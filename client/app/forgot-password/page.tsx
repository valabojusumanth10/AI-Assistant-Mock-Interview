"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import axiosInstance from "@/lib/axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await axiosInstance.post(
        "/api/auth/forgot-password",
        {
          email: normalizedEmail,
        },
      );

      setMessage(
        response.data?.message ||
          "If an account with that email exists, a password reset link has been sent.",
      );
    } catch (err: any) {
      console.error(
        "Forgot password error:",
        err,
      );

      /*
       * The backend intentionally returns a generic
       * response so we don't reveal whether an email
       * belongs to an account.
       */
      setMessage(
        err?.response?.data?.message ||
          "If an account with that email exists, a password reset link has been sent.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-xl font-bold text-white shadow-lg">
              AI
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Forgot your password?
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Enter your email and we&apos;ll send you a
              secure password reset link.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {message && (
              <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Sending..."
                  : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 hover:text-black hover:underline"
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            For security, we use the same response whether
            or not the email belongs to an account.
          </p>
        </div>
      </div>
    </main>
  );
}