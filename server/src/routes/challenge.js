const express = require("express");

const auth = require("../middleware/auth.js");
const { requirePermission } = require("../middleware/rbac.js");
const { PERMISSIONS } = require("../config/permissions.js");

const {
  getDailyChallenge,
  getWeeklyChallenge,
  generatePracticeChallenge,
  submitChallenge,
  getLeaderboard,
  getMyStats,
  getRankHistory,
  getChallengeHistory,
} = require("../controllers/challengecontroller.js");

const router = express.Router();

// ======================================================
// PEER CHALLENGE ARENA
// Permission: practice:use
// ======================================================
//
// Student:
//   Can use challenges, submit answers, view own stats/history.
//
// Mentor:
//   Can also use the challenge system.
//
// Admin:
//   Has all permissions.
//
// ======================================================


// ======================================================
// DAILY CHALLENGE
// GET /api/challenges/daily
// ======================================================

router.get(
  "/daily",
  auth,
  requirePermission(PERMISSIONS.PRACTICE_USE),
  getDailyChallenge
);


// ======================================================
// WEEKLY CHALLENGE
// GET /api/challenges/weekly
// ======================================================

router.get(
  "/weekly",
  auth,
  requirePermission(PERMISSIONS.PRACTICE_USE),
  getWeeklyChallenge
);


// ======================================================
// AI PRACTICE CHALLENGE
// POST /api/challenges/practice
// ======================================================

router.post(
  "/practice",
  auth,
  requirePermission(PERMISSIONS.PRACTICE_USE),
  generatePracticeChallenge
);


// ======================================================
// SUBMIT CHALLENGE
// POST /api/challenges/submit
// ======================================================

router.post(
  "/submit",
  auth,
  requirePermission(PERMISSIONS.PRACTICE_USE),
  submitChallenge
);


// ======================================================
// LEADERBOARD
// GET /api/challenges/leaderboard
// ======================================================

router.get(
  "/leaderboard",
  auth,
  requirePermission(PERMISSIONS.PRACTICE_USE),
  getLeaderboard
);


// ======================================================
// MY STATS
// GET /api/challenges/stats
// ======================================================

router.get(
  "/stats",
  auth,
  requirePermission(PERMISSIONS.PRACTICE_USE),
  getMyStats
);


// ======================================================
// RANK HISTORY
// GET /api/challenges/rank-history
// ======================================================

router.get(
  "/rank-history",
  auth,
  requirePermission(PERMISSIONS.PRACTICE_USE),
  getRankHistory
);


// ======================================================
// CHALLENGE HISTORY
// GET /api/challenges/history
// ======================================================

router.get(
  "/history",
  auth,
  requirePermission(PERMISSIONS.PRACTICE_USE),
  getChallengeHistory
);


module.exports = router;