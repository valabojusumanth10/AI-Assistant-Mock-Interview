const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["HR", "Technical", "Aptitude", "Domain-Specific"],
      required: true,
    },

    domain: {
      type: String,
      default: "General",
      trim: true,
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },

    question: {
      type: String,
      required: true,
    },

    options: {
      type: [String],
      default: [],
    },

    correctAnswer: {
      type: String,
      default: "",
    },

    expectedAnswer: {
      type: String,
      default: "",
    },

    points: {
      type: Number,
      default: 100,
      min: 10,
      max: 500,
    },

    duration: {
      type: Number,
      default: 10,
    },

    challengeType: {
      type: String,
      enum: ["daily", "weekly", "practice"],
      default: "daily",
    },

    challengeDate: {
      type: Date,
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    generatedByAI: {
      type: Boolean,
      default: true,
    },

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

challengeSchema.index({
  category: 1,
  challengeDate: -1,
});

challengeSchema.index({
  domain: 1,
  challengeDate: -1,
});

module.exports =
  mongoose.models.Challenge ||
  mongoose.model("Challenge", challengeSchema);