"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";

type PasswordStrength = {
  label: string;
  percentage: number;
};

export default function ResetPasswordPage() {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tokenReady, setTokenReady] =
    useState(false);

  // ==========================================================
  // READ RESET TOKEN
  // ==========================================================

  useEffect(() => {
    try {
      const params = new URLSearchParams(
        window.location.search,
      );

      const resetToken =
        params.get("token") || "";

      setToken(resetToken);
      setTokenReady(true);
    } catch (err) {
      console.error(
        "Unable to read reset token:",
        err,
      );

      setToken("");
      setTokenReady(true);
    }
  }, []);

  // ==========================================================
  // PASSWORD STRENGTH
  // ==========================================================

  const passwordStrength = useMemo<PasswordStrength>(() => {
    if (!newPassword) {
      return {
        label: "Enter a password",
        percentage: 0,
      };
    }

    let score = 0;

    if (newPassword.length >= 8) {
      score += 20;
    }

    if (newPassword.length >= 12) {
      score += 10;
    }

    if (/[A-Z]/.test(newPassword)) {
      score += 15;
    }

    if (/[a-z]/.test(newPassword)) {
      score += 15;
    }

    if (/[0-9]/.test(newPassword)) {
      score += 15;
    }

    if (/[^A-Za-z0-9]/.test(newPassword)) {
      score += 25;
    }

    if (score < 40) {
      return {
        label: "Weak",
        percentage: score,
      };
    }

    if (score < 70) {
      return {
        label: "Medium",
        percentage: score,
      };
    }

    if (score < 90) {
      return {
        label: "Strong",
        percentage: score,
      };
    }

    return {
      label: "Very Strong",
      percentage: 100,
    };
  }, [newPassword]);

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validatePassword = () => {
    if (!token) {
      return "This password reset link is invalid or missing.";
    }

    if (!newPassword) {
      return "Please enter a new password.";
    }

    if (newPassword.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (!/[A-Z]/.test(newPassword)) {
      return "Password must contain at least one uppercase letter.";
    }

    if (!/[a-z]/.test(newPassword)) {
      return "Password must contain at least one lowercase letter.";
    }

    if (!/[0-9]/.test(newPassword)) {
      return "Password must contain at least one number.";
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return "Password must contain at least one special character.";
    }

    if (newPassword !== confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  };

  // ==========================================================
  // RESET PASSWORD
  // ==========================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const validationError =
      validatePassword();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const response =
        await axiosInstance.post(
          "/api/auth/reset-password",
          {
            token,
            newPassword,
          },
        );

      setMessage(
        response.data?.message ||
          "Password reset successfully.",
      );

      setNewPassword("");
      setConfirmPassword("");

      /*
       * Give the user a moment to see the
       * success message before returning to login.
       */
      setTimeout(() => {
        router.replace("/login");
      }, 1800);
    } catch (err: any) {
      console.error(
        "Reset password error:",
        err,
      );

      const backendMessage =
        err?.response?.data?.message ||
        "Unable to reset your password.";

      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // LOADING TOKEN
  // ==========================================================

  if (!tokenReady) {
    return (
      <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-black" />
            <p className="text-sm text-slate-500">
              Validating reset link...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // INVALID / MISSING TOKEN
  // ==========================================================

  if (!token) {
    return (
      <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
              !
            </div>

            <h1 className="text-2xl font-bold">
              Invalid reset link
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              This password reset link is missing a
              token or is invalid. Please request a
              new password reset link.
            </p>

            <Link
              href="/forgot-password"
              className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // RESET FORM
  // ==========================================================

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-xl font-bold text-white shadow-lg">
              AI
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Reset your password
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create a new secure password for your
              Placement AI account.
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
              {/* New password */}

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  New Password
                </label>

                <div className="relative">
                  <input
                    id="new-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous,
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-black"
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>

                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      Password strength
                    </span>

                    <span className="text-xs font-bold text-slate-700">
                      {passwordStrength.label}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-black transition-all duration-300"
                      style={{
                        width: `${passwordStrength.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Confirm password */}

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Confirm Password
                </label>

                <div className="relative">
                  <input
                    id="confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) =>
                          !previous,
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-black"
                  >
                    {showConfirmPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>
              </div>

              {/* Requirements */}

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Password requirements
                </p>

                <ul className="space-y-1 text-xs text-slate-600">
                  <li>
                    {newPassword.length >= 8
                      ? "✓"
                      : "•"}{" "}
                    At least 8 characters
                  </li>

                  <li>
                    {/[A-Z]/.test(
                      newPassword,
                    )
                      ? "✓"
                      : "•"}{" "}
                    One uppercase letter
                  </li>

                  <li>
                    {/[a-z]/.test(
                      newPassword,
                    )
                      ? "✓"
                      : "•"}{" "}
                    One lowercase letter
                  </li>

                  <li>
                    {/[0-9]/.test(
                      newPassword,
                    )
                      ? "✓"
                      : "•"}{" "}
                    One number
                  </li>

                  <li>
                    {/[^A-Za-z0-9]/.test(
                      newPassword,
                    )
                      ? "✓"
                      : "•"}{" "}
                    One special character
                  </li>

                  <li>
                    {newPassword &&
                    confirmPassword &&
                    newPassword ===
                      confirmPassword
                      ? "✓"
                      : "•"}{" "}
                    Passwords match
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Resetting Password..."
                  : "Reset Password"}
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
            Reset links expire after 15 minutes and can
            only be used once.
          </p>
        </div>
      </div>
    </main>
  );
}