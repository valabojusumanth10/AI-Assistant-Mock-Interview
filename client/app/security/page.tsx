"use client";

import { FormEvent, useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

type Tab =
  | "password"
  | "sessions"
  | "history"
  | "alerts";

type Session = {
  sessionId: string;
  createdAt?: string;
  lastActiveAt?: string;
  expiresAt?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  operatingSystem?: string;
  isCurrent?: boolean;
  revoked?: boolean;
};

type LoginHistory = {
  _id?: string;
  timestamp?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  operatingSystem?: string;
  location?: string;
  status?: string;
  reason?: string;
};

type SecurityAlert = {
  _id: string;
  type?: string;
  message?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
  read?: boolean;
  severity?: string;
};

export default function SecurityPage() {
  const { user, isLoggedIn } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("password");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);

  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordLoading, setPasswordLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;

    fetchSessions();
    fetchLoginHistory();
    fetchSecurityAlerts();
  }, [isLoggedIn]);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);

      const response = await axiosInstance.get("/api/auth/sessions");

      setSessions(response.data.sessions || []);
    } catch (err: any) {
      console.error("Failed to fetch sessions:", err);

      if (err?.response?.status !== 401) {
        setError(
          err?.response?.data?.message ||
            "Failed to load active sessions.",
        );
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchLoginHistory = async () => {
    try {
      setHistoryLoading(true);

      const response = await axiosInstance.get(
        "/api/auth/login-history",
      );

      setLoginHistory(response.data.loginHistory || []);
    } catch (err: any) {
      console.error("Failed to fetch login history:", err);

      if (err?.response?.status !== 401) {
        setError(
          err?.response?.data?.message ||
            "Failed to load login history.",
        );
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchSecurityAlerts = async () => {
    try {
      setAlertsLoading(true);

      const response = await axiosInstance.get(
        "/api/auth/security-alerts",
      );

      setAlerts(response.data.alerts || []);
    } catch (err: any) {
      console.error("Failed to fetch security alerts:", err);

      if (err?.response?.status !== 401) {
        setError(
          err?.response?.data?.message ||
            "Failed to load security alerts.",
        );
      }
    } finally {
      setAlertsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (!password) {
      return {
        label: "Not entered",
        percentage: 0,
      };
    }

    if (score <= 2) {
      return {
        label: "Weak",
        percentage: 30,
      };
    }

    if (score <= 4) {
      return {
        label: "Medium",
        percentage: 65,
      };
    }

    return {
      label: "Strong",
      percentage: 100,
    };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const validatePassword = () => {
    if (!currentPassword) {
      return "Please enter your current password.";
    }

    if (!newPassword) {
      return "Please enter a new password.";
    }

    if (newPassword.length < 8) {
      return "New password must be at least 8 characters.";
    }

    if (!/[A-Z]/.test(newPassword)) {
      return "New password must contain at least one uppercase letter.";
    }

    if (!/[a-z]/.test(newPassword)) {
      return "New password must contain at least one lowercase letter.";
    }

    if (!/[0-9]/.test(newPassword)) {
      return "New password must contain at least one number.";
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return "New password must contain at least one special character.";
    }

    if (newPassword !== confirmPassword) {
      return "New password and confirmation do not match.";
    }

    if (newPassword === currentPassword) {
      return "New password must be different from your current password.";
    }

    return "";
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    clearMessages();

    const validationError = validatePassword();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setPasswordLoading(true);

      const response = await axiosInstance.post(
        "/api/auth/change-password",
        {
          currentPassword,
          newPassword,
        },
      );

      setMessage(
        response.data.message ||
          "Password changed successfully.",
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      await fetchSessions();
      await fetchSecurityAlerts();
    } catch (err: any) {
      console.error("Change password error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to change password.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      clearMessages();

      await axiosInstance.delete(
        `/api/auth/sessions/${sessionId}`,
      );

      setMessage("Session revoked successfully.");

      await fetchSessions();
      await fetchSecurityAlerts();
    } catch (err: any) {
      console.error("Revoke session error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to revoke session.",
      );
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      clearMessages();

      await axiosInstance.delete("/api/auth/sessions");

      setMessage("All other sessions have been revoked.");

      await fetchSessions();
      await fetchSecurityAlerts();
    } catch (err: any) {
      console.error("Revoke all sessions error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to revoke other sessions.",
      );
    }
  };

  const markAlertRead = async (alertId: string) => {
    try {
      await axiosInstance.patch(
        `/api/auth/security-alerts/${alertId}/read`,
      );

      setAlerts((prev) =>
        prev.map((alert) =>
          alert._id === alertId
            ? {
                ...alert,
                read: true,
              }
            : alert,
        ),
      );
    } catch (err: any) {
      console.error("Mark alert read error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to update security alert.",
      );
    }
  };

  const markAllAlertsRead = async () => {
    try {
      clearMessages();

      await axiosInstance.patch(
        "/api/auth/security-alerts/read-all",
      );

      setAlerts((prev) =>
        prev.map((alert) => ({
          ...alert,
          read: true,
        })),
      );

      setMessage("All security alerts marked as read.");
    } catch (err: any) {
      console.error("Mark all alerts read error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to update security alerts.",
      );
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "Unknown";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Unknown";
    }

    return parsed.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatType = (value?: string) => {
    if (!value) return "Security Event";

    return value
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1).toLowerCase(),
      )
      .join(" ");
  };

  const unreadAlerts = alerts.filter(
    (alert) => !alert.read,
  ).length;

  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-blue-600">
            Account Security
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Security Center
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your password, active sessions, login activity,
            and security alerts.
          </p>
        </div>

        {/* Account information */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div>
                <p className="font-bold text-slate-900">
                  {user.name}
                </p>

                <p className="text-sm text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-green-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Account
              </p>

              <p className="mt-1 text-sm font-bold text-green-800">
                Protected
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <span>{error}</span>

            <button
              onClick={() => setError("")}
              className="ml-4 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-2">
            <TabButton
              active={activeTab === "password"}
              onClick={() => {
                clearMessages();
                setActiveTab("password");
              }}
              icon="🔑"
              label="Change Password"
            />

            <TabButton
              active={activeTab === "sessions"}
              onClick={() => {
                clearMessages();
                setActiveTab("sessions");
              }}
              icon="💻"
              label="Active Sessions"
            />

            <TabButton
              active={activeTab === "history"}
              onClick={() => {
                clearMessages();
                setActiveTab("history");
              }}
              icon="🕒"
              label="Login History"
            />

            <button
              onClick={() => {
                clearMessages();
                setActiveTab("alerts");
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === "alerts"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🚨</span>

              <span>Security Alerts</span>

              {unreadAlerts > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === "alerts"
                      ? "bg-white text-slate-900"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {unreadAlerts}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Password */}
        {activeTab === "password" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-7">
              <h2 className="text-xl font-bold text-slate-900">
                Change Password
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Keep your account secure by using a strong,
                unique password.
              </p>
            </div>

            <form
              onSubmit={changePassword}
              className="max-w-2xl space-y-6"
            >
              <PasswordField
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrentPassword}
                setShow={setShowCurrentPassword}
                placeholder="Enter your current password"
              />

              <div>
                <PasswordField
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNewPassword}
                  setShow={setShowNewPassword}
                  placeholder="Enter your new password"
                />

                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      Password strength
                    </span>

                    <span
                      className={`text-xs font-bold ${
                        passwordStrength.label === "Strong"
                          ? "text-green-600"
                          : passwordStrength.label === "Medium"
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwordStrength.label === "Strong"
                          ? "bg-green-500"
                          : passwordStrength.label === "Medium"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{
                        width: `${passwordStrength.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirmPassword}
                setShow={setShowConfirmPassword}
                placeholder="Confirm your new password"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">
                  Password requirements
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Requirement
                    valid={newPassword.length >= 8}
                    text="At least 8 characters"
                  />

                  <Requirement
                    valid={/[A-Z]/.test(newPassword)}
                    text="One uppercase letter"
                  />

                  <Requirement
                    valid={/[a-z]/.test(newPassword)}
                    text="One lowercase letter"
                  />

                  <Requirement
                    valid={/[0-9]/.test(newPassword)}
                    text="One number"
                  />

                  <Requirement
                    valid={/[^A-Za-z0-9]/.test(newPassword)}
                    text="One special character"
                  />

                  <Requirement
                    valid={
                      newPassword.length > 0 &&
                      newPassword === confirmPassword
                    }
                    text="Passwords match"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {passwordLoading
                  ? "Updating..."
                  : "Change Password"}
              </button>
            </form>
          </section>
        )}

        {/* Sessions */}
        {activeTab === "sessions" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Active Sessions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Devices currently authorized to access your
                  account.
                </p>
              </div>

              <button
                onClick={revokeAllOtherSessions}
                disabled={sessions.length <= 1}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sign Out Other Devices
              </button>
            </div>

            <div className="p-6">
              {sessionsLoading ? (
                <LoadingState text="Loading active sessions..." />
              ) : sessions.length === 0 ? (
                <EmptyState
                  icon="💻"
                  title="No active sessions"
                  description="Your currently active devices will appear here."
                />
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className="rounded-xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                            {getDeviceIcon(session.device)}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-slate-900">
                                {session.device ||
                                  session.operatingSystem ||
                                  "Unknown Device"}
                              </p>

                              {session.isCurrent && (
                                <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                                  Current Session
                                </span>
                              )}

                              {session.revoked && (
                                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                                  Revoked
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {session.browser || "Unknown browser"}
                              {session.operatingSystem
                                ? ` • ${session.operatingSystem}`
                                : ""}
                            </p>

                            <div className="mt-3 grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
                              <span>
                                IP:{" "}
                                {session.ipAddress || "Unknown"}
                              </span>

                              <span>
                                Created:{" "}
                                {formatDate(session.createdAt)}
                              </span>

                              <span>
                                Last active:{" "}
                                {formatDate(session.lastActiveAt)}
                              </span>

                              <span>
                                Expires:{" "}
                                {formatDate(session.expiresAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!session.isCurrent &&
                          !session.revoked && (
                            <button
                              onClick={() =>
                                revokeSession(session.sessionId)
                              }
                              className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                            >
                              Revoke
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Login history */}
        {activeTab === "history" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900">
                Login History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review recent login attempts and account activity.
              </p>
            </div>

            <div className="p-6">
              {historyLoading ? (
                <LoadingState text="Loading login history..." />
              ) : loginHistory.length === 0 ? (
                <EmptyState
                  icon="🕒"
                  title="No login history"
                  description="Login activity will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {loginHistory.map((item, index) => {
                    const successful =
                      item.status === "success" ||
                      item.status === "successful";

                    return (
                      <div
                        key={item._id || index}
                        className="rounded-xl border border-slate-200 p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                successful
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {successful ? "✓" : "!"}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-slate-900">
                                  {successful
                                    ? "Successful Login"
                                    : "Failed Login"}
                                </p>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                    successful
                                      ? "bg-green-50 text-green-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {item.status || "Unknown"}
                                </span>
                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                {item.browser ||
                                  "Unknown browser"}
                                {item.operatingSystem
                                  ? ` • ${item.operatingSystem}`
                                  : ""}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                <span>
                                  IP:{" "}
                                  {item.ipAddress || "Unknown"}
                                </span>

                                {item.device && (
                                  <span>
                                    Device: {item.device}
                                  </span>
                                )}

                                {item.location && (
                                  <span>
                                    Location: {item.location}
                                  </span>
                                )}
                              </div>

                              {item.reason && (
                                <p className="mt-2 text-xs text-red-600">
                                  Reason: {item.reason}
                                </p>
                              )}
                            </div>
                          </div>

                          <p className="shrink-0 text-xs text-slate-400">
                            {formatDate(item.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Security alerts */}
        {activeTab === "alerts" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Security Alerts
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Suspicious login attempts and important account
                  security events.
                </p>
              </div>

              {unreadAlerts > 0 && (
                <button
                  onClick={markAllAlertsRead}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Mark All as Read
                </button>
              )}
            </div>

            <div className="p-6">
              {alertsLoading ? (
                <LoadingState text="Loading security alerts..." />
              ) : alerts.length === 0 ? (
                <EmptyState
                  icon="🛡️"
                  title="No security alerts"
                  description="Your account has no recorded security alerts."
                />
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert._id}
                      className={`rounded-xl border p-5 ${
                        alert.read
                          ? "border-slate-200 bg-white"
                          : "border-orange-200 bg-orange-50/40"
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              alert.severity === "critical"
                                ? "bg-red-100 text-red-700"
                                : alert.severity === "high"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            🚨
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-slate-900">
                                {formatType(alert.type)}
                              </p>

                              {!alert.read && (
                                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                                  New
                                </span>
                              )}

                              {alert.severity && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600">
                                  {alert.severity}
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {alert.message ||
                                "A security event occurred on your account."}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span>
                                {formatDate(alert.timestamp)}
                              </span>

                              {alert.ipAddress && (
                                <span>
                                  IP: {alert.ipAddress}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!alert.read && (
                          <button
                            onClick={() =>
                              markAlertRead(alert._id)
                            }
                            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Security information */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard
            icon="🔐"
            title="Strong Password"
            text="Use a unique password with uppercase, lowercase, numbers, and symbols."
          />

          <InfoCard
            icon="💻"
            title="Manage Sessions"
            text="Review devices that currently have access to your account."
          />

          <InfoCard
            icon="🚨"
            title="Security Alerts"
            text="Review suspicious login attempts and unusual account activity."
          />
        </div>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  setShow,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  setShow: (value: boolean) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-14 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

function Requirement({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full font-bold ${
          valid
            ? "bg-green-100 text-green-700"
            : "bg-slate-200 text-slate-400"
        }`}
      >
        {valid ? "✓" : "•"}
      </span>

      <span
        className={
          valid ? "text-green-700" : "text-slate-500"
        }
      >
        {text}
      </span>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

      <p className="text-sm font-semibold text-slate-700">
        {text}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="py-12 text-center">
      <div className="mb-4 text-5xl">{icon}</div>

      <h3 className="font-bold text-slate-900">{title}</h3>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function getDeviceIcon(device?: string) {
  const value = device?.toLowerCase() || "";

  if (
    value.includes("mobile") ||
    value.includes("phone") ||
    value.includes("android") ||
    value.includes("iphone")
  ) {
    return "📱";
  }

  if (value.includes("tablet")) {
    return "📱";
  }

  return "💻";
}