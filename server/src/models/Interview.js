const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Progress Schema
|--------------------------------------------------------------------------
*/

const progressSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },

    answer: {
      type: String,
      required: true,
      trim: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },

    evaluation: {
      type: String,
      enum: ["strong", "average", "weak", "skipped"],
      default: "average",
    },

    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    feedback: {
      type: String,
      default: "",
      trim: true,
    },

    skipped: {
      type: Boolean,
      default: false,
    },

    repeated: {
      type: Boolean,
      default: false,
    },

    topic: {
      type: String,
      default: "General",
      trim: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

/*
|--------------------------------------------------------------------------
| Message Schema
|--------------------------------------------------------------------------
|
| IMPORTANT:
| We explicitly allow:
|   user
|   assistant
|   ai
|
| This fixes:
| messages.0.role: `assistant` is not a valid enum value
|
*/

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "ai"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

/*
|--------------------------------------------------------------------------
| Interview Schema
|--------------------------------------------------------------------------
*/

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    domain: {
      type: String,
      required: true,
      trim: true,
      default: "General",
    },

    company: {
      type: String,
      trim: true,
      default: null,
    },

    companyName: {
      type: String,
      trim: true,
      default: null,
    },

    companyExpectedScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70,
    },

    currentDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },

    startingDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },

    difficultyHistory: {
      type: [
        {
          type: String,
          enum: ["easy", "medium", "hard"],
        },
      ],
      default: ["easy"],
    },

    questions: {
      type: [String],
      default: [],
    },

    progress: {
      type: [progressSchema],
      default: [],
    },

    messages: {
      type: [messageSchema],
      default: [],
    },

    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    questionsAnswered: {
      type: Number,
      min: 0,
      default: 0,
    },

    questionsSkipped: {
      type: Number,
      min: 0,
      default: 0,
    },

    isComplete: {
      type: Boolean,
      default: false,
      index: true,
    },

    duration: {
      type: Number,
      min: 0,
      default: 0,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    summary: {
      type: String,
      default: "",
      trim: true,
    },

    strengths: {
      type: [String],
      default: [],
    },

    weaknesses: {
      type: [String],
      default: [],
    },

    recommendations: {
      type: [String],
      default: [],
    },

    totalQuestions: {
      type: Number,
      min: 1,
      default: 5,
    },

    highestDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

interviewSchema.index({
  userId: 1,
  createdAt: -1,
});

interviewSchema.index({
  userId: 1,
  isComplete: 1,
});

interviewSchema.index({
  domain: 1,
  createdAt: -1,
});

interviewSchema.index({
  company: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

interviewSchema.methods.getHighestDifficulty = function () {
  const levels = {
    easy: 1,
    medium: 2,
    hard: 3,
  };

  let highest = "easy";

  const history = Array.isArray(this.difficultyHistory)
    ? this.difficultyHistory
    : [];

  for (const difficulty of history) {
    if ((levels[difficulty] || 1) > levels[highest]) {
      highest = difficulty;
    }
  }

  if (
    (levels[this.currentDifficulty] || 1) >
    levels[highest]
  ) {
    highest = this.currentDifficulty;
  }

  return highest;
};

interviewSchema.methods.getAttemptedProgress = function () {
  return (this.progress || []).filter(
    (item) => !item.skipped && item.evaluation !== "skipped"
  );
};

interviewSchema.methods.getSkippedProgress = function () {
  return (this.progress || []).filter(
    (item) => item.skipped || item.evaluation === "skipped"
  );
};

interviewSchema.methods.calculateFinalScore = function () {
  const attempted = this.getAttemptedProgress();

  if (!attempted.length) {
    return 0;
  }

  const total = attempted.reduce(
    (sum, item) => sum + Number(item.score || 0),
    0
  );

  return Math.round(total / attempted.length);
};

interviewSchema.methods.completeInterview = function (
  finalScore,
  duration = 0
) {
  const calculatedScore = this.calculateFinalScore();

  this.score = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(Number(finalScore))
        ? Number(finalScore)
        : calculatedScore
    )
  );

  this.duration = Math.max(0, Number(duration) || 0);

  this.isComplete = true;

  this.completedAt = new Date();

  this.questionsAnswered =
    this.getAttemptedProgress().length;

  this.questionsSkipped =
    this.getSkippedProgress().length;

  this.highestDifficulty =
    this.getHighestDifficulty();

  return this;
};

/*
|--------------------------------------------------------------------------
| Pre Save
|--------------------------------------------------------------------------
*/

interviewSchema.pre("save", function (next) {
  if (!Array.isArray(this.difficultyHistory)) {
    this.difficultyHistory = [];
  }

  if (!this.difficultyHistory.length) {
    this.difficultyHistory.push(
      this.startingDifficulty || "easy"
    );
  }

  if (
    this.currentDifficulty &&
    this.difficultyHistory[
      this.difficultyHistory.length - 1
    ] !== this.currentDifficulty
  ) {
    this.difficultyHistory.push(
      this.currentDifficulty
    );
  }

  this.highestDifficulty =
    this.getHighestDifficulty();

  const attempted = this.getAttemptedProgress();
  const skipped = this.getSkippedProgress();

  this.questionsAnswered = attempted.length;
  this.questionsSkipped = skipped.length;

  if (this.isComplete && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

/*
|--------------------------------------------------------------------------
| Model
|--------------------------------------------------------------------------
|
| deleteModel prevents an old cached model definition from surviving
| during development/hot reload.
|
*/

if (mongoose.models.Interview) {
  delete mongoose.models.Interview;
}

const Interview = mongoose.model(
  "Interview",
  interviewSchema
);

module.exports = Interview;