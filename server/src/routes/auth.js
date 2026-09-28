const express = require("express");

const {
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
} = require("../controllers/authcontroller.js");

const auth = require("../middleware/auth.js");

const router = express.Router();

// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

// Register new account
router.post("/register", register);

// Login
router.post("/login", login);

// Email verification
router.post("/verify-email", verifyEmail);

// Resend verification email
router.post("/resend-verification", resendVerification);
router.post("/select-role", auth, selectRole);
// Forgot password
router.post("/forgot-password", forgotPassword);

// Reset password using time-limited token
router.post("/reset-password", resetPassword);

// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

// Current authenticated user
router.get("/me", auth, getMe);

// Change password
router.post("/change-password", auth, changePassword);

// Logout current session
router.post("/logout", auth, logout);

// ============================================================
// ACTIVE SESSION MANAGEMENT
// ============================================================

// Get all active sessions
router.get("/sessions", auth, getActiveSessions);

// Revoke a specific session
router.delete("/sessions/:sessionId", auth, revokeSession);

// Revoke every session except current session
router.delete(
  "/sessions",
  auth,
  revokeAllOtherSessions
);

// ============================================================
// LOGIN ACTIVITY
// ============================================================

// Login history
router.get(
  "/login-history",
  auth,
  getLoginHistory
);

// ============================================================
// SECURITY ALERTS
// ============================================================

// Get security alerts
router.get(
  "/security-alerts",
  auth,
  getSecurityAlerts
);

// Mark one alert as read
router.patch(
  "/security-alerts/:alertId/read",
  auth,
  markSecurityAlertRead
);

// Mark all alerts as read
router.patch(
  "/security-alerts/read-all",
  auth,
  markAllSecurityAlertsRead
);

module.exports = router;