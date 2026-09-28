"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

type Role = "student" | "mentor" | "admin";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: Role[];
  fallback?: ReactNode;
}

export default function RoleGuard({
  children,
  allowedRoles,
  fallback,
}: RoleGuardProps) {
  const router = useRouter();

  const {
    user,
    isLoggedIn,
    loading,
  } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    // User is not logged in
    if (!isLoggedIn || !user) {
      router.replace("/login");
      return;
    }

    // User is logged in but does not have permission
    if (!allowedRoles.includes(user.role as Role)) {
      router.replace("/unauthorized");
      return;
    }
  }, [
    loading,
    isLoggedIn,
    user,
    allowedRoles,
    router,
  ]);

  // ============================================================
  // AUTH CHECK IN PROGRESS
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm font-medium text-slate-500">
            Checking permissions...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // NOT LOGGED IN
  // ============================================================

  if (!isLoggedIn || !user) {
    return (
      fallback ?? (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mb-4 text-5xl">
              🔐
            </div>

            <h1 className="text-xl font-bold text-slate-900">
              Authentication Required
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Redirecting you to the login page...
            </p>
          </div>
        </div>
      )
    );
  }

  // ============================================================
  // WRONG ROLE
  // ============================================================

  if (!allowedRoles.includes(user.role as Role)) {
    return (
      fallback ?? (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
              🚫
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Access Denied
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              You do not have permission to access
              this page.
            </p>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Your Role
              </p>

              <p className="mt-1 font-semibold capitalize text-slate-900">
                {user.role}
              </p>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Required Role
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {allowedRoles
                  .map(
                    (role) =>
                      role.charAt(0).toUpperCase() +
                      role.slice(1),
                  )
                  .join(" or ")}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard")
              }
              className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Go to Dashboard
            </button>

          </div>
        </div>
      )
    );
  }

  // ============================================================
  // AUTHORIZED USER
  // ============================================================

  return <>{children}</>;
}