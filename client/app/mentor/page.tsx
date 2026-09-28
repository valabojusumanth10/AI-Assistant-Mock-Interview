"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import useAuth from "@/hooks/useAuth";

type Student = {
  _id: string;
  name: string;
  email: string;
  candidateType?: string;
  createdAt?: string;
  interviewPerformance?: {
    averageScore?: number;
    totalInterviews?: number;
    bestScore?: number;
  };
  placementReadiness?: {
    overallScore?: number;
    category?: string;
  };
};

type Performance = {
  student: {
    _id: string;
    name: string;
    email: string;
    candidateType?: string;
  };
  summary?: {
    totalInterviews?: number;
    averageScore?: number;
    bestScore?: number;
    weakestArea?: string;
    strongestArea?: string;
  };
  readiness?: {
    overallScore?: number;
    category?: string;
  };
  skills?: Record<string, number> | Array<any>;
  resumeAnalysis?: any;
  interviews?: Array<any>;
};

type Feedback = {
  _id: string;
  mentorId?: string;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  rating?: number;
  createdAt: string;
};

export default function MentorPage() {
  const router = useRouter();
  const { user, isLoggedIn, loading: authLoading } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [performance, setPerformance] = useState<Performance | null>(null);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);

  const [loading, setLoading] = useState(true);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [error, setError] = useState("");

  const [feedback, setFeedback] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [rating, setRating] = useState(5);

  const [activeTab, setActiveTab] = useState<
    "overview" | "performance" | "feedback"
  >("overview");

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "mentor" && user.role !== "admin") {
      router.replace("/unauthorized");
      return;
    }

    fetchStudents();
  }, [authLoading, isLoggedIn, user, router]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get("/api/mentor/students");

      setStudents(response.data.students || []);
    } catch (err: any) {
      console.error("Failed to fetch students:", err);

      if (err?.response?.status === 403) {
        setError(
          "You do not have permission to access the Mentor Dashboard.",
        );
      } else {
        setError(
          err?.response?.data?.message ||
            "Failed to load students. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = async (student: Student) => {
    try {
      setSelectedStudent(student);
      setPerformance(null);
      setFeedbackList([]);
      setPerformanceLoading(true);
      setError("");
      setActiveTab("performance");

      const [performanceResponse, feedbackResponse] = await Promise.all([
        axiosInstance.get(
          `/api/mentor/students/${student._id}/performance`,
        ),
        axiosInstance.get(`/api/mentor/students/${student._id}/feedback`),
      ]);

      setPerformance(performanceResponse.data);
      setFeedbackList(feedbackResponse.data.feedback || []);
    } catch (err: any) {
      console.error("Failed to load student:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load student performance.",
      );
    } finally {
      setPerformanceLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!selectedStudent) return;

    if (!feedback.trim()) {
      setError("Please enter feedback before submitting.");
      return;
    }

    try {
      setFeedbackLoading(true);
      setError("");

      const payload = {
        feedback: feedback.trim(),
        strengths: strengths
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        improvements: improvements
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        rating,
      };

      const response = await axiosInstance.post(
        `/api/mentor/students/${selectedStudent._id}/feedback`,
        payload,
      );

      const newFeedback = response.data.feedback;

      if (newFeedback) {
        setFeedbackList((prev) => [newFeedback, ...prev]);
      }

      setFeedback("");
      setStrengths("");
      setImprovements("");
      setRating(5);

      setActiveTab("feedback");
    } catch (err: any) {
      console.error("Failed to submit feedback:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to submit feedback. Please try again.",
      );
    } finally {
      setFeedbackLoading(false);
    }
  };

  const getScore = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return 0;
    }

    return Math.round(value);
  };

  const getScoreClass = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const formatCandidateType = (type?: string) => {
    if (!type) return "Candidate";

    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getInterviewScore = (interview: any) => {
    return getScore(interview?.score);
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-lg font-semibold text-slate-900">
            Checking authentication...
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Please wait.
          </p>
        </div>
      </main>
    );
  }

  if (!isLoggedIn || !user) {
    return null;
  }

  if (user.role !== "mentor" && user.role !== "admin") {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-blue-600">
              Mentor Portal
            </p>

            <h1 className="text-3xl font-bold text-slate-900">
              Mentor Dashboard
            </h1>

            <p className="mt-2 text-slate-600">
              Review candidate performance, identify improvement areas, and
              provide personalized feedback.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Signed in as
            </p>

            <p className="font-semibold text-slate-900">
              {user.name || "Mentor"}
            </p>

            <p className="text-sm text-slate-500">{user.role}</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}

            <button
              onClick={() => setError("")}
              className="ml-3 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main layout */}
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Student list */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Students
                  </h2>

                  <p className="text-sm text-slate-500">
                    {students.length} active candidate
                    {students.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <button
                  onClick={fetchStudents}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="max-h-[650px] overflow-y-auto p-3">
              {loading ? (
                <div className="space-y-3 p-2">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-xl bg-slate-100 p-4"
                    >
                      <div className="mb-2 h-4 w-32 rounded bg-slate-200" />
                      <div className="h-3 w-44 rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              ) : students.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="mb-3 text-4xl">👥</div>

                  <p className="font-semibold text-slate-800">
                    No students found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Active student accounts will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {students.map((student, index) => {
                    const score = getScore(
                      student.interviewPerformance?.averageScore,
                    );

                    const isSelected =
                      selectedStudent?._id === student._id;

                    return (
                      <button
                        key={`${student._id || student.email || "student"}-${index}`}
                        onClick={() => selectStudent(student)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          isSelected
                            ? "border-blue-300 bg-blue-50"
                            : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
                            {student.name?.charAt(0)?.toUpperCase() || "S"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900">
                              {student.name}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {student.email}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                {formatCandidateType(student.candidateType)}
                              </span>

                              <span
                                className={`rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold ${getScoreClass(
                                  score,
                                )}`}
                              >
                                Avg {score}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Student workspace */}
          <section>
            {!selectedStudent ? (
              <div className="flex min-h-[600px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
                <div className="max-w-md px-6 text-center">
                  <div className="mb-5 text-6xl">🎓</div>

                  <h2 className="text-2xl font-bold text-slate-900">
                    Select a student
                  </h2>

                  <p className="mt-2 text-slate-500">
                    Choose a student from the list to review their interview
                    performance, placement readiness, skills, and mentor
                    feedback.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Student header */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-2xl font-bold text-white">
                        {selectedStudent.name
                          ?.charAt(0)
                          ?.toUpperCase() || "S"}
                      </div>

                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                          {selectedStudent.name}
                        </h2>

                        <p className="text-sm text-slate-500">
                          {selectedStudent.email}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {formatCandidateType(
                              selectedStudent.candidateType,
                            )}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            Joined {formatDate(selectedStudent.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedStudent(null);
                        setPerformance(null);
                        setFeedbackList([]);
                      }}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Back to Students
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                        activeTab === "overview"
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Overview
                    </button>

                    <button
                      onClick={() => setActiveTab("performance")}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                        activeTab === "performance"
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Performance
                    </button>

                    <button
                      onClick={() => setActiveTab("feedback")}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                        activeTab === "feedback"
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Feedback
                    </button>
                  </div>
                </div>

                {/* Loading */}
                {performanceLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

                    <p className="font-semibold text-slate-800">
                      Loading student performance...
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Gathering interviews, readiness, skills, and feedback.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Overview */}
                    {activeTab === "overview" && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <MetricCard
                          title="Interview Average"
                          value={`${getScore(
                            performance?.summary?.averageScore,
                          )}%`}
                          description="Average score across completed interviews"
                          icon="🎤"
                        />

                        <MetricCard
                          title="Best Interview"
                          value={`${getScore(
                            performance?.summary?.bestScore,
                          )}%`}
                          description="Highest interview performance"
                          icon="🏆"
                        />

                        <MetricCard
                          title="Placement Readiness"
                          value={`${getScore(
                            performance?.readiness?.overallScore,
                          )}%`}
                          description={
                            performance?.readiness?.category ||
                            "Readiness score"
                          }
                          icon="🎯"
                        />

                        <MetricCard
                          title="Completed Interviews"
                          value={String(
                            performance?.summary?.totalInterviews || 0,
                          )}
                          description="Completed AI mock interviews"
                          icon="📚"
                        />

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            Mentor Snapshot
                          </h3>

                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl bg-green-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                                Strongest Area
                              </p>

                              <p className="mt-2 font-bold text-green-900">
                                {performance?.summary?.strongestArea ||
                                  "Not enough data"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-red-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                                Weakest Area
                              </p>

                              <p className="mt-2 font-bold text-red-900">
                                {performance?.summary?.weakestArea ||
                                  "Not enough data"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Performance */}
                    {activeTab === "performance" && (
                      <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <MetricCard
                            title="Average"
                            value={`${getScore(
                              performance?.summary?.averageScore,
                            )}%`}
                            icon="📊"
                          />

                          <MetricCard
                            title="Best"
                            value={`${getScore(
                              performance?.summary?.bestScore,
                            )}%`}
                            icon="🏆"
                          />

                          <MetricCard
                            title="Interviews"
                            value={String(
                              performance?.summary?.totalInterviews || 0,
                            )}
                            icon="🎤"
                          />

                          <MetricCard
                            title="Readiness"
                            value={`${getScore(
                              performance?.readiness?.overallScore,
                            )}%`}
                            icon="🎯"
                          />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="border-b border-slate-100 p-6">
                            <h3 className="text-lg font-bold text-slate-900">
                              Interview History
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              Review how this candidate has performed over
                              time.
                            </p>
                          </div>

                          <div className="overflow-x-auto">
                            {performance?.interviews &&
                            performance.interviews.length > 0 ? (
                              <table className="w-full min-w-[650px]">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Domain
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Score
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Questions
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Date
                                    </th>
                                  </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                  {performance.interviews.map(
                                    (interview: any, index: number) => {
                                      const score =
                                        getInterviewScore(interview);

                                      return (
                                        <tr
                                          key={
                                            interview._id ||
                                            interview.id ||
                                            `interview-${index}`
                                          }
                                          className="hover:bg-slate-50"
                                        >
                                          <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-900">
                                              {interview.domain ||
                                                interview.topic ||
                                                "General"}
                                            </p>
                                          </td>

                                          <td className="px-6 py-4">
                                            <span
                                              className={`font-bold ${getScoreClass(
                                                score,
                                              )}`}
                                            >
                                              {score}%
                                            </span>
                                          </td>

                                          <td className="px-6 py-4 text-sm text-slate-600">
                                            {interview.questionsAnswered ??
                                              "—"}
                                          </td>

                                          <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDate(
                                              interview.completedAt ||
                                                interview.createdAt,
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </tbody>
                              </table>
                            ) : (
                              <div className="p-10 text-center">
                                <p className="font-semibold text-slate-800">
                                  No completed interviews
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  Interview performance will appear after the
                                  candidate completes a session.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Readiness */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-slate-900">
                            Placement Readiness
                          </h3>

                          <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-600">
                                Overall Readiness
                              </span>

                              <span
                                className={`text-lg font-bold ${getScoreClass(
                                  getScore(
                                    performance?.readiness?.overallScore,
                                  ),
                                )}`}
                              >
                                {getScore(
                                  performance?.readiness?.overallScore,
                                )}
                                %
                              </span>
                            </div>

                            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-900 transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      getScore(
                                        performance?.readiness?.overallScore,
                                      ),
                                    ),
                                  )}%`,
                                }}
                              />
                            </div>

                            <p className="mt-3 text-sm text-slate-500">
                              Category:{" "}
                              <span className="font-semibold text-slate-700">
                                {performance?.readiness?.category ||
                                  "Not classified"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Feedback */}
                    {activeTab === "feedback" && (
                      <div className="space-y-6">
                        {/* Create feedback */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-slate-900">
                            Provide Mentor Feedback
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Give actionable feedback based on the candidate's
                            performance.
                          </p>

                          <div className="mt-5 space-y-5">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Overall Feedback
                              </label>

                              <textarea
                                value={feedback}
                                onChange={(event) =>
                                  setFeedback(event.target.value)
                                }
                                rows={5}
                                maxLength={3000}
                                placeholder="Example: Your technical fundamentals are strong, but you should structure your answers more clearly and avoid over-explaining..."
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              />

                              <p className="mt-1 text-right text-xs text-slate-400">
                                {feedback.length}/3000
                              </p>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                  Strengths
                                </label>

                                <input
                                  value={strengths}
                                  onChange={(event) =>
                                    setStrengths(event.target.value)
                                  }
                                  placeholder="React, communication, problem solving"
                                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />

                                <p className="mt-1 text-xs text-slate-400">
                                  Separate multiple items with commas.
                                </p>
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                  Improvements
                                </label>

                                <input
                                  value={improvements}
                                  onChange={(event) =>
                                    setImprovements(event.target.value)
                                  }
                                  placeholder="DSA, system design, answer structure"
                                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />

                                <p className="mt-1 text-xs text-slate-400">
                                  Separate multiple items with commas.
                                </p>
                              </div>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Rating
                              </label>

                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => setRating(value)}
                                    className={`text-2xl transition ${
                                      value <= rating
                                        ? "scale-110"
                                        : "grayscale opacity-40"
                                    }`}
                                  >
                                    ⭐
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={submitFeedback}
                              disabled={
                                feedbackLoading || !feedback.trim()
                              }
                              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {feedbackLoading
                                ? "Submitting..."
                                : "Submit Mentor Feedback"}
                            </button>
                          </div>
                        </div>

                        {/* Previous feedback */}
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="border-b border-slate-100 p-6">
                            <h3 className="text-lg font-bold text-slate-900">
                              Previous Feedback
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              Feedback previously provided to this candidate.
                            </p>
                          </div>

                          <div className="p-6">
                            {feedbackList.length === 0 ? (
                              <div className="py-8 text-center">
                                <div className="mb-3 text-4xl">💬</div>

                                <p className="font-semibold text-slate-800">
                                  No feedback yet
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  Your first feedback will appear here.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-5">
                                {feedbackList.map((item, index) => (
                                  <div
                                    key={`${item._id || "feedback"}-${index}`}
                                    className="rounded-xl border border-slate-200 p-5"
                                  >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                          Mentor Feedback
                                        </p>

                                        <p className="text-xs text-slate-500">
                                          {formatDate(item.createdAt)}
                                        </p>
                                      </div>

                                      {item.rating && (
                                        <div className="text-sm">
                                          {"⭐".repeat(item.rating)}
                                        </div>
                                      )}
                                    </div>

                                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                      {item.feedback}
                                    </p>

                                    {item.strengths &&
                                      item.strengths.length > 0 && (
                                        <div className="mt-5">
                                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-700">
                                            Strengths
                                          </p>

                                          <div className="flex flex-wrap gap-2">
                                            {item.strengths.map(
                                              (strength, index) => (
                                                <span
                                                  key={`${strength}-${index}`}
                                                  className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                                                >
                                                  {strength}
                                                </span>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      )}

                                    {item.improvements &&
                                      item.improvements.length > 0 && (
                                        <div className="mt-5">
                                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-700">
                                            Improvements
                                          </p>

                                          <div className="flex flex-wrap gap-2">
                                            {item.improvements.map(
                                              (improvement, index) => (
                                                <span
                                                  key={`${improvement}-${index}`}
                                                  className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700"
                                                >
                                                  {improvement}
                                                </span>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description?: string;
  icon?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
            {icon}
          </div>
        )}
      </div>

      {description && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
} 