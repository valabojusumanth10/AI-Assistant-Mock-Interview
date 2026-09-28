const express = require("express");

const auth = require("../middleware/auth.js");

const {
  getReadiness,
  generateRoadmap,
  getReadinessHistory,
} = require("../controllers/readinesscontroller.js");

const router = express.Router();

// Placement readiness
router.get("/", auth, getReadiness);

// Personalized AI roadmap
router.get("/roadmap", auth, generateRoadmap);

// Historical readiness tracking
router.get("/history", auth, getReadinessHistory);

module.exports = router;