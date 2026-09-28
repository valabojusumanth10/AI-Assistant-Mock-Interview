const express = require("express");

const router = express.Router();

const {
  getCompanies,
  startInterview,
  submitAnswer,
  getInterviews,
  getInterview,
  getSkillAssessment,
} = require("../controllers/interviewcontroller");

const auth = require("../middleware/auth");

const {
  requirePermission,
} = require("../middleware/rbac");

const {
  PERMISSIONS,
} = require("../config/permissions");

/*
|--------------------------------------------------------------------------
| Companies
|--------------------------------------------------------------------------
*/

router.get(
  "/companies",
  auth,
  requirePermission(
    PERMISSIONS.INTERVIEW_USE
  ),
  getCompanies
);

/*
|--------------------------------------------------------------------------
| Start Interview
|--------------------------------------------------------------------------
*/

router.post(
  "/start",
  auth,
  requirePermission(
    PERMISSIONS.INTERVIEW_USE
  ),
  startInterview
);

/*
|--------------------------------------------------------------------------
| Submit Answer
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Frontend MUST call:
|
| POST /api/interviews/submit-answer
|
*/

router.post(
  "/submit-answer",
  auth,
  requirePermission(
    PERMISSIONS.INTERVIEW_USE
  ),
  submitAnswer
);

/*
|--------------------------------------------------------------------------
| Skill Assessment
|--------------------------------------------------------------------------
*/

router.get(
  "/skill-assessment",
  auth,
  requirePermission(
    PERMISSIONS.INTERVIEW_USE
  ),
  getSkillAssessment
);

/*
|--------------------------------------------------------------------------
| Interview History
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  auth,
  requirePermission(
    PERMISSIONS.REPORT_VIEW_OWN
  ),
  getInterviews
);

/*
|--------------------------------------------------------------------------
| Single Interview
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  auth,
  requirePermission(
    PERMISSIONS.REPORT_VIEW_OWN
  ),
  getInterview
);

module.exports = router;