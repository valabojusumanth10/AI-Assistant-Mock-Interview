"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

type AnyObject = Record<string, any>;

/* =========================================================
   BADGE STYLES
========================================================= */

const difficultyClass = (difficulty: string) => {
  switch (String(difficulty || "").toLowerCase()) {
    case "easy":
      return "text-green-600 bg-green-500/10 border-green-500/20";
    case "medium":
      return "text-yellow-600 bg-yellow-500/10 border-yellow-500/20";
    case "hard":
      return "text-red-600 bg-red-500/10 border-red-500/20";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
};

const evaluationClass = (evaluation: string) => {
  switch (String(evaluation || "").toLowerCase()) {
    case "strong":
      return "text-green-600 bg-green-500/10 border-green-500/20";
    case "average":
      return "text-yellow-600 bg-yellow-500/10 border-yellow-500/20";
    case "weak":
      return "text-red-600 bg-red-500/10 border-red-500/20";
    case "skipped":
      return "text-muted-foreground bg-muted border-border";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
};

/* =========================================================
   CLEAN DATA
========================================================= */

const cleanText = (value: any): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(item))
      .join("\n");
  }

  if (typeof value === "object") {
    if (value.text) {
      return cleanText(value.text);
    }

    if (value.message) {
      return cleanText(value.message);
    }

    if (value.feedback) {
      return cleanText(value.feedback);
    }

    if (value.content) {
      return cleanText(value.content);
    }

    return Object.values(value)
      .map((item) => cleanText(item))
      .filter(Boolean)
      .join("\n");
  }

  return String(value);
};

const formatDate = (date: any) => {
  if (!date) return "—";

  try {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

const formatDuration = (seconds: any) => {
  const value = Number(seconds || 0);

  if (!value) {
    return "—";
  }

  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

/* =========================================================
   STRUCTURED CONTENT RENDERER

   IMPORTANT:
   This does NOT invent "RESULT", "TECHNICAL DETAILS",
   etc. It preserves the candidate's actual structure.
========================================================= */

function MarkdownContent({
  content,
  className = "",
}: {
  content: any;
  className?: string;
}) {
  const text = cleanText(content);

  if (!text.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        No information available.
      </p>
    );
  }

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  const formatInline = (value: string) => {
    const parts = value.split(/(`[^`]+`)/g);

    return parts.map((part, index) => {
      if (
        part.startsWith("`") &&
        part.endsWith("`")
      ) {
        return (
          <code
            key={index}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      let clean = part;

      // Remove markdown formatting characters
      clean = clean.replace(
        /\*\*\*(.*?)\*\*\*/g,
        "$1"
      );

      clean = clean.replace(
        /\*\*(.*?)\*\*/g,
        "$1"
      );

      clean = clean.replace(
        /__(.*?)__/g,
        "$1"
      );

      clean = clean.replace(
        /\*(.*?)\*/g,
        "$1"
      );

      clean = clean.replace(
        /_(.*?)_/g,
        "$1"
      );

      return (
        <React.Fragment key={index}>
          {clean}
        </React.Fragment>
      );
    });
  };

  /*
   * We process the answer line-by-line.
   *
   * Normal lines stay together.
   * Numbered lists stay together.
   * Bullets stay together.
   * Real headings are headings.
   * Code blocks stay code blocks.
   *
   * We DO NOT split technical sentences into
   * random "RESULT" boxes.
   */

  const elements: React.ReactNode[] = [];

  let paragraphLines: string[] = [];

  let listItems: {
    marker: string;
    text: string;
  }[] = [];

  let codeLines: string[] = [];
  let insideCodeBlock = false;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    const paragraph = paragraphLines
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (paragraph) {
      elements.push(
        <p
          key={`paragraph-${elements.length}`}
          className="text-sm leading-7"
        >
          {formatInline(paragraph)}
        </p>
      );
    }

    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    elements.push(
      <div
        key={`list-${elements.length}`}
        className="space-y-2"
      >
        {listItems.map(
          (
            item: {
              marker: string;
              text: string;
            },
            index: number
          ) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg bg-muted/40 p-3"
            >
              <div className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
                {item.marker}
              </div>

              <p className="text-sm leading-6">
                {formatInline(item.text)}
              </p>
            </div>
          )
        )}
      </div>
    );

    listItems = [];
  };

  const flushCode = () => {
    if (codeLines.length === 0) {
      return;
    }

    elements.push(
      <div
        key={`code-${elements.length}`}
        className="overflow-x-auto rounded-xl border bg-muted/30"
      >
        <pre className="p-4">
          <code className="font-mono text-xs leading-6">
            {codeLines.join("\n")}
          </code>
        </pre>
      </div>
    );

    codeLines = [];
  };

  const lines = normalized.split("\n");

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    /* CODE BLOCK */
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();

      if (!insideCodeBlock) {
        insideCodeBlock = true;
        codeLines = [];
      } else {
        insideCodeBlock = false;
        flushCode();
      }

      return;
    }

    if (insideCodeBlock) {
      codeLines.push(rawLine);
      return;
    }

    /* EMPTY LINE */
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    /* REAL MARKDOWN HEADING */
    if (/^#{1,3}\s+/.test(line)) {
      flushParagraph();
      flushList();

      const heading = line
        .replace(/^#{1,3}\s+/, "")
        .replace(/\*\*/g, "")
        .trim();

      elements.push(
        <h4
          key={`heading-${elements.length}`}
          className="pt-3 text-sm font-bold"
        >
          {heading}
        </h4>
      );

      return;
    }

    /* NUMBERED LIST */
    const numberedMatch =
      line.match(/^(\d+)\.\s+(.+)$/);

    if (numberedMatch) {
      flushParagraph();

      listItems.push({
        marker: numberedMatch[1],
        text: numberedMatch[2],
      });

      return;
    }

    /* BULLET LIST */
    const bulletMatch =
      line.match(/^[-*•]\s+(.+)$/);

    if (bulletMatch) {
      flushParagraph();

      listItems.push({
        marker: "•",
        text: bulletMatch[1],
      });

      return;
    }

    /* BLOCKQUOTE */
    if (line.startsWith(">")) {
      flushParagraph();
      flushList();

      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="border-l-4 border-primary/30 pl-4 text-sm italic leading-7 text-muted-foreground"
        >
          {formatInline(
            line.replace(/^>\s?/, "")
          )}
        </blockquote>
      );

      return;
    }

    /*
     * NORMAL TEXT
     *
     * This is the important part.
     * Technical content stays together.
     */
    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();

  if (insideCodeBlock) {
    flushCode();
  }

  return (
    <div
      className={`space-y-4 ${className}`}
    >
      {elements}
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function InterviewReportPage() {
  const router = useRouter();
  const params = useParams();

  const {
    user,
    loading,
    isLoading,
  } = useAuth();

  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [report, setReport] =
    useState<AnyObject | null>(null);

  const [pageLoading, setPageLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [expandedQuestion, setExpandedQuestion] =
    useState<number | null>(null);

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    if (loading || isLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
    }
  }, [
    user,
    loading,
    isLoading,
    router,
  ]);

  /* =======================================================
     LOAD REPORT
  ======================================================= */

  useEffect(() => {
    if (!user || !id) {
      return;
    }

    let cancelled = false;

    const loadReport = async () => {
      try {
        setPageLoading(true);
        setError("");

        const response =
          await axiosInstance.get(
            `/api/interviews/${id}`
          );

        if (cancelled) {
          return;
        }

        const data = response?.data;

        const interview =
          data?.interview ||
          data?.data?.interview ||
          data?.data ||
          data;

        setReport(interview);
      } catch (err: any) {
        console.error(
          "REPORT LOAD ERROR:",
          err
        );

        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              "Unable to load this interview report."
          );
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [user, id]);

  /* =======================================================
     PROGRESS
  ======================================================= */

  const progress = useMemo(() => {
    if (!report) {
      return [];
    }

    if (Array.isArray(report.progress)) {
      return report.progress;
    }

    if (Array.isArray(report.questions)) {
      return report.questions;
    }

    return [];
  }, [report]);

  const actualProgress = useMemo(() => {
    return progress.filter(
      (item: AnyObject) =>
        item &&
        (
          item.question ||
          item.answer ||
          item.evaluation ||
          item.score !== undefined
        )
    );
  }, [progress]);

  /* =======================================================
     DIFFICULTY HISTORY
  ======================================================= */

  const difficultyHistory = useMemo(() => {
    if (!report) {
      return [];
    }

    let history = Array.isArray(
      report.difficultyHistory
    )
      ? report.difficultyHistory
      : [];

    /*
     * Prevent extra Q6/Q7/etc from being displayed
     * when the interview actually contains 5 questions.
     */
    if (actualProgress.length > 0) {
      history = history.slice(
        0,
        actualProgress.length
      );
    }

    return history;
  }, [
    report,
    actualProgress.length,
  ]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    if (!report) {
      return {
        answered: 0,
        skipped: 0,
        score: 0,
        total: 5,
      };
    }

    const answeredFromProgress =
      actualProgress.filter(
        (item: AnyObject) =>
          !item?.skipped &&
          String(
            item?.evaluation || ""
          ).toLowerCase() !== "skipped"
      ).length;

    const skippedFromProgress =
      actualProgress.filter(
        (item: AnyObject) =>
          item?.skipped ||
          String(
            item?.evaluation || ""
          ).toLowerCase() === "skipped"
      ).length;

    const scores =
      actualProgress
        .map((item: AnyObject) =>
          Number(item?.score)
        )
        .filter(
          (score: number) =>
            Number.isFinite(score)
        );

    const average =
      scores.length > 0
        ? Math.round(
            scores.reduce(
              (
                sum: number,
                score: number
              ) => sum + score,
              0
            ) / scores.length
          )
        : 0;

    const finalScore =
      report.score !== undefined
        ? Number(report.score)
        : average;

    return {
      answered:
        Number(report.questionsAnswered) ||
        answeredFromProgress,

      skipped:
        Number(report.questionsSkipped) ||
        skippedFromProgress,

      score:
        Number.isFinite(finalScore)
          ? Math.round(finalScore)
          : 0,

      total:
        Number(report.totalQuestions) ||
        actualProgress.length ||
        5,
    };
  }, [
    report,
    actualProgress,
  ]);

  /* =======================================================
     HIGHEST DIFFICULTY
  ======================================================= */

  const highestDifficulty = useMemo(() => {
    if (report?.highestDifficulty) {
      return String(
        report.highestDifficulty
      );
    }

    const levels =
      difficultyHistory.map(
        (item: any) =>
          String(
            typeof item === "string"
              ? item
              : item?.difficulty ||
                item?.level ||
                ""
          ).toLowerCase()
      );

    if (levels.includes("hard")) {
      return "hard";
    }

    if (levels.includes("medium")) {
      return "medium";
    }

    if (levels.includes("easy")) {
      return "easy";
    }

    return "—";
  }, [
    report,
    difficultyHistory,
  ]);

  /* =======================================================
     STRENGTHS
  ======================================================= */

  const strengths = useMemo(() => {
    if (!report) {
      return [];
    }

    const value =
      report.strengths ||
      report.strength ||
      [];

    if (Array.isArray(value)) {
      return value
        .map((item: any) =>
          cleanText(item)
        )
        .filter(Boolean);
    }

    if (value) {
      return [cleanText(value)];
    }

    return [];
  }, [report]);

  /* =======================================================
     WEAKNESSES
  ======================================================= */

  const weaknesses = useMemo(() => {
    if (!report) {
      return [];
    }

    const value =
      report.weaknesses ||
      report.weakness ||
      [];

    if (Array.isArray(value)) {
      return value
        .map((item: any) =>
          cleanText(item)
        )
        .filter(Boolean);
    }

    if (value) {
      return [cleanText(value)];
    }

    return [];
  }, [report]);

  /* =======================================================
     RECOMMENDATIONS
  ======================================================= */

  const recommendations = useMemo(() => {
    if (!report) {
      return [];
    }

    const value =
      report.recommendations ||
      report.recommendation ||
      report.aiRecommendations ||
      [];

    if (Array.isArray(value)) {
      return value
        .map((item: any) =>
          cleanText(item)
        )
        .filter(Boolean);
    }

    if (value) {
      return [cleanText(value)];
    }

    return [];
  }, [report]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    if (!report) {
      return "";
    }

    return cleanText(
      report.summary ||
        report.overallSummary ||
        report.feedback ||
        ""
    );
  }, [report]);

  /* =======================================================
     SCORE LABEL
  ======================================================= */

  const scoreLabel = useMemo(() => {
    if (stats.score >= 80) {
      return "Excellent";
    }

    if (stats.score >= 70) {
      return "Good";
    }

    if (stats.score >= 60) {
      return "Average";
    }

    if (stats.score >= 40) {
      return "Needs Improvement";
    }

    return "Needs Work";
  }, [stats.score]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading ||
    isLoading ||
    pageLoading
  ) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />

          <p className="text-sm text-muted-foreground">
            Loading interview report...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-2xl text-red-600">
            !
          </div>

          <h1 className="text-xl font-bold">
            Report unavailable
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {error ||
              "This interview report could not be found."}
          </p>

          <button
            onClick={() =>
              router.push("/history")
            }
            className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">
          <button
            onClick={() =>
              router.push("/history")
            }
            className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Interview History
          </button>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                Interview Report
              </p>

              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {cleanText(
                  report.domain
                ) ||
                  "Technical Interview"}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2">
                {report.company && (
                  <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium">
                    {cleanText(
                      report.company
                    )}
                  </span>
                )}

                {report.candidateType && (
                  <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium capitalize">
                    {cleanText(
                      report.candidateType
                    ).replace(
                      /-/g,
                      " "
                    )}
                  </span>
                )}

                {report.startedAt && (
                  <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                    {formatDate(
                      report.startedAt
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* SCORE */}
            <div className="rounded-2xl border bg-card px-8 py-5 text-center shadow-sm">
              <div className="text-4xl font-bold">
                {stats.score}%
              </div>

              <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {scoreLabel}
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            QUICK STATS
        ================================================= */}

        <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Questions
            </p>

            <p className="mt-2 text-2xl font-bold">
              {stats.answered}/
              {stats.total}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Skipped
            </p>

            <p className="mt-2 text-2xl font-bold">
              {stats.skipped}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Highest Difficulty
            </p>

            <p className="mt-2 text-2xl font-bold capitalize">
              {highestDifficulty}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Duration
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatDuration(
                report.duration
              )}
            </p>
          </div>
        </section>

        {/* =================================================
            ADAPTIVE PROGRESSION
        ================================================= */}

        {difficultyHistory.length > 0 && (
          <section className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                Adaptive Progression
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Interview difficulty changed based on your performance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {difficultyHistory.map(
                (
                  item: any,
                  index: number
                ) => {
                  const difficulty =
                    typeof item === "string"
                      ? item
                      : item?.difficulty ||
                        item?.level ||
                        "—";

                  return (
                    <React.Fragment
                      key={index}
                    >
                      <div
                        className={`rounded-lg border px-4 py-2 ${difficultyClass(
                          difficulty
                        )}`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          Question{" "}
                          {index + 1}
                        </div>

                        <div className="mt-0.5 text-sm font-bold capitalize">
                          {difficulty}
                        </div>
                      </div>

                      {index <
                        difficultyHistory.length -
                          1 && (
                        <span className="text-muted-foreground">
                          →
                        </span>
                      )}
                    </React.Fragment>
                  );
                }
              )}
            </div>
          </section>
        )}

        {/* =================================================
            STRENGTHS + WEAKNESSES
        ================================================= */}

        {(strengths.length > 0 ||
          weaknesses.length > 0) && (
          <section className="mb-8 grid gap-6 md:grid-cols-2">

            {/* STRENGTHS */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                  ✓
                </div>

                <div>
                  <h2 className="font-bold">
                    Strengths
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    Areas where you performed well
                  </p>
                </div>
              </div>

              {strengths.length > 0 ? (
                <div className="space-y-3">
                  {strengths.map(
                    (
                      strength: string,
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="rounded-lg bg-muted/40 p-4"
                      >
                        <MarkdownContent
                          content={
                            strength
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No strengths recorded.
                </p>
              )}
            </div>

            {/* WEAKNESSES */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                  !
                </div>

                <div>
                  <h2 className="font-bold">
                    Areas to Improve
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    Topics that need more practice
                  </p>
                </div>
              </div>

              {weaknesses.length > 0 ? (
                <div className="space-y-3">
                  {weaknesses.map(
                    (
                      weakness: string,
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="rounded-lg bg-muted/40 p-4"
                      >
                        <MarkdownContent
                          content={
                            weakness
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No weaknesses recorded.
                </p>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            QUESTION ANALYSIS
        ================================================= */}

        <section className="mb-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              Question-by-Question Analysis
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Review your answer and the AI evaluation for every question.
            </p>
          </div>

          {actualProgress.length === 0 ? (
            <div className="rounded-2xl border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No question data is available for this interview.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {actualProgress.map(
                (
                  item: AnyObject,
                  index: number
                ) => {
                  const question =
                    cleanText(
                      item?.question ||
                        item?.questionText ||
                        `Question ${
                          index + 1
                        }`
                    );

                  const answer =
                    cleanText(
                      item?.answer ||
                        item?.userAnswer ||
                        ""
                    );

                  const feedback =
                    cleanText(
                      item?.feedback ||
                        item?.evaluationFeedback ||
                        item?.aiFeedback ||
                        item?.explanation ||
                        ""
                    );

                  const evaluation =
                    cleanText(
                      item?.evaluation ||
                        item?.result ||
                        "—"
                    );

                  const difficulty =
                    cleanText(
                      item?.difficulty ||
                        (
                          typeof difficultyHistory[
                            index
                          ] === "string"
                            ? difficultyHistory[
                                index
                              ]
                            : difficultyHistory[
                                index
                              ]?.difficulty
                        ) ||
                        "—"
                    );

                  const score =
                    item?.score !==
                      undefined &&
                    item?.score !== null
                      ? Number(
                          item.score
                        )
                      : null;

                  const skipped =
                    Boolean(
                      item?.skipped
                    ) ||
                    evaluation
                      .toLowerCase()
                      .includes(
                        "skipped"
                      );

                  const isOpen =
                    expandedQuestion ===
                    index;

                  return (
                    <div
                      key={index}
                      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                    >
                      {/* QUESTION HEADER */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedQuestion(
                            isOpen
                              ? null
                              : index
                          )
                        }
                        className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-muted/30"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${difficultyClass(
                                difficulty
                              )}`}
                            >
                              {difficulty}
                            </span>

                            <span
                              className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${evaluationClass(
                                evaluation
                              )}`}
                            >
                              {evaluation}
                            </span>

                            {score !==
                              null &&
                              Number.isFinite(
                                score
                              ) && (
                                <span className="rounded-md border bg-muted/40 px-2 py-1 text-[10px] font-bold">
                                  {score}
                                  /100
                                </span>
                              )}
                          </div>

                          <p className="line-clamp-2 text-sm font-semibold leading-6">
                            {question}
                          </p>
                        </div>

                        <span className="shrink-0 text-xl text-muted-foreground">
                          {isOpen
                            ? "−"
                            : "+"}
                        </span>
                      </button>

                      {/* QUESTION DETAILS */}
                      {isOpen && (
                        <div className="border-t px-5 pb-6 pt-5">

                          {/* QUESTION */}
                          <div className="mb-6">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Question
                            </p>

                            <div className="rounded-xl border bg-muted/20 p-5">
                              <MarkdownContent
                                content={
                                  question
                                }
                              />
                            </div>
                          </div>

                          {/* YOUR ANSWER */}
                          <div className="mb-6">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Your Answer
                            </p>

                            <div className="rounded-xl border bg-card p-5">
                              {skipped ? (
                                <div className="rounded-lg bg-muted/40 p-4">
                                  <p className="text-sm italic text-muted-foreground">
                                    Question skipped.
                                  </p>
                                </div>
                              ) : answer ? (
                                <MarkdownContent
                                  content={
                                    answer
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No answer provided.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* AI EVALUATION */}
                          <div className="mb-6">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              AI Evaluation
                            </p>

                            <div className="rounded-xl border bg-primary/5 p-5">
                              {feedback ? (
                                <MarkdownContent
                                  content={
                                    feedback
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No detailed AI feedback available.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* TOPIC */}
                          {item?.topic && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground">
                                Topic:
                              </span>

                              <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium">
                                {cleanText(
                                  item.topic
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* =================================================
            OVERALL SUMMARY
        ================================================= */}

        {summary && (
          <section className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-bold">
                Overall Summary
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                AI-generated assessment of your overall interview performance.
              </p>
            </div>

            <div className="rounded-xl bg-muted/30 p-5">
              <MarkdownContent
                content={summary}
              />
            </div>
          </section>
        )}

        {/* =================================================
            RECOMMENDATIONS
        ================================================= */}

        <section className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              Recommended Next Steps
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Personalized actions to improve your next interview.
            </p>
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map(
                (
                  recommendation: string,
                  index: number
                ) => (
                  <div
                    key={index}
                    className="flex gap-4 rounded-xl bg-muted/40 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <MarkdownContent
                        content={
                          recommendation
                        }
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-muted/40 p-5">
              <p className="text-sm text-muted-foreground">
                Complete more interviews to receive personalized recommendations.
              </p>
            </div>
          )}
        </section>

        {/* =================================================
            INTERVIEW DETAILS
        ================================================= */}

        <section className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">
            Interview Details
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Domain
              </p>

              <p className="mt-1 text-sm font-semibold">
                {cleanText(
                  report.domain
                ) || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Company
              </p>

              <p className="mt-1 text-sm font-semibold">
                {cleanText(
                  report.company
                ) || "General"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Started
              </p>

              <p className="mt-1 text-sm font-semibold">
                {formatDate(
                  report.startedAt
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Completed
              </p>

              <p className="mt-1 text-sm font-semibold">
                {formatDate(
                  report.completedAt
                )}
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-between">
          <button
            onClick={() =>
              router.push("/history")
            }
            className="rounded-lg border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
          >
            ← Interview History
          </button>

          <button
            onClick={() =>
              router.push("/interview")
            }
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Start Another Interview →
          </button>
        </div>
      </div>
    </main>
  );
}