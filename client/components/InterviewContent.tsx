"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import ChatContainer from "@/components/ChatContainer";
import { InputBox } from "@/components/InputBox";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface Company {
  id: string;
  name: string;
  type?: string;
  description?: string;
  expectedScore?: number;
}

interface InterviewResponse {
  success?: boolean;

  interviewId?: string;
  sessionId?: string;
  id?: string;

  question?: string;
  nextQuestion?: string;

  score?: number;
  finalScore?: number;

  feedback?: string;

  evaluation?: string;

  currentDifficulty?: string;
  difficulty?: string;
  highestDifficulty?: string;

  questionsAnswered?: number;
  questionsSkipped?: number;

  companyExpectedScore?: number;

  completed?: boolean;
  isComplete?: boolean;

  data?: any;
}

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const TOTAL_QUESTIONS = 5;

const domainEmoji: Record<
  string,
  string
> = {
  JavaScript: "🟨",
  "JavaScript/Node.js": "🟨",
  React: "⚛️",
  Python: "🐍",
  "Data Science": "📊",
  DevOps: "⚙️",
  "System Design": "🏗️",
  "Database Design": "🗄️",
  General: "🎯",
};

/*
|--------------------------------------------------------------------------
| FALLBACK COMPANIES
|--------------------------------------------------------------------------
*/

const fallbackCompanies: Company[] = [
  {
    id: "google",
    name: "Google",
    type: "Product Based",
    description:
      "Strong focus on problem solving, algorithms, technical depth and scalable systems.",
    expectedScore: 85,
  },

  {
    id: "amazon",
    name: "Amazon",
    type: "Product Based",
    description:
      "Focus on practical engineering, problem solving, scalability and structured thinking.",
    expectedScore: 80,
  },

  {
    id: "microsoft",
    name: "Microsoft",
    type: "Product Based",
    description:
      "Focus on fundamentals, engineering depth, problem solving and system thinking.",
    expectedScore: 80,
  },

  {
    id: "tcs",
    name: "TCS",
    type: "Service Based",
    description:
      "Focus on fundamentals, practical knowledge, communication and project understanding.",
    expectedScore: 65,
  },

  {
    id: "infosys",
    name: "Infosys",
    type: "Service Based",
    description:
      "Focus on technical fundamentals, practical application and communication.",
    expectedScore: 65,
  },
];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function normalizeCompany(
  company: any,
  fallbackKey?: string,
): Company {
  const name =
    company?.name ||
    company?.companyName ||
    fallbackKey ||
    "Company";

  const id =
    company?.id ||
    company?.key ||
    company?.slug ||
    fallbackKey?.toLowerCase() ||
    name.toLowerCase().replace(/\s+/g, "-");

  return {
    id: String(id).toLowerCase(),
    name: String(name),
    type:
      company?.type ||
      company?.category ||
      ([
        "Google",
        "Amazon",
        "Microsoft",
      ].includes(name)
        ? "Product Based"
        : "Service Based"),
    description:
      company?.description ||
      company?.style ||
      "Company-specific AI mock interview.",
    expectedScore:
      Number(
        company?.expectedScore ??
          company?.minimumScore ??
          70,
      ),
  };
}

function extractResponse(
  response: any,
): InterviewResponse {
  const root = response || {};

  const nested =
    root?.data &&
    typeof root.data === "object"
      ? root.data
      : {};

  return {
    ...nested,
    ...root,
  };
}

function getInterviewId(
  response: InterviewResponse,
): string {
  const nested =
    response?.data &&
    typeof response.data === "object"
      ? response.data
      : {};

  return String(
    response.interviewId ||
      response.sessionId ||
      response.id ||
      nested.interviewId ||
      nested.sessionId ||
      nested.id ||
      "",
  );
}

function getQuestion(
  response: InterviewResponse,
): string {
  const nested =
    response?.data &&
    typeof response.data === "object"
      ? response.data
      : {};

  return String(
    response.question ||
      response.nextQuestion ||
      nested.question ||
      nested.nextQuestion ||
      "",
  ).trim();
}

function getScore(
  response: InterviewResponse,
): number {
  const nested =
    response?.data &&
    typeof response.data === "object"
      ? response.data
      : {};

  const value =
    response.finalScore ??
    response.score ??
    nested.finalScore ??
    nested.score;

  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, score),
  );
}

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function InterviewContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const {
    isLoggedIn,
    isLoading: authLoading,
  } = useAuth();

  const domain =
    searchParams.get("domain") ||
    "General";

  /*
  |--------------------------------------------------------------------------
  | COMPANY STATE
  |--------------------------------------------------------------------------
  */

  const [
    companies,
    setCompanies,
  ] = useState<Company[]>(
    fallbackCompanies,
  );

  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState<Company | null>(
    null,
  );

  const [
    companyLoading,
    setCompanyLoading,
  ] = useState(true);

  const [
    showCompanySelector,
    setShowCompanySelector,
  ] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | INTERVIEW STATE
  |--------------------------------------------------------------------------
  */

  const [
    messages,
    setMessages,
  ] = useState<Message[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    sessionId,
    setSessionId,
  ] = useState("");

  const [
    interviewScore,
    setInterviewScore,
  ] = useState<number | null>(
    null,
  );

  const [
    companyExpectedScore,
    setCompanyExpectedScore,
  ] = useState<number | null>(
    null,
  );

  const [
    isInterviewComplete,
    setIsInterviewComplete,
  ] = useState(false);

  const [
    questionsAnswered,
    setQuestionsAnswered,
  ] = useState(0);

  const [
    questionsSkipped,
    setQuestionsSkipped,
  ] = useState(0);

  const [
    currentDifficulty,
    setCurrentDifficulty,
  ] = useState("easy");

  const [
    highestDifficulty,
    setHighestDifficulty,
  ] = useState("easy");

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const [
    showExitConfirm,
    setShowExitConfirm,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | AUTH REDIRECT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !authLoading &&
      !isLoggedIn
    ) {
      router.replace("/login");
    }
  }, [
    authLoading,
    isLoggedIn,
    router,
  ]);

  /*
  |--------------------------------------------------------------------------
  | FETCH COMPANIES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let cancelled = false;

    const fetchCompanies =
      async () => {
        try {
          setCompanyLoading(true);

          const response =
            await axiosInstance.get(
              "/api/interviews/companies",
            );

          if (cancelled) {
            return;
          }

          const payload =
            response?.data;

          const raw =
            payload?.companies ??
            payload?.data ??
            payload;

          let normalized: Company[] =
            [];

          /*
          |--------------------------------------------------------------------------
          | Backend may return object:
          |
          | {
          |   Google: {...},
          |   Amazon: {...}
          | }
          |--------------------------------------------------------------------------
          */

          if (
            Array.isArray(raw)
          ) {
            normalized =
              raw.map((company) =>
                normalizeCompany(
                  company,
                ),
              );
          } else if (
            raw &&
            typeof raw === "object"
          ) {
            normalized =
              Object.entries(raw)
                .map(
                  ([
                    key,
                    value,
                  ]) =>
                    normalizeCompany(
                      value,
                      key,
                    ),
                );
          }

          if (
            normalized.length > 0
          ) {
            setCompanies(
              normalized,
            );
          } else {
            setCompanies(
              fallbackCompanies,
            );
          }
        } catch (error) {
          console.error(
            "Failed to fetch companies. Using defaults:",
            error,
          );

          if (!cancelled) {
            setCompanies(
              fallbackCompanies,
            );
          }
        } finally {
          if (!cancelled) {
            setCompanyLoading(
              false,
            );
          }
        }
      };

    fetchCompanies();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  /*
  |--------------------------------------------------------------------------
  | TIMER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !sessionId ||
      isInterviewComplete
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setElapsedSeconds(
          (seconds) =>
            seconds + 1,
        );
      }, 1000);

    return () =>
      window.clearInterval(
        timer,
      );
  }, [
    sessionId,
    isInterviewComplete,
  ]);

  /*
  |--------------------------------------------------------------------------
  | START INTERVIEW
  |--------------------------------------------------------------------------
  */

  const startInterview =
    async (
      companyOverride?: Company,
    ) => {
      const company =
        companyOverride ||
        selectedCompany;

      if (!company) {
        return;
      }

      try {
        setIsLoading(true);

        setMessages([]);

        setSessionId("");

        setQuestionsAnswered(0);

        setQuestionsSkipped(0);

        setInterviewScore(null);

        setCompanyExpectedScore(
          null,
        );

        setCurrentDifficulty(
          "easy",
        );

        setHighestDifficulty(
          "easy",
        );

        setIsInterviewComplete(
          false,
        );

        setElapsedSeconds(0);

        const response =
          await axiosInstance.post(
            "/api/interviews/start",
            {
              domain,
              company:
                company.name,
            },
            {
              timeout: 60000,
            },
          );

        const data =
          extractResponse(
            response?.data,
          );

        /*
        |--------------------------------------------------------------------------
        | CRITICAL FIX
        |--------------------------------------------------------------------------
        |
        | Backend may return:
        |
        | interviewId
        | sessionId
        | id
        | data.interviewId
        |
        */

        const id =
          getInterviewId(data);

        if (!id) {
          console.error(
            "START RESPONSE:",
            response?.data,
          );

          throw new Error(
            "Interview started but no interview ID was returned by the server.",
          );
        }

        const question =
          getQuestion(data);

        if (!question) {
          throw new Error(
            "Interview started but no question was returned.",
          );
        }

        const expected =
          Number(
            data.companyExpectedScore ??
              data?.data
                ?.companyExpectedScore ??
              company.expectedScore ??
              70,
          );

        setSelectedCompany(
          company,
        );

        setSessionId(id);

        setCompanyExpectedScore(
          Number.isFinite(expected)
            ? expected
            : 70,
        );

        setCurrentDifficulty(
          data.currentDifficulty ||
            data.difficulty ||
            data?.data
              ?.currentDifficulty ||
            "easy",
        );

        setHighestDifficulty(
          data.highestDifficulty ||
            data?.data
              ?.highestDifficulty ||
            data.currentDifficulty ||
            "easy",
        );

        /*
        |--------------------------------------------------------------------------
        | QUESTION
        |--------------------------------------------------------------------------
        */

        setMessages([
          {
            id: `question-${Date.now()}`,
            content: question,
            isUser: false,
            timestamp:
              new Date(),
          },
        ]);

        setShowCompanySelector(
          false,
        );

        console.log(
          "Interview started:",
          {
            interviewId: id,
            company:
              company.name,
            domain,
          },
        );
      } catch (error: any) {
        console.error(
          "Start interview error:",
          error?.response
            ?.data ||
            error?.message ||
            error,
        );

        setSessionId("");

        setMessages([
          {
            id: `error-${Date.now()}`,
            content:
              error?.response
                ?.data?.message ||
              error?.message ||
              "Unable to start the interview. Please try again.",
            isUser: false,
            timestamp:
              new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT ANSWER
  |--------------------------------------------------------------------------
  */

  const handleSendMessage =
    async (
      userMessage: string,
    ) => {
      const cleanMessage =
        userMessage.trim();

      /*
      |--------------------------------------------------------------------------
      | Never block typing.
      |--------------------------------------------------------------------------
      */

      if (!cleanMessage) {
        return;
      }

      if (!sessionId) {
        console.error(
          "Cannot submit: interview ID is missing.",
        );

        setMessages(
          (previous) => [
            ...previous,
            {
              id: `error-${Date.now()}`,
              content:
                "Interview session is not ready. Please restart the interview.",
              isUser: false,
              timestamp:
                new Date(),
            },
          ],
        );

        return;
      }

      if (isLoading) {
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Add user answer immediately
      |--------------------------------------------------------------------------
      */

      setMessages(
        (previous) => [
          ...previous,
          {
            id: `user-${Date.now()}`,
            content:
              cleanMessage,
            isUser: true,
            timestamp:
              new Date(),
          },
        ],
      );

      setIsLoading(true);

      try {
        /*
        |--------------------------------------------------------------------------
        | IMPORTANT:
        |
        | Backend route:
        | POST /api/interviews/submit-answer
        |
        */

        const response =
          await axiosInstance.post(
            "/api/interviews/submit-answer",
            {
              interviewId:
                sessionId,

              /*
              | Backward compatibility
              */

              sessionId:
                sessionId,

              answer:
                cleanMessage,

              domain,

              company:
                selectedCompany
                  ?.name ||
                "General",

              question:
                messages
                  .filter(
                    (message) =>
                      !message.isUser,
                  )
                  .slice(-1)[0]
                  ?.content ||
                "",
            },
            {
              timeout: 60000,
            },
          );

        const data =
          extractResponse(
            response?.data,
          );

        /*
        |--------------------------------------------------------------------------
        | COUNTS
        |--------------------------------------------------------------------------
        */

        const backendAnswered =
          Number(
            data.questionsAnswered ??
              data?.data
                ?.questionsAnswered,
          );

        const backendSkipped =
          Number(
            data.questionsSkipped ??
              data?.data
                ?.questionsSkipped,
          );

        if (
          Number.isFinite(
            backendAnswered,
          )
        ) {
          setQuestionsAnswered(
            Math.max(
              0,
              backendAnswered,
            ),
          );
        } else {
          setQuestionsAnswered(
            (count) =>
              count + 1,
          );
        }

        if (
          Number.isFinite(
            backendSkipped,
          )
        ) {
          setQuestionsSkipped(
            Math.max(
              0,
              backendSkipped,
            ),
          );
        }

        /*
        |--------------------------------------------------------------------------
        | DIFFICULTY
        |--------------------------------------------------------------------------
        */

        const difficulty =
          data.currentDifficulty ||
          data.difficulty ||
          data?.data
            ?.currentDifficulty ||
          data?.data?.difficulty;

        if (difficulty) {
          setCurrentDifficulty(
            difficulty,
          );
        }

        const highest =
          data.highestDifficulty ||
          data?.data
            ?.highestDifficulty;

        if (highest) {
          setHighestDifficulty(
            highest,
          );
        }

        /*
        |--------------------------------------------------------------------------
        | FEEDBACK
        |--------------------------------------------------------------------------
        */

        if (data.feedback) {
          setMessages(
            (previous) => [
              ...previous,
              {
                id: `feedback-${Date.now()}`,
                content:
                  data.feedback ||
                  "",
                isUser: false,
                timestamp:
                  new Date(),
              },
            ],
          );
        }

        /*
        |--------------------------------------------------------------------------
        | SCORE
        |--------------------------------------------------------------------------
        */

        const score =
          getScore(data);

        /*
        |--------------------------------------------------------------------------
        | COMPANY EXPECTED SCORE
        |--------------------------------------------------------------------------
        */

        const expected =
          Number(
            data.companyExpectedScore ??
              data?.data
                ?.companyExpectedScore,
          );

        if (
          Number.isFinite(
            expected,
          )
        ) {
          setCompanyExpectedScore(
            expected,
          );
        }

        /*
        |--------------------------------------------------------------------------
        | COMPLETION
        |--------------------------------------------------------------------------
        */

        const completed =
          data.isComplete === true ||
          data.completed === true ||
          data?.data
            ?.isComplete === true ||
          data?.data
            ?.completed === true;

        if (completed) {
          setInterviewScore(
            score,
          );

          setIsInterviewComplete(
            true,
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | NEXT QUESTION
        |--------------------------------------------------------------------------
        */

        const nextQuestion =
          getQuestion(data);

        if (nextQuestion) {
          setMessages(
            (previous) => [
              ...previous,
              {
                id: `question-${Date.now()}`,
                content:
                  nextQuestion,
                isUser: false,
                timestamp:
                  new Date(),
              },
            ],
          );
        }
      } catch (error: any) {
        console.error(
          "Submit answer error:",
          error?.response
            ?.data ||
            error?.message ||
            error,
        );

        setMessages(
          (previous) => [
            ...previous,
            {
              id: `error-${Date.now()}`,
              content:
                error?.response
                  ?.data?.message ||
                "Connection error. Please try submitting your answer again.",
              isUser: false,
              timestamp:
                new Date(),
            },
          ],
        );
      } finally {
        setIsLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SKIP QUESTION
  |--------------------------------------------------------------------------
  */

  const handleSkip =
    async () => {
      if (
        !sessionId ||
        isLoading ||
        isInterviewComplete
      ) {
        return;
      }

      const currentQuestion =
        messages
          .filter(
            (message) =>
              !message.isUser,
          )
          .slice(-1)[0]
          ?.content || "";

      setIsLoading(true);

      try {
        const response =
          await axiosInstance.post(
            "/api/interviews/submit-answer",
            {
              interviewId:
                sessionId,

              sessionId,

              answer: "",

              question:
                currentQuestion,

              domain,

              company:
                selectedCompany
                  ?.name ||
                "General",

              skipped: true,
            },
            {
              timeout: 60000,
            },
          );

        const data =
          extractResponse(
            response?.data,
          );

        const skippedCount =
          Number(
            data.questionsSkipped ??
              data?.data
                ?.questionsSkipped,
          );

        if (
          Number.isFinite(
            skippedCount,
          )
        ) {
          setQuestionsSkipped(
            skippedCount,
          );
        } else {
          setQuestionsSkipped(
            (count) =>
              count + 1,
          );
        }

        if (data.isComplete) {
          setInterviewScore(
            getScore(data),
          );

          setIsInterviewComplete(
            true,
          );

          return;
        }

        const nextQuestion =
          getQuestion(data);

        if (nextQuestion) {
          setMessages(
            (previous) => [
              ...previous,
              {
                id: `question-${Date.now()}`,
                content:
                  nextQuestion,
                isUser: false,
                timestamp:
                  new Date(),
              },
            ],
          );
        }
      } catch (error: any) {
        console.error(
          "Skip question error:",
          error?.response
            ?.data ||
            error?.message ||
            error,
        );
      } finally {
        setIsLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | RESET
  |--------------------------------------------------------------------------
  */

  const resetInterview =
    () => {
      setShowCompanySelector(
        true,
      );

      setSessionId("");

      setMessages([]);

      setInterviewScore(
        null,
      );

      setCompanyExpectedScore(
        null,
      );

      setIsInterviewComplete(
        false,
      );

      setQuestionsAnswered(0);

      setQuestionsSkipped(0);

      setCurrentDifficulty(
        "easy",
      );

      setHighestDifficulty(
        "easy",
      );

      setElapsedSeconds(0);
    };

  /*
  |--------------------------------------------------------------------------
  | EXIT
  |--------------------------------------------------------------------------
  */

  const handleEndInterview =
    () => {
      router.push(
        "/dashboard",
      );
    };

  /*
  |--------------------------------------------------------------------------
  | FORMAT TIME
  |--------------------------------------------------------------------------
  */

  const formatTime = (
    seconds: number,
  ) => {
    const minutes =
      Math.floor(
        seconds / 60,
      );

    const remaining =
      seconds % 60;

    return `${String(
      minutes,
    ).padStart(
      2,
      "0",
    )}:${String(
      remaining,
    ).padStart(
      2,
      "0",
    )}`;
  };

  /*
  |--------------------------------------------------------------------------
  | SCORE
  |--------------------------------------------------------------------------
  */

  const score =
    interviewScore ?? 0;

  const expectedScore =
    companyExpectedScore ??
    selectedCompany
      ?.expectedScore ??
    70;

  const meetsStandard =
    score >=
    expectedScore;

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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

  /*
  |--------------------------------------------------------------------------
  | COMPANY SELECTOR
  |--------------------------------------------------------------------------
  */

  if (
    showCompanySelector &&
    !sessionId
  ) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">
              {domainEmoji[
                domain
              ] || "🎯"}
            </div>

            <h1 className="text-3xl font-black text-foreground">
              Choose Your Company
            </h1>

            <p className="text-muted-foreground mt-2">
              Select the company you
              want to simulate your
              interview for.
            </p>

            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <span>
                {domainEmoji[
                  domain
                ] || "🎯"}
              </span>

              <span className="text-sm font-semibold text-primary">
                {domain}
              </span>
            </div>
          </div>

          {companyLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map(
                (company) => {
                  const selected =
                    selectedCompany
                      ?.id ===
                    company.id;

                  return (
                    <button
                      key={
                        company.id
                      }
                      type="button"
                      onClick={() =>
                        setSelectedCompany(
                          company,
                        )
                      }
                      className="text-left"
                    >
                      <Card
                        className={`p-5 h-full transition-all ${
                          selected
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl font-black">
                            {company.name
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </div>

                          {selected && (
                            <span className="text-primary text-lg">
                              ✓
                            </span>
                          )}
                        </div>

                        <h2 className="text-lg font-bold mt-4">
                          {
                            company.name
                          }
                        </h2>

                        <p className="text-xs text-primary font-semibold mt-1">
                          {
                            company.type
                          }
                        </p>

                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                          {
                            company.description
                          }
                        </p>

                        <div className="mt-4 pt-4 border-t border-border/50 flex justify-between">
                          <span className="text-xs text-muted-foreground">
                            Expected standard
                          </span>

                          <span className="text-sm font-bold">
                            {
                              company.expectedScore ??
                              70
                            }
                            /100
                          </span>
                        </div>
                      </Card>
                    </button>
                  );
                },
              )}
            </div>
          )}

          <div className="mt-8 flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  "/dashboard",
                )
              }
              className="rounded-full"
            >
              ← Dashboard
            </Button>

            <Button
              disabled={
                !selectedCompany ||
                isLoading
              }
              onClick={() =>
                startInterview()
              }
              className="rounded-full px-8"
            >
              {isLoading
                ? "Starting..."
                : selectedCompany
                  ? `Start ${selectedCompany.name} Interview →`
                  : "Select a Company First"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | COMPLETION SCREEN
  |--------------------------------------------------------------------------
  */

  if (isInterviewComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-5">
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">
              {meetsStandard
                ? "🎉"
                : "📈"}
            </div>

            <h1 className="text-3xl font-black">
              Interview Complete!
            </h1>

            <p className="text-muted-foreground mt-2">
              {
                selectedCompany
                  ?.name
              }{" "}
              • {domain}
            </p>

            <div className="mt-8">
              <ScoreRing
                score={score}
              />
            </div>

            <p
              className={`font-semibold mt-6 ${
                meetsStandard
                  ? "text-green-600"
                  : "text-orange-600"
              }`}
            >
              {meetsStandard
                ? "You meet the expected company standard 🚀"
                : "More preparation is needed for this company 🌱"}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Company Expected
                  Standard
                </p>

                <p className="text-2xl font-bold mt-1">
                  {
                    expectedScore
                  }
                  /100
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Your Score
                </p>

                <p className="text-2xl font-bold mt-1">
                  {score}
                  /100
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <p className="text-lg font-bold">
                {
                  questionsAnswered
                }
              </p>

              <p className="text-xs text-muted-foreground">
                Answered
              </p>
            </Card>

            <Card className="p-4 text-center">
              <p className="text-lg font-bold">
                {
                  questionsSkipped
                }
              </p>

              <p className="text-xs text-muted-foreground">
                Skipped
              </p>
            </Card>

            <Card className="p-4 text-center">
              <p className="text-lg font-bold">
                {formatTime(
                  elapsedSeconds,
                )}
              </p>

              <p className="text-xs text-muted-foreground">
                Duration
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={
                resetInterview
              }
              className="rounded-full"
            >
              🔄 Try Again
            </Button>

            <Button
              onClick={
                handleEndInterview
              }
              className="rounded-full"
            >
              Dashboard →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ACTIVE INTERVIEW
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-background/95 backdrop-blur sticky top-16 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                {domainEmoji[
                  domain
                ] || "🎯"}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-bold truncate">
                    {
                      selectedCompany
                        ?.name
                    }{" "}
                    Interview
                  </h1>

                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    ● Live
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {domain} • AI
                  Recruiter Simulator
                </p>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-center">
              <ProgressDots
                current={
                  questionsAnswered
                }
                total={
                  TOTAL_QUESTIONS
                }
              />

              <p className="text-xs text-muted-foreground mt-1">
                Question{" "}
                {Math.min(
                  questionsAnswered +
                    1,
                  TOTAL_QUESTIONS,
                )}{" "}
                of{" "}
                {
                  TOTAL_QUESTIONS
                }
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-sm font-mono bg-muted px-3 py-1.5 rounded-full">
                ⏱{" "}
                {formatTime(
                  elapsedSeconds,
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setShowExitConfirm(
                    true,
                  )
                }
                className="rounded-full"
              >
                Exit
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between sm:hidden">
            <span className="text-xs text-muted-foreground">
              Question{" "}
              {Math.min(
                questionsAnswered +
                  1,
                TOTAL_QUESTIONS,
              )}{" "}
              /{" "}
              {
                TOTAL_QUESTIONS
              }
            </span>

            <span className="text-xs font-mono">
              {formatTime(
                elapsedSeconds,
              )}
            </span>
          </div>

          <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  (questionsAnswered /
                    TOTAL_QUESTIONS) *
                    100,
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col">
        <ChatContainer
          messages={
            messages
          }
          isLoading={
            isLoading
          }
        />

        <div className="border-t border-border/50">
          <div className="px-4 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground text-center flex-1">
                💡 Answer like you're
                in a real interview.
                Be specific and
                explain your reasoning.
              </p>

              <span className="hidden sm:inline-flex text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                Difficulty:{" "}
                {currentDifficulty}
              </span>
            </div>
          </div>

          <InputBox
            onSend={
              handleSendMessage
            }
            disabled={
              isLoading
            }
          />

          <div className="flex justify-center pb-3">
            <button
              type="button"
              onClick={
                handleSkip
              }
              disabled={
                isLoading ||
                !sessionId
              }
              className="text-xs text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
            >
              Skip this question →
            </button>
          </div>
        </div>
      </div>

      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-bold">
              Exit Interview?
            </h2>

            <p className="text-sm text-muted-foreground mt-2">
              Your current interview
              will not be completed if
              you leave.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() =>
                  setShowExitConfirm(
                    false,
                  )
                }
              >
                Continue
              </Button>

              <Button
                variant="destructive"
                onClick={
                  handleEndInterview
                }
              >
                Exit Interview
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SCORE RING
|--------------------------------------------------------------------------
*/

function ScoreRing({
  score,
}: {
  score: number;
}) {
  const radius = 54;

  const circumference =
    2 *
    Math.PI *
    radius;

  const safeScore =
    Math.max(
      0,
      Math.min(100, score),
    );

  const offset =
    circumference -
    (safeScore / 100) *
      circumference;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg
        className="w-full h-full -rotate-90"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-border"
        />

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            offset
          }
          className={
            safeScore >= 80
              ? "text-green-500"
              : safeScore >= 60
                ? "text-blue-500"
                : "text-orange-500"
          }
          style={{
            transition:
              "stroke-dashoffset 1s ease",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black">
          {safeScore}
        </span>

        <span className="text-xs text-muted-foreground uppercase tracking-widest">
          Score
        </span>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PROGRESS DOTS
|--------------------------------------------------------------------------
*/

function ProgressDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({
        length: total,
      }).map(
        (_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index < current
                ? "bg-primary w-6"
                : index === current
                  ? "bg-primary/40 w-4"
                  : "bg-border w-2"
            }`}
          />
        ),
      )}
    </div>
  );
}