"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import useAuth from "@/hooks/useAuth";

type Role =
  | "student"
  | "mentor";

export default function SelectRolePage() {
  const router =
    useRouter();

  const {
    user,
    loading,
    isLoggedIn,
    selectRole,
  } = useAuth();

  const [
    selectedRole,
    setSelectedRole,
  ] = useState<Role | null>(
    null
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  // ============================================================
  // AUTH CHECK
  // ============================================================

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isLoggedIn) {
      router.replace("/login");

      return;
    }

    /*
     * If role is already completed,
     * there is no reason to stay here.
     */

if (user?.roleSelectionCompleted) {
  if (user.role === "admin") {
    router.replace("/admin");
    return;
  }

  if (user.role === "mentor") {
    router.replace("/mentor");
    return;
  }

  router.replace("/dashboard");
}
  }, [
    loading,
    isLoggedIn,
    user?.roleSelectionCompleted,
    router,
  ]);

  // ============================================================
  // SELECT ROLE
  // ============================================================
const handleRoleSelection = async (
  role: Role,
) => {
  if (submitting) {
    return;
  }

  setSelectedRole(role);
  setError("");
  setSubmitting(true);

  try {
    await selectRole(role);

    if (role === "mentor") {
      router.replace("/mentor");
      return;
    }

    router.replace("/dashboard");
  } catch (err: any) {
    console.error(
      "Role selection failed:",
      err,
    );

    setError(
      err?.message ||
        "Unable to select your role. Please try again.",
    );

    setSelectedRole(null);
  } finally {
    setSubmitting(false);
  }
};

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />

          <p className="text-sm text-muted-foreground">
            Loading your account...
          </p>
        </div>
      </main>
    );
  }

  // ============================================================
  // NOT LOGGED IN
  // ============================================================

  if (!isLoggedIn) {
    return null;
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">

      <div className="w-full max-w-3xl">

        {/* Header */}

        <div className="text-center mb-10">

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-black">
            AI
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Choose your role
          </h1>

          <p className="mt-3 text-muted-foreground">
            Welcome
            {user?.name
              ? `, ${user.name}`
              : ""}
            . Select how you want to use the platform.
          </p>

        </div>

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Role cards */}

        <div className="grid gap-6 md:grid-cols-2">

          {/* STUDENT */}

          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              handleRoleSelection(
                "student"
              )
            }
            className="group rounded-2xl border border-border bg-card p-8 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              🎓
            </div>

            <h2 className="mt-6 text-2xl font-bold text-foreground">
              Student
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Practice AI interviews, improve your
              technical skills, track placement
              readiness, participate in challenges,
              and prepare for your career.
            </p>

            <div className="mt-6 font-semibold text-primary">
              {submitting &&
              selectedRole === "student"
                ? "Setting up..."
                : "Continue as Student →"}
            </div>

          </button>

          {/* MENTOR */}

          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              handleRoleSelection(
                "mentor"
              )
            }
            className="group rounded-2xl border border-border bg-card p-8 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              👨‍🏫
            </div>

            <h2 className="mt-6 text-2xl font-bold text-foreground">
              Mentor
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Review student performance, analyze
              interview results, provide feedback,
              and help candidates improve their
              placement readiness.
            </p>

            <div className="mt-6 font-semibold text-primary">
              {submitting &&
              selectedRole === "mentor"
                ? "Setting up..."
                : "Continue as Mentor →"}
            </div>

          </button>

        </div>

        {/* Security note */}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Your role is saved securely to your account.
        </p>

      </div>

    </main>
  );
}