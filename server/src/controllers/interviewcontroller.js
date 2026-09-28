const Groq = require("groq-sdk");
const Interview = require("../models/Interview");
const User = require("../models/User");

// ============================================================
// CONFIGURATION
// ============================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "openai/gpt-oss-120b";
const MAX_QUESTIONS = 5;

// ============================================================
// COMPANY PROFILES
// ============================================================

const COMPANIES = {
  google: {
    id: "google",
    name: "Google",
    expectedScore: 85,
    difficulty: "hard",
    style: "Deep technical and analytical",
    focus: [
      "Algorithms",
      "Data Structures",
      "Computer Science Fundamentals",
      "Problem Solving",
      "System Design",
    ],
  },

  amazon: {
    id: "amazon",
    name: "Amazon",
    expectedScore: 80,
    difficulty: "hard",
    style: "Practical problem solving and scalability",
    focus: [
      "Problem Solving",
      "Data Structures",
      "Practical Engineering",
      "Scalability",
      "System Design",
    ],
  },

  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    expectedScore: 80,
    difficulty: "hard",
    style: "Strong fundamentals with practical engineering",
    focus: [
      "Computer Science Fundamentals",
      "Coding",
      "Problem Solving",
      "Object Oriented Programming",
      "System Design",
    ],
  },

  tcs: {
    id: "tcs",
    name: "TCS",
    expectedScore: 65,
    difficulty: "medium",
    style: "Fundamentals and communication",
    focus: [
      "Programming Fundamentals",
      "Aptitude",
      "Communication",
      "Basic Computer Science",
      "Practical Knowledge",
    ],
  },

  infosys: {
    id: "infosys",
    name: "Infosys",
    expectedScore: 65,
    difficulty: "medium",
    style: "Fundamentals and problem solving",
    focus: [
      "Programming Fundamentals",
      "Problem Solving",
      "Communication",
      "Computer Science Fundamentals",
      "Practical Knowledge",
    ],
  },
};

// ============================================================
// BASIC HELPERS
// ============================================================

const clamp = (value, min = 0, max = 100) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(Math.max(number, min), max);
};

const getCompanyProfile = (company) => {
  if (!company) {
    return COMPANIES.google;
  }

  const key = String(company).toLowerCase().trim();

  return COMPANIES[key] || COMPANIES.google;
};

const normalizeDifficulty = (difficulty) => {
  const value = String(difficulty || "easy")
    .toLowerCase()
    .trim();

  if (value === "hard" || value === "difficult") {
    return "hard";
  }

  if (value === "medium" || value === "moderate") {
    return "medium";
  }

  return "easy";
};

const cleanQuestion = (question = "") => {
  return String(question)
    .replace(
      /^\s*```(?:text|markdown|javascript|typescript|js|ts)?\s*/i,
      ""
    )
    .replace(/\s*```\s*$/i, "")
    .replace(/^\s*["'`]+|["'`]+\s*$/g, "")
    .replace(/^question\s*:\s*/i, "")
    .replace(/^q\d+\s*[:.)-]\s*/i, "")
    .trim();
};

const normalizeText = (text = "") => {
  return String(text)
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// ============================================================
// AI JSON PARSING
// ============================================================

const parseAIJson = (content) => {
  if (!content) {
    return null;
  }

  let text = String(content)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Remove accidental leading/trailing prose.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
};

// ============================================================
// QUESTION DUPLICATE DETECTION
// ============================================================

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "from",
  "with",
  "and",
  "or",
  "but",
  "if",
  "then",
  "than",
  "that",
  "this",
  "these",
  "those",
  "what",
  "why",
  "how",
  "when",
  "where",
  "which",
  "who",
  "can",
  "could",
  "would",
  "should",
  "do",
  "does",
  "did",
  "explain",
  "describe",
  "tell",
  "me",
  "about",
  "your",
  "you",
  "using",
  "use",
  "used",
  "example",
  "one",
  "some",
  "common",
  "important",
  "please",
]);

const getQuestionKeywords = (question = "") => {
  return normalizeText(question)
    .split(" ")
    .filter(
      (word) =>
        word.length > 2 &&
        !STOP_WORDS.has(word)
    );
};

const calculateQuestionSimilarity = (
  question1 = "",
  question2 = ""
) => {
  const first = new Set(
    getQuestionKeywords(question1)
  );

  const second = new Set(
    getQuestionKeywords(question2)
  );

  if (!first.size || !second.size) {
    return normalizeText(question1) ===
      normalizeText(question2)
      ? 1
      : 0;
  }

  let intersection = 0;

  first.forEach((word) => {
    if (second.has(word)) {
      intersection += 1;
    }
  });

  const union = new Set([
    ...first,
    ...second,
  ]).size;

  return union
    ? intersection / union
    : 0;
};

const isDuplicateQuestion = (
  question,
  previousQuestions = []
) => {
  const normalized = normalizeText(question);

  if (!normalized) {
    return true;
  }

  return previousQuestions.some((previous) => {
    const old = normalizeText(previous);

    if (!old) {
      return false;
    }

    if (old === normalized) {
      return true;
    }

    return (
      calculateQuestionSimilarity(
        question,
        previous
      ) >= 0.72
    );
  });
};

// ============================================================
// QUESTION VALIDATION
// ============================================================

const isIncompleteQuestion = (question = "") => {
  const text = String(question).trim();

  if (!text) {
    return true;
  }

  if (text.length < 18) {
    return true;
  }

  if (!/[?!.:]$/.test(text)) {
    return true;
  }

  if (
    /^(question|answer|feedback|topic|score)\s*:/i.test(
      text
    )
  ) {
    return true;
  }

  return false;
};

const isBadGeneratedQuestion = (question = "") => {
  const text = String(question).trim();

  const badPatterns = [
    /^here(?:'s| is) (?:the )?(?:next )?question/i,
    /^sure[!,]?/i,
    /^okay[!,]?/i,
    /^ok[!,]?/i,
    /as an ai/i,
    /the answer is/i,
    /sample answer/i,
    /feedback:/i,
    /score:/i,
    /difficulty:/i,
  ];

  return badPatterns.some((pattern) =>
    pattern.test(text)
  );
};

const isValidQuestion = (
  question,
  previousQuestions = []
) => {
  return (
    !!question &&
    !isIncompleteQuestion(question) &&
    !isBadGeneratedQuestion(question) &&
    !isDuplicateQuestion(
      question,
      previousQuestions
    )
  );
};

// ============================================================
// ANSWER SIMILARITY
// ============================================================

const calculateAnswerSimilarity = (
  answer1 = "",
  answer2 = ""
) => {
  const first = new Set(
    normalizeText(answer1)
      .split(" ")
      .filter(Boolean)
  );

  const second = new Set(
    normalizeText(answer2)
      .split(" ")
      .filter(Boolean)
  );

  if (!first.size || !second.size) {
    return 0;
  }

  let intersection = 0;

  first.forEach((word) => {
    if (second.has(word)) {
      intersection += 1;
    }
  });

  const denominator = Math.max(
    first.size,
    second.size
  );

  return denominator
    ? intersection / denominator
    : 0;
};

const isRepeatedAnswer = (
  answer = "",
  previousAnswers = []
) => {
  const normalized = normalizeText(answer);

  if (!normalized || normalized.length < 8) {
    return false;
  }

  return previousAnswers.some(
    (previousAnswer) => {
      const previous =
        normalizeText(previousAnswer);

      if (!previous) {
        return false;
      }

      if (normalized === previous) {
        return true;
      }

      return (
        calculateAnswerSimilarity(
          answer,
          previousAnswer
        ) >= 0.85
      );
    }
  );
};

// ============================================================
// SKIP
// ============================================================

const isSkipAnswer = (answer = "") => {
  const normalized = normalizeText(answer);

  const skipPhrases = new Set([
    "",
    "skip",
    "skipped",
    "i skip",
    "i skipped",
    "skip this",
    "skip question",
    "next question",
    "dont know",
    "do not know",
    "i dont know",
    "i do not know",
    "no idea",
    "not sure",
    "i am not sure",
    "idk",
  ]);

  return skipPhrases.has(normalized);
};

// ============================================================
// ADAPTIVE DIFFICULTY
// ============================================================

const getNextDifficulty = (
  currentDifficulty = "easy",
  difficultyChange = "maintain"
) => {
  const levels = [
    "easy",
    "medium",
    "hard",
  ];

  const current =
    normalizeDifficulty(
      currentDifficulty
    );

  let index =
    levels.indexOf(current);

  if (index < 0) {
    index = 0;
  }

  if (difficultyChange === "increase") {
    index += 1;
  }

  if (difficultyChange === "decrease") {
    index -= 1;
  }

  index = Math.max(
    0,
    Math.min(2, index)
  );

  return levels[index];
};

const normalizeEvaluation = (
  value,
  score
) => {
  if (score >= 80) {
    return "strong";
  }

  if (score <= 50) {
    return "weak";
  }

  return "average";
};

const normalizeDifficultyChange = (
  value,
  score,
  currentDifficulty = "easy"
) => {
  let change;

  if (score >= 80) {
    change = "increase";
  } else if (score <= 50) {
    change = "decrease";
  } else {
    change = "maintain";
  }

  const difficulty =
    normalizeDifficulty(
      currentDifficulty
    );

  // Cannot go below EASY.
  if (
    change === "decrease" &&
    difficulty === "easy"
  ) {
    return "maintain";
  }

  // Cannot go above HARD.
  if (
    change === "increase" &&
    difficulty === "hard"
  ) {
    return "maintain";
  }

  return change;
};

// ============================================================
// GROQ
// ============================================================

const callGroq = async ({
  system,
  user,
  maxTokens = 700,
  temperature = 0.2,
}) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not configured"
    );
  }

  const completion =
    await groq.chat.completions.create({
      model: MODEL,

      messages: [
        {
          role: "system",
          content: system,
        },
        {
          role: "user",
          content: user,
        },
      ],

      temperature,
      max_tokens: maxTokens,
    });

  return (
    completion?.choices?.[0]
      ?.message?.content?.trim() || ""
  );
};

// ============================================================
// COMPANY CONTEXT
// ============================================================

const buildCompanyContext = (
  companyProfile
) => {
  return `
Company: ${companyProfile.name}
Interview style: ${companyProfile.style}
Expected score: ${companyProfile.expectedScore}/100
Focus areas: ${companyProfile.focus.join(", ")}
`.trim();
};

// ============================================================
// QUESTION PROMPT
// ============================================================

const buildQuestionSystemPrompt = (
  domain,
  companyProfile
) => {
  return `
You are an expert technical interviewer conducting a realistic adaptive interview.

DOMAIN:
${domain}

${buildCompanyContext(companyProfile)}

Generate exactly ONE technical interview question.

DIFFICULTY RULES:

EASY:
- Fundamental concepts.
- Basic implementation.
- Clear and direct questions.
- Suitable for checking foundational understanding.

MEDIUM:
- Practical implementation.
- Multiple related concepts.
- Debugging.
- Moderate reasoning.
- Real-world engineering situations.

HARD:
- Deep technical reasoning.
- Multiple concepts.
- Edge cases.
- Trade-offs.
- Performance.
- Scalability.
- Architecture or advanced implementation.

IMPORTANT:
- The requested difficulty must be reflected in the actual question.
- Do not label the question with its difficulty.
- Do not give the answer.
- Do not give feedback.
- Do not give scoring.
- Do not ask generic HR questions.
- Do not repeat previous questions.
- Do not merely reword a previous question.
- Return ONLY the question.
`.trim();
};

// ============================================================
// SCORE NORMALIZATION
// ============================================================

const normalizeAIScore = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  if (
    number >= 0 &&
    number <= 10
  ) {
    return clamp(
      Math.round(number * 10)
    );
  }

  return clamp(
    Math.round(number)
  );
};

const calculateWeightedScore = (
  parsed
) => {
  const technicalAccuracy =
    normalizeAIScore(
      parsed?.technicalAccuracy
    );

  const relevance =
    normalizeAIScore(
      parsed?.relevance
    );

  const depth =
    normalizeAIScore(
      parsed?.depth
    );

  const clarity =
    normalizeAIScore(
      parsed?.clarity
    );

  if (
    technicalAccuracy !== null &&
    relevance !== null &&
    depth !== null &&
    clarity !== null
  ) {
    return Math.round(
      technicalAccuracy * 0.4 +
        relevance * 0.25 +
        depth * 0.2 +
        clarity * 0.15
    );
  }

  return normalizeAIScore(
    parsed?.score
  );
};

// ============================================================
// FALLBACK QUESTIONS
// ============================================================

const FALLBACK_QUESTIONS = {
  easy: [
    (domain) =>
      `What are the core concepts of ${domain} that every developer should understand?`,

    (domain) =>
      `Explain one important concept in ${domain} and give a practical example of where it is useful.`,

    (domain) =>
      `What problem does ${domain} solve, and when would you choose to use it?`,

    (domain) =>
      `Describe a simple project that could be built using ${domain} and explain its main components.`,

    (domain) =>
      `What are some common mistakes beginners make when working with ${domain}, and how can they avoid them?`,
  ],

  medium: [
    (domain) =>
      `Describe a real-world problem you could solve using ${domain} and explain your technical approach.`,

    (domain) =>
      `How would you improve the performance of an application built with ${domain}? Explain the reasoning behind your approach.`,

    (domain) =>
      `What important architectural decision would you make when building a production application with ${domain}, and why?`,

    (domain) =>
      `How would you debug a difficult production issue in a ${domain} application? Walk through your approach.`,

    (domain) =>
      `How would you structure a maintainable and scalable project using ${domain}?`,
  ],

  hard: [
    (domain) =>
      `How would you design a scalable production system using ${domain}, and what technical trade-offs would you consider?`,

    (domain) =>
      `Describe a serious performance bottleneck that could occur in ${domain} and explain how you would diagnose and solve it.`,

    (domain) =>
      `How would you design a ${domain} architecture capable of handling high traffic while maintaining reliability?`,

    (domain) =>
      `Explain a difficult technical trade-off you might face when building a large-scale ${domain} system and how you would decide between the alternatives.`,

    (domain) =>
      `How would you improve reliability, scalability, security, and maintainability in a complex ${domain} application?`,
  ],
};

const getFallbackQuestion = (
  domain,
  difficulty,
  questionNumber = 1
) => {
  const level =
    FALLBACK_QUESTIONS[
      normalizeDifficulty(
        difficulty
      )
    ]
      ? normalizeDifficulty(
          difficulty
        )
      : "easy";

  const questions =
    FALLBACK_QUESTIONS[level];

  const index =
    (Math.max(
      questionNumber,
      1
    ) - 1) %
    questions.length;

  return questions[index](
    domain ||
      "software development"
  );
};

const getUniqueFallbackQuestion = ({
  domain,
  difficulty,
  questionNumber,
  previousQuestions,
}) => {
  const levels = [
    normalizeDifficulty(
      difficulty
    ),
    "easy",
    "medium",
    "hard",
  ];

  for (const level of levels) {
    for (let i = 0; i < 10; i++) {
      const question =
        getFallbackQuestion(
          domain,
          level,
          questionNumber + i
        );

      if (
        isValidQuestion(
          question,
          previousQuestions
        )
      ) {
        return question;
      }
    }
  }

  return `Explain one practical technical problem you would expect to encounter while building a production application using ${
    domain || "software development"
  }, and describe how you would solve it.`;
};

// ============================================================
// DETERMINISTIC EVALUATION FALLBACK
// ============================================================
//
// IMPORTANT:
// This is used ONLY when Groq evaluation fails twice.
//
// It does NOT pretend that AI evaluated the answer.
// It uses observable answer characteristics.
// ============================================================

const deterministicEvaluationFallback = ({
  question,
  answer,
}) => {
  const cleanQuestionText =
    normalizeText(question);

  const cleanAnswerText =
    normalizeText(answer);

  const words =
    cleanAnswerText
      ? cleanAnswerText.split(" ")
      : [];

  const wordCount =
    words.length;

  if (!wordCount) {
    return {
      score: 0,
      evaluation: "weak",
      difficultyChange: "decrease",
      feedback:
        "No substantive answer was provided. Explain the concept, reasoning, and practical approach.",
      topic: "Answer Quality",
      dimensions: {
        technicalAccuracy: 0,
        relevance: 0,
        depth: 0,
        clarity: 0,
      },
      source: "deterministic-fallback",
    };
  }

  const technicalKeywords = [
    "react",
    "javascript",
    "typescript",
    "state",
    "props",
    "hook",
    "hooks",
    "usestate",
    "useeffect",
    "usememo",
    "usecallback",
    "component",
    "api",
    "backend",
    "frontend",
    "database",
    "cache",
    "caching",
    "performance",
    "scalability",
    "security",
    "authentication",
    "authorization",
    "async",
    "await",
    "promise",
    "websocket",
    "virtualization",
    "memoization",
    "redux",
    "context",
    "zustand",
    "testing",
    "error",
    "loading",
    "architecture",
    "system",
    "algorithm",
    "data",
    "server",
    "client",
    "network",
    "request",
    "response",
  ];

  const reasoningKeywords = [
    "because",
    "therefore",
    "tradeoff",
    "trade-off",
    "however",
    "instead",
    "depends",
    "reason",
    "reasoning",
    "pros",
    "cons",
    "advantage",
    "disadvantage",
    "edge",
    "case",
    "scale",
    "maintain",
    "performance",
  ];

  const exampleKeywords = [
    "example",
    "for instance",
    "e.g",
    "such as",
    "implementation",
    "code",
    "production",
  ];

  const technicalHits =
    technicalKeywords.filter(
      (keyword) =>
        cleanAnswerText.includes(
          keyword
        )
    ).length;

  const reasoningHits =
    reasoningKeywords.filter(
      (keyword) =>
        cleanAnswerText.includes(
          keyword
        )
    ).length;

  const exampleHits =
    exampleKeywords.filter(
      (keyword) =>
        cleanAnswerText.includes(
          keyword
        )
    ).length;

  let technicalAccuracy =
    45 +
    Math.min(
      technicalHits * 4,
      35
    );

  let relevance =
    50;

  const questionWords =
    new Set(
      cleanQuestionText
        .split(" ")
        .filter(
          (word) =>
            word.length > 3
        )
    );

  const answerWords =
    new Set(words);

  let overlap = 0;

  questionWords.forEach(
    (word) => {
      if (answerWords.has(word)) {
        overlap += 1;
      }
    }
  );

  if (
    questionWords.size
  ) {
    relevance += Math.round(
      (overlap /
        questionWords.size) *
        40
    );
  }

  relevance = clamp(
    relevance,
    0,
    90
  );

  let depth =
    40 +
    Math.min(
      reasoningHits * 6,
      30
    ) +
    Math.min(
      exampleHits * 5,
      20
    );

  if (wordCount >= 120) {
    depth += 5;
  }

  if (wordCount >= 200) {
    depth += 5;
  }

  depth = clamp(
    depth,
    0,
    100
  );

  let clarity = 45;

  if (wordCount >= 40) {
    clarity += 10;
  }

  if (wordCount >= 80) {
    clarity += 10;
  }

  if (wordCount >= 150) {
    clarity += 10;
  }

  if (
    reasoningHits >= 2
  ) {
    clarity += 10;
  }

  clarity = clamp(
    clarity,
    0,
    90
  );

  const score =
    Math.round(
      technicalAccuracy * 0.4 +
        relevance * 0.25 +
        depth * 0.2 +
        clarity * 0.15
    );

  const evaluation =
    normalizeEvaluation(
      "",
      score
    );

  const difficultyChange =
    normalizeDifficultyChange(
      "",
      score,
      "medium"
    );

  return {
    score,
    evaluation,
    difficultyChange,
    feedback:
      score >= 80
        ? "Your answer demonstrated relevant technical knowledge with reasonable reasoning and practical understanding."
        : score >= 51
          ? "Your answer addressed the topic, but the explanation would benefit from more technical reasoning, concrete examples, and implementation detail."
          : "Your answer needs stronger technical accuracy, relevance, and supporting reasoning.",
    topic:
      technicalHits > 0
        ? "Technical Understanding"
        : "General",
    dimensions: {
      technicalAccuracy:
        Math.round(
          technicalAccuracy
        ),
      relevance:
        Math.round(
          relevance
        ),
      depth:
        Math.round(depth),
      clarity:
        Math.round(clarity),
    },
    source: "deterministic-fallback",
  };
};

// ============================================================
// AI ANSWER EVALUATION
// ============================================================

const evaluateAnswerWithAI = async ({
  currentQuestion,
  currentDifficulty,
  cleanAnswer,
  previousQuestion,
  recentProgress,
}) => {
  const systemPrompt = `
You are an expert technical interviewer.

Evaluate ONLY the candidate's current answer to the current question.

Evaluate these four dimensions from 0 to 100:

1. technicalAccuracy
- Correctness of concepts.
- Correctness of logic.
- Correctness of code if applicable.

2. relevance
- Whether the candidate actually answered the question.
- Whether the response stayed on topic.

3. depth
- Reasoning.
- Implementation details.
- Edge cases.
- Trade-offs.
- Practical understanding.

4. clarity
- Clear explanation.
- Logical structure.
- Communication quality.

WEIGHTS:
technicalAccuracy = 40%
relevance = 25%
depth = 20%
clarity = 15%

SCORING:
90-100 = excellent
80-89 = strong
65-79 = good but incomplete
50-64 = average
30-49 = weak
0-29 = very weak

IMPORTANT:
- Judge ONLY what the candidate actually demonstrated.
- Never assume knowledge that was not demonstrated.
- Do not give a high score merely because the answer sounds confident.
- Do not judge the candidate based on the previous answer.
- The score must be consistent with the four dimensions.
- Return ONLY valid JSON.
- No markdown.
- No code fences.
- No explanation outside JSON.

Required JSON:

{
  "technicalAccuracy": 0,
  "relevance": 0,
  "depth": 0,
  "clarity": 0,
  "score": 0,
  "feedback": "specific feedback in 1-3 sentences",
  "topic": "specific technical topic"
}
`.trim();

  const userPrompt = `
CURRENT QUESTION:
${currentQuestion}

CURRENT DIFFICULTY:
${currentDifficulty}

CANDIDATE ANSWER:
${cleanAnswer}

PREVIOUS QUESTION:
${previousQuestion || "None"}

RECENT PERFORMANCE:
${recentProgress || "None"}

Evaluate ONLY the current answer.
`.trim();

  let lastError = null;

  // ----------------------------------------------------------
  // ATTEMPT 1
  // ----------------------------------------------------------

  for (
    let attempt = 1;
    attempt <= 2;
    attempt++
  ) {
    try {
      const result =
        await callGroq({
          system: systemPrompt,
          user:
            attempt === 1
              ? userPrompt
              : `
The previous evaluation response was invalid.

You MUST return strict JSON only.

Do not use markdown.
Do not use code fences.
Do not add commentary.

${userPrompt}
`,
          maxTokens: 700,
          temperature:
            attempt === 1
              ? 0.1
              : 0,
        });

      const parsed =
        parseAIJson(result);

      if (!parsed) {
        throw new Error(
          `Invalid evaluator JSON on attempt ${attempt}`
        );
      }

      const technicalAccuracy =
        normalizeAIScore(
          parsed.technicalAccuracy
        );

      const relevance =
        normalizeAIScore(
          parsed.relevance
        );

      const depth =
        normalizeAIScore(
          parsed.depth
        );

      const clarity =
        normalizeAIScore(
          parsed.clarity
        );

      let score =
        calculateWeightedScore(
          parsed
        );

      if (
        score === null ||
        !Number.isFinite(score)
      ) {
        throw new Error(
          `Evaluator returned no valid score on attempt ${attempt}`
        );
      }

      if (
        technicalAccuracy === null ||
        relevance === null ||
        depth === null ||
        clarity === null
      ) {
        throw new Error(
          `Evaluator returned incomplete dimensions on attempt ${attempt}`
        );
      }

      score = clamp(score);

      const evaluation =
        normalizeEvaluation(
          parsed.evaluation,
          score
        );

      const difficultyChange =
        normalizeDifficultyChange(
          parsed.difficultyChange,
          score,
          currentDifficulty
        );

      const feedback =
        String(
          parsed.feedback || ""
        ).trim();

      if (!feedback) {
        throw new Error(
          `Evaluator returned empty feedback on attempt ${attempt}`
        );
      }

      const topic =
        String(
          parsed.topic || ""
        ).trim();

      if (!topic) {
        throw new Error(
          `Evaluator returned empty topic on attempt ${attempt}`
        );
      }

      console.log(
        `ANSWER EVALUATION SUCCESS: attempt=${attempt}, score=${score}, evaluation=${evaluation}`
      );

      return {
        score,
        evaluation,
        difficultyChange,
        feedback,
        topic,
        dimensions: {
          technicalAccuracy,
          relevance,
          depth,
          clarity,
        },
        source:
          attempt === 1
            ? "ai"
            : "ai-retry",
      };
    } catch (error) {
      lastError = error;

      console.error(
        `ANSWER EVALUATION ATTEMPT ${attempt} ERROR:`,
        error?.message || error
      );
    }
  }

  throw lastError ||
    new Error(
      "AI evaluator failed"
    );
};

// ============================================================
// ANSWER EVALUATION WRAPPER
// ============================================================

const evaluateAnswer = async ({
  currentQuestion,
  currentDifficulty,
  cleanAnswer,
  previousQuestion,
  recentProgress,
}) => {
  try {
    return await evaluateAnswerWithAI({
      currentQuestion,
      currentDifficulty,
      cleanAnswer,
      previousQuestion,
      recentProgress,
    });
  } catch (error) {
    console.error(
      "AI EVALUATOR FAILED AFTER RETRY:",
      error?.message || error
    );

    const fallback =
      deterministicEvaluationFallback({
        question:
          currentQuestion,
        answer:
          cleanAnswer,
      });

    console.warn(
      "USING DETERMINISTIC EVALUATION FALLBACK:",
      {
        score:
          fallback.score,
        evaluation:
          fallback.evaluation,
        topic:
          fallback.topic,
      }
    );

    return fallback;
  }
};

// ============================================================
// PROGRESS HELPERS
// ============================================================

const getAttemptedProgress = (
  interview
) => {
  return (
    interview.progress || []
  ).filter(
    (item) =>
      !item.skipped
  );
};

const getSkippedProgress = (
  interview
) => {
  return (
    interview.progress || []
  ).filter(
    (item) =>
      item.skipped
  );
};

const calculateFinalScore = (
  interview
) => {
  const attempted =
    getAttemptedProgress(
      interview
    );

  if (!attempted.length) {
    return 0;
  }

  const scores =
    attempted.map(
      (item) =>
        clamp(item.score)
    );

  return Math.round(
    scores.reduce(
      (sum, score) =>
        sum + score,
      0
    ) /
      scores.length
  );
};

// ============================================================
// FINAL REPORT
// ============================================================

const buildFinalReport = (
  interview,
  finalScore
) => {
  const attempted =
    getAttemptedProgress(
      interview
    );

  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  attempted
    .filter(
      (item) =>
        item.evaluation ===
        "strong"
    )
    .forEach((item) => {
      const topic =
        String(
          item.topic ||
            "General"
        ).trim();

      if (
        topic &&
        !strengths.includes(
          topic
        )
      ) {
        strengths.push(
          topic
        );
      }
    });

  attempted
    .filter(
      (item) =>
        item.evaluation ===
        "weak"
    )
    .forEach((item) => {
      const topic =
        String(
          item.topic ||
            "General"
        ).trim();

      if (
        topic &&
        !weaknesses.includes(
          topic
        )
      ) {
        weaknesses.push(
          topic
        );
      }
    });

  attempted
    .filter(
      (item) =>
        Number(item.score) <
        65
    )
    .forEach((item) => {
      const topic =
        String(
          item.topic ||
            "General"
        ).trim();

      if (
        topic &&
        !weaknesses.includes(
          topic
        )
      ) {
        weaknesses.push(
          topic
        );
      }
    });

  if (
    !strengths.length &&
    finalScore >= 75
  ) {
    strengths.push(
      "Consistent technical understanding"
    );
  }

  if (
    !weaknesses.length &&
    finalScore < 75
  ) {
    weaknesses.push(
      "Technical depth and answer precision"
    );
  }

  weaknesses
    .slice(0, 5)
    .forEach((topic) => {
      recommendations.push(
        `Practice ${topic} with practical examples, implementation questions, and step-by-step explanations.`
      );
    });

  if (finalScore < 80) {
    recommendations.push(
      "Practice explaining technical answers with a clear structure: concept, reasoning, example, and trade-off."
    );
  }

  if (finalScore < 60) {
    recommendations.push(
      "Strengthen foundational concepts before attempting advanced interview problems."
    );
  }

  if (finalScore >= 80) {
    recommendations.push(
      "Continue practicing harder technical problems and deeper system or implementation questions."
    );
  }

  const skipped =
    getSkippedProgress(
      interview
    ).length;

  if (skipped > 0) {
    recommendations.push(
      "Review skipped questions and practice answering unfamiliar concepts instead of immediately skipping them."
    );
  }

  const summary =
    finalScore >= 85
      ? "Excellent interview performance with strong technical understanding and successful progression toward higher difficulty."
      : finalScore >= 75
        ? "Strong interview performance with a solid technical foundation and successful handling of increasing difficulty."
        : finalScore >= 60
          ? "Moderate interview performance. The candidate demonstrates useful knowledge but needs greater depth and consistency."
          : "The interview indicates that the candidate needs stronger preparation in the evaluated technical areas.";

  return {
    summary,
    strengths:
      strengths.slice(0, 5),
    weaknesses:
      weaknesses.slice(0, 5),
    recommendations:
      recommendations.slice(
        0,
        7
      ),
  };
};

// ============================================================
// COMPANY RESULT
// ============================================================

const getCompanyResult = (
  score,
  companyProfile
) => {
  if (
    score >=
    companyProfile.expectedScore
  ) {
    return `Your performance meets the expected ${companyProfile.name} interview standard.`;
  }

  if (
    score >=
    companyProfile.expectedScore -
      10
  ) {
    return `Your performance is close to the expected ${companyProfile.name} standard, but some improvement is needed.`;
  }

  return `Your current performance is below the expected ${companyProfile.name} interview standard.`;
};

// ============================================================
// GET COMPANIES
// ============================================================

const getCompanies = async (
  req,
  res
) => {
  try {
    return res.json({
      success: true,
      companies:
        COMPANIES,
    });
  } catch (error) {
    console.error(
      "GET COMPANIES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load companies",
    });
  }
};

// ============================================================
// START INTERVIEW
// ============================================================

const startInterview = async (
  req,
  res
) => {
  try {
    const {
      domain,
      company,
    } = req.body;

    if (
      !domain ||
      !String(domain).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Domain is required",
      });
    }

    const cleanDomain =
      String(domain).trim();

    const companyProfile =
      getCompanyProfile(
        company
      );

    const startingDifficulty =
      "easy";

    let firstQuestion = "";

    try {
      firstQuestion =
        cleanQuestion(
          await callGroq({
            system:
              buildQuestionSystemPrompt(
                cleanDomain,
                companyProfile
              ),

            user: `
Generate the first technical interview question.

QUESTION NUMBER:
1 of ${MAX_QUESTIONS}

REQUIRED DIFFICULTY:
easy

This is the beginning of the interview.
Test foundational understanding.

Return ONLY the question.
`.trim(),

            maxTokens: 500,
            temperature: 0.5,
          })
        );
    } catch (error) {
      console.error(
        "FIRST QUESTION AI ERROR:",
        error?.message ||
          error
      );
    }

    if (
      !isValidQuestion(
        firstQuestion,
        []
      )
    ) {
      firstQuestion =
        getFallbackQuestion(
          cleanDomain,
          "easy",
          1
        );
    }

    const interview =
      await Interview.create({
        userId:
          req.userId,

        domain:
          cleanDomain,

        company:
          companyProfile.id,

        companyName:
          companyProfile.name,

        companyExpectedScore:
          companyProfile.expectedScore,

        currentDifficulty:
          startingDifficulty,

        startingDifficulty,

        difficultyHistory: [
          startingDifficulty,
        ],

        questions: [
          firstQuestion,
        ],

        progress: [],

        messages: [
          {
            role: "assistant",
            content:
              firstQuestion,
            timestamp:
              new Date(),
          },
        ],

        score: 0,

        duration: 0,

        questionsAnswered: 0,

        questionsSkipped: 0,

        isComplete: false,

        totalQuestions:
          MAX_QUESTIONS,

        highestDifficulty:
          startingDifficulty,
      });

    return res.status(201).json({
      success: true,

      sessionId:
        interview._id,

      question:
        firstQuestion,

      nextQuestion:
        firstQuestion,

      difficulty:
        startingDifficulty,

      currentDifficulty:
        startingDifficulty,

      highestDifficulty:
        startingDifficulty,

      questionNumber: 1,

      totalQuestions:
        MAX_QUESTIONS,

      company: {
        id:
          companyProfile.id,

        name:
          companyProfile.name,

        expectedScore:
          companyProfile.expectedScore,

        style:
          companyProfile.style,

        focus:
          companyProfile.focus,
      },

      companyName:
        companyProfile.name,

      companyExpectedScore:
        companyProfile.expectedScore,
    });
  } catch (error) {
    console.error(
      "START INTERVIEW ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to start interview",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// SUBMIT ANSWER
// ============================================================

const submitAnswer = async (
  req,
  res
) => {
  try {
    const {
      sessionId,
      interviewId,
      answer,
      domain,
      company,
      skipped:
        requestedSkipped,
    } = req.body;

    const actualSessionId =
      sessionId ||
      interviewId;

    if (!actualSessionId) {
      return res.status(400).json({
        success: false,
        message:
          "Session ID is required",
      });
    }

    if (
      answer === undefined ||
      answer === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Answer is required",
      });
    }

    const interview =
      await Interview.findOne({
        _id:
          actualSessionId,

        userId:
          req.userId,
      });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message:
          "Interview session not found",
      });
    }

    if (interview.isComplete) {
      return res.status(400).json({
        success: false,
        message:
          "Interview is already complete",
      });
    }

    const interviewDomain =
      interview.domain ||
      domain ||
      "software development";

    const companyProfile =
      getCompanyProfile(
        interview.company ||
          company
      );

    const currentQuestion =
      interview.questions?.[
        interview.questions.length -
          1
      ];

    if (!currentQuestion) {
      return res.status(400).json({
        success: false,
        message:
          "Current question not found",
      });
    }

    const cleanAnswer =
      String(answer).trim();

    const previousAnswers =
      (
        interview.progress ||
        []
      )
        .map(
          (item) =>
            item.answer
        )
        .filter(Boolean);

    const skipped =
      requestedSkipped === true ||
      isSkipAnswer(
        cleanAnswer
      );

    const repeated =
      !skipped &&
      isRepeatedAnswer(
        cleanAnswer,
        previousAnswers
      );

    const currentDifficulty =
      normalizeDifficulty(
        interview.currentDifficulty
      );

    let evaluation =
      "average";

    let answerScore = 60;

    let difficultyChange =
      "maintain";

    let feedback =
      "Your answer was received successfully.";

    let topic =
      "General";

    let dimensions = {
      technicalAccuracy: 60,
      relevance: 60,
      depth: 60,
      clarity: 60,
    };

    let evaluationSource =
      "none";

    // ========================================================
    // SKIPPED
    // ========================================================

    if (skipped) {
      evaluation =
        "skipped";

      answerScore = 0;

      difficultyChange =
        currentDifficulty ===
        "easy"
          ? "maintain"
          : "decrease";

      topic =
        "Foundational Knowledge";

      feedback =
        "You skipped this question. Review the underlying fundamentals and practice explaining the concept in your own words.";

      dimensions = {
        technicalAccuracy: 0,
        relevance: 0,
        depth: 0,
        clarity: 0,
      };

      evaluationSource =
        "skip";
    }

    // ========================================================
    // REPEATED ANSWER
    // ========================================================

    else if (repeated) {
      evaluation =
        "weak";

      answerScore = 20;

      difficultyChange =
        currentDifficulty ===
        "easy"
          ? "maintain"
          : "decrease";

      topic =
        "Answer Relevance";

      feedback =
        "Your response is very similar to a previous answer and does not demonstrate enough understanding of the current question.";

      dimensions = {
        technicalAccuracy: 20,
        relevance: 20,
        depth: 20,
        clarity: 20,
      };

      evaluationSource =
        "repeated-answer";
    }

    // ========================================================
    // NORMAL AI EVALUATION
    // ========================================================

    else {
      const recentProgress =
        (
          interview.progress ||
          []
        )
          .slice(-3)
          .map(
            (
              item,
              index
            ) =>
              `Answer ${
                index + 1
              }: Topic=${
                item.topic ||
                "General"
              }, Difficulty=${
                item.difficulty ||
                "easy"
              }, Evaluation=${
                item.evaluation ||
                "average"
              }, Score=${
                item.score ?? 0
              }`
          )
          .join("\n");

      const previousQuestion =
        interview.questions
          ?.length > 1
          ? interview.questions[
              interview.questions
                .length - 2
            ]
          : "None";

      const evaluated =
        await evaluateAnswer({
          currentQuestion,
          currentDifficulty,
          cleanAnswer,
          previousQuestion,
          recentProgress,
        });

      answerScore =
        clamp(
          evaluated.score
        );

      evaluation =
        normalizeEvaluation(
          evaluated.evaluation,
          answerScore
        );

      difficultyChange =
        normalizeDifficultyChange(
          evaluated.difficultyChange,
          answerScore,
          currentDifficulty
        );

      feedback =
        evaluated.feedback;

      topic =
        evaluated.topic;

      dimensions =
        evaluated.dimensions;

      evaluationSource =
        evaluated.source;
    }

    // ========================================================
    // FINAL NORMALIZATION
    // ========================================================

    answerScore =
      clamp(answerScore);

    if (!skipped) {
      evaluation =
        normalizeEvaluation(
          evaluation,
          answerScore
        );

      difficultyChange =
        normalizeDifficultyChange(
          difficultyChange,
          answerScore,
          currentDifficulty
        );
    }

    const nextDifficulty =
      getNextDifficulty(
        currentDifficulty,
        difficultyChange
      );

    // ========================================================
    // SAVE PROGRESS
    // ========================================================

    if (
      !Array.isArray(
        interview.progress
      )
    ) {
      interview.progress = [];
    }

    interview.progress.push({
      question:
        currentQuestion,

      answer:
        cleanAnswer,

      difficulty:
        currentDifficulty,

      evaluation,

      score:
        answerScore,

      feedback,

      skipped,

      repeated,

      topic,

      timestamp:
        new Date(),
    });

    // ========================================================
    // SAVE USER MESSAGE
    // ========================================================

    if (
      !Array.isArray(
        interview.messages
      )
    ) {
      interview.messages = [];
    }

    interview.messages.push({
      role: "user",

      content:
        cleanAnswer,

      timestamp:
        new Date(),
    });

    // ========================================================
    // COUNTERS
    // ========================================================

    if (!skipped) {
      interview.questionsAnswered =
        (
          interview.questionsAnswered ||
          0
        ) + 1;
    }

    if (skipped) {
      interview.questionsSkipped =
        (
          interview.questionsSkipped ||
          0
        ) + 1;
    }

    // ========================================================
    // DIFFICULTY
    // ========================================================

    interview.currentDifficulty =
      nextDifficulty;

    if (
      !Array.isArray(
        interview.difficultyHistory
      )
    ) {
      interview.difficultyHistory =
        [];
    }

    interview.difficultyHistory.push(
      nextDifficulty
    );

    if (
      interview.difficultyHistory.includes(
        "hard"
      )
    ) {
      interview.highestDifficulty =
        "hard";
    } else if (
      interview.difficultyHistory.includes(
        "medium"
      )
    ) {
      interview.highestDifficulty =
        "medium";
    } else {
      interview.highestDifficulty =
        "easy";
    }

    // ========================================================
    // COMPLETE INTERVIEW
    // ========================================================

    if (
      interview.progress.length >=
      MAX_QUESTIONS
    ) {
      const finalScore =
        calculateFinalScore(
          interview
        );

      const finalReport =
        buildFinalReport(
          interview,
          finalScore
        );

      const attemptedProgress =
        getAttemptedProgress(
          interview
        );

      const skippedProgress =
        getSkippedProgress(
          interview
        );

      interview.score =
        finalScore;

      interview.questionsAnswered =
        attemptedProgress.length;

      interview.questionsSkipped =
        skippedProgress.length;

      interview.isComplete =
        true;

      interview.completedAt =
        new Date();

      interview.totalQuestions =
        MAX_QUESTIONS;

      interview.summary =
        finalReport.summary;

      interview.strengths =
        finalReport.strengths;

      interview.weaknesses =
        finalReport.weaknesses;

      interview.recommendations =
        finalReport.recommendations;

      if (
        interview.createdAt
      ) {
        const durationMs =
          interview.completedAt.getTime() -
          new Date(
            interview.createdAt
          ).getTime();

        interview.duration =
          Math.max(
            1,
            Math.round(
              durationMs /
                60000
            )
          );
      }

      await interview.save();

      // ======================================================
      // UPDATE USER INTERVIEW PERFORMANCE
      // ======================================================
      //
      // This intentionally represents the user's average
      // across completed interviews, not only this interview.
      // ======================================================

      let interviewPerformance =
        finalScore;

      try {
        const completedInterviews =
          await Interview.find({
            userId:
              req.userId,

            isComplete:
              true,
          }).select(
            "score"
          );

        const scores =
          completedInterviews
            .map(
              (item) =>
                Number(
                  item.score
                )
            )
            .filter(
              (score) =>
                Number.isFinite(
                  score
                )
            );

        interviewPerformance =
          scores.length
            ? Math.round(
                scores.reduce(
                  (
                    sum,
                    score
                  ) =>
                    sum + score,
                  0
                ) /
                  scores.length
              )
            : finalScore;

        await User.findByIdAndUpdate(
          req.userId,
          {
            $set: {
              interviewPerformance:
                interviewPerformance,
            },
          },
          {
            runValidators:
              true,
          }
        );
      } catch (error) {
        console.error(
          "USER INTERVIEW PERFORMANCE UPDATE ERROR:",
          error?.message ||
            error
        );
      }

      // ======================================================
      // COMPANY RESULT
      // ======================================================

      const expectedScore =
        Number(
          interview.companyExpectedScore
        ) ||
        companyProfile.expectedScore;

      const effectiveCompany = {
        ...companyProfile,

        name:
          interview.companyName ||
          companyProfile.name,

        expectedScore,
      };

      const companyResult =
        getCompanyResult(
          finalScore,
          effectiveCompany
        );

      const strong =
        attemptedProgress.filter(
          (item) =>
            item.evaluation ===
            "strong"
        ).length;

      const average =
        attemptedProgress.filter(
          (item) =>
            item.evaluation ===
            "average"
        ).length;

      const weak =
        attemptedProgress.filter(
          (item) =>
            item.evaluation ===
            "weak"
        ).length;

      const difficultyProgression =
        interview.progress.map(
          (
            item,
            index
          ) => ({
            questionNumber:
              index + 1,

            difficulty:
              item.difficulty,

            score:
              item.score,

            evaluation:
              item.evaluation,

            topic:
              item.topic,

            skipped:
              !!item.skipped,

            repeated:
              !!item.repeated,

            feedback:
              item.feedback,
          })
        );

      return res.json({
        success: true,

        complete: true,

        isComplete: true,

        sessionId:
          interview._id,

        score:
          finalScore,

        finalScore:
          finalScore,

        totalQuestions:
          MAX_QUESTIONS,

        questionsAnswered:
          attemptedProgress.length,

        questionsSkipped:
          skippedProgress.length,

        skippedQuestions:
          skippedProgress.length,

        company: {
          id:
            effectiveCompany.id,

          name:
            effectiveCompany.name,

          expectedScore,

          result:
            companyResult,

          style:
            effectiveCompany.style,

          focus:
            effectiveCompany.focus,
        },

        companyName:
          effectiveCompany.name,

        companyExpectedScore:
          expectedScore,

        performance: {
          strong,

          average,

          weak,

          skipped:
            skippedProgress.length,
        },

        difficultyProgression,

        startingDifficulty:
          interview.startingDifficulty,

        finalDifficulty:
          interview.currentDifficulty,

        highestDifficulty:
          interview.highestDifficulty,

        difficultyHistory:
          interview.difficultyHistory,

        summary:
          finalReport.summary,

        strengths:
          finalReport.strengths,

        weaknesses:
          finalReport.weaknesses,

        recommendations:
          finalReport.recommendations,

        evaluation,

        answerScore,

        feedback,

        topic,

        skipped,

        repeated,

        difficulty:
          interview.currentDifficulty,

        nextDifficulty:
          interview.currentDifficulty,

        difficultyChange,

        dimensions,

        evaluationSource,

        interviewPerformance,
      });
    }

    // ========================================================
    // GENERATE NEXT QUESTION
    // ========================================================

    const previousQuestions =
      [
        ...(interview.questions ||
          []),
      ];

    const recentPerformance =
      (
        interview.progress ||
        []
      )
        .slice(-4)
        .map(
          (
            item,
            index
          ) =>
            `Answer ${
              index + 1
            }: Topic=${
              item.topic ||
              "General"
            }, Difficulty=${
              item.difficulty ||
              "easy"
            }, Evaluation=${
              item.evaluation ||
              "average"
            }, Score=${
              item.score ?? 0
            }`
        )
        .join("\n");

    const compactQuestions =
      previousQuestions
        .slice(-5)
        .map(
          (
            question,
            index
          ) =>
            `${index + 1}. ${question}`
        )
        .join("\n");

    let nextQuestion = "";

    const generateNextQuestion =
      async (
        regenerate = false
      ) => {
        return callGroq({
          system:
            buildQuestionSystemPrompt(
              interviewDomain,
              companyProfile
            ),

          user: `
Generate the next technical interview question.

QUESTION NUMBER:
${
  interview.progress.length + 1
} of ${MAX_QUESTIONS}

REQUIRED DIFFICULTY:
${nextDifficulty}

CURRENT TOPIC:
${topic}

LATEST EVALUATION:
${evaluation}

LATEST SCORE:
${answerScore}/100

LATEST CANDIDATE ANSWER:
${cleanAnswer}

PREVIOUS QUESTIONS:
${compactQuestions}

RECENT PERFORMANCE:
${recentPerformance || "None"}

ADAPTIVE DECISION:
${
  skipped
    ? "The candidate skipped the previous question. Move to a simpler foundational concept."
    : repeated
      ? "The candidate repeated a previous answer. Move to a different concept."
      : evaluation ===
          "strong"
        ? "The candidate performed strongly. Increase technical depth and challenge."
        : evaluation ===
            "weak"
          ? "The candidate struggled. Move toward fundamentals."
          : "The candidate performed at an average level. Maintain approximately the same difficulty."
}

The generated question MUST match:
${nextDifficulty}

If EASY:
- Foundational.
- Avoid advanced architecture.

If MEDIUM:
- Practical implementation or reasoning.

If HARD:
- Deep technical reasoning.
- Multiple concepts.
- Performance.
- Scalability.
- Architecture.
- Trade-offs.

FOLLOW-UP:
Use the candidate's demonstrated knowledge to inform the next question.

Do not simply repeat or reword a previous question.

${
  regenerate
    ? "The previous generated question was invalid or duplicated. Generate a substantially different question about another concept."
    : ""
}

STRICT RULES:
- Exactly ONE question.
- Never repeat a previous question.
- Do not ask generic HR questions.
- Do not include an answer.
- Do not include feedback.
- Do not include JSON.
- Do not mention difficulty.
- Return ONLY the question.
`.trim(),

          maxTokens: 700,

          temperature:
            regenerate
              ? 0.85
              : 0.65,
        });
      };

    try {
      nextQuestion =
        cleanQuestion(
          await generateNextQuestion(
            false
          )
        );
    } catch (error) {
      console.error(
        "NEXT QUESTION AI ERROR:",
        error?.message ||
          error
      );
    }

    if (
      !isValidQuestion(
        nextQuestion,
        previousQuestions
      )
    ) {
      try {
        const regenerated =
          cleanQuestion(
            await generateNextQuestion(
              true
            )
          );

        if (
          isValidQuestion(
            regenerated,
            previousQuestions
          )
        ) {
          nextQuestion =
            regenerated;
        }
      } catch (error) {
        console.error(
          "QUESTION REGENERATION ERROR:",
          error?.message ||
            error
        );
      }
    }

    if (
      !isValidQuestion(
        nextQuestion,
        previousQuestions
      )
    ) {
      nextQuestion =
        getUniqueFallbackQuestion({
          domain:
            interviewDomain,

          difficulty:
            nextDifficulty,

          questionNumber:
            interview.progress
              .length + 1,

          previousQuestions,
        });
    }

    // ========================================================
    // SAVE NEXT QUESTION
    // ========================================================

    interview.questions.push(
      nextQuestion
    );

    interview.messages.push({
      role: "assistant",

      content:
        nextQuestion,

      timestamp:
        new Date(),
    });

    await interview.save();

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({
      success: true,

      complete: false,

      isComplete: false,

      sessionId:
        interview._id,

      nextQuestion,

      question:
        nextQuestion,

      questionNumber:
        interview.questions.length,

      totalQuestions:
        MAX_QUESTIONS,

      evaluation,

      answerScore,

      score:
        answerScore,

      feedback,

      topic,

      skipped,

      repeated,

      previousDifficulty:
        currentDifficulty,

      difficultyChange,

      difficulty:
        nextDifficulty,

      nextDifficulty,

      currentDifficulty:
        nextDifficulty,

      dimensions,

      evaluationSource,

      adaptive: {
        previousDifficulty:
          currentDifficulty,

        newDifficulty:
          nextDifficulty,

        change:
          difficultyChange,

        reason:
          skipped
            ? "Question skipped"
            : repeated
              ? "Repeated answer detected"
              : evaluation ===
                  "strong"
                ? "Strong performance"
                : evaluation ===
                    "weak"
                  ? "Weak performance"
                  : "Average performance",
      },

      company: {
        id:
          companyProfile.id,

        name:
          companyProfile.name,

        expectedScore:
          companyProfile.expectedScore,

        style:
          companyProfile.style,

        focus:
          companyProfile.focus,
      },

      companyName:
        companyProfile.name,

      companyExpectedScore:
        companyProfile.expectedScore,
    });
  } catch (error) {
    console.error(
      "SUBMIT ANSWER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to process interview answer",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET ALL INTERVIEWS
// ============================================================

const getInterviews = async (
  req,
  res
) => {
  try {
    const interviews =
      await Interview.find({
        userId:
          req.userId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    const result =
      interviews.map(
        (interview) => {
          const companyProfile =
            getCompanyProfile(
              interview.company
            );

          const progress =
            Array.isArray(
              interview.progress
            )
              ? interview.progress
              : [];

          const answered =
            progress.filter(
              (item) =>
                !item.skipped
            ).length;

          const skippedCount =
            progress.filter(
              (item) =>
                item.skipped
            ).length;

          return {
            ...interview,

            id:
              interview._id,

            companyName:
              interview.companyName ||
              companyProfile.name,

            companyExpectedScore:
              Number(
                interview.companyExpectedScore
              ) ||
              companyProfile.expectedScore,

            totalQuestions:
              MAX_QUESTIONS,

            questionsAnswered:
              answered,

            questionsSkipped:
              skippedCount,

            skippedQuestions:
              skippedCount,

            startingDifficulty:
              interview.startingDifficulty ||
              "easy",

            endingDifficulty:
              interview.currentDifficulty ||
              "easy",

            highestDifficulty:
              interview.highestDifficulty ||
              "easy",

            difficultyHistory:
              interview.difficultyHistory ||
              [],
          };
        }
      );

    return res.json({
      success: true,
      interviews:
        result,
    });
  } catch (error) {
    console.error(
      "GET INTERVIEWS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load interview history",
    });
  }
};

// ============================================================
// GET SINGLE INTERVIEW
// ============================================================

const getInterview = async (
  req,
  res
) => {
  try {
    const interview =
      await Interview.findOne({
        _id:
          req.params.id,

        userId:
          req.userId,
      }).lean();

    if (!interview) {
      return res.status(404).json({
        success: false,
        message:
          "Interview not found",
      });
    }

    const companyProfile =
      getCompanyProfile(
        interview.company
      );

    const progress =
      Array.isArray(
        interview.progress
      )
        ? interview.progress
        : [];

    const answered =
      progress.filter(
        (item) =>
          !item.skipped
      ).length;

    const skippedCount =
      progress.filter(
        (item) =>
          item.skipped
      ).length;

    const finalScore =
      Number(
        interview.score
      ) || 0;

    return res.json({
      success: true,

      interview: {
        ...interview,

        id:
          interview._id,

        companyName:
          interview.companyName ||
          companyProfile.name,

        companyExpectedScore:
          Number(
            interview.companyExpectedScore
          ) ||
          companyProfile.expectedScore,

        totalQuestions:
          MAX_QUESTIONS,

        questionsAnswered:
          answered,

        questionsSkipped:
          skippedCount,

        skippedQuestions:
          skippedCount,

        finalScore,

        startingDifficulty:
          interview.startingDifficulty ||
          "easy",

        finalDifficulty:
          interview.currentDifficulty ||
          "easy",

        highestDifficulty:
          interview.highestDifficulty ||
          "easy",

        difficultyHistory:
          interview.difficultyHistory ||
          [],

        difficultyProgression:
          progress.map(
            (
              item,
              index
            ) => ({
              questionNumber:
                index + 1,

              difficulty:
                item.difficulty,

              score:
                item.score,

              evaluation:
                item.evaluation,

              topic:
                item.topic,

              skipped:
                !!item.skipped,

              repeated:
                !!item.repeated,

              feedback:
                item.feedback,
            })
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET INTERVIEW ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load interview report",
    });
  }
};

// ============================================================
// GET SKILL ASSESSMENT
// ============================================================

const getSkillAssessment =
  async (req, res) => {
    try {
      const interviews =
        await Interview.find({
          userId:
            req.userId,

          isComplete:
            true,
        }).select(
          "domain score progress createdAt"
        );

      if (!interviews.length) {
        try {
          await User.findByIdAndUpdate(
            req.userId,
            {
              $set: {
                skillAssessment:
                  0,
              },
            },
            {
              runValidators:
                true,
            }
          );
        } catch (_) {}

        return res.json({
          success: true,

          skillAssessment:
            0,

          skills: [],

          weakSkills: [],

          strongSkills: [],

          interviewsUsed:
            0,
        });
      }

      const topicScores = {};

      interviews.forEach(
        (interview) => {
          if (
            !Array.isArray(
              interview.progress
            )
          ) {
            return;
          }

          interview.progress.forEach(
            (item) => {
              if (
                item.skipped
              ) {
                return;
              }

              const topic =
                item.topic &&
                String(
                  item.topic
                ).trim()
                  ? String(
                      item.topic
                    ).trim()
                  : interview.domain ||
                    "General";

              const score =
                Number(
                  item.score
                );

              if (
                !Number.isFinite(
                  score
                )
              ) {
                return;
              }

              if (
                !topicScores[
                  topic
                ]
              ) {
                topicScores[
                  topic
                ] = [];
              }

              topicScores[
                topic
              ].push(
                clamp(score)
              );
            }
          );
        }
      );

      const skills =
        Object.entries(
          topicScores
        )
          .map(
            (
              [topic, scores]
            ) => {
              const average =
                scores.reduce(
                  (
                    sum,
                    score
                  ) =>
                    sum + score,
                  0
                ) /
                scores.length;

              const score =
                Math.round(
                  average
                );

              return {
                topic,

                score,

                status:
                  score >= 75
                    ? "strong"
                    : score >= 50
                      ? "average"
                      : "weak",

                questionsAnswered:
                  scores.length,
              };
            }
          )
          .sort(
            (a, b) =>
              b.score -
              a.score
          );

      const strongSkills =
        skills.filter(
          (skill) =>
            skill.score >= 75
        );

      const weakSkills =
        skills.filter(
          (skill) =>
            skill.score < 50
        );

      const allScores =
        Object.values(
          topicScores
        ).flat();

      const skillAssessment =
        allScores.length
          ? Math.round(
              allScores.reduce(
                (
                  sum,
                  score
                ) =>
                  sum + score,
                0
              ) /
                allScores.length
            )
          : 0;

      try {
        await User.findByIdAndUpdate(
          req.userId,
          {
            $set: {
              skillAssessment:
                skillAssessment,
            },
          },
          {
            runValidators:
              true,
          }
        );
      } catch (error) {
        console.error(
          "SKILL ASSESSMENT USER UPDATE ERROR:",
          error?.message ||
            error
        );
      }

      return res.json({
        success: true,

        skillAssessment:
          skillAssessment,

        skills,

        weakSkills,

        strongSkills,

        interviewsUsed:
          interviews.length,
      });
    } catch (error) {
      console.error(
        "GET SKILL ASSESSMENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to calculate skill assessment",

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
  getCompanies,
  startInterview,
  submitAnswer,
  getInterviews,
  getInterview,
  getSkillAssessment,
};