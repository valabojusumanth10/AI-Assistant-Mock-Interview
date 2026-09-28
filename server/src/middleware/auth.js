const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
//
// Responsibilities:
// 1. Read JWT from Authorization header
// 2. Verify JWT signature + expiration
// 3. Extract userId + sessionId
// 4. Verify user exists
// 5. Verify account is active
// 6. Verify database session exists
// 7. Reject revoked sessions
// 8. Reject expired database sessions
// 9. Update session activity
// 10. Attach authentication information to req
//
// ============================================================

const auth = async (req, res, next) => {
  try {
    // ========================================================
    // 1. CHECK JWT SECRET
    // ========================================================

    if (!process.env.JWT_SECRET) {
      console.error(
        "AUTH ERROR: JWT_SECRET is missing from environment variables."
      );

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    // ========================================================
    // 2. GET AUTHORIZATION HEADER
    // ========================================================

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
        code: "TOKEN_REQUIRED",
      });
    }

    // ========================================================
    // 3. EXTRACT BEARER TOKEN
    // ========================================================

    let token = null;

    if (
      typeof authHeader === "string" &&
      authHeader.toLowerCase().startsWith("bearer ")
    ) {
      token = authHeader.substring(7).trim();
    } else {
      // Also allow a raw JWT for compatibility.
      token = authHeader.trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing",
        code: "TOKEN_MISSING",
      });
    }

    // ========================================================
    // 4. VERIFY JWT
    // ========================================================

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (jwtError) {
      console.error(
        "JWT VERIFICATION ERROR:",
        jwtError.name,
        jwtError.message
      );

      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Your authentication token has expired. Please log in again.",
          code: "TOKEN_EXPIRED",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid authentication token. Please log in again.",
        code: "TOKEN_INVALID",
      });
    }

    // ========================================================
    // 5. EXTRACT USER ID
    // ========================================================
    //
    // Our authcontroller signs tokens using:
    //
    // {
    //   userId,
    //   sessionId
    // }
    //
    // The additional fallbacks make the middleware safer if
    // another part of the application creates a compatible JWT.
    //
    // ========================================================

    const userId =
      decoded.userId ||
      decoded.id ||
      decoded._id ||
      decoded.user?._id;

    if (!userId) {
      console.error(
        "AUTH ERROR: JWT does not contain a user ID."
      );

      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "USER_ID_MISSING",
      });
    }

    // ========================================================
    // 6. EXTRACT SESSION ID
    // ========================================================

    const sessionId = decoded.sessionId;

    // ========================================================
    // 7. SESSION ID IS REQUIRED
    // ========================================================
    //
    // Enterprise authentication requires every active JWT
    // to correspond to a database session.
    //
    // Therefore tokens generated before the session system
    // cannot be used.
    //
    // ========================================================

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication session is invalid. Please log in again.",
        code: "SESSION_REQUIRED",
      });
    }

    // ========================================================
    // 8. FIND USER
    // ========================================================

    let user;

    try {
      user = await User.findById(userId).select("+sessions");
    } catch (dbError) {
      console.error(
        "AUTH USER LOOKUP ERROR:",
        dbError
      );

      return res.status(401).json({
        success: false,
        message: "Authentication failed",
        code: "USER_LOOKUP_FAILED",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists",
        code: "USER_NOT_FOUND",
      });
    }

    // ========================================================
    // 9. CHECK ACCOUNT STATUS
    // ========================================================

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
        code: "ACCOUNT_INACTIVE",
      });
    }

    // ========================================================
    // 10. FIND DATABASE SESSION
    // ========================================================

    const sessions = Array.isArray(user.sessions)
      ? user.sessions
      : [];

    const session = sessions.find(
      (item) =>
        String(item.sessionId) === String(sessionId)
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication session not found. Please log in again.",
        code: "SESSION_NOT_FOUND",
      });
    }

    // ========================================================
    // 11. CHECK REVOKED SESSION
    // ========================================================

    if (session.revoked === true) {
      return res.status(401).json({
        success: false,
        message:
          "Your session has been revoked. Please log in again.",
        code: "SESSION_REVOKED",
      });
    }

    // ========================================================
    // 12. CHECK DATABASE SESSION EXPIRATION
    // ========================================================

    const now = new Date();

    if (
      !session.expiresAt ||
      new Date(session.expiresAt).getTime() <= now.getTime()
    ) {
      // Mark only this session as revoked.
      session.revoked = true;
      session.revokedAt = now;
      session.isCurrent = false;

      try {
        await user.save();
      } catch (saveError) {
        console.error(
          "AUTH SESSION EXPIRATION SAVE ERROR:",
          saveError
        );
      }

      return res.status(401).json({
        success: false,
        message:
          "Your session has expired. Please log in again.",
        code: "SESSION_EXPIRED",
      });
    }

    // ========================================================
    // 13. UPDATE SESSION ACTIVITY
    // ========================================================
    //
    // IMPORTANT:
    // Do NOT save the entire User document on every request.
    //
    // Updating the session using updateOne reduces unnecessary
    // database writes and avoids overwriting changes made by
    // concurrent requests.
    //
    // ========================================================

    session.lastActiveAt = now;
    session.isCurrent = true;

    try {
      await User.updateOne(
        {
          _id: user._id,
          "sessions.sessionId": sessionId,
        },
        {
          $set: {
            "sessions.$.lastActiveAt": now,
            "sessions.$.isCurrent": true,
          },
        }
      );
    } catch (activityError) {
      // Activity tracking should NOT destroy an otherwise valid
      // authenticated request.
      console.error(
        "AUTH SESSION ACTIVITY UPDATE ERROR:",
        activityError
      );
    }

    // ========================================================
    // 14. ATTACH USER INFORMATION TO REQUEST
    // ========================================================

    req.user = user;

    req.userId = user._id.toString();

    req.sessionId = String(sessionId);

    req.session = session;

    // ========================================================
    // 15. ATTACH AUTH METADATA
    // ========================================================

    req.auth = {
      userId: user._id.toString(),

      sessionId: String(sessionId),

      tokenIssuedAt: decoded.iat
        ? new Date(decoded.iat * 1000)
        : null,

      tokenExpiresAt: decoded.exp
        ? new Date(decoded.exp * 1000)
        : null,
    };

    // ========================================================
    // 16. CONTINUE
    // ========================================================

    return next();
  } catch (error) {
    console.error(
      "AUTH MIDDLEWARE ERROR:",
      error
    );

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      code: "AUTH_FAILED",
    });
  }
};

module.exports = auth;