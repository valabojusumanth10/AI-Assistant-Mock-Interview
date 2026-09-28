const express = require("express");

const auth = require("../middleware/auth.js");
const { requirePermission } = require("../middleware/rbac.js");

const {
  getUsers,
  updateUserStatus,
  updateUserRole,
  getPlatformActivity,
  getSystemSettings,
} = require("../controllers/admincontroller.js");

const { PERMISSIONS } = require("../config/permissions.js");

const router = express.Router();

/*
 * USER MANAGEMENT
 * Admin only through USERS_VIEW / USERS_MANAGE permissions.
 */

router.get(
  "/users",
  auth,
  requirePermission(PERMISSIONS.USERS_VIEW),
  getUsers,
);

router.patch(
  "/users/:userId/status",
  auth,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  updateUserStatus,
);

router.patch(
  "/users/:userId/role",
  auth,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  updateUserRole,
);

/*
 * PLATFORM ACTIVITY
 */

router.get(
  "/activity",
  auth,
  requirePermission(PERMISSIONS.PLATFORM_ACTIVITY_VIEW),
  getPlatformActivity,
);

/*
 * SYSTEM SETTINGS
 */

router.get(
  "/settings",
  auth,
  requirePermission(PERMISSIONS.SYSTEM_SETTINGS_VIEW),
  getSystemSettings,
);

module.exports = router;