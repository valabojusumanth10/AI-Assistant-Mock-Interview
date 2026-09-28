"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

type AccountType = "student" | "mentor";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [candidateType, setCandidateType] = useState<
    "fresher" | "internship-seeker" | "experienced"
  >("fresher");

  const [accountType, setAccountType] =
    useState<AccountType>("student");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters.",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await axiosInstance.post(
        "/api/auth/register",
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          candidateType,

          // IMPORTANT:
          // Public registration can only create
          // student or mentor accounts.
          role: accountType,
        },
      );

      const data = response.data;

      /*
       * Some secure backends require email verification
       * before allowing login.
       */

      if (data.token) {
        await login(data.token, data.user);

        router.push("/dashboard");
        return;
      }

      setSuccess(
        data.message ||
          "Account created successfully. Please verify your email before logging in.",
      );

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      console.error("Registration error:", err);

      setError(
        err?.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">

        {/* Header */}

        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
            AI
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            Create your account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Join the AI Interview Placement Platform
          </p>
        </div>

        {/* Card */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

          {/* Error */}

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success */}

          {success && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* Name */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Enter your full name"
                autoComplete="name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            {/* Email */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            {/* Password */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Create a strong password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                Use at least 8 characters with a mix of
                uppercase, lowercase, numbers and symbols.
              </p>
            </div>

            {/* =====================================
                ACCOUNT TYPE
            ===================================== */}

            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                How are you joining the platform?
              </label>

              <div className="grid gap-3 sm:grid-cols-2">

                {/* Student */}

                <button
                  type="button"
                  onClick={() =>
                    setAccountType("student")
                  }
                  className={`rounded-2xl border p-5 text-left transition ${
                    accountType === "student"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-2xl">
                    👨‍🎓
                  </div>

                  <p className="mt-3 font-bold">
                    Student
                  </p>

                  <p
                    className={`mt-1 text-xs leading-5 ${
                      accountType === "student"
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    Practice interviews, improve skills
                    and track placement readiness.
                  </p>
                </button>

                {/* Mentor */}

                <button
                  type="button"
                  onClick={() =>
                    setAccountType("mentor")
                  }
                  className={`rounded-2xl border p-5 text-left transition ${
                    accountType === "mentor"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-2xl">
                    🎓
                  </div>

                  <p className="mt-3 font-bold">
                    Mentor
                  </p>

                  <p
                    className={`mt-1 text-xs leading-5 ${
                      accountType === "mentor"
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    Review candidate performance and
                    provide professional feedback.
                  </p>
                </button>

              </div>
            </div>

            {/* Candidate Type */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Candidate Type
              </label>

              <select
                value={candidateType}
                onChange={(event) =>
                  setCandidateType(
                    event.target.value as
                      | "fresher"
                      | "internship-seeker"
                      | "experienced",
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="fresher">
                  Fresher
                </option>

                <option value="internship-seeker">
                  Internship Seeker
                </option>

                <option value="experienced">
                  Experienced
                </option>
              </select>
            </div>

            {/* Security notice */}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex gap-3">
                <span>🔐</span>

                <div>
                  <p className="text-sm font-bold text-blue-900">
                    Secure account setup
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Your account role controls which
                    features you can access. Administrator
                    privileges can only be granted by an
                    existing administrator.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating account..."
                : "Create Account"}
            </button>
          </form>

          {/* Login */}

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/login")
              }
              className="mt-2 text-sm font-bold text-slate-900 hover:underline"
            >
              Sign in →
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}