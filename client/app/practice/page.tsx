"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const domains = [
  {
    name: "JavaScript",
    emoji: "🟨",
    description: "JavaScript, Node.js, APIs and modern web development",
  },
  {
    name: "React",
    emoji: "⚛️",
    description: "React, Hooks, state management and performance",
  },
  {
    name: "Python",
    emoji: "🐍",
    description: "Python, backend development and problem solving",
  },
  {
    name: "Data Science",
    emoji: "📊",
    description: "Data analysis, ML concepts and practical problems",
  },
  {
    name: "DevOps",
    emoji: "⚙️",
    description: "Docker, CI/CD, deployment and infrastructure",
  },
  {
    name: "System Design",
    emoji: "🏗️",
    description: "Architecture, scalability and distributed systems",
  },
  {
    name: "Database Design",
    emoji: "🗄️",
    description: "SQL, MongoDB, database design and optimization",
  },
  {
    name: "General",
    emoji: "🎯",
    description: "A balanced interview across multiple areas",
  },
];

export default function PracticePage() {
  const router = useRouter();

  const {
    isLoggedIn,
    isLoading: authLoading,
    user,
  } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

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

  const firstName =
    user?.name?.split(" ")[0] || "there";

  const startInterview = (domain: string) => {
    router.push(
      `/interview?domain=${encodeURIComponent(domain)}`
    );
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <section className="mb-10">
          <p className="text-sm text-muted-foreground font-medium mb-2">
            👋 Welcome back, {firstName}
          </p>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Practice
              </h1>

              <p className="mt-3 text-muted-foreground max-w-2xl">
                Sharpen your interview skills with adaptive AI
                interviews, targeted practice, and real-time
                feedback.
              </p>
            </div>

            <button
              onClick={() => startInterview("General")}
              className="self-start md:self-auto px-6 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-md hover:opacity-90 transition-all"
            >
              ⚡ Quick Interview
            </button>
          </div>
        </section>

        {/* =====================================================
            AI MOCK INTERVIEW
        ====================================================== */}

        <section className="mb-10">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">

            <div className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
                    🤖 AI POWERED
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black">
                    Adaptive AI Mock Interview
                  </h2>

                  <p className="mt-3 text-muted-foreground leading-relaxed">
                    Experience an interview that adapts to your
                    performance. Strong answers increase the
                    difficulty, while weaker answers move toward
                    foundational concepts.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-5">
                    <span className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium">
                      🧠 Adaptive Difficulty
                    </span>

                    <span className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium">
                      🔄 Follow-up Questions
                    </span>

                    <span className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium">
                      📊 AI Evaluation
                    </span>

                    <span className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium">
                      🏢 Company Simulation
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => startInterview("General")}
                  className="shrink-0 px-7 py-3.5 rounded-full bg-foreground text-background font-bold hover:opacity-90 transition-all"
                >
                  Start Interview →
                </button>

              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            DOMAIN PRACTICE
        ====================================================== */}

        <section className="mb-10">
          <div className="mb-5">
            <h2 className="text-2xl font-black">
              Practice by Domain
            </h2>

            <p className="text-sm text-muted-foreground mt-1">
              Choose an area you want to improve.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {domains.map((domain) => (
              <button
                key={domain.name}
                onClick={() => startInterview(domain.name)}
                className="group text-left rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">

                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-xl">
                    {domain.emoji}
                  </div>

                  <span className="text-muted-foreground group-hover:text-primary transition-colors">
                    →
                  </span>

                </div>

                <h3 className="mt-4 font-bold">
                  {domain.name}
                </h3>

                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {domain.description}
                </p>
              </button>
            ))}

          </div>
        </section>

        {/* =====================================================
            QUICK PRACTICE
        ====================================================== */}

        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-black">
              More Practice
            </h2>

            <p className="text-sm text-muted-foreground mt-1">
              Keep improving outside your mock interviews.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Daily Challenge */}

            <button
              onClick={() => router.push("/challenges")}
              className="text-left rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-xl">
                🔥
              </div>

              <h3 className="mt-4 font-bold text-lg">
                Daily Challenge
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                Complete today's AI-generated interview
                challenge and keep your streak alive.
              </p>

              <div className="mt-4 text-sm font-semibold text-primary">
                Go to Arena →
              </div>
            </button>

            {/* Weekly Challenge */}

            <button
              onClick={() => router.push("/challenges")}
              className="text-left rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-xl">
                🏆
              </div>

              <h3 className="mt-4 font-bold text-lg">
                Weekly Challenge
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                Take on a bigger challenge and compete
                against other candidates.
              </p>

              <div className="mt-4 text-sm font-semibold text-primary">
                Enter Challenge →
              </div>
            </button>

            {/* Previous Sessions */}

            <button
              onClick={() => router.push("/history")}
              className="text-left rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-xl">
                📊
              </div>

              <h3 className="mt-4 font-bold text-lg">
                Review Sessions
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                Look back at your previous interviews and
                understand where you improved.
              </p>

              <div className="mt-4 text-sm font-semibold text-primary">
                My Sessions →
              </div>
            </button>

          </div>
        </section>

      </div>
    </main>
  );
}