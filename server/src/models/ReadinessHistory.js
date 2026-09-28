const mongoose = require("mongoose");

const readinessHistorySchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interview",
        required: true,
      },

      readinessScore: {
        type: Number,
        default: 0,
      },

      category: {
        type: String,
        default: "Needs Improvement",
      },

      candidateType: {
        type: String,
        enum: [
          "fresher",
          "internship-seeker",
          "experienced",
        ],
        default: "fresher",
      },

      interviewDomain: {
        type: String,
        default: "General",
      },

      breakdown: {
        resume: {
          type: Number,
          default: 0,
        },

        interview: {
          type: Number,
          default: 0,
        },

        skillAssessment: {
          type: Number,
          default: 0,
        },

        communication: {
          type: Number,
          default: 0,
        },
      },

      weakSkills: [
        {
          topic: {
            type: String,
          },

          score: {
            type: Number,
            default: 0,
          },
        },
      ],

      strongSkills: [
        {
          topic: {
            type: String,
          },

          score: {
            type: Number,
            default: 0,
          },
        },
      ],

      skillAnalysis: [
        {
          topic: {
            type: String,
          },

          score: {
            type: Number,
            default: 0,
          },
        },
      ],

      expectedIndustrySkills: [
        {
          type: String,
        },
      ],

      existingIndustrySkills: [
        {
          type: String,
        },
      ],

      missingIndustrySkills: [
        {
          type: String,
        },
      ],

      communicationStrengths: [
        {
          type: String,
        },
      ],

      communicationGaps: [
        {
          type: String,
        },
      ],

      interviewsUsed: {
        type: Number,
        default: 0,
      },

      recordedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    },
  );

readinessHistorySchema.index({
  userId: 1,
  recordedAt: 1,
});

readinessHistorySchema.index({
  userId: 1,
  interviewId: 1,
});

module.exports =
  mongoose.model(
    "ReadinessHistory",
    readinessHistorySchema,
  );