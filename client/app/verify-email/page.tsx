"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/lib/axios";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState(
    "We're verifying your email address..."
  );

  // Prevent React Strict Mode from sending the verification
  // request twice during development.
  const verificationStarted = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage(
        "This verification link is invalid because the verification token is missing."
      );
      return;
    }

    if (verificationStarted.current) {
      return;
    }

    verificationStarted.current = true;

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      setStatus("verifying");
      setMessage("We're verifying your email address...");

      const response = await axiosInstance.post(
        "/api/auth/verify-email",
        {
          token,
        },
        {
          validateStatus: (status) =>
            status >= 200 && status < 500,
        }
      );

      if (
        response.status >= 200 &&
        response.status < 300
      ) {
        setStatus("success");

        setMessage(
          response.data?.message ||
            "Your email has been successfully verified."
        );

        return;
      }

      setStatus("error");

      setMessage(
        response.data?.message ||
          "This verification link is invalid or has expired."
      );
    } catch (error: any) {
      console.error(
        "EMAIL VERIFICATION ERROR:",
        error
      );

      setStatus("error");

      setMessage(
        error.response?.data?.message ||
          "Something went wrong while verifying your email. Please try again."
      );
    }
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const handleRetry = () => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage(
        "This verification link is invalid because the verification token is missing."
      );
      return;
    }

    // Allow a manual retry.
    verificationStarted.current = true;

    verifyEmail(token);
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-xl text-center">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-black">
                AI
              </span>
            </div>
          </div>

          {/* VERIFYING */}
          {status === "verifying" && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-2">
                Verifying your email
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {message}
              </p>
            </>
          )}

          {/* SUCCESS */}
          {status === "success" && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <span className="text-3xl text-green-600">
                    ✓
                  </span>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-2">
                Email Verified!
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed mb-7">
                {message}
              </p>

              <button
                onClick={handleLogin}
                className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 px-4 hover:opacity-90 transition-opacity"
              >
                Continue to Login →
              </button>
            </>
          )}

          {/* ERROR */}
          {status === "error" && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <span className="text-3xl text-red-600">
                    !
                  </span>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-2">
                Verification Failed
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed mb-7">
                {message}
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 px-4 hover:opacity-90 transition-opacity"
                >
                  Try Again
                </button>

                <button
                  onClick={handleLogin}
                  className="w-full rounded-xl border border-border/60 text-foreground font-semibold py-3 px-4 hover:bg-muted/50 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Placement AI · AI Powered Interview Preparation
        </p>
      </div>
    </main>
  );
}