"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";

import axiosInstance from "@/lib/axios";

// ============================================================
// TYPES
// ============================================================

export type CandidateType =
  | "fresher"
  | "internship-seeker"
  | "experienced";

export type UserRole =
  | "student"
  | "mentor"
  | "admin";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;

  candidateType?: CandidateType;

  role?: UserRole;

  roleSelectionCompleted?: boolean;

  emailVerified?: boolean;

  isActive?: boolean;

  forcePasswordChange?: boolean;

  passwordExpired?: boolean;

  lastLoginAt?: string | null;

  createdAt?: string;

  updatedAt?: string;
}

interface LoginSecurity {
  suspiciousLogin?: boolean;
  newDevice?: boolean;
  newIp?: boolean;
}

interface LoginResponse {
  success?: boolean;

  token: string;

  sessionId?: string;

  user: User;

  security?: LoginSecurity;
}

interface RegisterResponse {
  success?: boolean;

  message?: string;

  requiresEmailVerification?: boolean;

  user?: User;
}

interface AuthContextType {
  user: User | null;

  isLoggedIn: boolean;

  isLoading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<LoginResponse>;

  register: (
    name: string,
    email: string,
    password: string,
    candidateType: CandidateType | string
  ) => Promise<RegisterResponse>;

  logout: () => Promise<void>;

  refreshUser: () => Promise<void>;
}

// ============================================================
// CONTEXT
// ============================================================

export const AuthContext =
  createContext<AuthContextType | null>(null);

// ============================================================
// STORAGE KEYS
// ============================================================

const TOKEN_KEY = "token";
const USER_KEY = "user";
const SESSION_KEY = "sessionId";

/*
 * Custom event used to synchronize the two authentication
 * systems in this project.
 *
 * IMPORTANT:
 * The browser "storage" event does NOT fire in the same tab
 * that changed localStorage.
 *
 * Therefore we also listen for "auth-changed".
 */
const AUTH_CHANGED_EVENT = "auth-changed";
const AUTH_LOGOUT_EVENT = "auth-logout";

// ============================================================
// USER NORMALIZER
// ============================================================

const normalizeUser = (
  rawUser: any
): User | null => {
  if (!rawUser) {
    return null;
  }

  const normalized: User = {
    id:
      rawUser.id ||
      rawUser._id ||
      "",

    _id:
      rawUser._id ||
      rawUser.id,

    name:
      rawUser.name ||
      "",

    email:
      rawUser.email ||
      "",

    candidateType:
      rawUser.candidateType,

    role:
      rawUser.role,

    roleSelectionCompleted:
      rawUser.roleSelectionCompleted === true,

    emailVerified:
      rawUser.emailVerified === true,

    isActive:
      rawUser.isActive,

    forcePasswordChange:
      rawUser.forcePasswordChange,

    passwordExpired:
      rawUser.passwordExpired,

    lastLoginAt:
      rawUser.lastLoginAt ?? null,

    createdAt:
      rawUser.createdAt,

    updatedAt:
      rawUser.updatedAt,
  };

  return normalized;
};

// ============================================================
// PROVIDER
// ============================================================

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] =
    useState<User | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  // ==========================================================
  // SAVE AUTH DATA
  // ==========================================================

  const saveAuthData = useCallback(
    (
      token: string,
      loggedInUser: User,
      sessionId?: string
    ) => {
      localStorage.setItem(
        TOKEN_KEY,
        token
      );

      localStorage.setItem(
        USER_KEY,
        JSON.stringify(loggedInUser)
      );

      if (sessionId) {
        localStorage.setItem(
          SESSION_KEY,
          sessionId
        );
      }

      /*
       * Tell other AuthProvider/useAuth instances in the
       * SAME browser tab that authentication changed.
       */
      window.dispatchEvent(
        new Event(AUTH_CHANGED_EVENT)
      );
    },
    []
  );

  // ==========================================================
  // CLEAR AUTH DATA
  // ==========================================================

  const clearAuthData = useCallback(() => {
    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );

    localStorage.removeItem(
      SESSION_KEY
    );

    setUser(null);
  }, []);

  // ==========================================================
  // LOAD USER FROM LOCAL STORAGE
  // ==========================================================

  const loadStoredUser = useCallback(() => {
    try {
      const token =
        localStorage.getItem(
          TOKEN_KEY
        );

      const storedUser =
        localStorage.getItem(
          USER_KEY
        );

      /*
       * No token means there is no authenticated session.
       */
      if (!token) {
        setUser(null);
        return null;
      }

      /*
       * Token exists but user object is missing.
       */
      if (!storedUser) {
        return null;
      }

      const parsedUser =
        JSON.parse(storedUser);

      const normalizedUser =
        normalizeUser(parsedUser);

      if (normalizedUser) {
        setUser(normalizedUser);
      }

      return normalizedUser;
    } catch (error) {
      console.error(
        "LOAD STORED USER ERROR:",
        error
      );

      localStorage.removeItem(
        USER_KEY
      );

      return null;
    }
  }, []);

  // ==========================================================
  // REFRESH CURRENT USER
  // ==========================================================

  const refreshUser = useCallback(
    async () => {
      const token =
        localStorage.getItem(
          TOKEN_KEY
        );

      if (!token) {
        setUser(null);
        return;
      }

      try {
        const response =
          await axiosInstance.get(
            "/api/auth/me"
          );

        const serverUser =
          response.data?.user;

        if (!serverUser) {
          throw new Error(
            "User data not found"
          );
        }

        const normalizedUser =
          normalizeUser(serverUser);

        if (!normalizedUser) {
          throw new Error(
            "Invalid user data"
          );
        }

        setUser(normalizedUser);

        localStorage.setItem(
          USER_KEY,
          JSON.stringify(normalizedUser)
        );
      } catch (error: any) {
        console.error(
          "REFRESH USER ERROR:",
          error
        );

        const status =
          error?.response?.status;

        /*
         * Only clear authentication if the backend
         * explicitly rejects the token.
         *
         * Temporary network errors should not log
         * the user out.
         */
        if (
          status === 401 ||
          status === 403
        ) {
          clearAuthData();
        }
      }
    },
    [clearAuthData]
  );

  // ==========================================================
  // INITIAL AUTH CHECK
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        try {
          /*
           * FIRST:
           * Restore the cached user immediately.
           *
           * This makes the Navbar available immediately
           * after navigation/reload.
           */
          loadStoredUser();

          /*
           * SECOND:
           * Verify the session with the backend.
           */
          await refreshUser();
        } catch (error) {
          console.error(
            "AUTH INITIALIZATION ERROR:",
            error
          );
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [
    loadStoredUser,
    refreshUser,
  ]);

  // ==========================================================
  // AUTH CHANGE SYNCHRONIZATION
  // ==========================================================

  useEffect(() => {
    /*
     * This handles authentication changes in the SAME TAB.
     *
     * Example:
     *
     * Login page uses useAuth()
     *       ↓
     * localStorage user is saved
     *       ↓
     * auth-changed event
     *       ↓
     * AuthContext receives event
     *       ↓
     * Navbar receives user
     */
    const handleAuthChanged =
      async () => {
        const storedUser =
          loadStoredUser();

        /*
         * If another auth system just logged in,
         * immediately show the cached user.
         */
        if (storedUser) {
          setUser(storedUser);
        }

        /*
         * Then verify it with the backend.
         */
        await refreshUser();
      };

    /*
     * Logout synchronization.
     */
    const handleAuthLogout =
      () => {
        setUser(null);
      };

    /*
     * Same-tab custom event.
     */
    window.addEventListener(
      AUTH_CHANGED_EVENT,
      handleAuthChanged
    );

    window.addEventListener(
      AUTH_LOGOUT_EVENT,
      handleAuthLogout
    );

    /*
     * Cross-tab localStorage synchronization.
     */
    const handleStorage =
      (event: StorageEvent) => {
        if (
          event.key === TOKEN_KEY ||
          event.key === USER_KEY ||
          event.key === SESSION_KEY
        ) {
          loadStoredUser();
        }
      };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        AUTH_CHANGED_EVENT,
        handleAuthChanged
      );

      window.removeEventListener(
        AUTH_LOGOUT_EVENT,
        handleAuthLogout
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [
    loadStoredUser,
    refreshUser,
  ]);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    try {
      setIsLoading(true);

      const response =
        await axiosInstance.post(
          "/api/auth/login",
          {
            email:
              email
                .trim()
                .toLowerCase(),

            password,
          }
        );

      const data =
        response.data;

      if (!data?.token) {
        throw new Error(
          "Authentication token was not returned"
        );
      }

      if (!data?.user) {
        throw new Error(
          "User information was not returned"
        );
      }

      const normalizedUser =
        normalizeUser(
          data.user
        );

      if (!normalizedUser) {
        throw new Error(
          "Invalid user information returned by server"
        );
      }

      /*
       * Save token/user/session.
       */
      localStorage.setItem(
        TOKEN_KEY,
        data.token
      );

      localStorage.setItem(
        USER_KEY,
        JSON.stringify(normalizedUser)
      );

      if (data.sessionId) {
        localStorage.setItem(
          SESSION_KEY,
          data.sessionId
        );
      }

      /*
       * Update this AuthContext immediately.
       */
      setUser(normalizedUser);

      /*
       * Tell Navbar and the other auth system that
       * authentication has changed.
       */
      window.dispatchEvent(
        new Event(AUTH_CHANGED_EVENT)
      );

      return {
        ...data,
        user: normalizedUser,
      };
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================
  // REGISTER
  // ==========================================================

  const register = async (
    name: string,
    email: string,
    password: string,
    candidateType:
      | CandidateType
      | string
  ): Promise<RegisterResponse> => {
    try {
      setIsLoading(true);

      const response =
        await axiosInstance.post(
          "/api/auth/register",
          {
            name:
              name.trim(),

            email:
              email
                .trim()
                .toLowerCase(),

            password,

            candidateType,
          }
        );

      const data =
        response.data;

      /*
       * Registration does not create an authenticated
       * frontend session.
       */
      setUser(null);

      localStorage.removeItem(
        TOKEN_KEY
      );

      localStorage.removeItem(
        USER_KEY
      );

      localStorage.removeItem(
        SESSION_KEY
      );

      window.dispatchEvent(
        new Event(AUTH_LOGOUT_EVENT)
      );

      return data;
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = async (): Promise<void> => {
    try {
      const token =
        localStorage.getItem(
          TOKEN_KEY
        );

      /*
       * Revoke backend session.
       */
      if (token) {
        try {
          await axiosInstance.post(
            "/api/auth/logout"
          );
        } catch (error) {
          /*
           * Backend logout failure should not prevent
           * local logout.
           */
          console.warn(
            "BACKEND LOGOUT ERROR:",
            error
          );
        }
      }
    } finally {
      /*
       * Always clear local authentication.
       */
      clearAuthData();

      /*
       * Tell every auth consumer in the current tab.
       */
      window.dispatchEvent(
        new Event(AUTH_LOGOUT_EVENT)
      );

      window.dispatchEvent(
        new Event(AUTH_CHANGED_EVENT)
      );
    }
  };

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const value: AuthContextType = {
    user,

    isLoggedIn:
      Boolean(user),

    isLoading,

    login,

    register,

    logout,

    refreshUser,
  };

  // ==========================================================
  // PROVIDER
  // ==========================================================

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};