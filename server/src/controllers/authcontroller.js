const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User.js");

// ============================================================
// CONFIG
// ============================================================

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || "24h";

const EMAIL_VERIFICATION_EXPIRES_MS =
  24 * 60 * 60 * 1000;

const PASSWORD_RESET_EXPIRES_MS =
  15 * 60 * 1000;

const MAX_LOGIN_ATTEMPTS = 5;

const LOCKOUT_DURATION_MS =
  15 * 60 * 1000;

const PASSWORD_HISTORY_LIMIT = 5;

const CLIENT_URL =
  process.env.CLIENT_URL ||
  "http://localhost:3000";

// ============================================================
// HELPERS
// ============================================================

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const getIpAddress = (req) => {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (forwarded) {
    return String(forwarded)
      .split(",")[0]
      .trim();
  }

  return (
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
};

const getUserAgent = (req) => {
  return (
    req.headers["user-agent"] ||
    "unknown"
  );
};

// ------------------------------------------------------------
// Basic User-Agent Parser
// ------------------------------------------------------------

const getDeviceInfo = (userAgent, clientHints = "") => {
  const ua = String(userAgent || "").toLowerCase();
  const hints = String(clientHints || "").toLowerCase();

  let device = "Desktop";

  if (
    ua.includes("mobile") ||
    ua.includes("android")
  ) {
    device = "Mobile";
  } else if (
    ua.includes("tablet") ||
    ua.includes("ipad")
  ) {
    device = "Tablet";
  }

  let browser = "Unknown";

  // Brave is Chromium-based and its User-Agent contains Chrome.
  // Check Client Hints first so Brave is not reported as Chrome.
  if (
    hints.includes('"brave"') ||
    hints.includes("'brave'") ||
    hints.includes("brave")
  ) {
    browser = "Brave";
  } else if (ua.includes("edg/")) {
    browser = "Microsoft Edge";
  } else if (ua.includes("opr/")) {
    browser = "Opera";
  } else if (ua.includes("firefox/")) {
    browser = "Mozilla Firefox";
  } else if (
    ua.includes("safari/") &&
    !ua.includes("chrome/")
  ) {
    browser = "Safari";
  } else if (ua.includes("chrome/")) {
    browser = "Google Chrome";
  }

  let operatingSystem = "Unknown";

  if (ua.includes("windows")) {
    operatingSystem = "Windows";
  } else if (ua.includes("mac os")) {
    operatingSystem = "macOS";
  } else if (ua.includes("android")) {
    operatingSystem = "Android";
  } else if (
    ua.includes("iphone") ||
    ua.includes("ipad")
  ) {
    operatingSystem = "iOS";
  } else if (ua.includes("linux")) {
    operatingSystem = "Linux";
  }

  return {
    device,
    browser,
    operatingSystem,
  };
};

// ============================================================
// SECURE TOKEN
// ============================================================

const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

// ============================================================
// EMAIL
// ============================================================

const sendEmail = async ({
  to,
  subject,
  text,
  html,
}) => {
  let nodemailer;

  try {
    nodemailer = require("nodemailer");
  } catch (error) {
    console.warn(
      "Nodemailer is not installed."
    );

    console.log("EMAIL TO:", to);
    console.log("SUBJECT:", subject);
    console.log(text);

    return;
  }

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.log(
      "\n=================================================="
    );

    console.log(
      "EMAIL SERVICE NOT CONFIGURED"
    );

    console.log("TO:", to);
    console.log("SUBJECT:", subject);
    console.log(text);

    console.log(
      "==================================================\n"
    );

    return;
  }

  const transporter =
    nodemailer.createTransport({
      host: process.env.SMTP_HOST,

      port: Number(
        process.env.SMTP_PORT || 587
      ),

      secure:
        String(
          process.env.SMTP_SECURE || "false"
        ).toLowerCase() === "true",

      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

  await transporter.sendMail({
    from:
      process.env.SMTP_FROM ||
      process.env.SMTP_USER,

    to,

    subject,

    text,

    html,
  });
};

// ============================================================
// JWT
// ============================================================

const signToken = (
  userId,
  sessionId,
  extraPayload = {}
) => {
  return jwt.sign(
    {
      userId,
      sessionId,
      ...extraPayload,
    },

    process.env.JWT_SECRET,

    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
};

// ============================================================
// REGISTER
// ============================================================

const register = async (req, res) => {
  try {
    let {
      name,
      email,
      password,
      candidateType,
      role,
    } = req.body;

    name = String(name || "").trim();

    email = normalizeEmail(email);

    // --------------------------------------------------------
    // Required fields
    // --------------------------------------------------------

    if (
      !name ||
      !email ||
      !password ||
      !candidateType
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // --------------------------------------------------------
    // Candidate type validation
    // --------------------------------------------------------

    const allowedCandidateTypes = [
      "fresher",
      "internship-seeker",
      "experienced",
    ];

    if (
      !allowedCandidateTypes.includes(
        candidateType
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid candidate type",
      });
    }

    // --------------------------------------------------------
    // ROLE VALIDATION
    //
    // Public registration can create:
    // student
    // mentor
    //
    // ADMIN CANNOT BE CREATED THROUGH REGISTRATION.
    // --------------------------------------------------------

    const allowedRegistrationRoles = [
      "student",
      "mentor",
    ];

    const selectedRole =
      allowedRegistrationRoles.includes(role)
        ? role
        : "student";

    // --------------------------------------------------------
    // Password strength
    // --------------------------------------------------------

   const passwordValidation =
  User.validatePasswordStrength(password);

if (!passwordValidation.valid) {
  return res.status(400).json({
    success: false,
    message: "Password does not meet security requirements",
    errors: passwordValidation.errors,
  });
}

    // --------------------------------------------------------
    // Duplicate account
    // --------------------------------------------------------

    const exists = await User.findOne({
      email,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
      });
    }

    // --------------------------------------------------------
    // Email verification token
    // --------------------------------------------------------

    const verificationToken =
      generateToken();

    const verificationTokenHash =
      hashToken(
        verificationToken
      );

    const verificationExpires =
      new Date(
        Date.now() +
          EMAIL_VERIFICATION_EXPIRES_MS
      );

    // --------------------------------------------------------
    // Create user
    // --------------------------------------------------------

    const user = await User.create({
      name,

      email,

      password,

      candidateType,

      role: selectedRole,

      emailVerified: false,

      emailVerificationToken:
        verificationTokenHash,

      emailVerificationExpires:
        verificationExpires,
    });

    // --------------------------------------------------------
    // Verification URL
    // --------------------------------------------------------

    const verificationUrl =
      `${CLIENT_URL}/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: email,

      subject:
        "Verify your Placement AI account",

      text: `
Hello ${name},

Welcome to Placement AI.

Your account has been created as a ${selectedRole} account.

Please verify your email address by opening this link:

${verificationUrl}

This verification link will expire in 24 hours.

If you did not create this account, you can safely ignore this email.
      `,

      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Welcome to Placement AI</h2>

          <p>Hello ${name},</p>

          <p>
            Your account has been created as a
            <strong>${selectedRole}</strong> account.
          </p>

          <p>
            Please verify your email address to activate your account.
          </p>

          <p>
            <a
              href="${verificationUrl}"
              style="
                display:inline-block;
                padding:12px 20px;
                background:#000;
                color:#fff;
                text-decoration:none;
                border-radius:6px;
              "
            >
              Verify Email
            </a>
          </p>

          <p>
            This link expires in 24 hours.
          </p>
        </div>
      `,
    });

    // --------------------------------------------------------
    // DO NOT AUTO LOGIN
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        selectedRole === "mentor"
          ? "Mentor account created. Please verify your email before logging in."
          : "Student account created. Please verify your email before logging in.",

      requiresEmailVerification: true,

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        role: user.role,

        candidateType:
          user.candidateType,

        emailVerified:
          user.emailVerified,
      },
    });
  } catch (err) {
    console.error(
      "REGISTER ERROR:",
      err
    );

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// ============================================================
// VERIFY EMAIL
// ============================================================

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (
      !token ||
      typeof token !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Verification token is required",
      });
    }

    const tokenHash =
      hashToken(token);

    const now = new Date();

    const user =
      await User.findOne({
        emailVerificationToken:
          tokenHash,

        emailVerificationExpires: {
          $gt: now,
        },
      }).select(
        "+emailVerificationToken +emailVerificationExpires"
      );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification token",
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message:
          "Your email is already verified. You can log in.",
      });
    }

    const updatedUser =
      await User.findOneAndUpdate(
        {
          _id: user._id,

          emailVerified: false,

          emailVerificationToken:
            tokenHash,

          emailVerificationExpires: {
            $gt: now,
          },
        },

        {
          $set: {
            emailVerified: true,

            emailVerifiedAt: now,

            lastSecurityAlertAt:
              now,
          },

          $unset: {
            emailVerificationToken: 1,

            emailVerificationExpires: 1,
          },

          $push: {
            securityAlerts: {
              type: "email_verified",

              message:
                "Your email address was successfully verified.",

              ipAddress:
                getIpAddress(req),

              userAgent:
                getUserAgent(req),

              timestamp: now,

              read: false,

              severity: "low",
            },
          },
        },

        {
          new: true,

          runValidators: false,
        }
      );

    if (!updatedUser) {
      const latestUser =
        await User.findById(
          user._id
        ).select("emailVerified");

      if (
        latestUser &&
        latestUser.emailVerified
      ) {
        return res.status(200).json({
          success: true,
          message:
            "Your email is already verified. You can log in.",
        });
      }

      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification token",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully. You can now log in.",
    });
  } catch (err) {
    console.error(
      "VERIFY EMAIL ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify your email right now. Please try again.",
      error: err.message,
    });
  }
};

// ============================================================
// RESEND VERIFICATION EMAIL
// ============================================================

const resendVerification = async (
  req,
  res
) => {
  try {
    const email = normalizeEmail(
      req.body.email
    );

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user =
      await User.findOne({
        email,
      }).select(
        "+emailVerificationToken +emailVerificationExpires"
      );

    if (
      !user ||
      user.emailVerified
    ) {
      return res.json({
        success: true,
        message:
          "If the account exists and requires verification, a verification email has been sent.",
      });
    }

    const token =
      generateToken();

    user.emailVerificationToken =
      hashToken(token);

    user.emailVerificationExpires =
      new Date(
        Date.now() +
          EMAIL_VERIFICATION_EXPIRES_MS
      );

    await user.save();

    const verificationUrl =
      `${CLIENT_URL}/verify-email?token=${token}`;

    await sendEmail({
      to: user.email,

      subject:
        "Verify your Placement AI account",

      text: `
Hello ${user.name},

Verify your email:

${verificationUrl}

This link expires in 24 hours.
      `,

      html: `
        <div style="font-family:Arial,sans-serif;">
          <h2>Verify your email</h2>

          <p>Hello ${user.name},</p>

          <p>
            Click below to verify your email address.
          </p>

          <a
            href="${verificationUrl}"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#000;
              color:#fff;
              text-decoration:none;
              border-radius:6px;
            "
          >
            Verify Email
          </a>
        </div>
      `,
    });

    return res.json({
      success: true,
      message:
        "If the account exists and requires verification, a verification email has been sent.",
    });
  } catch (err) {
    console.error(
      "RESEND VERIFICATION ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================================
// LOGIN
// ============================================================

const login = async (req, res) => {
  try {
    const email = normalizeEmail(
      req.body.email
    );

    const password =
      req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    // --------------------------------------------------------
    // Find user
    // --------------------------------------------------------

    const user =
      await User.findOne({
        email,
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // --------------------------------------------------------
    // Account inactive
    // --------------------------------------------------------

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been deactivated.",
      });
    }

    // --------------------------------------------------------
    // Account locked
    // --------------------------------------------------------

    if (
      typeof user.isAccountLocked ===
        "function" &&
      user.isAccountLocked()
    ) {
      const remaining =
        Math.max(
          0,
          Math.ceil(
            (new Date(
              user.lockedUntil
            ).getTime() -
              Date.now()) /
              60000
          )
        );

      if (
        typeof user.addLoginHistory ===
        "function"
      ) {
        user.addLoginHistory({
          status: "locked",

          reason:
            "Login attempt while account was locked.",

          ipAddress:
            getIpAddress(req),

          userAgent:
            getUserAgent(req),
        });

        await user.save();
      }

      return res.status(423).json({
        success: false,

        message:
          `Account temporarily locked. Try again in ${remaining} minute(s).`,

        locked: true,

        remainingMinutes:
          remaining,
      });
    }

    // --------------------------------------------------------
    // Password check
    // --------------------------------------------------------

    const passwordCorrect =
      await user.comparePassword(
        password
      );

    if (!passwordCorrect) {
      user.failedLoginAttempts =
        (user.failedLoginAttempts || 0) +
        1;

      user.lastFailedLoginAt =
        new Date();

      const ip =
        getIpAddress(req);

      const userAgent =
        getUserAgent(req);

      const deviceInfo =
        getDeviceInfo(
        userAgent,
        req.headers["sec-ch-ua"] ||
          req.headers["sec-ch-ua-full-version-list"] ||
          ""
      );

      if (
        typeof user.addLoginHistory ===
        "function"
      ) {
        user.addLoginHistory({
          status: "failed",

          reason:
            "Invalid password",

          ipAddress: ip,

          userAgent,

          device:
            deviceInfo.device,

          browser:
            deviceInfo.browser,

          operatingSystem:
            deviceInfo.operatingSystem,
        });
      }

      // ------------------------------------------------------
      // Lock after 5 failed attempts
      // ------------------------------------------------------

      if (
        user.failedLoginAttempts >=
        MAX_LOGIN_ATTEMPTS
      ) {
        user.lockedUntil =
          new Date(
            Date.now() +
              LOCKOUT_DURATION_MS
          );

        user.lockoutCount =
          (user.lockoutCount || 0) +
          1;

        if (
          typeof user.addSecurityAlert ===
          "function"
        ) {
          user.addSecurityAlert({
            type: "account_locked",

            message:
              "Your account was temporarily locked after multiple failed login attempts.",

            ipAddress: ip,

            severity: "high",
          });
        }
      } else if (
        typeof user.addSecurityAlert ===
        "function"
      ) {
        user.addSecurityAlert({
          type: "failed_login",

          message:
            "A failed login attempt was detected on your account.",

          ipAddress: ip,

          severity: "medium",
        });
      }

      await user.save();

      if (
        user.failedLoginAttempts >=
        MAX_LOGIN_ATTEMPTS
      ) {
        return res.status(423).json({
          success: false,

          message:
            "Too many failed login attempts. Your account has been temporarily locked.",

          locked: true,
        });
      }

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // --------------------------------------------------------
    // Email verification
    // --------------------------------------------------------

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,

        message:
          "Please verify your email before logging in.",

        requiresEmailVerification:
          true,
      });
    }

    // --------------------------------------------------------
    // Password expiration
    // --------------------------------------------------------

    if (
      user.forcePasswordChange ||
      (
        typeof user.isPasswordExpired ===
          "function" &&
        user.isPasswordExpired()
      )
    ) {
      return res.status(403).json({
        success: false,

        message:
          "Your password has expired. Please reset your password.",

        requiresPasswordUpdate:
          true,

        code:
          "PASSWORD_UPDATE_REQUIRED",
      });
    }

    // --------------------------------------------------------
    // Successful login
    // --------------------------------------------------------

    const ip =
      getIpAddress(req);

    const userAgent =
      getUserAgent(req);

    const deviceInfo =
      getDeviceInfo(
        userAgent,
        req.headers["sec-ch-ua"] ||
          req.headers["sec-ch-ua-full-version-list"] ||
          ""
      );

    const sessionId =
      crypto.randomUUID();

    const now =
      new Date();

    const sessionExpires =
      new Date(
        Date.now() +
          24 * 60 * 60 * 1000
      );

    // --------------------------------------------------------
    // Detect suspicious login
    // --------------------------------------------------------

    const isDifferentIp =
      user.lastLoginIp &&
      user.lastLoginIp !== ip;

    const isDifferentDevice =
      user.lastLoginDevice &&
      user.lastLoginDevice !==
        deviceInfo.device;

    const isSuspicious =
      Boolean(
        user.lastLoginAt &&
        (
          isDifferentIp ||
          isDifferentDevice
        )
      );

    // --------------------------------------------------------
    // Prevent duplicate sessions
    // --------------------------------------------------------

    if (
      Array.isArray(user.sessions)
    ) {
      user.sessions.forEach(
        (session) => {
          if (
            !session.revoked &&
            new Date(
              session.expiresAt
            ) > now
          ) {
            session.revoked = true;

            session.revokedAt =
              now;

            session.isCurrent =
              false;
          }
        }
      );
    }

    // --------------------------------------------------------
    // Add new session
    // --------------------------------------------------------

    if (
      typeof user.addSession ===
      "function"
    ) {
      user.addSession({
        sessionId,

        createdAt: now,

        lastActiveAt: now,

        expiresAt:
          sessionExpires,

        ipAddress: ip,

        userAgent,

        device:
          deviceInfo.device,

        browser:
          deviceInfo.browser,

        operatingSystem:
          deviceInfo.operatingSystem,

        isCurrent: true,

        revoked: false,
      });
    } else {
      user.sessions =
        user.sessions || [];

      user.sessions.push({
        sessionId,

        createdAt: now,

        lastActiveAt: now,

        expiresAt:
          sessionExpires,

        ipAddress: ip,

        userAgent,

        device:
          deviceInfo.device,

        browser:
          deviceInfo.browser,

        operatingSystem:
          deviceInfo.operatingSystem,

        isCurrent: true,

        revoked: false,
      });
    }

    // --------------------------------------------------------
    // Login history
    // --------------------------------------------------------

    if (
      typeof user.addLoginHistory ===
      "function"
    ) {
      user.addLoginHistory({
        status: "success",

        reason:
          "Successful login",

        ipAddress: ip,

        userAgent,

        device:
          deviceInfo.device,

        browser:
          deviceInfo.browser,

        operatingSystem:
          deviceInfo.operatingSystem,
      });
    }

    // --------------------------------------------------------
    // Security alert
    // --------------------------------------------------------

    if (isSuspicious) {
      user.suspiciousActivityDetected =
        true;

      user.lastSecurityAlertAt =
        now;

      if (
        typeof user.addSecurityAlert ===
        "function"
      ) {
        user.addSecurityAlert({
          type: "suspicious_activity",

          message:
            "A login from a new device or IP address was detected.",

          ipAddress: ip,

          severity: "high",
        });
      }
    } else if (
      typeof user.addSecurityAlert ===
      "function"
    ) {
      user.addSecurityAlert({
        type: "new_login",

        message:
          "A new login was detected on your account.",

        ipAddress: ip,

        severity: "low",
      });
    }

    // --------------------------------------------------------
    // Clear failed attempts
    // --------------------------------------------------------

    if (
      typeof user.clearLoginFailures ===
      "function"
    ) {
      user.clearLoginFailures();
    } else {
      user.failedLoginAttempts = 0;

      user.lastFailedLoginAt =
        undefined;

      user.lockedUntil =
        undefined;
    }

    // --------------------------------------------------------
    // Update login metadata
    // --------------------------------------------------------

    user.lastLoginAt =
      now;

    user.lastLoginIp =
      ip;

    user.lastLoginUserAgent =
      userAgent;

    user.lastLoginDevice =
      deviceInfo.device;

    await user.save();

    // --------------------------------------------------------
    // JWT
    // --------------------------------------------------------

    const token = signToken(
      user._id.toString(),
      sessionId
    );

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.json({
      success: true,

      token,

      sessionId,

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        candidateType:
          user.candidateType,

        role: user.role,

        emailVerified:
          user.emailVerified,
      },

      security: {
        suspiciousLogin:
          isSuspicious,

        newDevice:
          Boolean(isDifferentDevice),

        newIp:
          Boolean(isDifferentIp),
      },
    });
  } catch (err) {
    console.error(
      "LOGIN ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// ============================================================
// GET CURRENT USER
// ============================================================

const getMe = async (req, res) => {
  try {
    const user =
      await User.findById(
        req.userId
      ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,

      user:
        typeof user.toSafeObject ===
        "function"
          ? user.toSafeObject()
          : user,
    });
  } catch (err) {
    console.error(
      "GET ME ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// ============================================================
// FORGOT PASSWORD
// ============================================================

const forgotPassword = async (
  req,
  res
) => {
  try {
    const email = normalizeEmail(
      req.body.email
    );

    const genericResponse = {
      success: true,

      message:
        "If an account with that email exists, a password reset link has been sent.",
    };

    if (!email) {
      return res.json(
        genericResponse
      );
    }

    const user =
      await User.findOne({
        email,
      }).select(
        "+passwordResetToken +passwordResetExpires"
      );

    if (!user) {
      return res.json(
        genericResponse
      );
    }

    const resetToken =
      generateToken();

    user.passwordResetToken =
      hashToken(resetToken);

    user.passwordResetExpires =
      new Date(
        Date.now() +
          PASSWORD_RESET_EXPIRES_MS
      );

    await user.save();

    const resetUrl =
      `${CLIENT_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,

      subject:
        "Reset your Placement AI password",

      text: `
Hello ${user.name},

We received a request to reset your password.

Reset your password using this link:

${resetUrl}

This link expires in 15 minutes.

If you did not request a password reset, you can safely ignore this email.
      `,

      html: `
        <div style="font-family:Arial,sans-serif;">
          <h2>Password Reset</h2>

          <p>Hello ${user.name},</p>

          <p>
            We received a request to reset your password.
          </p>

          <p>
            <a
              href="${resetUrl}"
              style="
                display:inline-block;
                padding:12px 20px;
                background:#000;
                color:#fff;
                text-decoration:none;
                border-radius:6px;
              "
            >
              Reset Password
            </a>
          </p>

          <p>
            This link expires in 15 minutes.
          </p>
        </div>
      `,
    });

    return res.json(
      genericResponse
    );
  } catch (err) {
    console.error(
      "FORGOT PASSWORD ERROR:",
      err
    );

    return res.json({
      success: true,

      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  }
};

// ============================================================
// RESET PASSWORD
// ============================================================

const resetPassword = async (
  req,
  res
) => {
  try {
    const {
      token,
      newPassword,
    } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token and new password are required",
      });
    }

 const validation =
  User.validatePasswordStrength(newPassword);

if (!validation.valid) {
  return res.status(400).json({
    success: false,
    message: "Password does not meet security requirements",
    errors: validation.errors,
  });
}

    const tokenHash =
      hashToken(token);

    const user =
      await User.findOne({
        passwordResetToken:
          tokenHash,

        passwordResetExpires: {
          $gt: new Date(),
        },
      }).select(
        "+passwordResetToken +passwordResetExpires +passwordHistory"
      );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired password reset token",
      });
    }

    const passwordsToCheck = [
      user.password,

      ...(user.passwordHistory || [])
        .slice(
          0,
          PASSWORD_HISTORY_LIMIT
        )
        .map(
          (item) =>
            item.passwordHash
        ),
    ];

    for (
      const passwordHash of
      passwordsToCheck
    ) {
      const isSame =
        await bcrypt.compare(
          newPassword,
          passwordHash
        );

      if (isSame) {
        return res.status(400).json({
          success: false,

          message:
            "You cannot reuse one of your recent passwords.",
        });
      }
    }

    user.passwordHistory =
      user.passwordHistory || [];

    user.passwordHistory.unshift({
      passwordHash:
        user.password,

      changedAt:
        new Date(),
    });

    user.passwordHistory =
      user.passwordHistory.slice(
        0,
        PASSWORD_HISTORY_LIMIT
      );

    user.password =
      newPassword;

    user.passwordResetToken =
      undefined;

    user.passwordResetExpires =
      undefined;

    user.forcePasswordChange =
      false;

    user.passwordChangedAt =
      new Date();

    user.passwordExpiresAt =
      new Date(
        Date.now() +
          90 * 24 * 60 * 60 * 1000
      );

    const now =
      new Date();

    if (
      Array.isArray(user.sessions)
    ) {
      user.sessions.forEach(
        (session) => {
          if (!session.revoked) {
            session.revoked =
              true;

            session.revokedAt =
              now;

            session.isCurrent =
              false;
          }
        }
      );
    }

    if (
      typeof user.addSecurityAlert ===
      "function"
    ) {
      user.addSecurityAlert({
        type: "password_reset",

        message:
          "Your password was successfully reset. Existing sessions were revoked.",

        severity: "high",
      });
    }

    await user.save();

    return res.json({
      success: true,

      message:
        "Password reset successfully. Please log in again.",
    });
  } catch (err) {
    console.error(
      "RESET PASSWORD ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// ============================================================
// CHANGE PASSWORD
// ============================================================

const changePassword = async (
  req,
  res
) => {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Current password and new password are required",
      });
    }

    const user =
      await User.findById(
        req.userId
      ).select(
        "+passwordHistory"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const currentCorrect =
      await user.comparePassword(
        currentPassword
      );

    if (!currentCorrect) {
      return res.status(401).json({
        success: false,

        message:
          "Current password is incorrect",
      });
    }

  const validation =
  User.validatePasswordStrength(newPassword);

if (!validation.valid) {
  return res.status(400).json({
    success: false,
    message: "Password does not meet security requirements",
    errors: validation.errors,
  });
}
    const passwordsToCheck = [
      user.password,

      ...(user.passwordHistory || [])
        .slice(
          0,
          PASSWORD_HISTORY_LIMIT
        )
        .map(
          (item) =>
            item.passwordHash
        ),
    ];

    for (
      const passwordHash of
      passwordsToCheck
    ) {
      const isSame =
        await bcrypt.compare(
          newPassword,
          passwordHash
        );

      if (isSame) {
        return res.status(400).json({
          success: false,

          message:
            "You cannot reuse one of your recent passwords.",
        });
      }
    }

    user.passwordHistory =
      user.passwordHistory || [];

    user.passwordHistory.unshift({
      passwordHash:
        user.password,

      changedAt:
        new Date(),
    });

    user.passwordHistory =
      user.passwordHistory.slice(
        0,
        PASSWORD_HISTORY_LIMIT
      );

    user.password =
      newPassword;

  user.forcePasswordChange = false;

// Clear old login lockout state after a successful
// password reset.
user.failedLoginAttempts = 0;
user.lastFailedLoginAt = null;
user.lockedUntil = null;

user.passwordChangedAt = new Date();

    user.passwordExpiresAt =
      new Date(
        Date.now() +
          90 * 24 * 60 * 60 * 1000
      );

    const now =
      new Date();

    if (
      Array.isArray(user.sessions)
    ) {
      user.sessions.forEach(
        (session) => {
          if (
            session.sessionId !==
            req.sessionId
          ) {
            session.revoked =
              true;

            session.revokedAt =
              now;

            session.isCurrent =
              false;
          }
        }
      );
    }

    if (
      typeof user.addSecurityAlert ===
      "function"
    ) {
      user.addSecurityAlert({
        type: "password_changed",

        message:
          "Your account password was changed successfully.",

        ipAddress:
          getIpAddress(req),

        severity: "medium",
      });
    }

    await user.save();

    return res.json({
      success: true,

      message:
        "Password changed successfully.",
    });
  } catch (err) {
    console.error(
      "CHANGE PASSWORD ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// ============================================================
// GET ACTIVE SESSIONS
// ============================================================

const getActiveSessions = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.userId
      ).select(
        "+sessions"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const now =
      new Date();

    const activeSessions =
      (user.sessions || [])
        .filter(
          (session) =>
            !session.revoked &&
            new Date(
              session.expiresAt
            ) > now
        )
        .map(
          (session) => ({
            sessionId:
              session.sessionId,

            createdAt:
              session.createdAt,

            lastActiveAt:
              session.lastActiveAt,

            expiresAt:
              session.expiresAt,

            ipAddress:
              session.ipAddress,

            device:
              session.device,

            browser:
              session.browser,

            operatingSystem:
              session.operatingSystem,

            isCurrent:
              session.sessionId ===
              req.sessionId,
          })
        );

    return res.json({
      success: true,

      sessions:
        activeSessions,
    });
  } catch (err) {
    console.error(
      "GET SESSIONS ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================================
// REVOKE SESSION
// ============================================================

const revokeSession = async (
  req,
  res
) => {
  try {
    const {
      sessionId,
    } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "Session ID is required",
      });
    }

    const user =
      await User.findById(
        req.userId
      ).select(
        "+sessions"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const session =
      (user.sessions || []).find(
        (item) =>
          item.sessionId ===
          sessionId
      );

    if (!session) {
      return res.status(404).json({
        success: false,
        message:
          "Session not found",
      });
    }

    session.revoked =
      true;

    session.revokedAt =
      new Date();

    session.isCurrent =
      false;

    if (
      typeof user.addSecurityAlert ===
      "function"
    ) {
      user.addSecurityAlert({
        type: "session_revoked",

        message:
          "A session was revoked from your account.",

        ipAddress:
          getIpAddress(req),

        severity: "medium",
      });
    }

    await user.save();

    return res.json({
      success: true,

      message:
        "Session revoked successfully.",
    });
  } catch (err) {
    console.error(
      "REVOKE SESSION ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================================
// REVOKE ALL OTHER SESSIONS
// ============================================================

const revokeAllOtherSessions =
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.userId
        ).select(
          "+sessions"
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const now =
        new Date();

      let revokedCount = 0;

      (
        user.sessions || []
      ).forEach(
        (session) => {
          if (
            session.sessionId !==
              req.sessionId &&
            !session.revoked
          ) {
            session.revoked =
              true;

            session.revokedAt =
              now;

            session.isCurrent =
              false;

            revokedCount++;
          }
        }
      );

      if (
        typeof user.addSecurityAlert ===
        "function"
      ) {
        user.addSecurityAlert({
          type: "session_revoked",

          message:
            `${revokedCount} other active session(s) were revoked.`,

          ipAddress:
            getIpAddress(req),

          severity: "medium",
        });
      }

      await user.save();

      return res.json({
        success: true,

        message:
          "All other sessions have been revoked.",

        revokedCount,
      });
    } catch (err) {
      console.error(
        "REVOKE ALL OTHER SESSIONS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error",
      });
    }
  };

// ============================================================
// LOGOUT
// ============================================================

const logout = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.userId
      ).select(
        "+sessions"
      );

    if (!user) {
      return res.json({
        success: true,

        message:
          "Logged out successfully.",
      });
    }

    const session =
      (user.sessions || []).find(
        (item) =>
          item.sessionId ===
          req.sessionId
      );

    if (session) {
      session.revoked =
        true;

      session.revokedAt =
        new Date();

      session.isCurrent =
        false;
    }

    await user.save();

    return res.json({
      success: true,

      message:
        "Logged out successfully.",
    });
  } catch (err) {
    console.error(
      "LOGOUT ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================================
// LOGIN HISTORY
// ============================================================

const getLoginHistory = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.userId
      ).select(
        "+loginHistory"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const history =
      (user.loginHistory || [])
        .slice(-50)
        .reverse()
        .map(
          (item) => ({
            timestamp:
              item.timestamp,

            ipAddress:
              item.ipAddress,

            device:
              item.device,

            browser:
              item.browser,

            operatingSystem:
              item.operatingSystem,

            status:
              item.status,

            reason:
              item.reason,
          })
        );

    return res.json({
      success: true,

      history,
    });
  } catch (err) {
    console.error(
      "LOGIN HISTORY ERROR:",
      err
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error",
    });
  }
};

// ============================================================
// SECURITY ALERTS
// ============================================================

const getSecurityAlerts = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.userId
      ).select(
        "+securityAlerts"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const alerts =
      (user.securityAlerts || [])
        .slice(-50)
        .reverse();

    return res.json({
      success: true,

      alerts,
    });
  } catch (err) {
    console.error(
      "SECURITY ALERTS ERROR:",
      err
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error",
    });
  }
};
// ============================================================
// SELECT ROLE
// ============================================================

const selectRole = async (req, res) => {
  try {
    const { role } = req.body;

    // Only Student and Mentor can be selected.
    // Admin can never be selected from the frontend.
    const allowedRoles = ["student", "mentor"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Please select Student or Mentor.",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Block inactive accounts
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive.",
      });
    }

    // Email must be verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before selecting a role.",
      });
    }

    // Admin accounts cannot use this endpoint
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot use role selection.",
      });
    }

    // Update role
    user.role = role;
    user.roleSelectionCompleted = true;

    await user.save();

    return res.json({
      success: true,
      message:
        role === "mentor"
          ? "Your account is now set up as a Mentor."
          : "Your account is now set up as a Student.",

    user: {
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  roleSelectionCompleted: user.roleSelectionCompleted,
  candidateType: user.candidateType,
  emailVerified: user.emailVerified,
},
    });
  } catch (err) {
    console.error("SELECT ROLE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Unable to update your role.",
    });
  }
};
// ============================================================
// MARK SECURITY ALERT AS READ
// ============================================================

const markSecurityAlertRead =
  async (req, res) => {
    try {
      const {
        alertId,
      } = req.params;

      const user =
        await User.findById(
          req.userId
        ).select(
          "+securityAlerts"
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const alert =
        (user.securityAlerts || []).find(
          (item) =>
            item._id.toString() ===
            alertId
        );

      if (!alert) {
        return res.status(404).json({
          success: false,

          message:
            "Security alert not found",
        });
      }

      alert.read =
        true;

      await user.save();

      return res.json({
        success: true,

        message:
          "Security alert marked as read.",
      });
    } catch (err) {
      console.error(
        "MARK SECURITY ALERT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error",
      });
    }
  };

// ============================================================
// MARK ALL SECURITY ALERTS AS READ
// ============================================================

const markAllSecurityAlertsRead =
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.userId
        ).select(
          "+securityAlerts"
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      (
        user.securityAlerts || []
      ).forEach(
        (alert) => {
          alert.read =
            true;
        }
      );

      await user.save();

      return res.json({
        success: true,

        message:
          "All security alerts marked as read.",
      });
    } catch (err) {
      console.error(
        "MARK ALL SECURITY ALERTS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error",
      });
    }
  };
// ============================================================
// SELECT ROLE
// ============================================================
// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  register,
  login,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  logout,
  getLoginHistory,
  getSecurityAlerts,
  markSecurityAlertRead,
  markAllSecurityAlertsRead,
  selectRole,
  signToken,
};
