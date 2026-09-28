const express = require("express");

const auth = require("../middleware/auth.js");
const { requirePermission } = require("../middleware/rbac.js");

const {
  getStudents,
  getStudentPerformance,
  createStudentFeedback,
  getStudentFeedback,
} = require("../controllers/mentorcontroller.js");

const { PERMISSIONS } = require("../config/permissions.js");

const router = express.Router();

/*
 * GET ALL ACTIVE STUDENTS
 * Mentor + Admin
 */
router.get(
  "/students",
  auth,
  requirePermission(PERMISSIONS.STUDENT_PERFORMANCE_VIEW),
  getStudents,
);

/*
 * GET STUDENT PERFORMANCE
 * Mentor + Admin
 */
router.get(
  "/students/:studentId/performance",
  auth,
  requirePermission(PERMISSIONS.STUDENT_PERFORMANCE_VIEW),
  getStudentPerformance,
);

/*
 * CREATE STUDENT FEEDBACK
 * Mentor + Admin
 */
router.post(
  "/students/:studentId/feedback",
  auth,
  requirePermission(PERMISSIONS.STUDENT_FEEDBACK_CREATE),
  createStudentFeedback,
);

/*
 * GET STUDENT FEEDBACK
 * Mentor + Admin
 */
router.get(
  "/students/:studentId/feedback",
  auth,
  requirePermission(PERMISSIONS.STUDENT_PERFORMANCE_VIEW),
  getStudentFeedback,
);

module.exports = router;