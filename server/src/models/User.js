const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// ============================================================
// LOGIN HISTORY
// ============================================================

const loginHistorySchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },

    ipAddress: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },

    device: {
      type: String,
      default: "Unknown",
    },

    browser: {
      type: String,
      default: "Unknown",
    },

    operatingSystem: {
      type: String,
      default: "Unknown",
    },

    location: {
      type: String,
      default: "Unknown",
    },

    status: {
      type: String,
      enum: ["success", "failed", "blocked", "locked"],
      default: "success",
    },

    reason: {
      type: String,
      default: "",
    },
  },
  {
    _id: true,
  }
);

// ============================================================
// ACTIVE SESSION
// ============================================================

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    ipAddress: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },

    device: {
      type: String,
      default: "Unknown",
    },

    browser: {
      type: String,
      default: "Unknown",
    },

    operatingSystem: {
      type: String,
      default: "Unknown",
    },

    isCurrent: {
      type: Boolean,
      default: false,
    },

    revoked: {
      type: Boolean,
      default: false,
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

// ============================================================
// SECURITY ALERT
// ============================================================

const securityAlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "new_login",
        "failed_login",
        "account_locked",
        "password_changed",
        "password_reset",
        "email_verified",
        "suspicious_activity",
        "session_revoked",
        "multiple_devices",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    ipAddress: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },

    read: {
      type: Boolean,
      default: false,
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
  },
  {
    _id: true,
  }
);

// ============================================================
// PASSWORD HISTORY
// ============================================================

const passwordHistorySchema = new mongoose.Schema(
  {
    passwordHash: {
      type: String,
      required: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

// ============================================================
// MENTOR FEEDBACK
// ============================================================

const mentorFeedbackSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    feedback: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    strengths: [
      {
        type: String,
        trim: true,
        maxlength: 500,
      },
    ],

    improvements: [
      {
        type: String,
        trim: true,
        maxlength: 500,
      },
    ],

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

// ============================================================
// USER SCHEMA
// ============================================================

const UserSchema = new mongoose.Schema(
  {
    // ========================================================
    // BASIC USER INFORMATION
    // ========================================================

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: 254,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: true,
    },

    // ========================================================
    // CANDIDATE TYPE
    // ========================================================

    candidateType: {
      type: String,
      enum: [
        "fresher",
        "internship-seeker",
        "experienced",
      ],
      required: true,
    },

    // ========================================================
    // ROLE
    // ========================================================

    role: {
      type: String,
      enum: [
        "student",
        "mentor",
        "admin",
      ],
      default: "student",
      index: true,
    },

    // ========================================================
    // ROLE SELECTION
    // ========================================================

    roleSelectionCompleted: {
      type: Boolean,
      default: false,
    },

    // ========================================================
    // PROFILE / SKILLS
    // ========================================================

    skills: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    resume: {
      type: String,
      default: "",
    },

    // ========================================================
    // PLACEMENT READINESS DATA
    // ========================================================

    resumeScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    interviewPerformance: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    skillAssessment: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ========================================================
    // COMMUNICATION ASSESSMENT
    // ========================================================

    communicationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    communicationStrengths: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    communicationGaps: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    // ========================================================
    // MENTOR FEEDBACK
    // ========================================================

    mentorFeedback: {
      type: [mentorFeedbackSchema],
      default: [],
    },

    // ========================================================
    // EMAIL VERIFICATION
    // ========================================================

    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    // ========================================================
    // PASSWORD RESET
    // ========================================================

    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // ========================================================
    // PASSWORD SECURITY POLICY
    // ========================================================

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    passwordExpiresAt: {
      type: Date,
      default: null,
    },

    passwordHistory: {
      type: [passwordHistorySchema],
      default: [],
      select: false,
    },

    forcePasswordChange: {
      type: Boolean,
      default: false,
    },

    // ========================================================
    // LOGIN FAILURE / ACCOUNT LOCKOUT
    // ========================================================

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    lastFailedLoginAt: {
      type: Date,
      default: null,
    },

    lockedUntil: {
      type: Date,
      default: null,
    },

    lockoutCount: {
      type: Number,
      default: 0,
    },

    // ========================================================
    // LOGIN ACTIVITY
    // ========================================================

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIp: {
      type: String,
      default: "",
    },

    lastLoginUserAgent: {
      type: String,
      default: "",
    },

    lastLoginDevice: {
      type: String,
      default: "Unknown",
    },

    lastLoginLocation: {
      type: String,
      default: "Unknown",
    },

    loginHistory: {
      type: [loginHistorySchema],
      default: [],
      select: false,
    },

    // ========================================================
    // ACTIVE SESSIONS
    // ========================================================

    sessions: {
      type: [sessionSchema],
      default: [],
      select: false,
    },

    // ========================================================
    // SECURITY ALERTS
    // ========================================================

    securityAlerts: {
      type: [securityAlertSchema],
      default: [],
      select: false,
    },

    // ========================================================
    // SECURITY FLAGS
    // ========================================================

    suspiciousActivityDetected: {
      type: Boolean,
      default: false,
    },

    lastSecurityAlertAt: {
      type: Date,
      default: null,
    },

    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

UserSchema.index({
  email: 1,
});

UserSchema.index({
  emailVerified: 1,
});

UserSchema.index({
  role: 1,
});

UserSchema.index({
  lockedUntil: 1,
});

UserSchema.index({
  "sessions.sessionId": 1,
});

// ============================================================
// PASSWORD HASHING
// ============================================================

UserSchema.pre(
  "save",
  async function (next) {
    try {
      // Only hash when password was actually changed.
      if (!this.isModified("password")) {
        return next();
      }

      // ------------------------------------------------------
      // Save previous password into history
      // ------------------------------------------------------

      if (!this.isNew && this.passwordHistory) {
        const currentPasswordHash = this.get("password");

        if (
          currentPasswordHash &&
          typeof currentPasswordHash === "string" &&
          currentPasswordHash.startsWith("$2")
        ) {
          const alreadyExists = this.passwordHistory.some(
            (item) =>
              item.passwordHash === currentPasswordHash
          );

          if (!alreadyExists) {
            this.passwordHistory.push({
              passwordHash: currentPasswordHash,
              changedAt: new Date(),
            });
          }
        }
      }

      // ------------------------------------------------------
      // Hash new password
      // ------------------------------------------------------

      const salt = await bcrypt.genSalt(12);

      this.password = await bcrypt.hash(
        this.password,
        salt
      );

      // ------------------------------------------------------
      // Password policy expiry - 90 days
      // ------------------------------------------------------

      const passwordExpiry = new Date();

      passwordExpiry.setDate(
        passwordExpiry.getDate() + 90
      );

      this.passwordExpiresAt = passwordExpiry;
      this.passwordChangedAt = new Date();

      next();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// COMPARE PASSWORD
// ============================================================

UserSchema.methods.comparePassword =
  async function (candidatePassword) {
    if (
      typeof candidatePassword !== "string" ||
      !candidatePassword
    ) {
      return false;
    }

    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };

// ============================================================
// PASSWORD STRENGTH VALIDATION
// ============================================================

UserSchema.statics.validatePasswordStrength =
  function (password) {
    const errors = [];

    if (
      typeof password !== "string" ||
      password.length < 8
    ) {
      errors.push(
        "Password must be at least 8 characters long"
      );
    }

    if (
      typeof password === "string" &&
      password.length > 128
    ) {
      errors.push(
        "Password must not exceed 128 characters"
      );
    }

    if (
      typeof password === "string" &&
      !/[A-Z]/.test(password)
    ) {
      errors.push(
        "Password must contain at least one uppercase letter"
      );
    }

    if (
      typeof password === "string" &&
      !/[a-z]/.test(password)
    ) {
      errors.push(
        "Password must contain at least one lowercase letter"
      );
    }

    if (
      typeof password === "string" &&
      !/[0-9]/.test(password)
    ) {
      errors.push(
        "Password must contain at least one number"
      );
    }

    if (
      typeof password === "string" &&
      !/[^A-Za-z0-9]/.test(password)
    ) {
      errors.push(
        "Password must contain at least one special character"
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

// ============================================================
// SECURE TOKEN GENERATOR
// ============================================================

UserSchema.statics.generateSecureToken =
  function () {
    return crypto
      .randomBytes(32)
      .toString("hex");
  };

// ============================================================
// TOKEN HASH
// ============================================================

UserSchema.statics.hashToken =
  function (token) {
    if (
      typeof token !== "string" ||
      !token
    ) {
      return "";
    }

    return crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
  };

// ============================================================
// ACCOUNT LOCK CHECK
// ============================================================

UserSchema.methods.isAccountLocked =
  function () {
    if (!this.lockedUntil) {
      return false;
    }

    if (
      this.lockedUntil.getTime() <=
      Date.now()
    ) {
      return false;
    }

    return true;
  };

// ============================================================
// CLEAR LOCKOUT
// ============================================================

UserSchema.methods.clearLoginFailures =
  function () {
    this.failedLoginAttempts = 0;
    this.lastFailedLoginAt = null;
    this.lockedUntil = null;
  };

// ============================================================
// ADD SECURITY ALERT
// ============================================================

UserSchema.methods.addSecurityAlert =
  function ({
    type,
    message,
    ipAddress = "",
    userAgent = "",
    severity = "low",
  }) {
    if (!this.securityAlerts) {
      this.securityAlerts = [];
    }

    this.securityAlerts.unshift({
      type,
      message,
      ipAddress,
      userAgent,
      severity,
      timestamp: new Date(),
      read: false,
    });

    // Keep only latest 100 alerts.
    if (this.securityAlerts.length > 100) {
      this.securityAlerts =
        this.securityAlerts.slice(0, 100);
    }

    this.lastSecurityAlertAt = new Date();
  };

// ============================================================
// ADD LOGIN HISTORY
// ============================================================

UserSchema.methods.addLoginHistory =
  function (data = {}) {
    if (!this.loginHistory) {
      this.loginHistory = [];
    }

    this.loginHistory.unshift({
      ...data,
      timestamp: new Date(),
    });

    // Keep only latest 100 records.
    if (this.loginHistory.length > 100) {
      this.loginHistory =
        this.loginHistory.slice(0, 100);
    }
  };

// ============================================================
// ADD SESSION
// ============================================================

UserSchema.methods.addSession =
  function (session) {
    if (!this.sessions) {
      this.sessions = [];
    }

    this.sessions.push(session);

    // Keep maximum 5 sessions.
    if (this.sessions.length > 5) {
      this.sessions =
        this.sessions
          .sort(
            (a, b) =>
              new Date(
                b.lastActiveAt
              ).getTime() -
              new Date(
                a.lastActiveAt
              ).getTime()
          )
          .slice(0, 5);
    }
  };

// ============================================================
// REMOVE SESSION
// ============================================================

UserSchema.methods.removeSession =
  function (sessionId) {
    if (
      !this.sessions ||
      !sessionId
    ) {
      return;
    }

    const session =
      this.sessions.find(
        (item) =>
          item.sessionId ===
          sessionId
      );

    if (session) {
      session.revoked = true;
      session.revokedAt = new Date();
      session.isCurrent = false;
    }
  };

// ============================================================
// PASSWORD EXPIRY CHECK
// ============================================================

UserSchema.methods.isPasswordExpired =
  function () {
    if (!this.passwordExpiresAt) {
      return false;
    }

    return (
      new Date(
        this.passwordExpiresAt
      ).getTime() <= Date.now()
    );
  };

// ============================================================
// PASSWORD HISTORY CHECK
// ============================================================

UserSchema.methods.hasUsedPassword =
  async function (candidatePassword) {
    if (
      typeof candidatePassword !== "string" ||
      !candidatePassword
    ) {
      return false;
    }

    if (
      await bcrypt.compare(
        candidatePassword,
        this.password
      )
    ) {
      return true;
    }

    if (
      !this.passwordHistory ||
      !this.passwordHistory.length
    ) {
      return false;
    }

    for (const item of this.passwordHistory) {
      if (
        item.passwordHash &&
        await bcrypt.compare(
          candidatePassword,
          item.passwordHash
        )
      ) {
        return true;
      }
    }

    return false;
  };

// ============================================================
// JSON OUTPUT PROTECTION
// ============================================================

UserSchema.methods.toSafeObject =
  function () {
    const user = this.toObject();

    delete user.password;

    delete user.passwordResetToken;
    delete user.passwordResetExpires;

    delete user.emailVerificationToken;
    delete user.emailVerificationExpires;

    delete user.passwordHistory;

    delete user.loginHistory;

    delete user.sessions;

    delete user.securityAlerts;

    return user;
  };

// ============================================================
// MODEL
// ============================================================

module.exports =
  mongoose.models.User ||
  mongoose.model(
    "User",
    UserSchema
  );