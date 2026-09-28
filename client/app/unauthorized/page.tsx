"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[75vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-12">

          {/* Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl">
            🛡️
          </div>

          {/* Status */}
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red-600">
            403 · Access Denied
          </p>

          {/* Heading */}
          <h1 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
            You don't have permission
          </h1>

          {/* Description */}
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
            This area of the platform is restricted to users with the
            required role or permissions. Your current account does not
            have access to this resource.
          </p>

          {/* Current role */}
          {isLoggedIn && user && (
            <div className="mx-auto mt-7 max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current Account
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {user.name || "User"}
              </p>

              <div className="mt-2 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                {formatRole(user.role)}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">

            <button
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              ← Go Back
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Go to Dashboard
            </button>

          </div>

          {/* Help */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-xs leading-5 text-slate-400">
              If you believe you should have access to this area,
              contact an administrator and ask them to review your
              account role and permissions.
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}

function formatRole(role?: string) {
  if (role === "admin") {
    return "Administrator";
  }

  if (role === "mentor") {
    return "Mentor";
  }

  if (role === "student") {
    return "Student";
  }

  return "User";
}