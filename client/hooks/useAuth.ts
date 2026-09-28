"use client";

import { useCallback, useEffect, useState } from "react";

export type UserRole = "student" | "mentor" | "admin";

export type CandidateType =
  | "fresher"
  | "internship-seeker"
  | "experienced";

export interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;

  roleSelectionCompleted: boolean;

  candidateType?: CandidateType;
  emailVerified?: boolean;
  isActive?: boolean;
  forcePasswordChange?: boolean;
  passwordExpired?: boolean;

  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface LoginResponseUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: UserRole;

  roleSelectionCompleted?: boolean;

  candidateType?: CandidateType;
  emailVerified?: boolean;
  isActive?: boolean;
  forcePasswordChange?: boolean;
  passwordExpired?: boolean;

  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const TOKEN_KEY = "token";
const USER_KEY = "user";
const SESSION_KEY = "sessionId";

/*
 * IMPORTANT:
 * This event synchronizes useAuth.ts with AuthContext.tsx.
 *
 * Both authentication systems use the same localStorage keys,
 * but React state is separate. Dispatching this event tells
 * AuthContext that login/role/logout has happened.
 */
const AUTH_CHANGED_EVENT = "auth-changed";
const AUTH_LOGOUT_EVENT = "auth-logout";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export function useAuth() {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  // ============================================================
  // NORMALIZE USER
  // ============================================================

  const normalizeUser = useCallback(
    (
      responseUser: LoginResponseUser,
      fallbackEmail = "",
    ): AuthUser => {
      const role =
        responseUser.role || "student";

      /*
       * IMPORTANT:
       *
       * The backend should return roleSelectionCompleted.
       *
       * For old accounts where the field is missing,
       * preserve the existing behavior.
       */
      const roleSelectionCompleted =
        typeof responseUser.roleSelectionCompleted ===
        "boolean"
          ? responseUser.roleSelectionCompleted
          : role === "admin";

      return {
        id:
          responseUser.id ||
          responseUser._id ||
          "",

        _id:
          responseUser._id ||
          responseUser.id,

        name:
          responseUser.name ||
          "",

        email:
          responseUser.email ||
          fallbackEmail,

        role,

        roleSelectionCompleted,

        candidateType:
          responseUser.candidateType,

        emailVerified:
          responseUser.emailVerified,

        isActive:
          responseUser.isActive,

        forcePasswordChange:
          responseUser.forcePasswordChange,

        passwordExpired:
          responseUser.passwordExpired,

        lastLoginAt:
          responseUser.lastLoginAt,

        createdAt:
          responseUser.createdAt,

        updatedAt:
          responseUser.updatedAt,
      };
    },
    [],
  );

  // ============================================================
  // SAVE AUTH DATA
  // ============================================================

  const saveAuthData = useCallback(
    (
      authToken: string,
      authUser: AuthUser,
      sessionId?: string,
    ) => {
      /*
       * Save authentication data.
       */
      localStorage.setItem(
        TOKEN_KEY,
        authToken,
      );

      localStorage.setItem(
        USER_KEY,
        JSON.stringify(authUser),
      );

      if (sessionId) {
        localStorage.setItem(
          SESSION_KEY,
          sessionId,
        );
      }

      /*
       * Update useAuth state immediately.
       */
      setToken(authToken);
      setUser(authUser);

      /*
       * CRITICAL FIX:
       *
       * Tell AuthContext that authentication changed.
       *
       * This event fires in the SAME browser tab.
       */
      window.dispatchEvent(
        new Event(AUTH_CHANGED_EVENT),
      );
    },
    [],
  );

  // ============================================================
  // LOAD AUTH STATE
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const storedToken =
          localStorage.getItem(
            TOKEN_KEY,
          );

        const storedUser =
          localStorage.getItem(
            USER_KEY,
          );

        if (!mounted) {
          return;
        }

        if (storedToken) {
          setToken(storedToken);
        }

        if (storedUser) {
          try {
            const parsedUser =
              JSON.parse(
                storedUser,
              );

            const normalizedUser =
              normalizeUser(
                parsedUser,
                parsedUser?.email || "",
              );

            if (mounted) {
              setUser(
                normalizedUser,
              );
            }
          } catch {
            localStorage.removeItem(
              USER_KEY,
            );
          }
        }
      } catch (error) {
        console.error(
          "Failed to load authentication state:",
          error,
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [normalizeUser]);

  // ============================================================
  // AUTH SYNCHRONIZATION
  // ============================================================

  useEffect(() => {
    /*
     * This allows useAuth to react if AuthContext changes
     * authentication state.
     */
    const handleAuthChanged = () => {
      try {
        const storedToken =
          localStorage.getItem(
            TOKEN_KEY,
          );

        const storedUser =
          localStorage.getItem(
            USER_KEY,
          );

        if (storedToken) {
          setToken(storedToken);
        } else {
          setToken(null);
        }

        if (storedUser) {
          try {
            const parsedUser =
              JSON.parse(
                storedUser,
              );

            const normalizedUser =
              normalizeUser(
                parsedUser,
                parsedUser?.email || "",
              );

            setUser(
              normalizedUser,
            );
          } catch {
            localStorage.removeItem(
              USER_KEY,
            );

            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error(
          "AUTH CHANGE SYNC ERROR:",
          error,
        );
      }
    };

    /*
     * Logout synchronization.
     */
    const handleAuthLogout = () => {
      setToken(null);
      setUser(null);
    };

    /*
     * Same-tab authentication changes.
     */
    window.addEventListener(
      AUTH_CHANGED_EVENT,
      handleAuthChanged,
    );

    window.addEventListener(
      AUTH_LOGOUT_EVENT,
      handleAuthLogout,
    );

    /*
     * Cross-tab localStorage changes.
     */
    const handleStorage = (
      event: StorageEvent,
    ) => {
      if (
        event.key === TOKEN_KEY ||
        event.key === USER_KEY ||
        event.key === SESSION_KEY
      ) {
        handleAuthChanged();
      }
    };

    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      window.removeEventListener(
        AUTH_CHANGED_EVENT,
        handleAuthChanged,
      );

      window.removeEventListener(
        AUTH_LOGOUT_EVENT,
        handleAuthLogout,
      );

      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  }, [normalizeUser]);

  // ============================================================
  // UPDATE USER
  // ============================================================

  const updateUser = useCallback(
    (updatedUser: AuthUser | null) => {
      setUser(updatedUser);

      if (updatedUser) {
        localStorage.setItem(
          USER_KEY,
          JSON.stringify(updatedUser),
        );
      } else {
        localStorage.removeItem(
          USER_KEY,
        );
      }

      /*
       * Keep AuthContext synchronized.
       */
      window.dispatchEvent(
        new Event(AUTH_CHANGED_EVENT),
      );
    },
    [],
  );

  // ============================================================
  // LOGIN
  // ============================================================

  const login = useCallback(
    async (
      emailOrToken: string,
      passwordOrUser?:
        | string
        | LoginResponseUser,
    ) => {
      /*
       * ========================================================
       * NORMAL LOGIN
       *
       * login(email, password)
       * ========================================================
       */

      if (
        typeof passwordOrUser ===
          "string" ||
        typeof passwordOrUser ===
          "undefined"
      ) {
        const email =
          emailOrToken.trim();

        const password =
          passwordOrUser;

        if (!password) {
          throw new Error(
            "Password is required.",
          );
        }

        const response =
          await fetch(
            `${API_URL}/api/auth/login`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                email,
                password,
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Login failed.",
          );
        }

        const responseToken =
          data?.token ||
          data?.data?.token;

        const responseUser =
          data?.user ||
          data?.data?.user;

        const responseSessionId =
          data?.sessionId ||
          data?.data?.sessionId;

        if (!responseToken) {
          throw new Error(
            "Login succeeded but no authentication token was returned.",
          );
        }

        if (!responseUser) {
          throw new Error(
            "Login succeeded but no user information was returned.",
          );
        }

        const normalizedUser =
          normalizeUser(
            responseUser,
            email,
          );

        /*
         * Save auth + immediately notify AuthContext.
         */
        saveAuthData(
          responseToken,
          normalizedUser,
          responseSessionId,
        );

        return {
          token: responseToken,

          sessionId:
            responseSessionId,

          user: normalizedUser,
        };
      }

      /*
       * ========================================================
       * TOKEN + USER LOGIN
       *
       * Used when restoring authentication from another flow.
       * ========================================================
       */

      const newToken =
        emailOrToken;

      const responseUser =
        passwordOrUser;

      if (
        !newToken ||
        !responseUser
      ) {
        throw new Error(
          "Authentication token and user are required.",
        );
      }

      const normalizedUser =
        normalizeUser(
          responseUser,
          responseUser.email ||
            "",
        );

      saveAuthData(
        newToken,
        normalizedUser,
      );

      return {
        token: newToken,

        user: normalizedUser,
      };
    },
    [
      normalizeUser,
      saveAuthData,
    ],
  );

  // ============================================================
  // SELECT ROLE
  // ============================================================

  const selectRole = useCallback(
    async (
      role: "student" | "mentor",
    ) => {
      const storedToken =
        localStorage.getItem(
          TOKEN_KEY,
        );

      if (!storedToken) {
        throw new Error(
          "You must be logged in to select a role.",
        );
      }

      if (
        role !== "student" &&
        role !== "mentor"
      ) {
        throw new Error(
          "Invalid role selected.",
        );
      }

      const response =
        await fetch(
          `${API_URL}/api/auth/select-role`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${storedToken}`,
            },

            body: JSON.stringify({
              role,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to select role.",
        );
      }

      const responseUser =
        data?.user ||
        data?.data?.user;

      if (!responseUser) {
        throw new Error(
          "Role selected but user information was not returned.",
        );
      }

      const normalizedUser: AuthUser = {
        id:
          responseUser.id ||
          responseUser._id ||
          user?.id ||
          "",

        _id:
          responseUser._id ||
          user?._id,

        name:
          responseUser.name ||
          user?.name ||
          "",

        email:
          responseUser.email ||
          user?.email ||
          "",

        role,

        /*
         * Once Student/Mentor is selected,
         * role selection is completed.
         */
        roleSelectionCompleted: true,

        candidateType:
          responseUser.candidateType ??
          user?.candidateType,

        emailVerified:
          responseUser.emailVerified ??
          user?.emailVerified,

        isActive:
          responseUser.isActive ??
          user?.isActive,

        forcePasswordChange:
          responseUser.forcePasswordChange ??
          user?.forcePasswordChange,

        passwordExpired:
          responseUser.passwordExpired ??
          user?.passwordExpired,

        lastLoginAt:
          responseUser.lastLoginAt ??
          user?.lastLoginAt,

        createdAt:
          responseUser.createdAt ??
          user?.createdAt,

        updatedAt:
          responseUser.updatedAt ??
          user?.updatedAt,
      };

      /*
       * Save the updated role.
       */
      localStorage.setItem(
        TOKEN_KEY,
        storedToken,
      );

      localStorage.setItem(
        USER_KEY,
        JSON.stringify(
          normalizedUser,
        ),
      );

      setToken(
        storedToken,
      );

      setUser(
        normalizedUser,
      );

      /*
       * CRITICAL FIX:
       *
       * Navbar/AuthContext must immediately know that
       * Student/Mentor role selection has completed.
       */
      window.dispatchEvent(
        new Event(AUTH_CHANGED_EVENT),
      );

      return {
        user: normalizedUser,
      };
    },
    [user],
  );

  // ============================================================
  // REFRESH USER
  // ============================================================

  const refreshUser =
    useCallback(async () => {
      const storedToken =
        localStorage.getItem(
          TOKEN_KEY,
        );

      if (!storedToken) {
        setToken(null);
        setUser(null);
        return null;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/auth/me`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${storedToken}`,

                "Content-Type":
                  "application/json",
              },
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            localStorage.removeItem(
              TOKEN_KEY,
            );

            localStorage.removeItem(
              USER_KEY,
            );

            localStorage.removeItem(
              SESSION_KEY,
            );

            setToken(null);
            setUser(null);

            window.dispatchEvent(
              new Event(
                AUTH_LOGOUT_EVENT,
              ),
            );
          }

          throw new Error(
            data?.message ||
              "Failed to refresh user.",
          );
        }

        const responseUser =
          data?.user ||
          data?.data?.user;

        if (!responseUser) {
          return null;
        }

        const normalizedUser =
          normalizeUser(
            responseUser,
            user?.email || "",
          );

        localStorage.setItem(
          USER_KEY,
          JSON.stringify(
            normalizedUser,
          ),
        );

        setToken(
          storedToken,
        );

        setUser(
          normalizedUser,
        );

        /*
         * Keep AuthContext synchronized with the
         * refreshed backend user.
         */
        window.dispatchEvent(
          new Event(AUTH_CHANGED_EVENT),
        );

        return normalizedUser;
      } catch (error) {
        console.error(
          "Failed to refresh authentication:",
          error,
        );

        return null;
      }
    }, [
      normalizeUser,
      user?.email,
    ]);

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout =
    useCallback(async () => {
      const storedToken =
        localStorage.getItem(
          TOKEN_KEY,
        );

      if (storedToken) {
        try {
          await fetch(
            `${API_URL}/api/auth/logout`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${storedToken}`,

                "Content-Type":
                  "application/json",
              },
            },
          );
        } catch (error) {
          /*
           * Backend logout failure should not prevent
           * local logout.
           */
          console.warn(
            "Backend logout request failed:",
            error,
          );
        }
      }

      /*
       * Clear everything locally.
       */
      localStorage.removeItem(
        TOKEN_KEY,
      );

      localStorage.removeItem(
        USER_KEY,
      );

      localStorage.removeItem(
        SESSION_KEY,
      );

      setToken(null);
      setUser(null);

      /*
       * CRITICAL:
       * Tell AuthContext to clear itself too.
       */
      window.dispatchEvent(
        new Event(AUTH_LOGOUT_EVENT),
      );

      window.dispatchEvent(
        new Event(AUTH_CHANGED_EVENT),
      );
    }, []);

  // ============================================================
  // ROLE HELPERS
  // ============================================================

  const isStudent =
    user?.role === "student";

  const isMentor =
    user?.role === "mentor";

  const isAdmin =
    user?.role === "admin";

  const hasRole =
    useCallback(
      (
        role:
          | UserRole
          | UserRole[],
      ) => {
        if (!user) {
          return false;
        }

        if (
          Array.isArray(role)
        ) {
          return role.includes(
            user.role,
          );
        }

        return (
          user.role === role
        );
      },
      [user],
    );

  // ============================================================
  // RETURN
  // ============================================================

  return {
    user,

    token,

    loading,

    isLoading: loading,

    isLoggedIn:
      !!token && !!user,

    isStudent,

    isMentor,

    isAdmin,

    login,

    selectRole,

    logout,

    updateUser,

    refreshUser,

    hasRole,
  };
}

export default useAuth;