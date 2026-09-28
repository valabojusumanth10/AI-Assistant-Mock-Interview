const Groq = require("groq-sdk");
const User = require("../models/User.js");
const Interview = require("../models/Interview.js");
const ReadinessHistory = require("../models/ReadinessHistory.js");

// ============================================================
// GROQ
// ============================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = "openai/gpt-oss-120b";

const MAX_COMMUNICATION_ANSWERS = 8;
const MAX_ANSWER_CHARS = 450;

// ============================================================
// READINESS CONFIGURATION
// ============================================================

const READINESS_CONFIG = {
  weights: {
    resume: 0.25,
    interview: 0.30,
    skillAssessment: 0.25,
    communication: 0.20,
  },

  categories: {
    placementReady: 80,
    needsImprovement: 60,
  },
};

// ============================================================
// INDUSTRY SKILLS
// ============================================================

const INDUSTRY_SKILLS = {
  "JavaScript/Node.js": {
    fresher: [
      "JavaScript",
      "Node.js",
      "Express.js",
      "REST APIs",
      "MongoDB",
      "Git",
      "Async JavaScript",
      "Authentication",
      "Testing",
    ],

    "internship-seeker": [
      "JavaScript",
      "Node.js",
      "Express.js",
      "REST APIs",
      "MongoDB",
      "Git",
      "Async JavaScript",
      "Authentication",
      "Testing",
      "TypeScript",
      "Docker",
    ],

    experienced: [
      "JavaScript",
      "Node.js",
      "Express.js",
      "REST APIs",
      "MongoDB",
      "Git",
      "Async JavaScript",
      "Authentication",
      "Testing",
      "TypeScript",
      "Docker",
      "Redis",
      "CI/CD",
      "System Design",
      "Application Security",
    ],
  },

  React: {
    fresher: [
      "JavaScript",
      "React",
      "HTML",
      "CSS",
      "Git",
      "REST APIs",
      "State Management",
      "React Hooks",
      "Testing",
    ],

    "internship-seeker": [
      "JavaScript",
      "React",
      "HTML",
      "CSS",
      "Git",
      "REST APIs",
      "State Management",
      "React Hooks",
      "Testing",
      "TypeScript",
      "Next.js",
    ],

    experienced: [
      "JavaScript",
      "React",
      "HTML",
      "CSS",
      "Git",
      "REST APIs",
      "State Management",
      "React Hooks",
      "Testing",
      "TypeScript",
      "Next.js",
      "Performance Optimization",
      "Frontend Architecture",
      "CI/CD",
      "Web Security",
    ],
  },

  Python: {
    fresher: [
      "Python",
      "OOP",
      "Data Structures",
      "Algorithms",
      "Git",
      "REST APIs",
      "SQL",
      "Testing",
    ],

    "internship-seeker": [
      "Python",
      "OOP",
      "Data Structures",
      "Algorithms",
      "Git",
      "REST APIs",
      "SQL",
      "Testing",
      "FastAPI",
      "Docker",
    ],

    experienced: [
      "Python",
      "OOP",
      "Data Structures",
      "Algorithms",
      "Git",
      "REST APIs",
      "SQL",
      "Testing",
      "FastAPI",
      "Docker",
      "CI/CD",
      "System Design",
      "Caching",
      "Application Security",
    ],
  },

  "Data Science": {
    fresher: [
      "Python",
      "Statistics",
      "Pandas",
      "NumPy",
      "Machine Learning",
      "SQL",
      "Data Visualization",
    ],

    "internship-seeker": [
      "Python",
      "Statistics",
      "Pandas",
      "NumPy",
      "Machine Learning",
      "SQL",
      "Data Visualization",
      "Scikit-learn",
      "Feature Engineering",
      "Git",
    ],

    experienced: [
      "Python",
      "Statistics",
      "Pandas",
      "NumPy",
      "Machine Learning",
      "SQL",
      "Data Visualization",
      "Scikit-learn",
      "Feature Engineering",
      "Deep Learning",
      "MLOps",
      "Docker",
      "Model Deployment",
      "Cloud",
    ],
  },

  DevOps: {
    fresher: [
      "Linux",
      "Git",
      "Docker",
      "CI/CD",
      "Networking",
      "Cloud Fundamentals",
    ],

    "internship-seeker": [
      "Linux",
      "Git",
      "Docker",
      "CI/CD",
      "Networking",
      "Cloud Fundamentals",
      "AWS",
      "Kubernetes",
    ],

    experienced: [
      "Linux",
      "Git",
      "Docker",
      "CI/CD",
      "Networking",
      "AWS",
      "Kubernetes",
      "Terraform",
      "Monitoring",
      "Cloud Architecture",
      "Security",
    ],
  },

  "Database Design": {
    fresher: [
      "SQL",
      "PostgreSQL",
      "MongoDB",
      "Database Design",
      "Indexes",
      "CRUD",
    ],

    "internship-seeker": [
      "SQL",
      "PostgreSQL",
      "MongoDB",
      "Database Design",
      "Indexes",
      "CRUD",
      "Transactions",
      "Database Security",
    ],

    experienced: [
      "SQL",
      "PostgreSQL",
      "MongoDB",
      "Database Design",
      "Indexes",
      "CRUD",
      "Transactions",
      "Database Security",
      "Query Optimization",
      "Replication",
      "Sharding",
      "Caching",
    ],
  },

  "System Design": {
    fresher: [
      "Data Structures",
      "Algorithms",
      "APIs",
      "Database Design",
      "Networking",
      "Caching",
    ],

    "internship-seeker": [
      "Data Structures",
      "Algorithms",
      "APIs",
      "Database Design",
      "Networking",
      "Caching",
      "Load Balancing",
      "Scalability",
    ],

    experienced: [
      "Data Structures",
      "Algorithms",
      "APIs",
      "Database Design",
      "Networking",
      "Caching",
      "Load Balancing",
      "Scalability",
      "Microservices",
      "Message Queues",
      "Distributed Systems",
      "Observability",
      "Security",
    ],
  },

  General: {
    fresher: [
      "Data Structures",
      "Algorithms",
      "OOP",
      "SQL",
      "Git",
      "REST APIs",
      "Problem Solving",
    ],

    "internship-seeker": [
      "Data Structures",
      "Algorithms",
      "OOP",
      "SQL",
      "Git",
      "REST APIs",
      "Problem Solving",
      "Testing",
      "Docker",
    ],

    experienced: [
      "Data Structures",
      "Algorithms",
      "OOP",
      "SQL",
      "Git",
      "REST APIs",
      "Problem Solving",
      "Testing",
      "Docker",
      "System Design",
      "CI/CD",
      "Cloud",
    ],
  },
};

// ============================================================
// HELPERS
// ============================================================

const clamp = (value, min, max) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(Math.max(number, min), max);
};

const safeString = (value, fallback = "") => {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
};

const normalizeSkill = (skill) => {
  return String(skill || "")
    .toLowerCase()
    .replace(/[.\-_\/]/g, "")
    .replace(/\s+/g, "")
    .trim();
};

const parseAIJson = (raw) => {
  if (!raw) {
    return null;
  }

  const text = String(raw)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch (error) {
    try {
      const match = text.match(/\{[\s\S]*\}/);

      if (!match) {
        return null;
      }

      return JSON.parse(match[0]);
    } catch (secondError) {
      console.error(
        "Failed to parse AI JSON:",
        secondError.message
      );

      return null;
    }
  }
};

// ============================================================
// NUMERIC SKILL ASSESSMENT
// ============================================================

const calculateNumericSkillAssessment = (interviews) => {
  const scores = [];

  if (!Array.isArray(interviews)) {
    return 0;
  }

  interviews.forEach((interview) => {
    if (!Array.isArray(interview.progress)) {
      return;
    }

    interview.progress.forEach((item) => {
      if (!item || item.skipped) {
        return;
      }

      const score = Number(item.score);

      if (Number.isFinite(score)) {
        scores.push(clamp(score, 0, 100));
      }
    });
  });

  if (scores.length === 0) {
    return 0;
  }

  const average =
    scores.reduce((sum, score) => sum + score, 0) /
    scores.length;

  return clamp(Math.round(average), 0, 100);
};

// ============================================================
// TECHNICAL SKILL ANALYSIS
// ============================================================

const calculateTechnicalSkills = (interviews) => {
  const topicScores = {};

  if (!Array.isArray(interviews)) {
    return {
      skillAnalysis: [],
      weakSkills: [],
      strongSkills: [],
      averageSkills: [],
      skillAssessment: 0,
    };
  }

  interviews.forEach((interview) => {
    if (!Array.isArray(interview.progress)) {
      return;
    }

    interview.progress.forEach((item) => {
      if (
        !item ||
        item.skipped ||
        !item.topic
      ) {
        return;
      }

      const topic = String(item.topic).trim();

      if (!topic) {
        return;
      }

      const score = Number(item.score);

      if (!Number.isFinite(score)) {
        return;
      }

      if (!topicScores[topic]) {
        topicScores[topic] = [];
      }

      topicScores[topic].push(
        clamp(score, 0, 100)
      );
    });
  });

  const skillAnalysis = Object.entries(topicScores)
    .map(([topic, scores]) => {
      const average =
        scores.reduce(
          (sum, score) => sum + score,
          0
        ) / scores.length;

      const score = Math.round(average);

      let status = "weak";

      if (score >= 75) {
        status = "strong";
      } else if (score >= 50) {
        status = "average";
      }

      return {
        topic,
        score,
        status,
        questionsAnswered: scores.length,
      };
    })
    .sort((a, b) => b.score - a.score);

  const strongSkills = skillAnalysis.filter(
    (skill) => skill.score >= 75
  );

  const averageSkills = skillAnalysis.filter(
    (skill) =>
      skill.score >= 50 &&
      skill.score < 75
  );

  const weakSkills = skillAnalysis.filter(
    (skill) => skill.score < 50
  );

  const skillAssessment =
    calculateNumericSkillAssessment(interviews);

  return {
    skillAnalysis,
    weakSkills,
    strongSkills,
    averageSkills,
    skillAssessment,
  };
};

// ============================================================
// FIND MISSING INDUSTRY SKILLS
// ============================================================

const findMissingIndustrySkills = (
  user,
  interviews,
  skillAnalysis = []
) => {
  const candidateType =
    user.candidateType || "fresher";

  const resumeSkills = Array.isArray(user.skills)
    ? user.skills
    : [];

  const demonstratedTopics = Array.isArray(
    skillAnalysis
  )
    ? skillAnalysis.map((item) => item.topic)
    : [];

  const allKnownSkills = [
    ...resumeSkills,
    ...demonstratedTopics,
  ];

  const domains = [
    ...new Set(
      (Array.isArray(interviews)
        ? interviews
        : []
      )
        .map((interview) => interview.domain)
        .filter(Boolean)
    ),
  ];

  const selectedDomains =
    domains.length > 0
      ? domains
      : ["General"];

  const expectedSkills = new Set();

  selectedDomains.forEach((domain) => {
    const config = INDUSTRY_SKILLS[domain];

    if (!config) {
      return;
    }

    const required =
      config[candidateType] ||
      config.fresher ||
      [];

    required.forEach((skill) => {
      expectedSkills.add(skill);
    });
  });

  const existingSkills = [];

  expectedSkills.forEach((requiredSkill) => {
    const requiredNormalized =
      normalizeSkill(requiredSkill);

    const demonstrated = allKnownSkills.some(
      (knownSkill) => {
        const knownNormalized =
          normalizeSkill(knownSkill);

        if (!knownNormalized) {
          return false;
        }

        return (
          knownNormalized === requiredNormalized ||
          knownNormalized.includes(
            requiredNormalized
          ) ||
          requiredNormalized.includes(
            knownNormalized
          )
        );
      }
    );

    if (demonstrated) {
      existingSkills.push(requiredSkill);
    }
  });

  const missingSkills = [
    ...expectedSkills,
  ].filter(
    (requiredSkill) =>
      !existingSkills.includes(requiredSkill)
  );

  return {
    candidateType,
    domains: selectedDomains,
    expectedSkills: [
      ...expectedSkills,
    ],
    existingSkills,
    missingSkills,
  };
};

// ============================================================
// COMMUNICATION FALLBACK
// ============================================================

const calculateFallbackCommunication = (
  answers
) => {
  if (!answers.length) {
    return {
      communicationScore: 0,

      strengths: [],

      gaps: [
        "Not enough interview answers to assess communication",
      ],

      summary:
        "Complete an interview to receive a communication assessment.",
    };
  }

  const averageLength =
    answers.reduce(
      (sum, answer) =>
        sum + String(answer).length,
      0
    ) / answers.length;

  let score = 70;

  if (averageLength < 25) {
    score -= 12;
  } else if (averageLength > 150) {
    score -= 5;
  } else {
    score += 5;
  }

  const shortAnswers = answers.filter(
    (answer) =>
      String(answer).length < 35
  ).length;

  if (
    shortAnswers >=
    Math.ceil(answers.length / 2)
  ) {
    score -= 8;
  }

  score = clamp(
    Math.round(score),
    40,
    85
  );

  const strengths = [
    "Attempts to answer interview questions directly",
    "Demonstrates willingness to explain technical concepts",
  ];

  const gaps = [];

  if (averageLength < 35) {
    gaps.push(
      "Answers could provide more explanation and context"
    );
  }

  gaps.push(
    "Use a clearer structure when explaining technical concepts"
  );

  gaps.push(
    "Support answers with concise examples when appropriate"
  );

  return {
    communicationScore: score,

    strengths: strengths.slice(0, 4),

    gaps: gaps.slice(0, 4),

    summary:
      "Communication is estimated from the clarity, structure and completeness of the candidate's interview responses.",
  };
};

// ============================================================
// AI COMMUNICATION ASSESSMENT
// ============================================================

const calculateCommunicationScore = async (
  user,
  interviews
) => {
  try {
    const answerData = [];

    interviews.forEach((interview) => {
      if (!Array.isArray(interview.progress)) {
        return;
      }

      interview.progress.forEach((item) => {
        if (
          !item ||
          item.skipped ||
          !item.answer ||
          !String(item.answer).trim()
        ) {
          return;
        }

        answerData.push({
          domain: safeString(
            interview.domain,
            "General"
          ),

          answer: String(item.answer)
            .trim()
            .slice(0, MAX_ANSWER_CHARS),

          score: Number(item.score) || 0,
        });
      });
    });

    if (!answerData.length) {
      return null;
    }

    const recentAnswers =
      answerData.slice(
        -MAX_COMMUNICATION_ANSWERS
      );

    const compactAnswers =
      recentAnswers
        .map(
          (item, index) =>
            `Answer ${index + 1} (${item.domain}, technical score ${item.score}/100): ${item.answer}`
        )
        .join("\n");

    const prompt = `
You are an expert technical interview communication evaluator.

Evaluate ONLY communication quality.
Do NOT evaluate technical correctness.

Candidate type:
${user.candidateType || "fresher"}

Interview responses:

${compactAnswers}

Evaluate:
- clarity
- structure
- conciseness
- language
- confidence
- ability to explain technical ideas

Do not heavily penalize simple or non-native English.

Return ONLY valid JSON:

{
  "communicationScore": 72,
  "strengths": [
    "Clear explanation",
    "Answers questions directly"
  ],
  "gaps": [
    "Some answers lack structure",
    "Could use clearer examples"
  ],
  "summary": "One concise personalized sentence."
}

Rules:
- communicationScore must be 0-100
- strengths must contain 2-4 items
- gaps must contain 2-4 items
- summary must be one sentence
`.trim();

    let response;

    try {
      response =
        await groq.chat.completions.create({
          model: GROQ_MODEL,

          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0.1,

          max_tokens: 300,
          response_format: {
  type: "json_object",
},
        });
    } catch (error) {
      console.error(
        "Communication AI request failed:",
        error?.message || error
      );

      return calculateFallbackCommunication(
        recentAnswers.map(
          (item) => item.answer
        )
      );
    }

    const raw =
      response?.choices?.[0]?.message?.content?.trim() ||
      "";

    const parsed =
      parseAIJson(raw);

    if (!parsed) {
      return calculateFallbackCommunication(
        recentAnswers.map(
          (item) => item.answer
        )
      );
    }

    const communicationScore =
      clamp(
        Number(
          parsed.communicationScore
        ) || 0,
        0,
        100
      );

    const strengths =
      Array.isArray(parsed.strengths)
        ? parsed.strengths
            .filter(
              (item) =>
                typeof item === "string" &&
                item.trim()
            )
            .map((item) => item.trim())
            .slice(0, 4)
        : [];

    const gaps =
      Array.isArray(parsed.gaps)
        ? parsed.gaps
            .filter(
              (item) =>
                typeof item === "string" &&
                item.trim()
            )
            .map((item) => item.trim())
            .slice(0, 4)
        : [];

    return {
      communicationScore,

      strengths:
        strengths.length > 0
          ? strengths
          : [
              "Communicates ideas during interview responses",
            ],

      gaps:
        gaps.length > 0
          ? gaps
          : [
              "Improve structure and clarity of technical explanations",
            ],

      summary:
        typeof parsed.summary ===
        "string"
          ? parsed.summary.trim()
          : "Communication is assessed from the candidate's interview responses.",
    };
  } catch (error) {
    console.error(
      "Communication assessment error:",
      error
    );

    return calculateFallbackCommunication(
      []
    );
  }
};

// ============================================================
// BUILD READINESS DATA
// ============================================================

const buildReadinessData = async (user) => {
  const interviews =
    await Interview.find({
      userId: user._id,
      isComplete: true,
    })
      .sort({
        completedAt: -1,
      })
      .lean();

  // ----------------------------------------------------------
  // Technical skills
  // ----------------------------------------------------------

  const technical =
    calculateTechnicalSkills(
      interviews
    );

  const calculatedSkillAssessment =
    Number(
      technical.skillAssessment
    ) || 0;

  const storedSkillAssessment =
    typeof user.skillAssessment ===
      "number" &&
    Number.isFinite(
      user.skillAssessment
    )
      ? clamp(
          user.skillAssessment,
          0,
          100
        )
      : 0;

  let finalSkillAssessment =
    calculatedSkillAssessment;

  if (
    finalSkillAssessment === 0 &&
    storedSkillAssessment > 0
  ) {
    finalSkillAssessment =
      storedSkillAssessment;
  }

  // ----------------------------------------------------------
  // Save numeric skill assessment
  // ----------------------------------------------------------

  try {
    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          skillAssessment:
            Number(
              finalSkillAssessment
            ),
        },
      },
      {
        runValidators: true,
      }
    );
  } catch (error) {
    console.error(
      "SKILL ASSESSMENT USER UPDATE ERROR:",
      error.message
    );
  }

  // ----------------------------------------------------------
  // Communication
  // ----------------------------------------------------------

  let communicationScore =
    typeof user.communicationScore ===
      "number" &&
    Number.isFinite(
      user.communicationScore
    )
      ? clamp(
          user.communicationScore,
          0,
          100
        )
      : 0;

  let communicationStrengths =
    Array.isArray(
      user.communicationStrengths
    )
      ? user.communicationStrengths
      : [];

  let communicationGaps =
    Array.isArray(
      user.communicationGaps
    )
      ? user.communicationGaps
      : [];

  /*
   * Recalculate communication when there
   * are completed interviews.
   *
   * This makes readiness evolve as the user
   * completes more interviews.
   */
  if (interviews.length > 0) {
    console.log(
      "Running communication assessment..."
    );

    const communication =
      await calculateCommunicationScore(
        user,
        interviews
      );

    if (communication) {
      communicationScore =
        clamp(
          Number(
            communication.communicationScore
          ) || 0,
          0,
          100
        );

      communicationStrengths =
        communication.strengths || [];

      communicationGaps =
        communication.gaps || [];

      try {
        await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              communicationScore:
                communicationScore,

              communicationStrengths:
                communicationStrengths,

              communicationGaps:
                communicationGaps,
            },
          },
          {
            runValidators: true,
          }
        );
      } catch (error) {
        console.error(
          "Failed to save communication assessment:",
          error.message
        );
      }
    }
  }

  // ----------------------------------------------------------
  // Resume
  // ----------------------------------------------------------

  const resumeScore =
    typeof user.resumeScore ===
      "number" &&
    Number.isFinite(
      user.resumeScore
    )
      ? clamp(
          user.resumeScore,
          0,
          100
        )
      : 0;

  // ----------------------------------------------------------
  // Interview performance
  // ----------------------------------------------------------

  /*
   * Calculate directly from completed interviews
   * so readiness does not depend on stale stored data.
   */
  const interviewScores =
    interviews
      .map((interview) =>
        Number(interview.score)
      )
      .filter((score) =>
        Number.isFinite(score)
      )
      .map((score) =>
        clamp(score, 0, 100)
      );

  const calculatedInterviewPerformance =
    interviewScores.length > 0
      ? Math.round(
          interviewScores.reduce(
            (sum, score) =>
              sum + score,
            0
          ) /
            interviewScores.length
        )
      : 0;

  const storedInterviewPerformance =
    typeof user.interviewPerformance ===
      "number" &&
    Number.isFinite(
      user.interviewPerformance
    )
      ? clamp(
          user.interviewPerformance,
          0,
          100
        )
      : 0;

  const interviewScore =
    interviewScores.length > 0
      ? calculatedInterviewPerformance
      : storedInterviewPerformance;

  // ----------------------------------------------------------
  // Industry skills
  // ----------------------------------------------------------

  const industrySkillAnalysis =
    findMissingIndustrySkills(
      user,
      interviews,
      technical.skillAnalysis
    );

  // ----------------------------------------------------------
  // Overall readiness
  // ----------------------------------------------------------

  const readinessScore =
    Math.round(
      resumeScore *
        READINESS_CONFIG.weights.resume +

      interviewScore *
        READINESS_CONFIG.weights.interview +

      finalSkillAssessment *
        READINESS_CONFIG.weights
          .skillAssessment +

      communicationScore *
        READINESS_CONFIG.weights
          .communication
    );

  // ----------------------------------------------------------
  // Category
  // ----------------------------------------------------------

  let category;

  if (
    readinessScore >=
    READINESS_CONFIG.categories
      .placementReady
  ) {
    category =
      "Placement Ready";
  } else if (
    readinessScore >=
    READINESS_CONFIG.categories
      .needsImprovement
  ) {
    category =
      "Needs Improvement";
  } else {
    category =
      "High Potential Candidate";
  }

  // ----------------------------------------------------------
  // Return
  // ----------------------------------------------------------

  return {
    interviews,

    readinessScore,

    category,

    breakdown: {
      resume: resumeScore,

      interview: interviewScore,

      skillAssessment:
        finalSkillAssessment,

      communication:
        communicationScore,
    },

    communication: {
      score:
        communicationScore,

      strengths:
        communicationStrengths,

      gaps:
        communicationGaps,
    },

    skillAnalysis:
      technical.skillAnalysis,

    weakSkills:
      technical.weakSkills,

    strongSkills:
      technical.strongSkills,

    averageSkills:
      technical.averageSkills,

    candidateType:
      industrySkillAnalysis.candidateType,

    interviewDomains:
      industrySkillAnalysis.domains,

    industrySkills: {
      expected:
        industrySkillAnalysis.expectedSkills,

      existing:
        industrySkillAnalysis.existingSkills,

      missing:
        industrySkillAnalysis.missingSkills,
    },

    interviewsUsed:
      interviews.length,
  };
};

// ============================================================
// SAVE READINESS HISTORY
// ============================================================

const saveReadinessHistory = async (
  user,
  readiness,
  interview
) => {
  try {
    if (!interview) {
      return null;
    }

    const existingHistory =
      await ReadinessHistory.findOne({
        userId: user._id,
        interviewId: interview._id,
      });

    if (existingHistory) {
      return existingHistory;
    }

    const history =
      await ReadinessHistory.create({
        userId: user._id,

        interviewId:
          interview._id,

        readinessScore:
          Number(
            readiness.readinessScore
          ),

        category:
          readiness.category,

        candidateType:
          readiness.candidateType ||
          user.candidateType ||
          "fresher",

        interviewDomain:
          interview.domain ||
          "General",

        breakdown: {
          resume:
            Number(
              readiness.breakdown.resume
            ),

          interview:
            Number(
              readiness.breakdown.interview
            ),

          skillAssessment:
            Number(
              readiness.breakdown
                .skillAssessment
            ),

          communication:
            Number(
              readiness.breakdown
                .communication
            ),
        },

        weakSkills:
          readiness.weakSkills || [],

        strongSkills:
          readiness.strongSkills || [],

        /*
         * IMPORTANT FIX:
         * Preserve the complete technical
         * skill snapshot for historical tracking.
         */
        skillAnalysis:
          readiness.skillAnalysis || [],

        expectedIndustrySkills:
          readiness.industrySkills
            ?.expected || [],

        existingIndustrySkills:
          readiness.industrySkills
            ?.existing || [],

        missingIndustrySkills:
          readiness.industrySkills
            ?.missing || [],

        communicationStrengths:
          readiness.communication
            ?.strengths || [],

        communicationGaps:
          readiness.communication
            ?.gaps || [],

        interviewsUsed:
          Number(
            readiness.interviewsUsed
          ) || 0,

        recordedAt: new Date(),
      });

    console.log(
      `Readiness history saved: ${history._id}`
    );

    return history;
  } catch (error) {
    console.error(
      "Failed to save readiness history:",
      error
    );

    return null;
  }
};

// ============================================================
// GET READINESS
// ============================================================

const getReadiness = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.userId
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const readiness =
      await buildReadinessData(
        user
      );

    return res.json({
      success: true,

      readinessScore:
        readiness.readinessScore,

      category:
        readiness.category,

      breakdown:
        readiness.breakdown,

      communication:
        readiness.communication,

      skillAssessment:
        readiness.breakdown
          .skillAssessment,

      skillAnalysis:
        readiness.skillAnalysis,

      weakSkills:
        readiness.weakSkills,

      strongSkills:
        readiness.strongSkills,

      averageSkills:
        readiness.averageSkills,

      candidateType:
        readiness.candidateType,

      interviewDomains:
        readiness.interviewDomains,

      industrySkills:
        readiness.industrySkills,

      interviewsUsed:
        readiness.interviewsUsed,

      scoringConfig:
        READINESS_CONFIG,
    });
  } catch (error) {
    console.error(
      "Readiness calculation error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to calculate placement readiness",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET READINESS HISTORY
// ============================================================

const getReadinessHistory =
  async (
    req,
    res
  ) => {
    try {
      const history =
        await ReadinessHistory.find({
          userId: req.userId,
        })
          .sort({
            recordedAt: 1,
          })
          .lean();

      return res.json({
        success: true,

        history,

        count:
          history.length,
      });
    } catch (error) {
      console.error(
        "Readiness history error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch readiness history",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };

// ============================================================
// GENERATE ROADMAP
// ============================================================

const generateRoadmap = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.userId
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const readiness =
      await buildReadinessData(
        user
      );

    const strongSkillsText =
      readiness.strongSkills
        .slice(0, 8)
        .map(
          (skill) =>
            `${skill.topic}: ${skill.score}/100`
        )
        .join(", ") ||
      "None";

    const weakSkillsText =
      readiness.weakSkills
        .slice(0, 8)
        .map(
          (skill) =>
            `${skill.topic}: ${skill.score}/100`
        )
        .join(", ") ||
      "None";

    const averageSkillsText =
      readiness.averageSkills
        .slice(0, 8)
        .map(
          (skill) =>
            `${skill.topic}: ${skill.score}/100`
        )
        .join(", ") ||
      "None";

    const roadmapPrompt = `
You are an expert placement strategist and technical career coach.

Create a personalized placement roadmap based ONLY on the candidate data below.

Candidate type:
${user.candidateType || "fresher"}

Current resume skills:
${
  Array.isArray(user.skills) &&
  user.skills.length
    ? user.skills
        .slice(0, 20)
        .join(", ")
    : "None provided"
}

Placement readiness:
${readiness.readinessScore}/100

Category:
${readiness.category}

Score breakdown:
Resume: ${readiness.breakdown.resume}/100
Interview: ${readiness.breakdown.interview}/100
Technical skills: ${readiness.breakdown.skillAssessment}/100
Communication: ${readiness.breakdown.communication}/100

Strong technical areas:
${strongSkillsText}

Average technical areas:
${averageSkillsText}

Weak technical areas:
${weakSkillsText}

Communication strengths:
${
  readiness.communication.strengths
    .slice(0, 4)
    .join(", ") ||
  "None"
}

Communication gaps:
${
  readiness.communication.gaps
    .slice(0, 4)
    .join(", ") ||
  "None"
}

Missing industry skills:
${
  readiness.industrySkills.missing
    .slice(0, 15)
    .join(", ") ||
  "None"
}

Interview domains:
${
  readiness.interviewDomains.join(
    ", "
  ) || "General"
}

Rules:

For fresher candidates:
- prioritize fundamentals
- DSA
- OOP
- DBMS/SQL
- practical projects
- Git/GitHub
- interview preparation
- job-ready development skills

For internship seekers:
- prioritize practical implementation
- portfolio projects
- Git/GitHub
- demonstrable work
- coding interview preparation

For experienced candidates:
- prioritize system design
- architecture
- production engineering
- scalability
- advanced engineering practices

Do not recommend technologies randomly.

Every recommendation should connect to:
- a weak technical area
- a missing industry skill
- a communication gap
- the candidate type
- or an interview requirement.

Do not recommend a certification merely because it is popular.

Return ONLY valid JSON.

{
  "summary": "Personalized current situation summary.",

  "immediatePriorities": [
    {
      "title": "Specific priority",
      "reason": "Why this should be addressed now.",
      "priority": "high"
    }
  ],

  "technologies": [
    {
      "name": "Technology or concept",
      "reason": "Why the candidate needs it.",
      "priority": "high",
      "estimatedWeeks": 2
    }
  ],

  "projects": [
    {
      "title": "Project title",
      "description": "What the candidate should build.",
      "technologies": [
        "Technology"
      ],
      "skillsItImproves": [
        "Skill"
      ],
      "difficulty": "Intermediate"
    }
  ],

  "certifications": [
    {
      "name": "Relevant certification",
      "provider": "Provider",
      "reason": "Why it is relevant."
    }
  ],

  "interviewTopics": [
    {
      "topic": "Topic",
      "reason": "Why the candidate should practice it.",
      "priority": "high"
    }
  ],

  "communicationImprovement": [
    "Specific action"
  ],

  "thirtyDayPlan": [
    {
      "week": 1,
      "focus": "Focus",
      "actions": [
        "Action"
      ]
    },
    {
      "week": 2,
      "focus": "Focus",
      "actions": [
        "Action"
      ]
    },
    {
      "week": 3,
      "focus": "Focus",
      "actions": [
        "Action"
      ]
    },
    {
      "week": 4,
      "focus": "Focus",
      "actions": [
        "Action"
      ]
    }
  ],

  "sixtyDayPlan": [
    {
      "focus": "Focus",
      "actions": [
        "Action"
      ]
    }
  ],

  "ninetyDayPlan": [
    {
      "focus": "Focus",
      "actions": [
        "Action"
      ]
    }
  ]
}
`.trim();

    console.log(
      "Generating personalized AI roadmap..."
    );

    let response;

    try {
      response =
        await groq.chat.completions.create({
          model: GROQ_MODEL,

          messages: [
            {
              role: "user",
              content:
                roadmapPrompt,
            },
          ],

          temperature: 0.2,

          max_tokens: 1800,
          response_format: {
  type: "json_object",
},
        });
    } catch (aiError) {
      console.error(
        "Roadmap AI error:",
        aiError?.message ||
          aiError
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to generate AI roadmap",
      });
    }

    const raw =
      response?.choices?.[0]?.message?.content?.trim() ||
      "";

    const roadmap =
      parseAIJson(raw);

    if (!roadmap) {
      return res.status(500).json({
        success: false,

        message:
          "AI returned an invalid roadmap.",
      });
    }

    return res.json({
      success: true,

      candidate: {
        name: user.name,

        candidateType:
          user.candidateType,

        skills:
          user.skills || [],
      },

      readiness: {
        score:
          readiness.readinessScore,

        category:
          readiness.category,

        breakdown:
          readiness.breakdown,
      },

      analysis: {
        strongSkills:
          readiness.strongSkills,

        weakSkills:
          readiness.weakSkills,

        averageSkills:
          readiness.averageSkills,

        skillAnalysis:
          readiness.skillAnalysis,

        communicationStrengths:
          readiness.communication
            .strengths,

        communicationGaps:
          readiness.communication
            .gaps,

        missingIndustrySkills:
          readiness.industrySkills
            .missing,

        interviewDomains:
          readiness.interviewDomains,
      },

      roadmap,
    });
  } catch (error) {
    console.error(
      "Roadmap generation error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to generate personalized roadmap",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getReadiness,
  generateRoadmap,
  getReadinessHistory,
  buildReadinessData,
  saveReadinessHistory,
};