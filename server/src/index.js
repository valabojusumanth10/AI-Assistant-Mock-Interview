const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Load environment variables FIRST
require("dotenv").config();

const connectDB = require("./config/db.js");

const authRoutes = require("./routes/auth.js");
const interviewRoutes = require("./routes/interview.js");
const resumeRoutes = require("./routes/resume.js");
const readinessRoutes = require("./routes/readinessroutes.js");
const challengeRoutes = require("./routes/challenge.js");
const mentorRoutes = require("./routes/mentor.js");
const adminRoutes = require("./routes/admin.js");

connectDB();

const app = express();

app.use(
  cors({
    origin: "*",
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/readiness", readinessRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/mentor", mentorRoutes);

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});