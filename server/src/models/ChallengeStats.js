const mongoose = require("mongoose");

const challengeStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    totalPoints: {
      type: Number,
      default: 0,
    },

    totalChallenges: {
      type: Number,
      default: 0,
    },

    completedChallenges: {
      type: Number,
      default: 0,
    },

    averageScore: {
      type: Number,
      default: 0,
    },

    bestScore: {
      type: Number,
      default: 0,
    },

    currentStreak: {
      type: Number,
      default: 0,
    },

    longestStreak: {
      type: Number,
      default: 0,
    },

    lastChallengeDate: {
      type: Date,
      default: null,
    },

    rank: {
      type: Number,
      default: 0,
    },

    rankHistory: [
      {
        rank: Number,
        points: Number,
        recordedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    badges: {
      type: [String],
      default: [],
    },

    categoryStats: {
      HR: {
        completed: {
          type: Number,
          default: 0,
        },
        averageScore: {
          type: Number,
          default: 0,
        },
      },

      Technical: {
        completed: {
          type: Number,
          default: 0,
        },
        averageScore: {
          type: Number,
          default: 0,
        },
      },

      Aptitude: {
        completed: {
          type: Number,
          default: 0,
        },
        averageScore: {
          type: Number,
          default: 0,
        },
      },

      "Domain-Specific": {
        completed: {
          type: Number,
          default: 0,
        },
        averageScore: {
          type: Number,
          default: 0,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.ChallengeStats ||
  mongoose.model("ChallengeStats", challengeStatsSchema);