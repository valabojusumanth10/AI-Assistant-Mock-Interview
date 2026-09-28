const COMPANY_PROFILES = {
  google: {
    id: "google",
    name: "Google",
    shortName: "Google",

    description:
      "Product-based company interview style focused on strong problem solving, algorithms, technical depth, optimization, and clear communication.",

    interviewStyle:
      "Deep technical interview with emphasis on reasoning, problem solving, algorithms, optimization, and explaining trade-offs.",

    difficulty: "hard",

    expectedScore: 75,

    questionPatterns: [
      "Data Structures and Algorithms",
      "Problem solving",
      "Time and space complexity",
      "Optimization",
      "JavaScript or domain-specific fundamentals",
      "Debugging and edge cases",
      "System design for experienced-level questions",
      "Technical reasoning",
    ],

    technicalFocus: [
      "Data Structures",
      "Algorithms",
      "Problem Solving",
      "Time Complexity",
      "Space Complexity",
      "Optimization",
      "Core CS Fundamentals",
      "System Design",
    ],

    evaluationCriteria: [
      "Problem solving ability",
      "Correctness of solution",
      "Time and space complexity",
      "Optimization",
      "Technical depth",
      "Handling edge cases",
      "Reasoning and explanation",
      "Communication clarity",
    ],

    hiringExpectations:
      "The candidate should demonstrate strong problem-solving ability, understand complexity, reason through edge cases, and explain technical decisions clearly.",

    recruiterStyle:
      "Analytical, technically deep, and focused on how the candidate thinks rather than only whether the final answer is correct.",
  },

  amazon: {
    id: "amazon",
    name: "Amazon",
    shortName: "Amazon",

    description:
      "Product-based company interview style combining technical problem solving, practical engineering, system thinking, and leadership-oriented evaluation.",

    interviewStyle:
      "Structured technical interview with practical problem solving, engineering judgment, technical fundamentals, and behavioral evaluation.",

    difficulty: "hard",

    expectedScore: 72,

    questionPatterns: [
      "Data Structures and Algorithms",
      "Practical coding",
      "Debugging",
      "Backend engineering",
      "System design",
      "Scalability",
      "API design",
      "Database fundamentals",
      "Leadership and ownership scenarios",
      "Real-world engineering decisions",
    ],

    technicalFocus: [
      "Data Structures",
      "Algorithms",
      "Backend Development",
      "APIs",
      "Databases",
      "System Design",
      "Scalability",
      "Debugging",
      "Software Engineering Practices",
    ],

    evaluationCriteria: [
      "Problem solving",
      "Technical correctness",
      "Practical engineering judgment",
      "Scalability awareness",
      "System design",
      "Debugging ability",
      "Ownership",
      "Communication",
      "Decision making",
    ],

    hiringExpectations:
      "The candidate should solve technical problems effectively, demonstrate practical engineering judgment, understand scalability, and communicate decisions with clear reasoning.",

    recruiterStyle:
      "Practical, structured, and focused on engineering decisions, ownership, scalability, and measurable outcomes.",
  },

  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    shortName: "Microsoft",

    description:
      "Product-based interview style focused on problem solving, coding fundamentals, software engineering, system design, and communication.",

    interviewStyle:
      "Technical interview combining coding, computer science fundamentals, practical engineering, and system-level thinking.",

    difficulty: "hard",

    expectedScore: 72,

    questionPatterns: [
      "Data Structures and Algorithms",
      "Coding",
      "Object-Oriented Programming",
      "Operating Systems",
      "Database concepts",
      "Networking",
      "System Design",
      "Debugging",
      "Software engineering practices",
      "Technical fundamentals",
    ],

    technicalFocus: [
      "Data Structures",
      "Algorithms",
      "Object-Oriented Programming",
      "Operating Systems",
      "Databases",
      "Computer Networks",
      "System Design",
      "Software Engineering",
    ],

    evaluationCriteria: [
      "Coding correctness",
      "Problem solving",
      "Technical fundamentals",
      "Code quality",
      "System thinking",
      "Debugging",
      "Trade-off analysis",
      "Communication",
    ],

    hiringExpectations:
      "The candidate should have strong CS fundamentals, write clean solutions, reason about trade-offs, and demonstrate the ability to design and debug software systems.",

    recruiterStyle:
      "Balanced between fundamental CS knowledge, coding ability, engineering quality, and clear technical communication.",
  },

  tcs: {
    id: "tcs",
    name: "TCS",
    shortName: "TCS",

    description:
      "Service-based company interview style focused on programming fundamentals, core computer science concepts, projects, communication, and practical technical knowledge.",

    interviewStyle:
      "Structured interview focusing on fundamentals, programming concepts, project understanding, and practical problem solving.",

    difficulty: "medium",

    expectedScore: 65,

    questionPatterns: [
      "Programming fundamentals",
      "Object-Oriented Programming",
      "Data Structures",
      "SQL",
      "Database fundamentals",
      "Computer Networks",
      "Operating Systems",
      "Projects",
      "Basic coding problems",
      "Behavioral questions",
    ],

    technicalFocus: [
      "Programming Fundamentals",
      "Data Structures",
      "OOP",
      "SQL",
      "Databases",
      "Operating Systems",
      "Computer Networks",
      "Projects",
    ],

    evaluationCriteria: [
      "Programming fundamentals",
      "Technical knowledge",
      "Basic problem solving",
      "Project understanding",
      "SQL knowledge",
      "Communication",
      "Confidence",
      "Conceptual clarity",
    ],

    hiringExpectations:
      "The candidate should demonstrate solid programming fundamentals, understand their projects, explain core CS concepts clearly, and solve basic to moderate technical problems.",

    recruiterStyle:
      "Structured and fundamentals-oriented, with emphasis on whether the candidate understands the concepts listed in their resume.",
  },

  infosys: {
    id: "infosys",
    name: "Infosys",
    shortName: "Infosys",

    description:
      "Service-based company interview style focused on programming fundamentals, logical reasoning, projects, databases, communication, and adaptability.",

    interviewStyle:
      "Fundamentals-oriented technical interview with programming, project discussion, problem solving, and communication assessment.",

    difficulty: "medium",

    expectedScore: 65,

    questionPatterns: [
      "Programming fundamentals",
      "Data Structures",
      "OOP",
      "SQL",
      "Database concepts",
      "Computer Networks",
      "Operating Systems",
      "Project discussion",
      "Logical problem solving",
      "Behavioral questions",
    ],

    technicalFocus: [
      "Programming Fundamentals",
      "Data Structures",
      "OOP",
      "SQL",
      "Databases",
      "Operating Systems",
      "Computer Networks",
      "Projects",
      "Problem Solving",
    ],

    evaluationCriteria: [
      "Programming fundamentals",
      "Problem solving",
      "Technical knowledge",
      "Project understanding",
      "Database knowledge",
      "Communication",
      "Adaptability",
      "Conceptual clarity",
    ],

    hiringExpectations:
      "The candidate should have a reliable understanding of programming and CS fundamentals, explain projects confidently, and demonstrate logical problem-solving ability.",

    recruiterStyle:
      "Fundamentals-focused and structured, evaluating conceptual understanding, project knowledge, communication, and learning ability.",
  },

  startup: {
    id: "startup",
    name: "Startup",
    shortName: "Startup",

    description:
      "Startup interview style focused on practical engineering, real-world problem solving, projects, debugging, adaptability, ownership, and ability to build quickly.",

    interviewStyle:
      "Highly practical interview focused on real-world engineering problems, projects, debugging, implementation decisions, and adaptability.",

    difficulty: "medium",

    expectedScore: 65,

    questionPatterns: [
      "Real-world problem solving",
      "Project discussion",
      "Debugging",
      "API development",
      "Database decisions",
      "System design",
      "Architecture decisions",
      "Performance optimization",
      "Deployment",
      "Production problems",
      "Practical coding",
    ],

    technicalFocus: [
      "Practical Development",
      "Backend Development",
      "Frontend Development",
      "APIs",
      "Databases",
      "Debugging",
      "System Design",
      "Deployment",
      "Performance",
      "Projects",
    ],

    evaluationCriteria: [
      "Practical problem solving",
      "Implementation ability",
      "Debugging",
      "Engineering judgment",
      "Project ownership",
      "Adaptability",
      "Speed of reasoning",
      "Technical communication",
      "Real-world decision making",
    ],

    hiringExpectations:
      "The candidate should demonstrate that they can build, debug, deploy, and improve real applications while making sensible engineering decisions with limited guidance.",

    recruiterStyle:
      "Practical and direct, focusing heavily on whether the candidate can actually build and solve real-world problems.",
  },
};


/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

const getCompanyProfile = (company) => {
  if (!company) {
    return null;
  }

  const normalizedCompany = String(company)
    .trim()
    .toLowerCase();

  return COMPANY_PROFILES[normalizedCompany] || null;
};


const getAvailableCompanies = () => {
  return Object.values(COMPANY_PROFILES).map(
    (company) => ({
      id: company.id,
      name: company.name,
      shortName: company.shortName,
      description: company.description,
      difficulty: company.difficulty,
      expectedScore: company.expectedScore,
    }),
  );
};


const isValidCompany = (company) => {
  return Boolean(getCompanyProfile(company));
};


module.exports = {
  COMPANY_PROFILES,
  getCompanyProfile,
  getAvailableCompanies,
  isValidCompany,
};