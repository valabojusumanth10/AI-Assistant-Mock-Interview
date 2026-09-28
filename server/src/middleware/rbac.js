// ============================================================
// RBAC MIDDLEWARE
// ============================================================

const {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isValidRole,
} = require("../config/permissions.js");

// ============================================================
// REQUIRE ROLE
// ============================================================
//
// Example:
//
// router.get(
//   "/admin",
//   auth,
//   requireRole("admin"),
//   controller
// );
//
// ============================================================

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const userRole = req.user.role;

    if (!isValidRole(userRole)) {
      console.error(
        `RBAC: Invalid role "${userRole}" for user ${req.userId}`
      );

      return res.status(403).json({
        message: "Your account has an invalid role configuration.",
        code: "INVALID_ROLE",
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message:
          "You do not have permission to access this resource.",
        code: "FORBIDDEN",
        requiredRoles: allowedRoles,
        currentRole: userRole,
      });
    }

    next();
  };
};

// ============================================================
// REQUIRE PERMISSION
// ============================================================

const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const userRole = req.user.role;

    if (!isValidRole(userRole)) {
      console.error(
        `RBAC: Invalid role "${userRole}" for user ${req.userId}`
      );

      return res.status(403).json({
        message: "Your account has an invalid role configuration.",
        code: "INVALID_ROLE",
      });
    }

    const allowed = permissions.some((permission) =>
      hasPermission(userRole, permission)
    );

    if (!allowed) {
      return res.status(403).json({
        message:
          "You do not have permission to perform this action.",
        code: "FORBIDDEN",
        requiredPermissions: permissions,
        currentRole: userRole,
      });
    }

    next();
  };
};

// ============================================================
// REQUIRE ALL PERMISSIONS
// ============================================================

const requireAllPermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const userRole = req.user.role;

    if (!isValidRole(userRole)) {
      return res.status(403).json({
        message: "Invalid account role.",
        code: "INVALID_ROLE",
      });
    }

    if (!hasAllPermissions(userRole, permissions)) {
      return res.status(403).json({
        message:
          "You do not have all required permissions.",
        code: "FORBIDDEN",
        requiredPermissions: permissions,
        currentRole: userRole,
      });
    }

    next();
  };
};

// ============================================================
// REQUIRE ANY PERMISSION
// ============================================================

const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const userRole = req.user.role;

    if (!isValidRole(userRole)) {
      return res.status(403).json({
        message: "Invalid account role.",
        code: "INVALID_ROLE",
      });
    }

    if (!hasAnyPermission(userRole, permissions)) {
      return res.status(403).json({
        message:
          "You do not have permission to access this resource.",
        code: "FORBIDDEN",
        requiredPermissions: permissions,
        currentRole: userRole,
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
};