const express = require("express");
const multer = require("multer");

const auth = require("../middleware/auth.js");
const { analyzeResume } = require("../controllers/resumecontroller.js");

const router = express.Router();

// ─────────────────────────────────────────────
// Multer Configuration
// ─────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, TXT, DOC, and DOCX files are allowed."
        ),
        false
      );
    }
  },
});

// ─────────────────────────────────────────────
// Resume Analysis
// ─────────────────────────────────────────────

router.post(
  "/analyze",
  auth,
  upload.single("resume"),
  analyzeResume
);

module.exports = router;