"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";

interface Interview {
  id?: string;
  _id?: string;
  topic?: string;
  domain?: string;
  score?: number;
  duration?: number;
  questionsAnswered?: number;
  questionsSkipped?: number;
  startingDifficulty?: string;
  endingDifficulty?: string;
  difficultyHistory?: string[];
  progress?: unknown[];
  date?: string;
  completedAt?: string;
}

const getScoreLabel = (score: number) => {
  if (score >= 85) {
    return {
      label: "Excellent",
      className:
        "bg-green-500/10 text-green-600 border-green-500/20",
    };
  }

  if (score >= 75) {
    return {
      label: "Strong",
      className:
        "bg-blue-500/10 text-blue-600 border-blue-500/20",
    };
  }

  if (score >= 60) {
    return {
      label: "Needs Work",
      className:
        "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    };
  }

  return {
    label: "Needs Improvement",
    className:
      "bg-red-500/10 text-red-600 border-red-500/20",
  };
};

const getDomainEmoji = (domain: string) => {
  const normalized = domain.toLowerCase();

  if (normalized.includes("javascript")) return "🟨";
  if (normalized.includes("react")) return "⚛️";
  if (normalized.includes("python")) return "🐍";
  if (normalized.includes("data")) return "📊";
  if (normalized.includes("devops")) return "⚙️";
  if (normalized.includes("system")) return "🏗️";
  if (normalized.includes("database")) return "🗄️";

  return "🎯";
};

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) {
    return "—";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

const formatDate = (date?: string) => {
  if (!date) {
    return "Unknown date";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (date?: string) => {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function HistoryPage() {
  const router = useRouter();

  const {
    isLoggedIn,
    isLoading: authLoading,
  } = useAuth();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchInterviews();
    }
  }, [isLoggedIn]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await axiosInstance.get(
        "/api/interviews"
      );

      const sessions = Array.isArray(data?.interviews)
        ? data.interviews
        : [];

      /*
       * Normalize the interview ID.
       *
       * Depending on the backend response, the ID may arrive as:
       * - id
       * - _id
       * - _id.$oid
       * - interviewId
       *
       * We always store it as `id` so View Report never
       * navigates to /history/undefined.
       */
      const normalizedSessions: Interview[] =
        sessions.map((session: any) => {
          let interviewId = "";

          if (
            typeof session?.id === "string" &&
            session.id.trim()
          ) {
            interviewId = session.id;
          } else if (
            typeof session?._id === "string" &&
            session._id.trim()
          ) {
            interviewId = session._id;
          } else if (
            typeof session?._id?.$oid === "string" &&
            session._id.$oid.trim()
          ) {
            interviewId = session._id.$oid;
          } else if (
            typeof session?.interviewId === "string" &&
            session.interviewId.trim()
          ) {
            interviewId = session.interviewId;
          }

          return {
            ...session,
            id: interviewId,
          };
        });

      setInterviews(normalizedSessions);
    } catch (err: any) {
      console.error(
        "Failed to fetch interview history:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to load your sessions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const domains = useMemo(() => {
    const unique = new Set<string>();

    interviews.forEach((interview) => {
      const domain =
        interview.topic ||
        interview.domain ||
        "General";

      unique.add(domain);
    });

    return ["All", ...Array.from(unique)];
  }, [interviews]);

  const filteredInterviews = useMemo(() => {
    if (filter === "All") {
      return interviews;
    }

    return interviews.filter(
      (interview) =>
        (interview.topic ||
          interview.domain ||
          "General") === filter
    );
  }, [interviews, filter]);

  const averageScore = interviews.length
    ? Math.round(
        interviews.reduce(
          (total, interview) =>
            total + (interview.score || 0),
          0
        ) / interviews.length
      )
    : 0;

  const bestScore = interviews.length
    ? Math.max(
        ...interviews.map(
          (interview) => interview.score || 0
        )
      )
    : 0;

  const totalQuestions = interviews.reduce(
    (total, interview) =>
      total +
      (interview.questionsAnswered || 0) +
      (interview.questionsSkipped || 0),
    0
  );

  const openSession = (id?: string) => {
    if (!id || id === "undefined" || id === "null") {
      console.error(
        "Cannot open interview report: interview ID is missing"
      );
      return;
    }

    router.push(`/history/${id}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />

          <p className="text-sm text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <section className="mb-8">
          <p className="text-sm text-muted-foreground font-medium mb-2">
            📚 Your interview journey
          </p>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                My Sessions
              </h1>

              <p className="mt-3 text-muted-foreground max-w-2xl">
                Review your completed interviews, track your
                performance, and identify where you need to
                improve.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/practice")}
              className="self-start md:self-auto px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all"
            >
              + New Practice
            </button>
          </div>
        </section>

        {/* =====================================================
            SUMMARY STATS
        ====================================================== */}

        {!loading && interviews.length > 0 && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground font-medium">
                Total Sessions
              </p>

              <p className="text-3xl font-black mt-2">
                {interviews.length}
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Completed interviews
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground font-medium">
                Average Score
              </p>

              <p className="text-3xl font-black mt-2">
                {averageScore}%
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Across all sessions
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground font-medium">
                Best Score
              </p>

              <p className="text-3xl font-black mt-2">
                {bestScore}%
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Personal best
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground font-medium">
                Questions
              </p>

              <p className="text-3xl font-black mt-2">
                {totalQuestions}
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Attempted + skipped
              </p>
            </div>

          </section>
        )}

        {/* =====================================================
            FILTERS
        ====================================================== */}

        {!loading && interviews.length > 0 && (
          <section className="mb-6">
            <div className="flex flex-wrap items-center gap-2">

              {domains.map((domain) => (
                <button
                  type="button"
                  key={domain}
                  onClick={() => setFilter(domain)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                    filter === domain
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {domain === "All"
                    ? "All Sessions"
                    : `${getDomainEmoji(domain)} ${domain}`}
                </button>
              ))}

            </div>
          </section>
        )}

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              <div>
                <p className="font-semibold text-red-600">
                  Something went wrong
                </p>

                <p className="text-sm text-muted-foreground mt-1">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={fetchInterviews}
                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-600 text-sm font-semibold hover:bg-red-500/20 transition-all"
              >
                Try Again
              </button>

            </div>
          </div>
        )}

        {/* =====================================================
            LOADING
        ====================================================== */}

        {loading && (
          <section className="space-y-4">

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="animate-pulse">

                  <div className="flex gap-4">

                    <div className="w-12 h-12 rounded-xl bg-muted" />

                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-1/3" />

                      <div className="h-3 bg-muted rounded w-1/4 mt-3" />
                    </div>

                    <div className="w-16 h-10 bg-muted rounded" />

                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="h-12 bg-muted rounded-xl" />
                    <div className="h-12 bg-muted rounded-xl" />
                    <div className="h-12 bg-muted rounded-xl" />
                  </div>

                </div>
              </div>
            ))}

          </section>
        )}

        {/* =====================================================
            EMPTY STATE
        ====================================================== */}

        {!loading &&
          !error &&
          interviews.length === 0 && (
            <section className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-10 md:p-16 text-center">

              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-4xl mx-auto">
                🎯
              </div>

              <h2 className="text-2xl font-black mt-6">
                No sessions yet
              </h2>

              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-3 leading-relaxed">
                Your completed AI interviews will appear here.
                Start your first practice session and build your
                interview history.
              </p>

              <button
                type="button"
                onClick={() => router.push("/practice")}
                className="mt-6 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all"
              >
                Start Your First Interview →
              </button>

            </section>
          )}

        {/* =====================================================
            NO FILTER RESULTS
        ====================================================== */}

        {!loading &&
          !error &&
          interviews.length > 0 &&
          filteredInterviews.length === 0 && (
            <section className="rounded-2xl border border-border bg-card p-10 text-center">

              <div className="text-4xl mb-4">
                🔍
              </div>

              <h2 className="font-bold text-lg">
                No sessions found
              </h2>

              <p className="text-sm text-muted-foreground mt-2">
                You don't have any sessions for this domain.
              </p>

              <button
                type="button"
                onClick={() => setFilter("All")}
                className="mt-5 px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:border-primary/40 transition-all"
              >
                Show All Sessions
              </button>

            </section>
          )}

        {/* =====================================================
            SESSION LIST
        ====================================================== */}

        {!loading &&
          !error &&
          filteredInterviews.length > 0 && (
            <section className="space-y-4">

              {filteredInterviews.map(
                (interview, index) => {
                  const score =
                    interview.score || 0;

                  const domain =
                    interview.topic ||
                    interview.domain ||
                    "General";

                  const scoreInfo =
                    getScoreLabel(score);

                  const date =
                    interview.completedAt ||
                    interview.date;

                  const interviewId =
                    interview.id ||
                    interview._id;

                  return (
                    <article
                      key={
                        interviewId ||
                        `${domain}-${date || "unknown"}-${index}`
                      }
                      className="group rounded-2xl border border-border bg-card p-5 md:p-6 hover:border-primary/30 hover:shadow-md transition-all"
                    >

                      {/* TOP */}

                      <div className="flex flex-col md:flex-row md:items-center gap-5">

                        <div className="flex items-center gap-4 flex-1 min-w-0">

                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                            {getDomainEmoji(domain)}
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h2 className="font-bold text-lg truncate">
                                {domain}
                              </h2>

                              <span
                                className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${scoreInfo.className}`}
                              >
                                {scoreInfo.label}
                              </span>

                            </div>

                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(date)}

                              {formatTime(date)
                                ? ` · ${formatTime(date)}`
                                : ""}
                            </p>

                          </div>

                        </div>

                        {/* SCORE */}

                        <div className="flex items-center gap-4">

                          <div className="text-left md:text-right">

                            <p className="text-xs text-muted-foreground">
                              Score
                            </p>

                            <p
                              className={`text-3xl font-black ${
                                score >= 75
                                  ? "text-green-600"
                                  : score >= 60
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {score}%
                            </p>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openSession(interviewId)
                            }
                            disabled={!interviewId}
                            className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            View Report →
                          </button>

                        </div>

                      </div>

                      {/* DETAILS */}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

                        <div className="rounded-xl bg-muted/50 p-3">

                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Answered
                          </p>

                          <p className="font-bold mt-1">
                            {interview.questionsAnswered ??
                              0}
                          </p>

                        </div>

                        <div className="rounded-xl bg-muted/50 p-3">

                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Skipped
                          </p>

                          <p className="font-bold mt-1">
                            {interview.questionsSkipped ??
                              0}
                          </p>

                        </div>

                        <div className="rounded-xl bg-muted/50 p-3">

                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Duration
                          </p>

                          <p className="font-bold mt-1">
                            {formatDuration(
                              interview.duration
                            )}
                          </p>

                        </div>

                        <div className="rounded-xl bg-muted/50 p-3">

                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Difficulty
                          </p>

                          <p className="font-bold mt-1 capitalize">
                            {interview.startingDifficulty ||
                              "—"}

                            {interview.endingDifficulty &&
                            interview.startingDifficulty !==
                              interview.endingDifficulty
                              ? ` → ${interview.endingDifficulty}`
                              : ""}
                          </p>

                        </div>

                      </div>

                      {/* DIFFICULTY PROGRESSION */}

                      {interview.difficultyHistory &&
                        interview.difficultyHistory.length > 0 && (
                          <div className="mt-4 flex items-center gap-2 flex-wrap">

                            <span className="text-xs text-muted-foreground">
                              Difficulty:
                            </span>

                            {interview.difficultyHistory.map(
                              (
                                difficulty,
                                difficultyIndex
                              ) => (
                                <span
                                  key={`${difficulty}-${difficultyIndex}`}
                                  className="text-[11px] px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/10 capitalize"
                                >
                                  {difficulty}
                                </span>
                              )
                            )}

                          </div>
                        )}

                    </article>
                  );
                }
              )}

            </section>
          )}

      </div>
    </main>
  );
}