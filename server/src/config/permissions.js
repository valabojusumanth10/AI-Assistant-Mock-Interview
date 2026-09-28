// ============================================================
// RBAC PERMISSIONS
// ============================================================
//
// Roles:
//   student
//   mentor
//   admin
//
// Keep permissions independent from roles so new roles can be
// added later without rewriting authorization middleware.
// ============================================================

const ROLES = Object.freeze({
  STUDENT: "student",
  MENTOR: "mentor",
  ADMIN: "admin",
});

const PERMISSIONS = Object.freeze({
  // Student features
  INTERVIEW_USE: "interview:use",
  PRACTICE_USE: "practice:use",
  REPORT_VIEW_OWN: "report:view:own",
  PROFILE_VIEW_OWN: "profile:view:own",

  // Mentor features
  STUDENT_PERFORMANCE_VIEW: "student-performance:view",
  STUDENT_FEEDBACK_CREATE: "student-feedback:create",

  // Admin features
  USERS_VIEW: "users:view",
  USERS_MANAGE: "users:manage",
  PLATFORM_ACTIVITY_VIEW: "platform-activity:view",
  SYSTEM_SETTINGS_VIEW: "system-settings:view",
  SYSTEM_SETTINGS_MANAGE: "system-settings:manage",
});

// ============================================================
// ROLE → PERMISSIONS
// ============================================================

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.STUDENT]: Object.freeze([
    PERMISSIONS.INTERVIEW_USE,
    PERMISSIONS.PRACTICE_USE,
    PERMISSIONS.REPORT_VIEW_OWN,
    PERMISSIONS.PROFILE_VIEW_OWN,
  ]),

  [ROLES.MENTOR]: Object.freeze([
    PERMISSIONS.INTERVIEW_USE,
    PERMISSIONS.PRACTICE_USE,
    PERMISSIONS.REPORT_VIEW_OWN,
    PERMISSIONS.PROFILE_VIEW_OWN,

    PERMISSIONS.STUDENT_PERFORMANCE_VIEW,
    PERMISSIONS.STUDENT_FEEDBACK_CREATE,
  ]),

  [ROLES.ADMIN]: Object.freeze([
    // Student capabilities
    PERMISSIONS.INTERVIEW_USE,
    PERMISSIONS.PRACTICE_USE,
    PERMISSIONS.REPORT_VIEW_OWN,
    PERMISSIONS.PROFILE_VIEW_OWN,

    // Mentor capabilities
    PERMISSIONS.STUDENT_PERFORMANCE_VIEW,
    PERMISSIONS.STUDENT_FEEDBACK_CREATE,

    // Admin capabilities
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.PLATFORM_ACTIVITY_VIEW,
    PERMISSIONS.SYSTEM_SETTINGS_VIEW,
    PERMISSIONS.SYSTEM_SETTINGS_MANAGE,
  ]),
});

// ============================================================
// HELPERS
// ============================================================

const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

const hasPermission = (role, permission) => {
  return getRolePermissions(role).includes(permission);
};

const hasAnyPermission = (role, permissions = []) => {
  return permissions.some((permission) =>
    hasPermission(role, permission)
  );
};

const hasAllPermissions = (role, permissions = []) => {
  return permissions.every((permission) =>
    hasPermission(role, permission)
  );
};

const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getRolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isValidRole,
};