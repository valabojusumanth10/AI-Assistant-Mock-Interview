const Groq = require("groq-sdk");
const pdfjslib = require("pdfjs-dist/legacy/build/pdf.js");
const User = require("../models/User.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const DOMAINS = [
  "JavaScript/Node.js",
  "React",
  "Python",
  "Data Science",
  "DevOps",
  "System Design",
  "Database Design",
  "General",
];

async function extractTextFromPDF(buffer) {
  const uint8Array = new Uint8Array(buffer);

  const loadingTask = pdfjslib.getDocument({
    data: uint8Array,
  });

  const pdf = await loadingTask.promise;

  let textContent = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const strings = content.items.map((item) => item.str);

    textContent += strings.join(" ") + "\n";
  }

  return textContent;
}

const analyzeResume = async (req, res) => {
  try {
    // Check file
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    // Extract resume text
    let resumeText;

    if (req.file.mimetype === "application/pdf") {
      const parsed = await extractTextFromPDF(req.file.buffer);

      resumeText = parsed || "No text extracted from PDF.";
    } else {
      resumeText = req.file.buffer.toString("utf-8");
    }

    // Validate extracted text
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({
        error: "Failed to extract text from resume",
      });
    }

    // Limit text sent to AI
    const truncated = resumeText.slice(0, 6000);

    // AI prompt
    const prompt = `
You are an expert technical recruiter and career coach.

Analyze the following resume and respond ONLY with a valid JSON object.
No text outside JSON.

Available interview domains:
${DOMAINS.join(", ")}

Resume text:

"""
${truncated}
"""

Respond with this exact JSON structure:

{
  "summary": "2-3 sentence professional summary of the candidate",

  "experienceLevel": "Junior" | "Mid" | "Senior",

  "resumeScore": 78,

  "skillsDetected": [
    "skill1",
    "skill2",
    "skill3"
  ],

  "strengths": [
    "strength1",
    "strength2",
    "strength3"
  ],

  "recommendedDomains": [
    {
      "label": "exact domain name from the available list",
      "reason": "one sentence why this domain fits them",
      "confidence": 85
    }
  ]
}

Rules:

- experienceLevel must be exactly "Junior", "Mid", or "Senior"
- resumeScore must be a number from 0 to 100
- resumeScore should reflect overall resume quality, technical skills, projects, experience, education, and job readiness
- skillsDetected must contain up to 12 actual skills found in the resume
- strengths must contain exactly 3 specific professional strengths
- recommendedDomains must contain 3 domains ordered by best fit
- confidence scores must be between 0 and 100
- confidence scores should be realistic and different for each domain
- domain label must exactly match one of the available domains
`.trim();

    // Call Groq
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    // Get AI response
    const raw = response.choices[0].message.content || "{}";

    let analysis;

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);

      analysis = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : null;
    } catch (error) {
      return res.status(500).json({
        error: "Failed to parse analysis result",
      });
    }

    if (!analysis) {
      return res.status(500).json({
        error: "Invalid analysis result",
      });
    }

    // Validate recommended domains
    const validDomains = DOMAINS;

    if (analysis.recommendedDomains) {
      analysis.recommendedDomains =
        analysis.recommendedDomains.filter((domain) =>
          validDomains.includes(domain.label)
        );
    }

    // Make sure resume score is valid
    const resumeScore = Math.max(
      0,
      Math.min(100, Number(analysis.resumeScore) || 0)
    );

    // Save resume information to logged-in user
    await User.findByIdAndUpdate(req.userId, {
      skills: analysis.skillsDetected || [],
      resumeScore: resumeScore,
      resume: req.file.originalname,
    });

    // Return analysis to frontend
    return res.json({
      analysis: {
        ...analysis,
        resumeScore,
      },
    });
  } catch (error) {
    console.error("Error analyzing resume:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

module.exports = {
  analyzeResume,
};