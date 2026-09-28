const mongoose = require("mongoose");

const challengeAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: ["HR", "Technical", "Aptitude", "Domain-Specific"],
      required: true,
    },

    domain: {
      type: String,
      default: "General",
    },

    answer: {
      type: String,
      default: "",
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    pointsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },

    timeTaken: {
      type: Number,
      default: 0,
    },

    feedback: {
      type: String,
      default: "",
    },

    strengths: {
      type: [String],
      default: [],
    },

    improvements: {
      type: [String],
      default: [],
    },

    isCorrect: {
      type: Boolean,
      default: false,
    },

    completed: {
      type: Boolean,
      default: true,
    },

    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

challengeAttemptSchema.index({
  userId: 1,
  createdAt: -1,
});

challengeAttemptSchema.index({
  challengeId: 1,
  score: -1,
});

challengeAttemptSchema.index(
  {
    userId: 1,
    challengeId: 1,
  },
  {
    unique: true,
  }
);

module.exports =
  mongoose.models.ChallengeAttempt ||
  mongoose.model("ChallengeAttempt", challengeAttemptSchema);