"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";

// ============================================================
// TYPES
// ============================================================

type Category =
  | "HR"
  | "Technical"
  | "Aptitude"
  | "Domain-Specific";

type ChallengeType =
  | "daily"
  | "weekly"
  | "practice";

interface Challenge {
  _id: string;
  title: string;
  description: string;
  category: Category;
  domain: string;
  difficulty: string;
  question: string;
  options: string[];
  points: number;
  duration: number;
  challengeType: string;
  tags: string[];
}

interface Result {
  score: number;
  pointsEarned: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  isCorrect: boolean;
}

interface RankHistoryItem {
  rank: number;
  points?: number;
  totalPoints?: number;
  rankName?: string;
  recordedAt?: string;
  createdAt?: string;
  date?: string;
}

interface Stats {
  totalPoints: number;
  completedChallenges: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  longestStreak: number;
  rank: number;
  rankName: string;
  badges: string[];
  rankHistory?: RankHistoryItem[];
}

interface LeaderboardItem {
  rank: number;
  name: string;
  totalPoints: number;
  completedChallenges: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  rankName: string;
  badges: string[];
}

// ============================================================
// CONSTANTS
// ============================================================

const categories: {
  id: Category;
  label: string;
  emoji: string;
}[] = [
  {
    id: "Technical",
    label: "Technical",
    emoji: "💻",
  },
  {
    id: "HR",
    label: "HR",
    emoji: "🧑‍💼",
  },
  {
    id: "Aptitude",
    label: "Aptitude",
    emoji: "🧠",
  },
  {
    id: "Domain-Specific",
    label: "Domain",
    emoji: "🎯",
  },
];

// ============================================================
// HELPERS
// ============================================================

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getRankMovement(
  currentRank: number,
  previousRank?: number,
) {
  if (
    !previousRank ||
    !currentRank ||
    currentRank === previousRank
  ) {
    return {
      label: "No change",
      className: "text-muted-foreground",
      icon: "→",
    };
  }

  if (currentRank < previousRank) {
    return {
      label: `Up ${previousRank - currentRank}`,
      className: "text-green-600 dark:text-green-400",
      icon: "↑",
    };
  }

  return {
    label: `Down ${currentRank - previousRank}`,
    className: "text-red-600 dark:text-red-400",
    icon: "↓",
  };
}

function getRankIcon(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";

  return `#${rank}`;
}

// ============================================================
// PAGE
// ============================================================

export default function ChallengeArenaPage() {
  const router = useRouter();

  const {
    isLoggedIn,
    isLoading: authLoading,
    user,
  } = useAuth();

  // ----------------------------------------------------------
  // Challenge state
  // ----------------------------------------------------------

  const [category, setCategory] =
    useState<Category>("Technical");

  const [domain, setDomain] =
    useState("JavaScript/Node.js");

  const [challenge, setChallenge] =
    useState<Challenge | null>(null);

  const [challengeType, setChallengeType] =
    useState<ChallengeType>("daily");

  // ----------------------------------------------------------
  // Stats
  // ----------------------------------------------------------

  const [stats, setStats] =
    useState<Stats | null>(null);

  const [leaderboard, setLeaderboard] =
    useState<LeaderboardItem[]>([]);

  // ----------------------------------------------------------
  // Answer
  // ----------------------------------------------------------

  const [answer, setAnswer] =
    useState("");

  const [selectedOption, setSelectedOption] =
    useState("");

  // ----------------------------------------------------------
  // Loading
  // ----------------------------------------------------------

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  // ----------------------------------------------------------
  // Result
  // ----------------------------------------------------------

  const [result, setResult] =
    useState<Result | null>(null);

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  const [error, setError] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<
      "challenge" | "leaderboard" | "history"
    >("challenge");

  const [startTime, setStartTime] =
    useState<number | null>(null);

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
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (!isLoggedIn) return;

    fetchStats();
    fetchLeaderboard();
    fetchChallenge(
      "daily",
      category,
      domain,
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // ==========================================================
  // FETCH STATS
  // ==========================================================

  const fetchStats = async () => {
    try {
      const { data } =
        await axiosInstance.get(
          "/api/challenges/stats",
        );

      const incomingStats =
        data?.stats || {};

      setStats({
        totalPoints:
          Number(
            incomingStats.totalPoints,
          ) || 0,

        completedChallenges:
          Number(
            incomingStats.completedChallenges,
          ) || 0,

        averageScore:
          Number(
            incomingStats.averageScore,
          ) || 0,

        bestScore:
          Number(
            incomingStats.bestScore,
          ) || 0,

        currentStreak:
          Number(
            incomingStats.currentStreak,
          ) || 0,

        longestStreak:
          Number(
            incomingStats.longestStreak,
          ) || 0,

        rank:
          Number(
            incomingStats.rank,
          ) || 0,

        rankName:
          incomingStats.rankName ||
          "Beginner",

        badges:
          Array.isArray(
            incomingStats.badges,
          )
            ? incomingStats.badges
            : [],

        rankHistory:
          Array.isArray(
            incomingStats.rankHistory,
          )
            ? incomingStats.rankHistory
            : [],
      });
    } catch (err) {
      console.error(
        "Failed to fetch challenge stats:",
        err,
      );
    }
  };

  // ==========================================================
  // FETCH LEADERBOARD
  // ==========================================================

  const fetchLeaderboard = async () => {
    try {
      const { data } =
        await axiosInstance.get(
          "/api/challenges/leaderboard",
        );

      setLeaderboard(
        Array.isArray(
          data?.leaderboard,
        )
          ? data.leaderboard
          : [],
      );
    } catch (err) {
      console.error(
        "Failed to fetch leaderboard:",
        err,
      );
    }
  };

  // ==========================================================
  // FETCH DAILY / WEEKLY
  // ==========================================================

  const fetchChallenge = async (
    type: "daily" | "weekly",
    selectedCategory: Category = category,
    selectedDomain: string = domain,
  ) => {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      setAnswer("");
      setSelectedOption("");

      const { data } =
        await axiosInstance.get(
          `/api/challenges/${type}`,
          {
            params: {
              category:
                selectedCategory,
              domain:
                selectedDomain,
            },
          },
        );

      setChallenge(
        data?.challenge || null,
      );

      if (data?.completed) {
        setResult({
          score:
            Number(
              data?.attempt?.score,
            ) || 0,

          pointsEarned:
            Number(
              data?.attempt?.pointsEarned,
            ) || 0,

          feedback:
            data?.attempt?.feedback ||
            "Already completed.",

          strengths:
            Array.isArray(
              data?.attempt?.strengths,
            )
              ? data.attempt.strengths
              : [],

          improvements:
            Array.isArray(
              data?.attempt?.improvements,
            )
              ? data.attempt.improvements
              : [],

          isCorrect:
            Boolean(
              data?.attempt?.isCorrect,
            ),
        });
      }

      setStartTime(Date.now());
    } catch (err: any) {
      console.error(
        "Challenge loading error:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load challenge.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // GENERATE AI PRACTICE
  // ==========================================================

  const generatePractice = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      setAnswer("");
      setSelectedOption("");

      const { data } =
        await axiosInstance.post(
          "/api/challenges/practice",
          {
            category,
            domain,
          },
        );

      setChallenge(
        data?.challenge || null,
      );

      setChallengeType("practice");
      setStartTime(Date.now());
    } catch (err: any) {
      console.error(
        "Practice challenge error:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Failed to generate challenge.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // SUBMIT CHALLENGE
  // ==========================================================

  const submitChallenge = async () => {
    if (!challenge) return;

    const finalAnswer =
      challenge.options?.length > 0
        ? selectedOption
        : answer.trim();

    if (!finalAnswer) {
      setError(
        "Please answer the challenge first.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const timeTaken = startTime
        ? Math.round(
            (Date.now() - startTime) /
              1000,
          )
        : 0;

      const { data } =
        await axiosInstance.post(
          "/api/challenges/submit",
          {
            challengeId:
              challenge._id,

            answer: finalAnswer,

            timeTaken,
          },
        );

      setResult(
        data?.result || null,
      );

      if (data?.stats) {
        setStats({
          totalPoints:
            Number(
              data.stats.totalPoints,
            ) || 0,

          completedChallenges:
            Number(
              data.stats.completedChallenges,
            ) || 0,

          averageScore:
            Number(
              data.stats.averageScore,
            ) || 0,

          bestScore:
            Number(
              data.stats.bestScore,
            ) || 0,

          currentStreak:
            Number(
              data.stats.currentStreak,
            ) || 0,

          longestStreak:
            Number(
              data.stats.longestStreak,
            ) || 0,

          rank:
            Number(
              data.stats.rank,
            ) || 0,

          rankName:
            data.stats.rankName ||
            "Beginner",

          badges:
            Array.isArray(
              data.stats.badges,
            )
              ? data.stats.badges
              : [],

          rankHistory:
            Array.isArray(
              data.stats.rankHistory,
            )
              ? data.stats.rankHistory
              : [],
        });
      }

      await fetchLeaderboard();
      await fetchStats();
    } catch (err: any) {
      console.error(
        "Challenge submission error:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Failed to submit challenge.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================
  // CATEGORY CHANGE
  // ==========================================================

  const handleCategoryChange = (
    newCategory: Category,
  ) => {
    setCategory(newCategory);
    setResult(null);
    setAnswer("");
    setSelectedOption("");

    if (challengeType === "practice") {
      return;
    }

    fetchChallenge(
      challengeType,
      newCategory,
      domain,
    );
  };

  // ==========================================================
  // DOMAIN CHANGE
  // ==========================================================

  const handleDomainChange = (
    value: string,
  ) => {
    setDomain(value);
    setResult(null);
    setAnswer("");
    setSelectedOption("");
  };

  // ==========================================================
  // LOAD DAILY
  // ==========================================================

  const loadDaily = () => {
    setChallengeType("daily");

    fetchChallenge(
      "daily",
      category,
      domain,
    );
  };

  // ==========================================================
  // LOAD WEEKLY
  // ==========================================================

  const loadWeekly = () => {
    setChallengeType("weekly");

    fetchChallenge(
      "weekly",
      category,
      domain,
    );
  };

  // ==========================================================
  // RANK HISTORY
  // ==========================================================

  const rankHistory = useMemo(() => {
    const history =
      stats?.rankHistory || [];

    return [...history]
      .filter(
        (item) =>
          Number.isFinite(
            Number(item.rank),
          ),
      )
      .sort((a, b) => {
        const dateA =
          new Date(
            a.recordedAt ||
              a.createdAt ||
              a.date ||
              0,
          ).getTime();

        const dateB =
          new Date(
            b.recordedAt ||
              b.createdAt ||
              b.date ||
              0,
          ).getTime();

        return dateB - dateA;
      });
  }, [stats?.rankHistory]);

  const latestHistoricalRank =
    rankHistory.length > 0
      ? rankHistory[0].rank
      : stats?.rank || 0;

  const previousHistoricalRank =
    rankHistory.length > 1
      ? rankHistory[1].rank
      : undefined;

  const rankMovement =
    getRankMovement(
      latestHistoricalRank,
      previousHistoricalRank,
    );

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
          <div>
            <p className="text-sm text-muted-foreground">
              🎮 Competitive Interview Practice
            </p>

            <h1 className="text-3xl md:text-4xl font-black mt-1">
              Peer Challenge Arena
            </h1>

            <p className="text-muted-foreground mt-2">
              Compete, improve your interview
              skills, earn points and climb the
              leaderboard.
            </p>
          </div>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="px-5 py-2.5 rounded-full border hover:bg-muted transition"
          >
            ← Dashboard
          </button>
        </div>

        {/* ==================================================
            STATS
        ================================================== */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

          <div className="rounded-2xl border p-5 bg-card">
            <p className="text-sm text-muted-foreground">
              🏆 Points
            </p>

            <p className="text-3xl font-black mt-2">
              {stats?.totalPoints || 0}
            </p>
          </div>

          <div className="rounded-2xl border p-5 bg-card">
            <p className="text-sm text-muted-foreground">
              📊 Average
            </p>

            <p className="text-3xl font-black mt-2">
              {stats?.averageScore || 0}%
            </p>
          </div>

          <div className="rounded-2xl border p-5 bg-card">
            <p className="text-sm text-muted-foreground">
              🔥 Streak
            </p>

            <p className="text-3xl font-black mt-2">
              {stats?.currentStreak || 0}
            </p>
          </div>

          <div className="rounded-2xl border p-5 bg-card">
            <p className="text-sm text-muted-foreground">
              🎖️ Rank
            </p>

            <p className="text-2xl font-black mt-2">
              #{stats?.rank || "—"}
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              {stats?.rankName ||
                "Beginner"}
            </p>
          </div>
        </div>

        {/* ==================================================
            CATEGORY SELECTOR
        ================================================== */}

        <div className="rounded-2xl border bg-card p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div>
              <h2 className="font-bold text-lg">
                Choose Challenge Category
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                Pick the area you want to
                practice.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(
                (item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      handleCategoryChange(
                        item.id,
                      )
                    }
                    className={`px-4 py-2.5 rounded-full text-sm font-semibold border transition ${
                      category === item.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {item.emoji}{" "}
                    {item.label}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col md:flex-row gap-3">

            <input
              value={domain}
              onChange={(e) =>
                handleDomainChange(
                  e.target.value,
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (
                    challengeType ===
                    "daily"
                  ) {
                    loadDaily();
                  } else if (
                    challengeType ===
                    "weekly"
                  ) {
                    loadWeekly();
                  } else {
                    generatePractice();
                  }
                }
              }}
              placeholder="Domain e.g. JavaScript, React, Python"
              className="flex-1 rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              onClick={loadDaily}
              className={`px-5 py-3 rounded-xl font-semibold border ${
                challengeType === "daily"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              ☀️ Daily
            </button>

            <button
              onClick={loadWeekly}
              className={`px-5 py-3 rounded-xl font-semibold border ${
                challengeType === "weekly"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              📅 Weekly
            </button>

            <button
              onClick={generatePractice}
              className={`px-5 py-3 rounded-xl font-semibold border ${
                challengeType === "practice"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              🤖 AI Practice
            </button>
          </div>
        </div>

        {/* ==================================================
            TABS
        ================================================== */}

        <div className="flex flex-wrap gap-2 mb-6">

          <button
            onClick={() =>
              setActiveTab(
                "challenge",
              )
            }
            className={`px-5 py-2.5 rounded-full font-semibold ${
              activeTab === "challenge"
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted"
            }`}
          >
            🎯 Challenge
          </button>

          <button
            onClick={() =>
              setActiveTab(
                "leaderboard",
              )
            }
            className={`px-5 py-2.5 rounded-full font-semibold ${
              activeTab === "leaderboard"
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted"
            }`}
          >
            🏆 Leaderboard
          </button>

          <button
            onClick={() =>
              setActiveTab("history")
            }
            className={`px-5 py-2.5 rounded-full font-semibold ${
              activeTab === "history"
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted"
            }`}
          >
            📈 Ranking History
          </button>
        </div>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ==================================================
            CHALLENGE TAB
        ================================================== */}

        {activeTab === "challenge" && (
          <div className="grid lg:grid-cols-[1fr_350px] gap-6">

            {/* MAIN CHALLENGE */}

            <div className="rounded-2xl border bg-card overflow-hidden">

              <div className="p-5 border-b flex items-center justify-between gap-4">

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    {challengeType ===
                    "daily"
                      ? "☀️ Daily Challenge"
                      : challengeType ===
                          "weekly"
                        ? "📅 Weekly Challenge"
                        : "🤖 AI Practice"}
                  </p>

                  <h2 className="text-2xl font-black mt-1">
                    {challenge?.title ||
                      "Loading Challenge..."}
                  </h2>
                </div>

                {challenge && (
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      +{challenge.points} pts
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {challenge.difficulty}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6">

                {loading ? (
                  <div className="py-20 text-center">
                    <div className="animate-spin h-10 w-10 rounded-full border-4 border-primary border-t-transparent mx-auto" />

                    <p className="text-sm text-muted-foreground mt-4">
                      AI is preparing your
                      challenge...
                    </p>
                  </div>
                ) : challenge ? (
                  <>
                    {/* META */}

                    <div className="flex flex-wrap gap-2 mb-5">

                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {challenge.category}
                      </span>

                      <span className="px-3 py-1 rounded-full bg-muted text-xs font-bold">
                        {challenge.domain}
                      </span>

                      <span className="px-3 py-1 rounded-full bg-muted text-xs font-bold">
                        ⏱{" "}
                        {challenge.duration}{" "}
                        min
                      </span>

                      {challenge.tags
                        ?.slice(0, 3)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full border text-xs text-muted-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>

                    {/* DESCRIPTION */}

                    <p className="text-muted-foreground mb-6">
                      {challenge.description}
                    </p>

                    {/* QUESTION */}

                    <div className="rounded-2xl bg-muted/50 border p-5 mb-6">
                      <p className="text-lg font-semibold leading-relaxed whitespace-pre-wrap">
                        {challenge.question}
                      </p>
                    </div>

                    {/* OPTIONS */}

                    {challenge.options
                      ?.length > 0 ? (
                      <div className="space-y-3">

                        {challenge.options.map(
                          (
                            option,
                            index,
                          ) => (
                            <button
                              key={option}
                              onClick={() =>
                                !result &&
                                setSelectedOption(
                                  option,
                                )
                              }
                              disabled={
                                !!result
                              }
                              className={`w-full text-left rounded-xl border p-4 transition ${
                                selectedOption ===
                                option
                                  ? "border-primary bg-primary/10"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <span className="font-bold mr-3">
                                {String.fromCharCode(
                                  65 +
                                    index,
                                )}
                                .
                              </span>

                              {option}
                            </button>
                          ),
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={answer}
                        onChange={(e) =>
                          setAnswer(
                            e.target.value,
                          )
                        }
                        disabled={!!result}
                        rows={8}
                        placeholder="Write your interview answer here..."
                        className="w-full rounded-2xl border bg-background p-4 outline-none resize-none focus:ring-2 focus:ring-primary"
                      />
                    )}

                    {/* SUBMIT */}

                    {!result && (
                      <button
                        onClick={
                          submitChallenge
                        }
                        disabled={
                          submitting ||
                          loading
                        }
                        className="mt-6 w-full rounded-xl bg-primary text-primary-foreground py-3.5 font-bold hover:opacity-90 disabled:opacity-50"
                      >
                        {submitting
                          ? "Evaluating..."
                          : "Submit Challenge →"}
                      </button>
                    )}

                    {/* RESULT */}

                    {result && (
                      <div className="mt-7 rounded-2xl border p-5">

                        <div className="flex items-center justify-between mb-5">

                          <div>
                            <p className="text-sm text-muted-foreground">
                              Your Score
                            </p>

                            <p className="text-5xl font-black mt-1">
                              {result.score}%
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Points earned
                            </p>

                            <p className="text-2xl font-black">
                              +
                              {
                                result.pointsEarned
                              }
                            </p>
                          </div>
                        </div>

                        {/* FEEDBACK */}

                        <div className="rounded-xl bg-muted/50 p-4">
                          <p className="font-semibold">
                            AI Feedback
                          </p>

                          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                            {
                              result.feedback
                            }
                          </p>
                        </div>

                        {/* STRENGTHS */}

                        {result.strengths
                          ?.length >
                          0 && (
                          <div className="mt-4">
                            <p className="font-semibold text-sm">
                              ✅ Strengths
                            </p>

                            <ul className="mt-2 space-y-1">
                              {result.strengths.map(
                                (
                                  item,
                                  index,
                                ) => (
                                  <li
                                    key={`${item}-${index}`}
                                    className="text-sm text-muted-foreground"
                                  >
                                    •{" "}
                                    {item}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                        {/* IMPROVEMENTS */}

                        {result.improvements
                          ?.length >
                          0 && (
                          <div className="mt-4">
                            <p className="font-semibold text-sm">
                              ⚠️ Improve
                            </p>

                            <ul className="mt-2 space-y-1">
                              {result.improvements.map(
                                (
                                  item,
                                  index,
                                ) => (
                                  <li
                                    key={`${item}-${index}`}
                                    className="text-sm text-muted-foreground"
                                  >
                                    •{" "}
                                    {item}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                        {/* NEXT */}

                        <button
                          onClick={() => {
                            /*
                             * Daily and Weekly challenges are
                             * time-based. Once completed, asking
                             * the backend for the same challenge
                             * simply returns the completed attempt.
                             *
                             * "Try Another Challenge" therefore
                             * generates a fresh AI Practice
                             * challenge.
                             */
                            generatePractice();
                          }}
                          disabled={loading}
                          className="mt-6 w-full rounded-xl border py-3 font-bold hover:bg-muted disabled:opacity-50"
                        >
                          {challengeType ===
                          "practice"
                            ? "🔄 Try Another Challenge"
                            : "🤖 Try Another AI Challenge"}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-20 text-center">
                    <p className="text-4xl">
                      🎯
                    </p>

                    <p className="font-bold mt-3">
                      No challenge loaded
                    </p>

                    <p className="text-sm text-muted-foreground mt-1">
                      Try loading a daily,
                      weekly or AI practice
                      challenge.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ==================================================
                SIDEBAR
            ================================================== */}

            <div className="space-y-5">

              {/* RANK */}

              <div className="rounded-2xl border bg-card p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Your Arena Rank
                </p>

                <p className="text-3xl font-black mt-2">
                  {stats?.rankName ||
                    "Beginner"}
                </p>

                <p className="text-sm text-muted-foreground mt-1">
                  #{stats?.rank || "—"} on
                  leaderboard
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      Completed
                    </p>

                    <p className="font-black text-xl">
                      {stats?.completedChallenges ||
                        0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      Best
                    </p>

                    <p className="font-black text-xl">
                      {stats?.bestScore ||
                        0}
                      %
                    </p>
                  </div>
                </div>
              </div>

              {/* BADGES */}

              <div className="rounded-2xl border bg-card p-5">
                <p className="font-bold">
                  🎖️ Your Badges
                </p>

                {stats?.badges?.length ? (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {stats.badges.map(
                      (badge) => (
                        <span
                          key={badge}
                          className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                        >
                          🏅 {badge}
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-3">
                    Complete challenges to
                    unlock badges.
                  </p>
                )}
              </div>

              {/* STREAK */}

              <div className="rounded-2xl border bg-card p-5">
                <p className="font-bold">
                  🔥 Streak
                </p>

                <p className="text-4xl font-black mt-3">
                  {stats?.currentStreak ||
                    0}{" "}
                  <span className="text-base font-semibold">
                    days
                  </span>
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  Longest:{" "}
                  {stats?.longestStreak ||
                    0}{" "}
                  days
                </p>
              </div>

              {/* QUICK HISTORY */}

              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between">

                  <p className="font-bold">
                    📈 Rank Progress
                  </p>

                  <button
                    onClick={() =>
                      setActiveTab(
                        "history",
                      )
                    }
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    View
                  </button>
                </div>

                {rankHistory.length >
                0 ? (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground">
                      Current
                    </p>

                    <div className="flex items-end gap-3 mt-1">
                      <p className="text-3xl font-black">
                        #
                        {
                          latestHistoricalRank
                        }
                      </p>

                      <span
                        className={`text-xs font-bold mb-1 ${rankMovement.className}`}
                      >
                        {
                          rankMovement.icon
                        }{" "}
                        {
                          rankMovement.label
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-3">
                    Complete challenges to
                    start tracking your rank
                    history.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            LEADERBOARD
        ================================================== */}

        {activeTab ===
          "leaderboard" && (
          <div className="space-y-6">

            <div className="rounded-2xl border bg-card overflow-hidden">

              <div className="p-6 border-b">
                <h2 className="text-2xl font-black">
                  🏆 Peer Leaderboard
                </h2>

                <p className="text-sm text-muted-foreground mt-1">
                  See how you compare with other
                  candidates.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">

                  <thead>
                    <tr className="border-b text-left">

                      <th className="p-4 text-sm">
                        Rank
                      </th>

                      <th className="p-4 text-sm">
                        Candidate
                      </th>

                      <th className="p-4 text-sm">
                        Level
                      </th>

                      <th className="p-4 text-sm">
                        Points
                      </th>

                      <th className="p-4 text-sm">
                        Avg
                      </th>

                      <th className="p-4 text-sm">
                        Challenges
                      </th>

                      <th className="p-4 text-sm">
                        Streak
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {leaderboard.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-10 text-center text-muted-foreground"
                        >
                          No candidates yet.
                          Complete a challenge
                          to appear here.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map(
                        (item, index) => {
                          const isCurrentUser =
                            item.name ===
                            user?.name;

                          return (
                            <tr
                              key={`${item.rank}-${item.name}-${index}`}
                              className={`border-b last:border-0 ${
                                isCurrentUser
                                  ? "bg-primary/5"
                                  : ""
                              }`}
                            >

                              <td className="p-4 font-black">
                                {getRankIcon(
                                  item.rank,
                                )}
                              </td>

                              <td className="p-4">
                                <p className="font-semibold">
                                  {
                                    item.name
                                  }
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {
                                    item.rankName
                                  }
                                </p>
                              </td>

                              <td className="p-4">
                                <span className="text-sm">
                                  {
                                    item.rankName
                                  }
                                </span>
                              </td>

                              <td className="p-4 font-black">
                                {
                                  item.totalPoints
                                }
                              </td>

                              <td className="p-4">
                                {
                                  item.averageScore
                                }
                                %
                              </td>

                              <td className="p-4">
                                {
                                  item.completedChallenges
                                }
                              </td>

                              <td className="p-4">
                                🔥{" "}
                                {
                                  item.currentStreak
                                }
                              </td>
                            </tr>
                          );
                        },
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6">

              <h3 className="font-bold text-lg">
                🎯 How Arena Ranking Works
              </h3>

              <div className="grid md:grid-cols-3 gap-4 mt-5">

                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="font-bold">
                    🏆 Earn Points
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    Complete AI-generated
                    interview challenges and
                    earn points based on your
                    performance.
                  </p>
                </div>

                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="font-bold">
                    🔥 Build Streaks
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    Practice consistently to
                    maintain your streak and
                    unlock achievements.
                  </p>
                </div>

                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="font-bold">
                    📈 Climb the Ranks
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    Your points determine your
                    position among other
                    candidates.
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            RANKING HISTORY
        ================================================== */}

        {activeTab === "history" && (
          <div className="space-y-6">

            <div className="rounded-2xl border bg-card p-6">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    📈 Competitive Progress
                  </p>

                  <h2 className="text-2xl md:text-3xl font-black mt-1">
                    Ranking History
                  </h2>

                  <p className="text-sm text-muted-foreground mt-2">
                    Track how your position in
                    the Arena changes as you
                    complete more challenges.
                  </p>
                </div>

                <div className="text-left md:text-right">

                  <p className="text-xs text-muted-foreground">
                    Current Rank
                  </p>

                  <p className="text-4xl font-black mt-1">
                    #{stats?.rank || "—"}
                  </p>

                  <p
                    className={`text-xs font-bold mt-1 ${rankMovement.className}`}
                  >
                    {rankMovement.icon}{" "}
                    {rankMovement.label}
                  </p>
                </div>
              </div>
            </div>

            {/* SUMMARY */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <div className="rounded-2xl border bg-card p-5">
                <p className="text-xs text-muted-foreground">
                  Current Rank
                </p>

                <p className="text-3xl font-black mt-2">
                  #{stats?.rank || "—"}
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <p className="text-xs text-muted-foreground">
                  Rank Level
                </p>

                <p className="text-xl font-black mt-2">
                  {stats?.rankName ||
                    "Beginner"}
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <p className="text-xs text-muted-foreground">
                  Total Points
                </p>

                <p className="text-3xl font-black mt-2">
                  {stats?.totalPoints ||
                    0}
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <p className="text-xs text-muted-foreground">
                  Recorded Positions
                </p>

                <p className="text-3xl font-black mt-2">
                  {rankHistory.length}
                </p>
              </div>
            </div>

            {/* HISTORY TABLE */}

            <div className="rounded-2xl border bg-card overflow-hidden">

              <div className="p-6 border-b">
                <h3 className="text-xl font-black">
                  📊 Your Rank Timeline
                </h3>

                <p className="text-sm text-muted-foreground mt-1">
                  Every recorded competitive
                  position appears here.
                </p>
              </div>

              {rankHistory.length ===
              0 ? (
                <div className="p-12 text-center">

                  <div className="text-5xl mb-4">
                    📈
                  </div>

                  <h3 className="font-bold text-lg">
                    No ranking history yet
                  </h3>

                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                    Complete your first challenge
                    to start building your
                    competitive history.
                  </p>

                  <button
                    onClick={() =>
                      setActiveTab(
                        "challenge",
                      )
                    }
                    className="mt-5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold"
                  >
                    🎯 Start a Challenge
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead>
                      <tr className="border-b text-left">

                        <th className="p-4 text-sm">
                          Date
                        </th>

                        <th className="p-4 text-sm">
                          Rank
                        </th>

                        <th className="p-4 text-sm">
                          Movement
                        </th>

                        <th className="p-4 text-sm">
                          Level
                        </th>

                        <th className="p-4 text-sm">
                          Points
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {rankHistory.map(
                        (
                          item,
                          index,
                        ) => {
                          const previousRank =
                            rankHistory[
                              index + 1
                            ]?.rank;

                          const movement =
                            getRankMovement(
                              item.rank,
                              previousRank,
                            );

                          const points =
                            item.totalPoints ??
                            item.points ??
                            undefined;

                          const date =
                            item.recordedAt ||
                            item.createdAt ||
                            item.date;

                          return (
                            <tr
                              key={`${item.rank}-${date || index}-${index}`}
                              className="border-b last:border-0"
                            >

                              <td className="p-4">
                                <p className="font-semibold text-sm">
                                  {formatDate(
                                    date,
                                  )}
                                </p>
                              </td>

                              <td className="p-4">

                                <div className="flex items-center gap-3">

                                  <span className="text-xl">
                                    {getRankIcon(
                                      item.rank,
                                    )}
                                  </span>

                                  <span className="font-black text-lg">
                                    #
                                    {
                                      item.rank
                                    }
                                  </span>
                                </div>
                              </td>

                              <td className="p-4">

                                <span
                                  className={`text-sm font-bold ${movement.className}`}
                                >
                                  {
                                    movement.icon
                                  }{" "}
                                  {
                                    movement.label
                                  }
                                </span>
                              </td>

                              <td className="p-4">

                                <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                  {item.rankName ||
                                    "Arena Rank"}
                                </span>
                              </td>

                              <td className="p-4 font-black">
                                {points !==
                                undefined
                                  ? points
                                  : "—"}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* CURRENT VS PREVIOUS */}

            {rankHistory.length >=
              2 && (
              <div className="rounded-2xl border bg-card p-6">

                <h3 className="font-bold text-lg">
                  🔎 Latest Rank Change
                </h3>

                <div className="grid md:grid-cols-3 gap-4 mt-5">

                  <div className="rounded-xl bg-muted/50 p-4">

                    <p className="text-xs text-muted-foreground">
                      Previous
                    </p>

                    <p className="text-3xl font-black mt-1">
                      #
                      {
                        rankHistory[1]
                          .rank
                      }
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(
                        rankHistory[1]
                          .recordedAt ||
                          rankHistory[1]
                            .createdAt ||
                          rankHistory[1]
                            .date,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/50 p-4">

                    <p className="text-xs text-muted-foreground">
                      Current
                    </p>

                    <p className="text-3xl font-black mt-1">
                      #
                      {
                        rankHistory[0]
                          .rank
                      }
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(
                        rankHistory[0]
                          .recordedAt ||
                          rankHistory[0]
                            .createdAt ||
                          rankHistory[0]
                            .date,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/50 p-4">

                    <p className="text-xs text-muted-foreground">
                      Change
                    </p>

                    <p
                      className={`text-3xl font-black mt-1 ${rankMovement.className}`}
                    >
                      {rankMovement.icon}{" "}
                      {
                        rankMovement.label
                      }
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      Since your previous
                      recorded position
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* GAMIFICATION SUMMARY */}

            <div className="rounded-2xl border bg-card p-6">

              <h3 className="font-bold text-lg">
                🎮 Arena Progress
              </h3>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">

                <div className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">
                    Challenges Completed
                  </p>

                  <p className="text-2xl font-black mt-1">
                    {stats?.completedChallenges ||
                      0}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">
                    Current Streak
                  </p>

                  <p className="text-2xl font-black mt-1">
                    🔥{" "}
                    {stats?.currentStreak ||
                      0}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">
                    Longest Streak
                  </p>

                  <p className="text-2xl font-black mt-1">
                    {stats?.longestStreak ||
                      0}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">
                    Badges Unlocked
                  </p>

                  <p className="text-2xl font-black mt-1">
                    {stats?.badges
                      ?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}