"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";

import { AuthContext, type UserRole } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";

type NavLink = {
  href: string;
  label: string;
  roles: UserRole[];
};

const navLinks: NavLink[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: ["student"],
  },
  {
    href: "/practice",
    label: "Practice",
    roles: ["student"],
  },
  {
    href: "/history",
    label: "My Sessions",
    roles: ["student"],
  },
  {
    href: "/challenges",
    label: "Arena",
    roles: ["student"],
  },
  {
    href: "/mentor",
    label: "Mentor Dashboard",
    roles: ["mentor"],
  },
  {
    href: "/admin",
    label: "Admin Dashboard",
    roles: ["admin"],
  },
  {
    href: "/security",
    label: "Security",
    roles: ["student", "mentor", "admin"],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  /*
   * ------------------------------------------------------------
   * AUTH SOURCE #1
   * ------------------------------------------------------------
   *
   * Your layout provides AuthProvider, so we can read AuthContext.
   */
  const authContext = useContext(AuthContext);

  const contextUser = authContext?.user ?? null;
  const contextLoggedIn = authContext?.isLoggedIn ?? false;
  const contextLogout = authContext?.logout;

  /*
   * ------------------------------------------------------------
   * AUTH SOURCE #2
   * ------------------------------------------------------------
   *
   * Your dashboard/authenticated pages also use useAuth().
   *
   * We keep this as a fallback because your project currently has
   * two authentication states.
   */
  const hookAuth = useAuth();

  const hookUser = hookAuth?.user ?? null;
  const hookLoggedIn = hookAuth?.isLoggedIn ?? false;
  const hookLogout = hookAuth?.logout;

  /*
   * ------------------------------------------------------------
   * RESOLVE THE ACTUAL LOGGED-IN USER
   * ------------------------------------------------------------
   *
   * If AuthContext has a user, use it.
   * Otherwise fall back to useAuth().
   *
   * This fixes the situation where the dashboard knows the user
   * but AuthContext has not been populated yet.
   */
  const user =
    contextUser && contextLoggedIn
      ? contextUser
      : hookUser && hookLoggedIn
        ? hookUser
        : contextUser ?? hookUser ?? null;

  const isLoggedIn =
    contextLoggedIn ||
    hookLoggedIn ||
    Boolean(user);

  const role = user?.role as UserRole | undefined;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  /*
   * Close mobile navigation when changing pages.
   */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /*
   * ------------------------------------------------------------
   * IMPORTANT
   * ------------------------------------------------------------
   *
   * Don't render the Navbar on login/register pages or while
   * authentication is genuinely unavailable.
   *
   * But if we have a user from either auth system, render it.
   */
  if (!isLoggedIn || !user || !role) {
    return null;
  }

  /*
   * Only show links allowed for the current role.
   */
  const visibleLinks = navLinks.filter((link) =>
    link.roles.includes(role)
  );

  /*
   * Home page based on role.
   */
  const homeHref =
    role === "admin"
      ? "/admin"
      : role === "mentor"
        ? "/mentor"
        : "/dashboard";

  /*
   * ------------------------------------------------------------
   * ACTIVE LINK
   * ------------------------------------------------------------
   */
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  /*
   * ------------------------------------------------------------
   * LOGOUT
   * ------------------------------------------------------------
   *
   * Try both auth systems so whichever one currently owns the
   * authenticated state gets cleared.
   */
  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      /*
       * If both systems exist, calling both logout methods is
       * intentional. This keeps their localStorage/state in sync.
       */
      const logoutPromises: Promise<unknown>[] = [];

      if (contextLogout) {
        logoutPromises.push(
          Promise.resolve(contextLogout()).catch((error) => {
            console.error("AuthContext logout error:", error);
          })
        );
      }

      if (hookLogout) {
        logoutPromises.push(
          Promise.resolve(hookLogout()).catch((error) => {
            console.error("useAuth logout error:", error);
          })
        );
      }

      if (logoutPromises.length > 0) {
        await Promise.all(logoutPromises);
      }

      /*
       * Extra cleanup for the duplicated auth architecture.
       * This prevents stale authentication from bringing the user
       * back into the application after logout.
       */
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("sessionId");
      } catch (storageError) {
        console.error(
          "Could not clear localStorage:",
          storageError
        );
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setMobileOpen(false);
      setLoggingOut(false);

      router.replace("/login");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ======================================================
            LOGO
        ====================================================== */}
        <Link
          href={homeHref}
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
            <span className="text-sm font-bold">
              AI
            </span>
          </div>

          <div className="hidden sm:block">
            <div className="text-sm font-bold leading-tight text-gray-900">
              AI Mock Interview
            </div>

            <div className="text-[11px] leading-tight text-gray-500">
              Interview smarter
            </div>
          </div>
        </Link>

        {/* ======================================================
            DESKTOP NAVIGATION
        ====================================================== */}
        <div className="hidden items-center gap-1 md:flex">
          {visibleLinks.map((link) => {
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* ======================================================
            DESKTOP USER SECTION
        ====================================================== */}
        <div className="hidden items-center gap-3 md:flex">

          <div className="text-right">
            <p className="max-w-[180px] truncate text-sm font-semibold text-gray-900">
              {user.name || "User"}
            </p>

            <p className="text-xs capitalize text-gray-500">
              {role}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>

        {/* ======================================================
            MOBILE MENU BUTTON
        ====================================================== */}
        <button
          type="button"
          aria-label={
            mobileOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={mobileOpen}
          onClick={() =>
            setMobileOpen((previous) => !previous)
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 md:hidden"
        >
          {mobileOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </nav>

      {/* ========================================================
          MOBILE NAVIGATION
      ======================================================== */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">

            {/* User information */}
            <div className="mb-3 rounded-xl bg-gray-50 p-3">
              <p className="truncate text-sm font-semibold text-gray-900">
                {user.name || "User"}
              </p>

              <p className="mt-1 text-xs capitalize text-gray-500">
                {role}
              </p>

              {user.email && (
                <p className="mt-1 truncate text-xs text-gray-400">
                  {user.email}
                </p>
              )}
            </div>

            {/* Navigation links */}
            <div className="space-y-1">
              {visibleLinks.map((link) => {
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-lg px-3 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile logout */}
            <div className="mt-3 border-t border-gray-200 pt-3">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut
                  ? "Logging out..."
                  : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}