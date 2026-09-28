"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ============================================================
// TYPES
// ============================================================

interface Interview {
  id: string;
  date: string;
  score: number;
  duration: number;
  topic: string;
}

interface ResumeAnalysis {
  summary: string;
  strengths: string[];
  recommendedDomains: {
    label: string;
    reason: string;
    confidence: number;
  }[];
  experienceLevel: string;
  skillsDetected: string[];
}

interface Skill {
  topic: string;
  score: number;
  status: "strong" | "average" | "weak";
  questionsAnswered: number;
}

interface SkillAssessment {
  skillAssessment: number;
  skills: Skill[];
  weakSkills: Skill[];
  strongSkills: Skill[];
  interviewsUsed: number;
}

interface ReadinessData {
  readinessScore: number;
  category:
    | "Placement Ready"
    | "Needs Improvement"
    | "High Potential Candidate";

  breakdown: {
    resume: number;
    interview: number;
    skillAssessment: number;
    communication: number;
  };

  weakSkills: {
    topic: string;
    score: number;
  }[];

  strongSkills: {
    topic: string;
    score: number;
  }[];

  interviewsUsed: number;
  candidateType?: string;
  interviewDomains?: string[];

  communication?: {
    score: number;
    strengths: string[];
    gaps: string[];
  };

  industrySkills?: {
    expected: string[];
    existing: string[];
    missing: string[];
  };
}

interface ReadinessHistoryItem {
  _id: string;
  interviewId: string;
  readinessScore: number;

  category:
    | "Placement Ready"
    | "Needs Improvement"
    | "High Potential Candidate";

  candidateType?: string;
  interviewDomain?: string;

  breakdown: {
    resume: number;
    interview: number;
    skillAssessment: number;
    communication: number;
  };

  weakSkills: {
    topic: string;
    score: number;
  }[];

  strongSkills: {
    topic: string;
    score: number;
  }[];

  missingIndustrySkills: string[];
  communicationStrengths: string[];
  communicationGaps: string[];

  interviewsUsed: number;
  recordedAt: string;
}

interface RoadmapData {
  summary: string;

  immediatePriorities: {
    title: string;
    reason: string;
    priority: string;
  }[];

  technologies: {
    name: string;
    reason: string;
    priority: string;
    estimatedWeeks: number;
  }[];

  projects: {
    title: string;
    description: string;
    technologies: string[];
    skillsItImproves: string[];
    difficulty: string;
  }[];

  certifications: {
    name: string;
    provider: string;
    reason: string;
  }[];

  interviewTopics: {
    topic: string;
    reason: string;
    priority: string;
  }[];

  communicationImprovement: string[];

  thirtyDayPlan: {
    week: number;
    focus: string;
    actions: string[];
  }[];

  sixtyDayPlan: {
    focus: string;
    actions: string[];
  }[];

  ninetyDayPlan: {
    focus: string;
    actions: string[];
  }[];
}

// ============================================================
// INTERVIEW DOMAINS
// ============================================================

const INTERVIEW_DOMAINS = [
  {
    label: "JavaScript/Node.js",
    icon: "ðŸŸ¨",
    desc: "ES6+, async, Node runtime",
  },
  {
    label: "React",
    icon: "âš›ï¸",
    desc: "Hooks, state, lifecycle",
  },
  {
    label: "Python",
    icon: "ðŸ",
    desc: "OOP, data structures, stdlib",
  },
  {
    label: "Data Science",
    icon: "ðŸ“Š",
    desc: "ML, pandas, statistics",
  },
  {
    label: "DevOps",
    icon: "âš™ï¸",
    desc: "CI/CD, Docker, Kubernetes",
  },
  {
    label: "System Design",
    icon: "ðŸ—ï¸",
    desc: "Scalability, architecture",
  },
  {
    label: "Database Design",
    icon: "ðŸ—„ï¸",
    desc: "SQL, NoSQL, indexing",
  },
  {
    label: "General",
    icon: "ðŸŽ¯",
    desc: "Behavioural & fundamentals",
  },
];

// ============================================================
// SCORE BADGE
// ============================================================

function ScoreBadge({ score }: { score: number }) {
  const safeScore = Number(score) || 0;

  const className =
    safeScore >= 80
      ? "bg-green-500/10 text-green-600 border-green-500/20"
      : safeScore >= 60
        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
        : "bg-orange-500/10 text-orange-600 border-orange-500/20";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold ${className}`}
    >
      {safeScore >= 80
        ? "ðŸŸ¢"
        : safeScore >= 60
          ? "ðŸ”µ"
          : "ðŸŸ "}{" "}
      {safeScore}%
    </span>
  );
}

// ============================================================
// SPARKLINE
// ============================================================

function MiniSparkline({
  scores,
}: {
  scores: number[];
}) {
  if (scores.length < 2) {
    return null;
  }

  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;

  const width = 100;
  const height = 32;

  const points = scores
    .map((score, index) => {
      const x =
        (index / (scores.length - 1)) *
        width;

      const y =
        height -
        ((score - min) / range) *
          height;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {scores.map((score, index) => {
        const x =
          (index / (scores.length - 1)) *
          width;

        const y =
          height -
          ((score - min) / range) *
            height;

        return (
          <circle
            key={`${score}-${index}`}
            cx={x}
            cy={y}
            r="2.5"
            className="fill-primary"
          />
        );
      })}
    </svg>
  );
}

// ============================================================
// RESUME PANEL
// ============================================================

function ResumePanel({
  onDomainSelect,
}: {
  onDomainSelect: (domain: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [dragging, setDragging] =
    useState(false);

  const [analysis, setAnalysis] =
    useState<ResumeAnalysis | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [step, setStep] =
    useState<
      "upload" | "analyzing" | "results"
    >("upload");

  const [analyzingStep, setAnalyzingStep] =
    useState(0);

  const analyzingSteps = [
    "Reading your resumeâ€¦",
    "Detecting skills & technologiesâ€¦",
    "Mapping to interview domainsâ€¦",
    "Generating recommendationsâ€¦",
  ];

  const handleFile = (selectedFile: File) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const validExtension =
      /\.(pdf|doc|docx|txt)$/i.test(
        selectedFile.name,
      );

    if (
      !allowedTypes.includes(
        selectedFile.type,
      ) &&
      !validExtension
    ) {
      setError(
        "Please upload a PDF, DOC, DOCX, or TXT file.",
      );
      return;
    }

    if (
      selectedFile.size >
      5 * 1024 * 1024
    ) {
      setError("File must be under 5MB.");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setAnalysis(null);
    setStep("upload");
  };

  const handleAnalyze = async () => {
    if (!file) {
      return;
    }

    setStep("analyzing");
    setError(null);
    setAnalyzingStep(0);

    let index = 0;

    const interval = setInterval(() => {
      index =
        (index + 1) %
        analyzingSteps.length;

      setAnalyzingStep(index);
    }, 1100);

    try {
      const formData = new FormData();

      formData.append(
        "resume",
        file,
      );

      const { data } =
        await axiosInstance.post(
          "/api/resume/analyze",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          },
        );

      setAnalysis(
        data?.analysis || null,
      );

      setStep("results");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to analyze resume.",
      );

      setStep("upload");
    } finally {
      clearInterval(interval);
    }
  };

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setError(null);
    setStep("upload");
    setAnalyzingStep(0);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  return (
    <Card className="border border-border/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg">
            ðŸ“„
          </div>

          <div>
            <p className="text-sm font-bold">
              AI Resume Analysis
            </p>

            <p className="text-xs text-muted-foreground">
              Upload your resume Â· Get domain
              recommendations
            </p>
          </div>
        </div>

        {step === "results" && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground border border-border/60 px-3 py-1 rounded-full"
          >
            Upload new â†‘
          </button>
        )}
      </div>

      <div className="p-5">
        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() =>
                setDragging(false)
              }
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);

                const droppedFile =
                  event.dataTransfer
                    .files?.[0];

                if (droppedFile) {
                  handleFile(
                    droppedFile,
                  );
                }
              }}
              onClick={() =>
                fileRef.current?.click()
              }
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-primary bg-primary/5"
                  : file
                    ? "border-primary/40 bg-primary/[0.03]"
                    : "border-border/50 hover:border-primary/40"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(event) => {
                  const selectedFile =
                    event.target.files?.[0];

                  if (selectedFile) {
                    handleFile(
                      selectedFile,
                    );
                  }
                }}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                    ðŸ“‹
                  </div>

                  <div className="text-left">
                    <p className="text-sm font-semibold truncate max-w-[220px]">
                      {file.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {(
                        file.size / 1024
                      ).toFixed(0)}{" "}
                      KB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      reset();
                    }}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">
                    â˜ï¸
                  </div>

                  <p className="text-sm font-semibold">
                    Drop your resume here
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse Â· PDF,
                    DOC, DOCX, TXT Â· Max 5 MB
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-xl">
                âš ï¸ {error}
              </p>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!file}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold"
            >
              ðŸ¤– Analyse Resume with AI
            </Button>
          </div>
        )}

        {step === "analyzing" && (
          <div className="py-10 flex flex-col items-center gap-5">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />

              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />

              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                ðŸ¤–
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm font-bold">
                Groq AI is reading your resumeâ€¦
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                {
                  analyzingSteps[
                    analyzingStep
                  ]
                }
              </p>
            </div>
          </div>
        )}

        {step === "results" &&
          analysis && (
            <div className="space-y-5">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span>ðŸ§ </span>

                  <p className="text-xs font-bold">
                    AI Summary
                  </p>

                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    {
                      analysis.experienceLevel
                    }
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {analysis.summary}
                </p>
              </div>

              {analysis.skillsDetected
                ?.length > 0 && (
                <div>
                  <p className="text-xs font-bold mb-2">
                    ðŸ›  Skills Detected
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {analysis.skillsDetected.map(
                      (skill) => (
                        <span
                          key={skill}
                          className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full"
                        >
                          {skill}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold mb-2">
                  ðŸŽ¯ Recommended Interview
                  Domains
                </p>

                <div className="space-y-2">
                  {(
                    analysis.recommendedDomains ||
                    []
                  ).map(
                    (
                      recommendation,
                    ) => {
                      const meta =
                        INTERVIEW_DOMAINS.find(
                          (domain) =>
                            domain.label ===
                            recommendation.label,
                        );

                      return (
                        <button
                          type="button"
                          key={
                            recommendation.label
                          }
                          onClick={() =>
                            onDomainSelect(
                              recommendation.label,
                            )
                          }
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary hover:bg-primary/5 text-left transition-all"
                        >
                          <span className="text-xl">
                            {meta?.icon ||
                              "ðŸŽ¯"}
                          </span>

                          <div className="flex-1">
                            <p className="text-sm font-semibold">
                              {
                                recommendation.label
                              }
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {
                                recommendation.reason
                              }
                            </p>
                          </div>

                          <span className="text-xs font-bold text-primary">
                            {
                              recommendation.confidence
                            }
                            %
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {analysis.strengths
                ?.length > 0 && (
                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-xs font-bold text-green-600 mb-2">
                    âœ… Your Strengths
                  </p>

                  <ul className="space-y-1.5">
                    {analysis.strengths.map(
                      (strength) => (
                        <li
                          key={strength}
                          className="text-xs text-muted-foreground"
                        >
                          â€¢ {strength}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
      </div>
    </Card>
  );
}

// ============================================================
// SKILL ASSESSMENT NORMALIZER
// ============================================================

function normalizeSkillAssessment(payload: any): SkillAssessment | null {
  if (payload === null || payload === undefined) {
    return null;
  }

  // Current backend may return the assessment directly as a number:
  // { skillAssessment: 75, score: 75 }
  // Older dashboard responses may return a full object.
  const source =
    typeof payload === "object" && payload !== null
      ? payload?.data && typeof payload.data === "object"
        ? payload.data
        : payload
      : { skillAssessment: payload };

  const rawScore =
    typeof source?.skillAssessment === "number"
      ? source.skillAssessment
      : typeof source?.score === "number"
        ? source.score
        : typeof payload === "number"
          ? payload
          : 0;

  const safeScore = Math.max(
    0,
    Math.min(100, Number(rawScore) || 0),
  );

  const skills = Array.isArray(source?.skills)
    ? source.skills
        .filter(Boolean)
        .map((skill: any, index: number) => ({
          topic: String(
            skill?.topic ||
              skill?.name ||
              `Skill ${index + 1}`,
          ),
          score: Math.max(
            0,
            Math.min(100, Number(skill?.score) || 0),
          ),
          status:
            skill?.status === "strong" ||
            skill?.status === "weak"
              ? skill.status
              : "average",
          questionsAnswered: Math.max(
            0,
            Number(skill?.questionsAnswered) || 0,
          ),
        }))
    : [];

  const weakSkills = Array.isArray(
    source?.weakSkills,
  )
    ? source.weakSkills.filter(Boolean).map(
        (skill: any, index: number) => ({
          topic: String(
            skill?.topic ||
              skill?.name ||
              `Skill ${index + 1}`,
          ),
          score: Math.max(
            0,
            Math.min(100, Number(skill?.score) || 0),
          ),
          status: "weak" as const,
          questionsAnswered: Math.max(
            0,
            Number(skill?.questionsAnswered) || 0,
          ),
        }),
      )
   : skills.filter(
    (skill: any) => skill.status === "weak",
  );

  const strongSkills = Array.isArray(
    source?.strongSkills,
  )
    ? source.strongSkills.filter(Boolean).map(
        (skill: any, index: number) => ({
          topic: String(
            skill?.topic ||
              skill?.name ||
              `Skill ${index + 1}`,
          ),
          score: Math.max(
            0,
            Math.min(100, Number(skill?.score) || 0),
          ),
          status: "strong" as const,
          questionsAnswered: Math.max(
            0,
            Number(skill?.questionsAnswered) || 0,
          ),
        }),
      )
   : skills.filter(
    (skill: any) => skill.status === "strong",
  );

  return {
    skillAssessment: safeScore,
    skills,
    weakSkills,
    strongSkills,
    interviewsUsed: Math.max(
      0,
      Number(source?.interviewsUsed) || 0,
    ),
  };
}

// ============================================================
// MAIN DASHBOARD
// ============================================================

export default function DashboardPage() {
  const router = useRouter();

  const {
    isLoggedIn,
    isLoading: authLoading,
    user,
  } = useAuth();

  // ----------------------------------------------------------
  // Main state
  // ----------------------------------------------------------

  const [interviews, setInterviews] =
    useState<Interview[]>([]);

  const [dataLoading, setDataLoading] =
    useState(true);

  const [
    showDomainSelector,
    setShowDomainSelector,
  ] = useState(false);

  const [
    hoveredDomain,
    setHoveredDomain,
  ] = useState<string | null>(null);

  const [activeTab, setActiveTab] =
    useState<"resume" | "skills">("resume");

  // ----------------------------------------------------------
  // Skill assessment
  // ----------------------------------------------------------

  const [
    skillAssessment,
    setSkillAssessment,
  ] = useState<SkillAssessment | null>(
    null,
  );

  const [skillLoading, setSkillLoading] =
    useState(false);

  // ----------------------------------------------------------
  // Readiness
  // ----------------------------------------------------------

  const [readiness, setReadiness] =
    useState<ReadinessData | null>(null);

  const [
    readinessLoading,
    setReadinessLoading,
  ] = useState(false);

  // ----------------------------------------------------------
  // Readiness history
  // ----------------------------------------------------------

  const [
    readinessHistory,
    setReadinessHistory,
  ] = useState<ReadinessHistoryItem[]>(
    [],
  );

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  // ----------------------------------------------------------
  // Roadmap
  // ----------------------------------------------------------

  const [roadmap, setRoadmap] =
    useState<RoadmapData | null>(null);

  const [
    roadmapLoading,
    setRoadmapLoading,
  ] = useState(false);

  const [
    roadmapError,
    setRoadmapError,
  ] = useState<string | null>(null);

  // ==========================================================
  // AUTH REDIRECT
  // ==========================================================

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [
    authLoading,
    isLoggedIn,
    router,
  ]);

  // ==========================================================
  // FETCH INTERVIEWS
  // ==========================================================

  const fetchInterviews = async () => {
    try {
      setDataLoading(true);

      const { data } =
        await axiosInstance.get(
          "/api/interviews",
        );

      setInterviews(
        data?.interviews || [],
      );
    } catch (error) {
      console.error(
        "Failed to fetch interviews:",
        error,
      );
    } finally {
      setDataLoading(false);
    }
  };

  // ==========================================================
  // FETCH SKILL ASSESSMENT
  // ==========================================================

  const fetchSkillAssessment =
    async () => {
      try {
        setSkillLoading(true);

        const { data } =
          await axiosInstance.get(
            "/api/interviews/skill-assessment",
          );

        console.log(
          "SKILL ASSESSMENT:",
          data,
        );

        setSkillAssessment(
          normalizeSkillAssessment(data),
        );
      } catch (error) {
        console.error(
          "SKILL ASSESSMENT ERROR:",
          error,
        );
      } finally {
        setSkillLoading(false);
      }
    };

  // ==========================================================
  // FETCH READINESS
  // ==========================================================

  const fetchReadiness = async () => {
    try {
      setReadinessLoading(true);

      const { data } =
        await axiosInstance.get(
          "/api/readiness",
        );

      console.log(
        "PLACEMENT READINESS:",
        data,
      );

      setReadiness(data);
    } catch (error) {
      console.error(
        "PLACEMENT READINESS ERROR:",
        error,
      );
    } finally {
      setReadinessLoading(false);
    }
  };

  // ==========================================================
  // FETCH READINESS HISTORY
  // ==========================================================

  const fetchReadinessHistory =
    async () => {
      try {
        setHistoryLoading(true);

        const { data } =
          await axiosInstance.get(
            "/api/readiness/history",
          );

        console.log(
          "READINESS HISTORY:",
          data,
        );

        setReadinessHistory(
          data?.history || [],
        );
      } catch (error: any) {
        console.error(
          "READINESS HISTORY ERROR:",
          error?.response?.data ||
            error?.message ||
            error,
        );

        setReadinessHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

  // ==========================================================
  // FETCH ROADMAP
  // ==========================================================

  const fetchRoadmap = async () => {
    try {
      setRoadmapLoading(true);
      setRoadmapError(null);

      const { data } =
        await axiosInstance.get(
          "/api/readiness/roadmap",
        );

      console.log(
        "AI ROADMAP:",
        data,
      );

      setRoadmap(
        data?.roadmap || null,
      );
    } catch (error: any) {
      console.error(
        "AI ROADMAP ERROR:",
        error?.response?.data ||
          error?.message ||
          error,
      );

      setRoadmapError(
        error?.response?.data?.message ||
          "Failed to generate roadmap.",
      );
    } finally {
      setRoadmapLoading(false);
    }
  };

  // ==========================================================
  // FETCH DASHBOARD DATA
  // ==========================================================

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    fetchInterviews();
    fetchSkillAssessment();
    fetchReadiness();
    fetchReadinessHistory();
  }, [isLoggedIn]);

  // ==========================================================
  // DOMAIN SELECTION
  // ==========================================================

  const handleSelectDomain = (
    domain: string,
  ) => {
    router.push(
      `/interview?domain=${encodeURIComponent(
        domain,
      )}`,
    );
  };

  // ==========================================================
  // AUTH LOADING
  // ==========================================================

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />

          <p className="text-sm text-muted-foreground">
            Loadingâ€¦
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  // ==========================================================
  // CALCULATIONS
  // ==========================================================

  const averageScore =
    interviews.length > 0
      ? Math.round(
          interviews.reduce(
            (sum, interview) =>
              sum +
              Number(
                interview.score || 0,
              ),
            0,
          ) / interviews.length,
        )
      : null;

  const bestScore =
    interviews.length > 0
      ? Math.max(
          ...interviews.map(
            (interview) =>
              Number(
                interview.score || 0,
              ),
          ),
        )
      : null;

  const totalMinutes =
    interviews.reduce(
      (sum, interview) =>
        sum +
        Number(
          interview.duration || 0,
        ),
      0,
    );

  const recentScores = interviews
    .slice(-6)
    .map((interview) =>
      Number(interview.score || 0),
    );

  // ----------------------------------------------------------
  // Historical progress
  // ----------------------------------------------------------

  const firstHistory =
    readinessHistory.length > 0
      ? readinessHistory[0]
      : null;

  const latestHistory =
    readinessHistory.length > 0
      ? readinessHistory[
          readinessHistory.length - 1
        ]
      : null;

  const readinessChange =
    firstHistory && latestHistory
      ? latestHistory.readinessScore -
        firstHistory.readinessScore
      : 0;

  // ----------------------------------------------------------
  // IMPORTANT:
  // Normalize optional API arrays.
  // This prevents TypeScript undefined errors.
  // ----------------------------------------------------------

  const communicationGaps =
    readiness?.communication?.gaps ??
    [];

  const communicationStrengths =
    readiness?.communication?.strengths ??
    [];

  const missingIndustrySkills =
    readiness?.industrySkills?.missing ??
    [];

  const existingIndustrySkills =
    readiness?.industrySkills?.existing ??
    [];

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">

        {/* ==================================================
            HEADER
        ================================================== */}

        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">
              ðŸ‘‹ Welcome back
              {user?.name
                ? `, ${user.name.split(" ")[0]}`
                : ""}
            </p>

            <h1 className="text-3xl md:text-4xl font-black">
              Your Dashboard
            </h1>
          </div>

          <Button
            size="lg"
            onClick={() =>
              setShowDomainSelector(true)
            }
            className="bg-gradient-to-r from-primary to-accent text-white rounded-full px-6 font-semibold"
          >
            âš¡ New Interview
          </Button>
        </section>

        {/* ==================================================
            STATS
        ================================================== */}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border border-border/50">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                Total Sessions
              </p>

              <span>ðŸ“‹</span>
            </div>

            <p className="text-2xl font-black">
              {interviews.length}
            </p>

            <p className="text-xs text-muted-foreground">
              {interviews.length} session
              {interviews.length !==
              1
                ? "s"
                : ""}
            </p>
          </Card>

          <Card className="p-5 border border-primary/30 bg-primary/[0.03]">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                Average Score
              </p>

              <span>ðŸ“Š</span>
            </div>

            <p className="text-2xl font-black text-primary">
              {averageScore !== null
                ? `${averageScore}%`
                : "â€”"}
            </p>

            <p className="text-xs text-muted-foreground">
              {averageScore === null
                ? "No data yet"
                : averageScore >= 80
                  ? "Excellent ðŸ”¥"
                  : averageScore >= 60
                    ? "Good ðŸ‘"
                    : "Keep going ðŸ’ª"}
            </p>
          </Card>

          <Card className="p-5 border border-border/50">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                Best Score
              </p>

              <span>ðŸ†</span>
            </div>

            <p className="text-2xl font-black">
              {bestScore !== null
                ? `${bestScore}%`
                : "â€”"}
            </p>

            <p className="text-xs text-muted-foreground">
              Personal best
            </p>
          </Card>

          <Card className="p-5 border border-border/50">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                Skill Assessment
              </p>

              <span>ðŸ§ </span>
            </div>

            <p className="text-2xl font-black">
              {skillAssessment
                ? `${skillAssessment.skillAssessment}%`
                : "â€”"}
            </p>

            <p className="text-xs text-muted-foreground">
              {skillAssessment
                ? `${(skillAssessment.skills || []).length} skills evaluated`
                : skillLoading
                  ? "Calculating..."
                  : "No assessment yet"}
            </p>
          </Card>
        </section>

        {/* ==================================================
            PLACEMENT READINESS
        ================================================== */}

        <Card className="border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">
                ðŸŽ¯ Placement Readiness
              </p>

              <p className="text-xs text-muted-foreground mt-0.5">
                Your combined readiness across resume,
                interviews, skills and communication
              </p>
            </div>

            {readiness && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">
                {readiness.category}
              </span>
            )}
          </div>

          <div className="p-5">
            {readinessLoading ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin mb-3" />

                <p className="text-sm text-muted-foreground">
                  Calculating your placement
                  readiness...
                </p>
              </div>
            ) : !readiness ? (
              <div className="py-8 text-center">
                <div className="text-4xl mb-3">
                  ðŸŽ¯
                </div>

                <p className="text-sm font-semibold">
                  Readiness data is not
                  available yet
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  Complete your resume
                  analysis and at least one
                  interview.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Overall score */}

                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                  <div className="w-28 h-28 rounded-full border-8 border-primary/10 flex items-center justify-center flex-shrink-0">
                    <div className="text-center">
                      <p className="text-3xl font-black text-primary">
                        {
                          readiness.readinessScore
                        }
                      </p>

                      <p className="text-[10px] text-muted-foreground">
                        / 100
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 w-full">
                    <p className="text-lg font-black">
                      {readiness.category}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      Based on{" "}
                      {
                        readiness.interviewsUsed
                      }{" "}
                      completed interview
                      {readiness.interviewsUsed !==
                      1
                        ? "s"
                        : ""}{" "}
                      and your current profile.
                    </p>

                    <div className="mt-4 w-full h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        style={{
                          width: `${readiness.readinessScore}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Breakdown */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Resume",
                      value:
                        readiness.breakdown
                          ?.resume ?? 0,
                      icon: "ðŸ“„",
                    },
                    {
                      label: "Interview",
                      value:
                        readiness.breakdown
                          ?.interview ?? 0,
                      icon: "ðŸŽ¤",
                    },
                    {
                      label: "Skills",
                      value:
                        readiness.breakdown
                          ?.skillAssessment ??
                        0,
                      icon: "ðŸ§ ",
                    },
                    {
                      label: "Communication",
                      value:
                        readiness.breakdown
                          ?.communication ??
                        0,
                      icon: "ðŸ’¬",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-3 rounded-xl border border-border/50 bg-background/60"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] text-muted-foreground">
                          {item.label}
                        </p>

                        <span>
                          {item.icon}
                        </span>
                      </div>

                      <p className="text-lg font-black">
                        {item.value}%
                      </p>

                      <div className="mt-2 w-full h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                          style={{
                            width: `${item.value}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weak skills */}

                {readiness.weakSkills?.length >
                  0 && (
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">
                      âš ï¸ Priority Technical
                      Areas
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {readiness.weakSkills.map(
                        (skill) => (
                          <span
                            key={skill.topic}
                            className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          >
                            {skill.topic} Â·{" "}
                            {skill.score}%
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Strong skills */}

                {readiness.strongSkills?.length >
                  0 && (
                  <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                    <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-2">
                      âœ… Strong Technical
                      Areas
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {readiness.strongSkills.map(
                        (skill) => (
                          <span
                            key={skill.topic}
                            className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                          >
                            {skill.topic} Â·{" "}
                            {skill.score}%
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Missing industry skills */}

                {missingIndustrySkills.length >
                  0 && (
                  <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2">
                      ðŸ§© Missing Industry
                      Skills
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {missingIndustrySkills.map(
                        (skill) => (
                          <span
                            key={skill}
                            className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                          >
                            {skill}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Existing industry skills */}

                {existingIndustrySkills.length >
                  0 && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-xs font-bold text-primary mb-2">
                      ðŸ›  Existing Industry
                      Skills
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {existingIndustrySkills.map(
                        (skill) => (
                          <span
                            key={skill}
                            className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                          >
                            {skill}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Communication */}

                {communicationGaps.length >
                  0 && (
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">
                      ðŸ’¬ Communication Gaps
                    </p>

                    <ul className="space-y-1">
                      {communicationGaps
                        .slice(0, 5)
                        .map(
                          (
                            gap,
                            index,
                          ) => (
                            <li
                              key={`${gap}-${index}`}
                              className="text-xs text-muted-foreground"
                            >
                              â€¢ {gap}
                            </li>
                          ),
                        )}
                    </ul>
                  </div>
                )}

                {communicationStrengths.length >
                  0 && (
                  <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                    <p className="text-xs font-bold text-green-600 mb-2">
                      ðŸ’¬ Communication
                      Strengths
                    </p>

                    <ul className="space-y-1">
                      {communicationStrengths
                        .slice(0, 5)
                        .map(
                          (
                            strength,
                            index,
                          ) => (
                            <li
                              key={`${strength}-${index}`}
                              className="text-xs text-muted-foreground"
                            >
                              â€¢ {strength}
                            </li>
                          ),
                        )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* ==================================================
            READINESS HISTORY
        ================================================== */}

        <Card className="border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">
                ðŸ“ˆ Readiness Progress
              </p>

              <p className="text-xs text-muted-foreground mt-0.5">
                Track your placement readiness
                over time
              </p>
            </div>

            {readinessHistory.length >=
              2 && (
              <div className="text-right">
                <p
                  className={`text-sm font-black ${
                    readinessChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {readinessChange >= 0
                    ? "+"
                    : ""}
                  {readinessChange}
                </p>

                <p className="text-[10px] text-muted-foreground">
                  points
                </p>
              </div>
            )}
          </div>

          <div className="p-5">
            {historyLoading ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin mb-3" />

                <p className="text-sm text-muted-foreground">
                  Loading readiness history...
                </p>
              </div>
            ) : readinessHistory.length ===
              0 ? (
              <div className="py-8 text-center">
                <div className="text-4xl mb-3">
                  ðŸ“Š
                </div>

                <p className="text-sm font-semibold">
                  No readiness history yet
                </p>

                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Complete a new mock interview
                  to start tracking how your
                  placement readiness improves.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Overall progress */}

                {readinessHistory.length >=
                  2 && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold">
                          Overall Progress
                        </p>

                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          First assessment â†’
                          latest
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground">
                          {
                            firstHistory?.readinessScore
                          }
                        </span>

                        <span className="text-primary">
                          â†’
                        </span>

                        <span className="text-xl font-black text-primary">
                          {
                            latestHistory?.readinessScore
                          }
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 w-full h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        style={{
                          width: `${latestHistory?.readinessScore || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* History */}

                <div>
                  <p className="text-xs font-bold mb-3">
                    Assessment History
                  </p>

                  <div className="space-y-3">
                    {[...readinessHistory]
                      .reverse()
                      .map(
                        (
                          item,
                          index,
                        ) => (
                          <div
                            key={
                              item._id ||
                              item.interviewId ||
                              index
                            }
                            className="p-4 rounded-xl border border-border/50 bg-background/60"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-bold">
                                    {item.interviewDomain ||
                                      "General"}
                                  </p>

                                  <ScoreBadge
                                    score={
                                      item.readinessScore
                                    }
                                  />

                                  <span className="text-[10px] px-2 py-1 rounded-full border border-border/60 text-muted-foreground">
                                    {
                                      item.category
                                    }
                                  </span>
                                </div>

                                <p className="text-[11px] text-muted-foreground mt-1.5">
                                  {new Date(
                                    item.recordedAt,
                                  ).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}

                                  {item.candidateType
                                    ? ` Â· ${item.candidateType}`
                                    : ""}
                                </p>
                              </div>

                              {/* Breakdown */}

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  {
                                    label:
                                      "Resume",
                                    value:
                                      item
                                        .breakdown
                                        ?.resume ??
                                      0,
                                  },
                                  {
                                    label:
                                      "Interview",
                                    value:
                                      item
                                        .breakdown
                                        ?.interview ??
                                      0,
                                  },
                                  {
                                    label:
                                      "Skills",
                                    value:
                                      item
                                        .breakdown
                                        ?.skillAssessment ??
                                      0,
                                  },
                                  {
                                    label:
                                      "Communication",
                                    value:
                                      item
                                        .breakdown
                                        ?.communication ??
                                      0,
                                  },
                                ].map(
                                  (part) => (
                                    <div
                                      key={
                                        part.label
                                      }
                                      className="px-2.5 py-2 rounded-lg bg-muted/30 border border-border/40 text-center"
                                    >
                                      <p className="text-[10px] text-muted-foreground">
                                        {
                                          part.label
                                        }
                                      </p>

                                      <p className="text-xs font-black mt-0.5">
                                        {
                                          part.value
                                        }
                                        %
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>

                            {/* Weak skills */}

                            {item.weakSkills?.length >
                              0 && (
                              <div className="mt-4">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  âš ï¸ Weak areas
                                </p>

                                <div className="flex flex-wrap gap-1.5">
                                  {item.weakSkills
                                    .slice(
                                      0,
                                      5,
                                    )
                                    .map(
                                      (
                                        skill,
                                      ) => (
                                        <span
                                          key={`${item._id}-${skill.topic}`}
                                          className="text-[11px] px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                        >
                                          {
                                            skill.topic
                                          }{" "}
                                          Â·{" "}
                                          {
                                            skill.score
                                          }
                                          %
                                        </span>
                                      ),
                                    )}
                                </div>
                              </div>
                            )}

                            {/* Missing industry skills */}

                            {item.missingIndustrySkills
                              ?.length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  ðŸ§© Missing industry
                                  skills
                                </p>

                                <div className="flex flex-wrap gap-1.5">
                                  {item.missingIndustrySkills
                                    .slice(
                                      0,
                                      5,
                                    )
                                    .map(
                                      (
                                        skill,
                                      ) => (
                                        <span
                                          key={`${item._id}-${skill}`}
                                          className="text-[11px] px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                                        >
                                          {
                                            skill
                                          }
                                        </span>
                                      ),
                                    )}
                                </div>
                              </div>
                            )}

                            {/* Communication gaps */}

                            {item.communicationGaps
                              ?.length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  ðŸ’¬ Communication
                                  gaps
                                </p>

                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {item.communicationGaps
                                    .slice(
                                      0,
                                      3,
                                    )
                                    .map(
                                      (
                                        gap,
                                        gapIndex,
                                      ) => (
                                        <li
                                          key={`${item._id}-gap-${gapIndex}`}
                                        >
                                          â€¢ {gap}
                                        </li>
                                      ),
                                    )}
                                </ul>
                              </div>
                            )}
                          </div>
                        ),
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ==================================================
            AI ROADMAP
        ================================================== */}

        <Card className="border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">
                ðŸ¤– AI Personalized Roadmap
              </p>

              <p className="text-xs text-muted-foreground mt-0.5">
                Your improvement plan based on
                your readiness profile
              </p>
            </div>

            <Button
              onClick={fetchRoadmap}
              disabled={roadmapLoading}
              className="rounded-full bg-gradient-to-r from-primary to-accent text-white text-xs"
            >
              {roadmapLoading
                ? "Generating..."
                : roadmap
                  ? "ðŸ”„ Regenerate"
                  : "âœ¨ Generate Roadmap"}
            </Button>
          </div>

          <div className="p-5">
            {roadmapLoading ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />

                <p className="text-sm font-semibold">
                  AI is building your roadmap...
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  Analyzing your skills,
                  weaknesses and industry gaps
                </p>
              </div>
            ) : roadmapError ? (
              <div className="py-8 text-center">
                <div className="text-3xl mb-3">
                  âš ï¸
                </div>

                <p className="text-sm font-semibold">
                  Could not generate roadmap
                </p>

                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {roadmapError}
                </p>

                <Button
                  variant="outline"
                  onClick={fetchRoadmap}
                  className="rounded-full text-xs"
                >
                  Try Again
                </Button>
              </div>
            ) : !roadmap ? (
              <div className="py-8 text-center">
                <div className="text-4xl mb-3">
                  ðŸ—ºï¸
                </div>

                <p className="text-sm font-semibold">
                  Get your personalized placement
                  roadmap
                </p>

                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  AI will use your readiness
                  score, technical gaps,
                  communication gaps and
                  missing industry skills.
                </p>

                <Button
                  onClick={fetchRoadmap}
                  className="mt-4 rounded-full bg-gradient-to-r from-primary to-accent text-white"
                >
                  âœ¨ Generate My Roadmap
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs font-bold mb-2">
                    ðŸŽ¯ Your Current Direction
                  </p>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {roadmap.summary}
                  </p>
                </div>

                {/* Immediate priorities */}

                {roadmap.immediatePriorities
                  ?.length > 0 && (
                  <div>
                    <p className="text-sm font-bold mb-3">
                      ðŸ”¥ Immediate Priorities
                    </p>

                    <div className="grid md:grid-cols-3 gap-3">
                      {roadmap.immediatePriorities.map(
                        (
                          priority,
                          index,
                        ) => (
                          <div
                            key={`${priority.title}-${index}`}
                            className="p-4 rounded-xl border border-border/50"
                          >
                            <div className="flex justify-between gap-2 mb-2">
                              <span className="text-xs font-bold text-primary">
                                #
                                {index +
                                  1}
                              </span>

                              <span className="text-[10px] uppercase font-bold">
                                {
                                  priority.priority
                                }
                              </span>
                            </div>

                            <p className="text-sm font-semibold">
                              {
                                priority.title
                              }
                            </p>

                            <p className="text-xs text-muted-foreground mt-1.5">
                              {
                                priority.reason
                              }
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Technologies */}

                {roadmap.technologies
                  ?.length > 0 && (
                  <div>
                    <p className="text-sm font-bold mb-3">
                      ðŸ›  Technologies & Concepts
                    </p>

                    <div className="grid md:grid-cols-2 gap-3">
                      {roadmap.technologies.map(
                        (technology) => (
                          <div
                            key={
                              technology.name
                            }
                            className="p-4 rounded-xl border border-border/50"
                          >
                            <div className="flex justify-between gap-3">
                              <p className="text-sm font-semibold">
                                {
                                  technology.name
                                }
                              </p>

                              <span className="text-[10px] font-bold text-primary">
                                {
                                  technology.estimatedWeeks
                                }{" "}
                                week
                                {technology.estimatedWeeks !==
                                1
                                  ? "s"
                                  : ""}
                              </span>
                            </div>

                            <p className="text-xs text-muted-foreground mt-2">
                              {
                                technology.reason
                              }
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Projects */}

                {roadmap.projects
                  ?.length > 0 && (
                  <div>
                    <p className="text-sm font-bold mb-3">
                      ðŸš€ Projects To Build
                    </p>

                    <div className="space-y-3">
                      {roadmap.projects.map(
                        (project) => (
                          <div
                            key={
                              project.title
                            }
                            className="p-4 rounded-xl border border-border/50"
                          >
                            <div className="flex justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold">
                                  {
                                    project.title
                                  }
                                </p>

                                <p className="text-xs text-muted-foreground mt-1">
                                  {
                                    project.description
                                  }
                                </p>
                              </div>

                              <span className="text-[10px] font-bold text-primary whitespace-nowrap">
                                {
                                  project.difficulty
                                }
                              </span>
                            </div>

                            {project.technologies
                              ?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {project.technologies.map(
                                  (
                                    technology,
                                  ) => (
                                    <span
                                      key={
                                        technology
                                      }
                                      className="text-[11px] px-2 py-1 rounded-full bg-muted border border-border/50"
                                    >
                                      {
                                        technology
                                      }
                                    </span>
                                  ),
                                )}
                              </div>
                            )}

                            {project.skillsItImproves
                              ?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {project.skillsItImproves.map(
                                  (skill) => (
                                    <span
                                      key={
                                        skill
                                      }
                                      className="text-[11px] px-2 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20"
                                    >
                                      {
                                        skill
                                      }
                                    </span>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Certifications */}

                {roadmap.certifications
                  ?.length > 0 && (
                  <div>
                    <p className="text-sm font-bold mb-3">
                      ðŸŽ“ Recommended
                      Certifications
                    </p>

                    <div className="grid md:grid-cols-2 gap-3">
                      {roadmap.certifications.map(
                        (certification) => (
                          <div
                            key={`${certification.provider}-${certification.name}`}
                            className="p-4 rounded-xl border border-border/50"
                          >
                            <p className="text-sm font-semibold">
                              {
                                certification.name
                              }
                            </p>

                            <p className="text-xs text-primary mt-1">
                              {
                                certification.provider
                              }
                            </p>

                            <p className="text-xs text-muted-foreground mt-2">
                              {
                                certification.reason
                              }
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Interview topics */}

                {roadmap.interviewTopics
                  ?.length > 0 && (
                  <div>
                    <p className="text-sm font-bold mb-3">
                      ðŸŽ¤ Interview Topics To
                      Practice
                    </p>

                    <div className="grid md:grid-cols-2 gap-3">
                      {roadmap.interviewTopics.map(
                        (topic) => (
                          <div
                            key={
                              topic.topic
                            }
                            className="p-4 rounded-xl border border-border/50"
                          >
                            <div className="flex justify-between gap-2">
                              <p className="text-sm font-semibold">
                                {
                                  topic.topic
                                }
                              </p>

                              <span className="text-[10px] font-bold text-primary">
                                {
                                  topic.priority
                                }
                              </span>
                            </div>

                            <p className="text-xs text-muted-foreground mt-1.5">
                              {
                                topic.reason
                              }
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Communication */}

                {roadmap.communicationImprovement
                  ?.length > 0 && (
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs font-bold text-blue-600 mb-2">
                      ðŸ’¬ Communication
                      Improvement
                    </p>

                    <ul className="space-y-2">
                      {roadmap.communicationImprovement.map(
                        (item) => (
                          <li
                            key={item}
                            className="text-xs text-muted-foreground"
                          >
                            â€¢ {item}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                {/* 30 day plan */}

                {roadmap.thirtyDayPlan
                  ?.length > 0 && (
                  <div>
                    <p className="text-sm font-bold mb-3">
                      ðŸ“… First 30 Days
                    </p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {roadmap.thirtyDayPlan.map(
                        (week) => (
                          <div
                            key={week.week}
                            className="p-4 rounded-xl border border-border/50"
                          >
                            <p className="text-[10px] font-bold text-primary uppercase">
                              Week{" "}
                              {week.week}
                            </p>

                            <p className="text-sm font-semibold mt-1">
                              {week.focus}
                            </p>

                            <ul className="mt-2 space-y-1.5">
                              {(
                                week.actions ||
                                []
                              ).map(
                                (action) => (
                                  <li
                                    key={
                                      action
                                    }
                                    className="text-[11px] text-muted-foreground"
                                  >
                                    â€¢ {action}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* 60 and 90 day */}

                <div className="grid md:grid-cols-2 gap-3">
                  {roadmap.sixtyDayPlan
                    ?.length > 0 && (
                    <div className="p-4 rounded-xl border border-border/50">
                      <p className="text-xs font-bold text-primary mb-2">
                        ðŸ“ˆ 60-Day Goal
                      </p>

                      {roadmap.sixtyDayPlan.map(
                        (
                          item,
                          index,
                        ) => (
                          <div
                            key={`${item.focus}-${index}`}
                            className="mb-3 last:mb-0"
                          >
                            <p className="text-sm font-semibold">
                              {item.focus}
                            </p>

                            <ul className="mt-1.5 space-y-1">
                              {(
                                item.actions ||
                                []
                              ).map(
                                (action) => (
                                  <li
                                    key={
                                      action
                                    }
                                    className="text-xs text-muted-foreground"
                                  >
                                    â€¢ {action}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {roadmap.ninetyDayPlan
                    ?.length > 0 && (
                    <div className="p-4 rounded-xl border border-border/50">
                      <p className="text-xs font-bold text-primary mb-2">
                        ðŸ† 90-Day Goal
                      </p>

                      {roadmap.ninetyDayPlan.map(
                        (
                          item,
                          index,
                        ) => (
                          <div
                            key={`${item.focus}-${index}`}
                            className="mb-3 last:mb-0"
                          >
                            <p className="text-sm font-semibold">
                              {item.focus}
                            </p>

                            <ul className="mt-1.5 space-y-1">
                              {(
                                item.actions ||
                                []
                              ).map(
                                (action) => (
                                  <li
                                    key={
                                      action
                                    }
                                    className="text-xs text-muted-foreground"
                                  >
                                    â€¢ {action}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ==================================================
            SKILL ASSESSMENT
        ================================================== */}

        {skillAssessment && (
          <Card className="border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">
                  ðŸ§  Skill Assessment
                </p>

                <p className="text-xs text-muted-foreground">
                  Based on your completed
                  interview answers
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black text-primary">
                  {
                    skillAssessment.skillAssessment
                  }
                  %
                </p>

                <p className="text-[11px] text-muted-foreground">
                  Overall skill score
                </p>
              </div>
            </div>

            <div className="p-5">
              {skillAssessment.skills
                .length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-5">
                  Complete an interview to
                  generate your skill assessment.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {(skillAssessment.skills || []).map(
                    (skill) => (
                      <div
                        key={skill.topic}
                        className="p-4 rounded-xl border border-border/50"
                      >
                        <div className="flex justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold">
                              {skill.topic}
                            </p>

                            <p className="text-[11px] text-muted-foreground">
                              {
                                skill.questionsAnswered
                              }{" "}
                              answered questions
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-primary">
                              {skill.score}%
                            </p>

                            <p className="text-[11px] capitalize text-muted-foreground">
                              {skill.status}
                            </p>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                            style={{
                              width: `${skill.score}%`,
                            }}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              {skillAssessment.weakSkills
                .length > 0 && (
                <div className="mt-5 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-xs font-bold text-red-600 mb-2">
                    âš ï¸ Areas That Need
                    Improvement
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(skillAssessment.weakSkills || []).map(
                      (skill) => (
                        <span
                          key={skill.topic}
                          className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 border border-red-500/20"
                        >
                          {skill.topic} Â·{" "}
                          {skill.score}%
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              {skillAssessment.strongSkills
                .length > 0 && (
                <div className="mt-3 p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <p className="text-xs font-bold text-green-600 mb-2">
                    âœ… Strong Areas
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(skillAssessment.strongSkills || []).map(
                      (skill) => (
                        <span
                          key={skill.topic}
                          className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20"
                        >
                          {skill.topic} Â·{" "}
                          {skill.score}%
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ==================================================
            SCORE TREND
        ================================================== */}

        {recentScores.length >= 2 && (
          <Card className="p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  Score Trend
                </p>

                <p className="text-xs text-muted-foreground">
                  Last{" "}
                  {recentScores.length} sessions
                </p>
              </div>

              <div className="flex items-end gap-3">
                <MiniSparkline
                  scores={recentScores}
                />

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Latest
                  </p>

                  <p className="text-sm font-bold text-primary">
                    {
                      recentScores[
                        recentScores.length -
                          1
                      ]
                    }
                    %
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ==================================================
            TABS
        ================================================== */}

        <section>
          <div className="flex items-center gap-1 mb-6 border-b border-border/50">
            {(
              [
                "resume",
                "skills",
              ] as const
            ).map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() =>
                  setActiveTab(tab)
                }
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {tab === "resume"
                  ? "ðŸ“„ Resume Analysis"
                  : "ðŸ§  Skill Assessment"}
              </button>
            ))}
          </div>

          {/* =================================================
              RESUME TAB
          ================================================= */}

          {activeTab === "resume" && (
            <ResumePanel
              onDomainSelect={
                handleSelectDomain
              }
            />
          )}

          {/* =================================================
              SKILLS TAB
          ================================================= */}

          {activeTab === "skills" && (
            <Card className="border border-border/50">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold">
                      ðŸ§  Detailed Skill Assessment
                    </h2>

                    <p className="text-xs text-muted-foreground mt-1">
                      Your technical performance
                      across interview topics
                    </p>
                  </div>

                  {skillAssessment && (
                    <div className="text-right">
                      <p className="text-3xl font-black text-primary">
                        {
                          skillAssessment.skillAssessment
                        }
                        %
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Overall
                      </p>
                    </div>
                  )}
                </div>

                {skillLoading ? (
                  <div className="py-10 text-center">
                    <div className="w-8 h-8 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin mb-3" />

                    <p className="text-sm text-muted-foreground">
                      Calculating your skill
                      assessment...
                    </p>
                  </div>
                ) : !skillAssessment ||
                  skillAssessment.skills
                    .length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="text-4xl mb-3">
                      ðŸ§ 
                    </div>

                    <p className="text-sm font-semibold">
                      No skill data yet
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      Complete an interview to
                      build your skill profile.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(skillAssessment.skills || []).map(
                      (skill) => (
                        <div
                          key={skill.topic}
                          className="p-4 rounded-xl border border-border/50"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <p className="text-sm font-semibold">
                                {skill.topic}
                              </p>

                              <p className="text-[11px] text-muted-foreground">
                                {
                                  skill.questionsAnswered
                                }{" "}
                                answered questions
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-bold text-primary">
                                {skill.score}%
                              </p>

                              <p className="text-[11px] capitalize text-muted-foreground">
                                {skill.status}
                              </p>
                            </div>
                          </div>

                          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                              style={{
                                width: `${skill.score}%`,
                              }}
                            />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </section>
      </div>

      {/* ======================================================
          DOMAIN SELECTOR
      ====================================================== */}

      {showDomainSelector && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowDomainSelector(false);
            }
          }}
        >
          <Card className="w-full max-w-xl p-6 border border-border shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-black">
                  Pick a Domain
                </h2>

                <p className="text-sm text-muted-foreground mt-1">
                  Choose what you want to
                  practice today
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDomainSelector(false)
                }
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                âœ•
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5 mb-5">
              {INTERVIEW_DOMAINS.map(
                (domain) => (
                  <button
                    type="button"
                    key={domain.label}
                    onMouseEnter={() =>
                      setHoveredDomain(
                        domain.label,
                      )
                    }
                    onMouseLeave={() =>
                      setHoveredDomain(
                        null,
                      )
                    }
                    onClick={() => {
                      setShowDomainSelector(
                        false,
                      );

                      handleSelectDomain(
                        domain.label,
                      );
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      hoveredDomain ===
                      domain.label
                        ? "border-primary bg-primary/5"
                        : "border-border/60"
                    }`}
                  >
                    <span className="text-2xl">
                      {domain.icon}
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {domain.label}
                      </p>

                      <p className="text-xs text-muted-foreground truncate">
                        {domain.desc}
                      </p>
                    </div>

                    <span
                      className={`ml-auto text-primary ${
                        hoveredDomain ===
                        domain.label
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    >
                      â†’
                    </span>
                  </button>
                ),
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full rounded-xl"
              onClick={() =>
                setShowDomainSelector(false)
              }
            >
              Cancel
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
