const Groq = require("groq-sdk");

const Challenge = require("../models/Challenge.js");
const ChallengeAttempt = require("../models/ChallengeAttempt.js");
const ChallengeStats = require("../models/ChallengeStats.js");
const User = require("../models/User.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = "openai/gpt-oss-120b";

const CATEGORIES = [
  "HR",
  "Technical",
  "Aptitude",
  "Domain-Specific",
];

// ======================================================
// BASIC HELPERS
// ======================================================

const clamp = (value, min = 0, max = 100) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.max(min, Math.min(max, number));
};

const normalizeCategory = (category) => {
  if (!category) {
    return "Technical";
  }

  const value = String(category).trim().toLowerCase();

  if (value === "hr") {
    return "HR";
  }

  if (value === "technical") {
    return "Technical";
  }

  if (value === "aptitude") {
    return "Aptitude";
  }

  if (
    value === "domain" ||
    value === "domain-specific" ||
    value === "domainspecific"
  ) {
    return "Domain-Specific";
  }

  return "Technical";
};

const normalizeDomain = (domain) => {
  const value = String(domain || "General").trim();

  return value || "General";
};

// ======================================================
// AI TEXT CLEANUP
// ======================================================

const cleanAIText = (text = "") => {
  let cleaned = String(text);

  // Remove markdown code fences
  cleaned = cleaned.replace(/```[\w-]*/gi, "");
  cleaned = cleaned.replace(/```/g, "");

  // Remove bold / italic markdown
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/gs, "$1");
  cleaned = cleaned.replace(/__(.*?)__/gs, "$1");
  cleaned = cleaned.replace(/\*(.*?)\*/gs, "$1");
  cleaned = cleaned.replace(/_(.*?)_/gs, "$1");

  // Remove inline code markers
  cleaned = cleaned.replace(/`/g, "");

  // Remove markdown headings
  cleaned = cleaned.replace(/^#{1,6}\s*/gm, "");

  // Convert markdown bullet points into normal text bullets
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "• ");

  // Remove excessive blank lines
  cleaned = cleaned.replace(/\r\n/g, "\n");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
};

const cleanAIArray = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => cleanAIText(item))
    .filter(Boolean);
};

const cleanGeneratedChallenge = (challenge) => {
  if (!challenge || typeof challenge !== "object") {
    return null;
  }

  return {
    title: cleanAIText(challenge.title || ""),
    description: cleanAIText(challenge.description || ""),
    question: cleanAIText(challenge.question || ""),
    options: cleanAIArray(challenge.options),
    correctAnswer: cleanAIText(
      challenge.correctAnswer || "",
    ),
    expectedAnswer: cleanAIText(
      challenge.expectedAnswer || "",
    ),
    tags: cleanAIArray(challenge.tags),
  };
};

// ======================================================
// DATE HELPERS
// ======================================================

const getTodayStart = () => {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date;
};

const getTomorrowStart = () => {
  const date = getTodayStart();

  date.setDate(date.getDate() + 1);

  return date;
};

const getWeekStart = () => {
  const date = getTodayStart();

  const day = date.getDay();

  const difference = day === 0 ? 6 : day - 1;

  date.setDate(date.getDate() - difference);

  return date;
};

// ======================================================
// JSON CLEANER
// ======================================================

const cleanAIJson = (text) => {
  if (!text) {
    return null;
  }

  let cleaned = String(text).trim();

  cleaned = cleaned
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(
      firstBrace,
      lastBrace + 1,
    );
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

// ======================================================
// USER DOMAIN
// ======================================================

const getUserDomain = (user) => {
  if (
    user?.skills &&
    Array.isArray(user.skills) &&
    user.skills.length > 0
  ) {
    return String(user.skills[0]);
  }

  return "General";
};

// ======================================================
// AI CHALLENGE GENERATOR
// ======================================================

const generateAIChallenge = async ({
  category,
  domain,
  difficulty,
  challengeType,
}) => {
  const prompt = `
You are conducting a realistic interview practice session.

Create one interview challenge for a candidate.

The challenge should feel like something a real interviewer would actually say, not like a textbook exercise or a formal AI-generated assignment.

Category: ${category}
Domain: ${domain}
Difficulty: ${difficulty}
Challenge type: ${challengeType}

Writing style:

Use natural conversational language.

Keep the wording clear and direct.

Do not over-explain the problem.

Do not make every challenge follow the same structure.

Avoid phrases that sound like an assignment such as:
"Additional requirements"
"The system should"
"Explain the algorithm you used"
"Edge cases such as"
"The candidate must"
"Your task is to"

Do not use Markdown formatting in any generated text.

Do not use:
**bold**
*italics*
backticks
Markdown headings
Markdown tables

Do not put Markdown symbols inside the title, description, question, expectedAnswer, or tags.

The candidate should feel like an interviewer has just given them the problem.

For HR challenges:
Ask realistic behavioral, situational, teamwork, conflict, leadership, communication, or workplace questions.

For Technical challenges:
Focus on programming, debugging, data structures, algorithms, JavaScript, backend, frontend, databases, APIs, architecture, or technical reasoning depending on the domain.

For Aptitude challenges:
Create one logical, quantitative, verbal, or reasoning problem. Include multiple-choice options and one correct answer.

For Domain-Specific challenges:
Make the question strongly connected to the supplied domain and preferably give it a practical real-world context.

Difficulty:

Easy should test fundamentals.

Medium should require some reasoning and practical understanding.

Hard should require deeper reasoning, trade-offs, debugging, design decisions, or practical experience.

Avoid generic questions like:
"What is JavaScript?"
"What is React?"
"What is an API?"

Instead, give the candidate something they can actually think through.

Return ONLY valid JSON.

Use exactly this structure:

{
  "title": "short natural title",
  "description": "one short sentence explaining the situation",
  "question": "natural interview question",
  "options": [],
  "correctAnswer": "",
  "expectedAnswer": "what a strong candidate should cover",
  "tags": ["tag1", "tag2"]
}

For Aptitude:
options must contain the possible answers.
correctAnswer must contain the correct option.

For HR, Technical, and Domain-Specific:
options should normally be empty.
correctAnswer should normally be empty.
expectedAnswer should describe the key points a strong candidate should cover.

Keep the challenge realistic and concise.
`;

  try {
    const completion =
      await groq.chat.completions.create({
        model: GROQ_MODEL,
        temperature: 0.85,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content:
              "You create realistic interview challenges. Write like a human interviewer. Return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const content =
      completion?.choices?.[0]?.message?.content || "";

    const parsed = cleanAIJson(content);

    const cleaned = cleanGeneratedChallenge(parsed);

    if (
      cleaned &&
      cleaned.title &&
      cleaned.question
    ) {
      return cleaned;
    }
  } catch (error) {
    console.error(
      "AI challenge generation error:",
      error.message,
    );
  }

  return getFallbackChallenge(
    category,
    domain,
    difficulty,
  );
};

// ======================================================
// FALLBACK CHALLENGES
// ======================================================

const getFallbackChallenge = (
  category,
  domain,
  difficulty,
) => {
  if (category === "HR") {
    return {
      title: "A Team Disagreement",
      description:
        "A situation that tests how you handle disagreement at work.",
      question:
        "Imagine you and a teammate strongly disagree about how a feature should be built. The deadline is close and both of you believe your approach is better. How would you handle the situation?",
      options: [],
      correctAnswer: "",
      expectedAnswer:
        "A strong answer should show that you would understand the other person's reasoning, compare the approaches objectively, communicate respectfully, and make a decision based on the project's needs rather than personal preference.",
      tags: [
        "communication",
        "teamwork",
        "behavioral",
      ],
    };
  }

  if (category === "Aptitude") {
    return {
      title: "Price Change",
      description:
        "A quick percentage problem similar to placement aptitude rounds.",
      question:
        "A product is first increased in price by 20% and then discounted by 20%. What happens to the final price compared with the original price?",
      options: [
        "It remains the same",
        "It decreases by 4%",
        "It increases by 4%",
        "It decreases by 8%",
      ],
      correctAnswer: "It decreases by 4%",
      expectedAnswer:
        "If the original price is 100, it becomes 120 after the increase and 96 after the discount. The final price is therefore 4% lower than the original.",
      tags: [
        "percentage",
        "aptitude",
        "quantitative-reasoning",
      ],
    };
  }

  if (category === "Domain-Specific") {
    return {
      title: `${domain} in a Real Project`,
      description:
        `A practical question based on working with ${domain}.`,
      question:
        `You're building a real application using ${domain} and something starts failing in production. What would you check first, and how would you work your way toward finding the actual cause?`,
      options: [],
      correctAnswer: "",
      expectedAnswer:
        `A strong answer should show a structured debugging process, explain what information you would collect, discuss possible causes, and describe how you would verify the fix in a real ${domain} environment.`,
      tags: [domain, "debugging", "practical"],
    };
  }

  return {
    title: `${domain} Under Pressure`,
    description:
      `A practical technical question based on ${domain}.`,
    question:
      `Imagine you're working on a ${domain} project and a part of the application suddenly becomes slow. How would you investigate the problem before deciding how to fix it?`,
    options: [],
    correctAnswer: "",
    expectedAnswer:
      "A strong answer should explain how you would reproduce the problem, collect evidence, identify the bottleneck, consider possible causes, make a targeted change, and verify that the performance actually improved.",
    tags: [
      domain,
      "problem-solving",
      "technical",
    ],
  };
};

// ======================================================
// DIFFICULTY
// ======================================================

const getDifficultyForCategory = (
  category,
  stats,
) => {
  const completed =
    stats?.completedChallenges || 0;

  const average =
    stats?.averageScore || 0;

  if (completed < 3) {
    return "Easy";
  }

  if (average >= 80) {
    return "Hard";
  }

  if (average >= 60) {
    return "Medium";
  }

  return "Easy";
};

// ======================================================
// STREAK
// ======================================================

const calculateStreak = async (
  stats,
  completedAt,
) => {
  const current = new Date(completedAt);

  current.setHours(0, 0, 0, 0);

  if (!stats.lastChallengeDate) {
    return 1;
  }

  const previous = new Date(
    stats.lastChallengeDate,
  );

  previous.setHours(0, 0, 0, 0);

  const difference = Math.round(
    (current.getTime() -
      previous.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (difference === 0) {
    return stats.currentStreak || 1;
  }

  if (difference === 1) {
    return (stats.currentStreak || 0) + 1;
  }

  return 1;
};

// ======================================================
// POINTS
// ======================================================

const calculatePoints = (
  score,
  basePoints,
) => {
  const multiplier =
    clamp(score, 0, 100) / 100;

  return Math.round(
    Math.max(
      10,
      basePoints * multiplier,
    ),
  );
};

// ======================================================
// BADGES
// ======================================================

const getBadges = (stats) => {
  const badges = new Set(
    stats.badges || [],
  );

  if (stats.completedChallenges >= 1) {
    badges.add("First Challenge");
  }

  if (stats.completedChallenges >= 5) {
    badges.add("5 Challenges");
  }

  if (stats.completedChallenges >= 10) {
    badges.add("10 Challenges");
  }

  if (stats.completedChallenges >= 25) {
    badges.add("25 Challenges");
  }

  if (stats.totalPoints >= 500) {
    badges.add("500 Points");
  }

  if (stats.totalPoints >= 1000) {
    badges.add("1000 Points");
  }

  if (stats.bestScore >= 90) {
    badges.add("90+ Performer");
  }

  if (stats.currentStreak >= 3) {
    badges.add("3 Day Streak");
  }

  if (stats.currentStreak >= 7) {
    badges.add("7 Day Streak");
  }

  if (stats.currentStreak >= 30) {
    badges.add("30 Day Streak");
  }

  return [...badges];
};

// ======================================================
// RANK
// ======================================================

const getRankName = (points) => {
  if (points >= 5000) {
    return "Interview Master";
  }

  if (points >= 2500) {
    return "Placement Pro";
  }

  if (points >= 1000) {
    return "Interview Warrior";
  }

  if (points >= 500) {
    return "Rising Candidate";
  }

  return "Beginner";
};

// ======================================================
// LEADERBOARD RANKS
// ======================================================

const updateLeaderboardRanks = async () => {
  const stats =
    await ChallengeStats.find({})
      .sort({
        totalPoints: -1,
        averageScore: -1,
        completedChallenges: -1,
      });

  const bulkOperations = [];

  stats.forEach((item, index) => {
    const rank = index + 1;

    const lastHistory =
      Array.isArray(item.rankHistory) &&
      item.rankHistory.length > 0
        ? item.rankHistory[
            item.rankHistory.length - 1
          ]
        : null;

    const rankChanged =
      !lastHistory ||
      Number(lastHistory.rank) !== rank ||
      Number(lastHistory.points) !==
        Number(item.totalPoints || 0);

    const update = {
      $set: {
        rank,
      },
    };

    if (rankChanged) {
      update.$push = {
        rankHistory: {
          $each: [
            {
              rank,
              points:
                item.totalPoints || 0,
              recordedAt: new Date(),
            },
          ],
          $slice: -30,
        },
      };
    }

    bulkOperations.push({
      updateOne: {
        filter: {
          _id: item._id,
        },
        update,
      },
    });
  });

  if (bulkOperations.length > 0) {
    await ChallengeStats.bulkWrite(
      bulkOperations,
    );
  }

  return stats;
};

// ======================================================
// GET DAILY CHALLENGE
// ======================================================

const getDailyChallenge = async (
  req,
  res,
) => {
  try {
    const category =
      normalizeCategory(
        req.query.category,
      );

    const domain =
      normalizeDomain(
        req.query.domain,
      );

    const today = getTodayStart();

    let challenge =
      await Challenge.findOne({
        challengeType: "daily",
        category,
        domain,
        challengeDate: today,
        isActive: true,
      }).lean();

    if (!challenge) {
      const difficulty = "Medium";

      const generated =
        await generateAIChallenge({
          category,
          domain,
          difficulty,
          challengeType: "daily",
        });

      const created =
        await Challenge.create({
          title: generated.title,

          description:
            generated.description ||
            "Daily interview challenge",

          category,

          domain,

          difficulty,

          question:
            generated.question,

          options:
            generated.options || [],

          correctAnswer:
            generated.correctAnswer ||
            "",

          expectedAnswer:
            generated.expectedAnswer ||
            "",

          points: 100,

          duration: 10,

          challengeType: "daily",

          challengeDate: today,

          expiresAt:
            getTomorrowStart(),

          generatedByAI: true,

          tags:
            generated.tags || [],
        });

      challenge =
        created.toObject();
    }

    const existingAttempt =
      await ChallengeAttempt.findOne({
        userId: req.userId,
        challengeId:
          challenge._id,
      }).lean();

    const safeChallenge = {
      ...challenge,
    };

    delete safeChallenge.correctAnswer;
    delete safeChallenge.expectedAnswer;

    return res.json({
      challenge: safeChallenge,
      completed:
        !!existingAttempt,
      attempt:
        existingAttempt || null,
    });
  } catch (error) {
    console.error(
      "Daily challenge error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to load daily challenge",
      error: error.message,
    });
  }
};

// ======================================================
// GET WEEKLY CHALLENGE
// ======================================================

const getWeeklyChallenge = async (
  req,
  res,
) => {
  try {
    const category =
      normalizeCategory(
        req.query.category,
      );

    const domain =
      normalizeDomain(
        req.query.domain,
      );

    const weekStart =
      getWeekStart();

    let challenge =
      await Challenge.findOne({
        challengeType: "weekly",
        category,
        domain,
        challengeDate: weekStart,
        isActive: true,
      }).lean();

    if (!challenge) {
      const generated =
        await generateAIChallenge({
          category,
          domain,
          difficulty: "Hard",
          challengeType: "weekly",
        });

      const expiresAt =
        new Date(weekStart);

      expiresAt.setDate(
        expiresAt.getDate() + 7,
      );

      const created =
        await Challenge.create({
          title: generated.title,

          description:
            generated.description ||
            "Weekly interview challenge",

          category,

          domain,

          difficulty: "Hard",

          question:
            generated.question,

          options:
            generated.options || [],

          correctAnswer:
            generated.correctAnswer ||
            "",

          expectedAnswer:
            generated.expectedAnswer ||
            "",

          points: 250,

          duration: 20,

          challengeType: "weekly",

          challengeDate:
            weekStart,

          expiresAt,

          generatedByAI: true,

          tags:
            generated.tags || [],
        });

      challenge =
        created.toObject();
    }

    const existingAttempt =
      await ChallengeAttempt.findOne({
        userId: req.userId,
        challengeId:
          challenge._id,
      }).lean();

    const safeChallenge = {
      ...challenge,
    };

    delete safeChallenge.correctAnswer;
    delete safeChallenge.expectedAnswer;

    return res.json({
      challenge: safeChallenge,

      completed:
        !!existingAttempt,

      attempt:
        existingAttempt || null,
    });
  } catch (error) {
    console.error(
      "Weekly challenge error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to load weekly challenge",
      error: error.message,
    });
  }
};

// ======================================================
// SUBMIT CHALLENGE
// ======================================================

const submitChallenge = async (
  req,
  res,
) => {
  try {
    const {
      challengeId,
      answer,
      timeTaken = 0,
    } = req.body;

    if (!challengeId) {
      return res.status(400).json({
        message:
          "challengeId is required",
      });
    }

    const challenge =
      await Challenge.findById(
        challengeId,
      );

    if (!challenge) {
      return res.status(404).json({
        message:
          "Challenge not found",
      });
    }

    if (
      challenge.expiresAt &&
      new Date() >
        new Date(
          challenge.expiresAt,
        )
    ) {
      return res.status(400).json({
        message:
          "This challenge has expired.",
      });
    }

    const existingAttempt =
      await ChallengeAttempt.findOne({
        userId: req.userId,
        challengeId,
      });

    if (existingAttempt) {
      return res.status(400).json({
        message:
          "You have already completed this challenge.",
        attempt:
          existingAttempt,
      });
    }

    const user =
      await User.findById(
        req.userId,
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found",
      });
    }

    const submittedAnswer =
      String(answer || "").trim();

    if (!submittedAnswer) {
      return res.status(400).json({
        message:
          "Please provide an answer.",
      });
    }

    let score = 0;
    let feedback = "";
    let strengths = [];
    let improvements = [];
    let isCorrect = false;

    // ====================================================
    // APTITUDE EVALUATION
    // ====================================================

    if (
      challenge.category ===
        "Aptitude" &&
      challenge.correctAnswer
    ) {
      isCorrect =
        submittedAnswer
          .toLowerCase()
          .trim() ===
        challenge.correctAnswer
          .toLowerCase()
          .trim();

      score = isCorrect
        ? 100
        : 0;

      feedback = isCorrect
        ? "Correct. Your answer is right."
        : `The correct answer is ${challenge.correctAnswer}.`;

      strengths = isCorrect
        ? [
            "You reached the correct answer.",
          ]
        : [];

      improvements = isCorrect
        ? []
        : [
            "Review the reasoning behind this type of aptitude problem.",
          ];
    }

    // ====================================================
    // AI EVALUATION
    // ====================================================

    else {
      const evaluationPrompt = `
You are evaluating a candidate during a realistic interview.

Be fair. Judge the answer that was actually given.

Category: ${challenge.category}
Domain: ${challenge.domain}
Difficulty: ${challenge.difficulty}

Question:
${challenge.question}

What a strong answer should cover:
${challenge.expectedAnswer}

Candidate answer:
${submittedAnswer}

Give useful feedback that a real interviewer might give.

Do not be unnecessarily harsh.

Do not give a high score just because the answer sounds confident.

Look at correctness, reasoning, relevance, clarity, practical understanding, and completeness.

Return ONLY valid JSON.

{
  "score": 0,
  "feedback": "short natural feedback",
  "strengths": ["strength"],
  "improvements": ["improvement"],
  "isCorrect": false
}

Scoring:

90-100 = excellent
80-89 = strong
70-79 = good
60-69 = average
40-59 = weak
0-39 = poor
`;

      try {
        const completion =
          await groq.chat.completions.create(
            {
              model:
                GROQ_MODEL,

              temperature: 0.2,

              max_tokens: 900,

              messages: [
                {
                  role: "system",
                  content:
                    "You are a fair interview evaluator. Return valid JSON only.",
                },
                {
                  role: "user",
                  content:
                    evaluationPrompt,
                },
              ],
            },
          );

        const content =
          completion
            ?.choices?.[0]
            ?.message?.content || "";

        const evaluation =
          cleanAIJson(content);

        if (evaluation) {
          score = clamp(
            evaluation.score,
          );

          feedback =
            cleanAIText(
              evaluation.feedback ||
                "Your answer was evaluated.",
            );

          strengths =
            cleanAIArray(
              evaluation.strengths,
            );

          improvements =
            cleanAIArray(
              evaluation.improvements,
            );

          isCorrect =
            Boolean(
              evaluation.isCorrect,
            );
        }
      } catch (error) {
        console.error(
          "Challenge evaluation error:",
          error.message,
        );

        score = 50;

        feedback =
          "Your answer was recorded, but AI evaluation was temporarily unavailable.";

        improvements = [
          "Try to give a clearer and more structured answer.",
        ];
      }
    }

    // ====================================================
    // POINTS
    // ====================================================

    const pointsEarned =
      calculatePoints(
        score,
        challenge.points,
      );

    const completedAt =
      new Date();

    // ====================================================
    // SAVE ATTEMPT
    // ====================================================

    const attempt =
      await ChallengeAttempt.create(
        {
          userId: req.userId,

          challengeId:
            challenge._id,

          category:
            challenge.category,

          domain:
            challenge.domain,

          answer:
            submittedAnswer,

          score,

          pointsEarned,

          timeTaken:
            Number(timeTaken) || 0,

          feedback,

          strengths,

          improvements,

          isCorrect,

          completed: true,

          completedAt,
        },
      );

    // ====================================================
    // GET / CREATE STATS
    // ====================================================

    let stats =
      await ChallengeStats.findOne({
        userId: req.userId,
      });

    if (!stats) {
      stats =
        await ChallengeStats.create(
          {
            userId:
              req.userId,
          },
        );
    }

    const oldCompleted =
      stats.completedChallenges ||
      0;

    const oldAverage =
      stats.averageScore || 0;

    const newCompleted =
      oldCompleted + 1;

    const newAverage =
      (
        oldAverage *
          oldCompleted +
        score
      ) /
      newCompleted;

    stats.totalChallenges =
      (stats.totalChallenges || 0) +
      1;

    stats.completedChallenges =
      newCompleted;

    stats.totalPoints =
      (stats.totalPoints || 0) +
      pointsEarned;

    stats.averageScore =
      Math.round(
        newAverage,
      );

    stats.bestScore =
      Math.max(
        stats.bestScore || 0,
        score,
      );

    stats.currentStreak =
      await calculateStreak(
        stats,
        completedAt,
      );

    stats.longestStreak =
      Math.max(
        stats.longestStreak || 0,
        stats.currentStreak,
      );

    stats.lastChallengeDate =
      completedAt;

    // ====================================================
    // CATEGORY STATS
    // ====================================================

    if (!stats.categoryStats) {
      stats.categoryStats = {};
    }

    const categoryStats =
      stats.categoryStats[
        challenge.category
      ];

    if (categoryStats) {
      const previousCount =
        categoryStats.completed ||
        0;

      const previousAverage =
        categoryStats.averageScore ||
        0;

      categoryStats.completed =
        previousCount + 1;

      categoryStats.averageScore =
        Math.round(
          (
            previousAverage *
              previousCount +
            score
          ) /
            categoryStats.completed,
        );
    } else {
      stats.categoryStats[
        challenge.category
      ] = {
        completed: 1,
        averageScore: score,
      };
    }

    // ====================================================
    // BADGES
    // ====================================================

    stats.badges =
      getBadges(stats);

    await stats.save();

    // ====================================================
    // UPDATE LEADERBOARD
    // ====================================================

    await updateLeaderboardRanks();

    stats =
      await ChallengeStats.findOne({
        userId: req.userId,
      }).lean();

    return res.json({
      message:
        "Challenge completed successfully.",

      result: {
        score,

        pointsEarned,

        feedback,

        strengths,

        improvements,

        isCorrect,
      },

      stats: {
        totalPoints:
          stats.totalPoints,

        completedChallenges:
          stats.completedChallenges,

        averageScore:
          stats.averageScore,

        bestScore:
          stats.bestScore,

        currentStreak:
          stats.currentStreak,

        longestStreak:
          stats.longestStreak,

        rank:
          stats.rank,

        rankName:
          getRankName(
            stats.totalPoints,
          ),

        badges:
          stats.badges,
      },
    });
  } catch (error) {
    console.error(
      "Submit challenge error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to submit challenge",

      error:
        error.message,
    });
  }
};

// ======================================================
// LEADERBOARD
// ======================================================

const getLeaderboard = async (
  req,
  res,
) => {
  try {
    const limit = Math.min(
      Number(req.query.limit) || 20,
      100,
    );

    await updateLeaderboardRanks();

    const leaderboard =
      await ChallengeStats.find({})
        .sort({
          totalPoints: -1,
          averageScore: -1,
          completedChallenges: -1,
        })
        .limit(limit)
        .populate(
          "userId",
          "name email candidateType",
        )
        .lean();

    const currentUser =
      await ChallengeStats.findOne({
        userId: req.userId,
      }).lean();

    const formatted =
      leaderboard.map(
        (item, index) => ({
          rank:
            index + 1,

          userId:
            item.userId?._id,

          name:
            item.userId?.name ||
            "Candidate",

          candidateType:
            item.userId
              ?.candidateType ||
            "fresher",

          totalPoints:
            item.totalPoints || 0,

          completedChallenges:
            item.completedChallenges ||
            0,

          averageScore:
            item.averageScore || 0,

          bestScore:
            item.bestScore || 0,

          currentStreak:
            item.currentStreak || 0,

          badges:
            item.badges || [],

          rankName:
            getRankName(
              item.totalPoints || 0,
            ),
        }),
      );

    return res.json({
      leaderboard:
        formatted,

      currentUser:
        currentUser
          ? {
              rank:
                currentUser.rank,

              totalPoints:
                currentUser.totalPoints,

              completedChallenges:
                currentUser.completedChallenges,

              averageScore:
                currentUser.averageScore,

              currentStreak:
                currentUser.currentStreak,

              badges:
                currentUser.badges || [],

              rankName:
                getRankName(
                  currentUser.totalPoints ||
                    0,
                ),
            }
          : null,
    });
  } catch (error) {
    console.error(
      "Leaderboard error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to load leaderboard",

      error:
        error.message,
    });
  }
};

// ======================================================
// MY STATS
// ======================================================

const getMyStats = async (
  req,
  res,
) => {
  try {
    let stats =
      await ChallengeStats.findOne({
        userId: req.userId,
      }).lean();

    if (!stats) {
      stats = {
        totalPoints: 0,
        totalChallenges: 0,
        completedChallenges: 0,
        averageScore: 0,
        bestScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        rank: 0,
        badges: [],
        rankHistory: [],
        categoryStats: {},
      };
    }

    const recentAttempts =
      await ChallengeAttempt.find({
        userId: req.userId,
      })
        .sort({
          completedAt: -1,
        })
        .limit(10)
        .populate(
          "challengeId",
          "title category domain difficulty challengeType",
        )
        .lean();

    return res.json({
      stats: {
        ...stats,

        rankName:
          getRankName(
            stats.totalPoints || 0,
          ),
      },

      recentAttempts,
    });
  } catch (error) {
    console.error(
      "My stats error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to load challenge statistics",

      error:
        error.message,
    });
  }
};

// ======================================================
// RANK HISTORY
// ======================================================

const getRankHistory = async (
  req,
  res,
) => {
  try {
    const stats =
      await ChallengeStats.findOne({
        userId: req.userId,
      }).lean();

    return res.json({
      history:
        stats?.rankHistory || [],
    });
  } catch (error) {
    console.error(
      "Rank history error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to load rank history",

      error:
        error.message,
    });
  }
};

// ======================================================
// CHALLENGE HISTORY
// ======================================================

const getChallengeHistory = async (
  req,
  res,
) => {
  try {
    const attempts =
      await ChallengeAttempt.find({
        userId: req.userId,
      })
        .sort({
          completedAt: -1,
        })
        .populate(
          "challengeId",
          "title category domain difficulty challengeType",
        )
        .lean();

    return res.json({
      attempts,

      count:
        attempts.length,
    });
  } catch (error) {
    console.error(
      "Challenge history error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to load challenge history",

      error:
        error.message,
    });
  }
};

// ======================================================
// GENERATE PRACTICE CHALLENGE
// ======================================================

const generatePracticeChallenge =
  async (req, res) => {
    try {
      const category =
        normalizeCategory(
          req.body.category,
        );

      const domain =
        normalizeDomain(
          req.body.domain,
        );

      const user =
        await User.findById(
          req.userId,
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      const existingStats =
        await ChallengeStats.findOne({
          userId: req.userId,
        });

      const difficulty =
        getDifficultyForCategory(
          category,
          existingStats,
        );

      const generated =
        await generateAIChallenge({
          category,
          domain,
          difficulty,
          challengeType:
            "practice",
        });

      const challenge =
        await Challenge.create({
          title:
            generated.title,

          description:
            generated.description ||
            "Practice challenge",

          category,

          domain,

          difficulty,

          question:
            generated.question,

          options:
            generated.options || [],

          correctAnswer:
            generated.correctAnswer ||
            "",

          expectedAnswer:
            generated.expectedAnswer ||
            "",

          points: 100,

          duration: 10,

          challengeType:
            "practice",

          challengeDate:
            new Date(),

          expiresAt: null,

          generatedByAI: true,

          tags:
            generated.tags || [],
        });

      const safeChallenge =
        challenge.toObject();

      delete safeChallenge.correctAnswer;
      delete safeChallenge.expectedAnswer;

      return res.json({
        challenge:
          safeChallenge,
      });
    } catch (error) {
      console.error(
        "Practice challenge generation error:",
        error,
      );

      return res.status(500).json({
        message:
          "Failed to generate challenge",

        error:
          error.message,
      });
    }
  };

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getDailyChallenge,
  getWeeklyChallenge,
  generatePracticeChallenge,
  submitChallenge,
  getLeaderboard,
  getMyStats,
  getRankHistory,
  getChallengeHistory,
};