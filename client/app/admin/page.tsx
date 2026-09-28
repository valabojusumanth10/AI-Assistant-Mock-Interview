"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import useAuth from "@/hooks/useAuth";

type Role = "student" | "mentor" | "admin";

type User = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  candidateType?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  lastLoginIP?: string;
};

type Statistics = {
  totalUsers?: number;
  students?: number;
  mentors?: number;
  admins?: number;
  activeUsers?: number;
  totalInterviews?: number;
  completedInterviews?: number;
  totalChallengeAttempts?: number;
};

type Settings = {
  registrationEnabled?: boolean;
  emailVerificationRequired?: boolean;
  maxLoginAttempts?: number;
  accountLockoutMinutes?: number;
  passwordExpiryDays?: number;
  sessionDurationHours?: number;
  supportedRoles?: string[];
};

type ActivityInterview = {
  _id: string;
  userId?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  domain?: string;
  score?: number;
  isComplete?: boolean;
  createdAt?: string;
  completedAt?: string;
};

type Activity = {
  recentUsers?: User[];
  recentInterviews?: ActivityInterview[];
};

type Tab =
  | "overview"
  | "users"
  | "activity"
  | "settings";

export default function AdminPage() {
  const router = useRouter();

  /*
   * IMPORTANT:
   * We use the auth hook as the single source of truth.
   * authLoading prevents the page from redirecting to /login
   * before authentication has finished initializing.
   */
  const {
    user,
    isLoggedIn,
    loading: authLoading,
  } = useAuth();

  const [activeTab, setActiveTab] =
    useState<Tab>("overview");

  const [users, setUsers] = useState<User[]>([]);

  const [statistics, setStatistics] =
    useState<Statistics | null>(null);

  const [activity, setActivity] =
    useState<Activity | null>(null);

  const [settings, setSettings] =
    useState<Settings | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [usersLoading, setUsersLoading] =
    useState(false);

  const [activityLoading, setActivityLoading] =
    useState(false);

  const [settingsLoading, setSettingsLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  /*
   * AUTHORIZATION
   *
   * Do not redirect while useAuth is still loading.
   * Previously this page checked !isLoggedIn immediately,
   * which caused:
   *
   * /admin -> /login -> /admin -> /login
   *
   * because authentication had not finished initializing yet.
   */
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isLoggedIn || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/unauthorized");
      return;
    }

    loadDashboard();
  }, [
    authLoading,
    isLoggedIn,
    user,
    router,
  ]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        usersResponse,
        activityResponse,
        settingsResponse,
      ] = await Promise.all([
        axiosInstance.get(
          "/api/admin/users",
        ),

        axiosInstance.get(
          "/api/admin/activity",
        ),

        axiosInstance.get(
          "/api/admin/settings",
        ),
      ]);

      setUsers(
        usersResponse.data.users || [],
      );

      setStatistics(
        activityResponse.data.statistics ||
          null,
      );

      setActivity({
        recentUsers:
          activityResponse.data
            .recentUsers || [],

        recentInterviews:
          activityResponse.data
            .recentInterviews || [],
      });

      setSettings(
        settingsResponse.data.settings ||
          null,
      );
    } catch (err: any) {
      console.error(
        "Failed to load admin dashboard:",
        err,
      );

      if (
        err?.response?.status === 403
      ) {
        setError(
          "You do not have permission to access the Admin Dashboard.",
        );
      } else {
        setError(
          err?.response?.data?.message ||
            "Failed to load admin dashboard.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);

      const response =
        await axiosInstance.get(
          "/api/admin/users",
        );

      setUsers(
        response.data.users || [],
      );
    } catch (err: any) {
      console.error(
        "Failed to load users:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load users.",
      );
    } finally {
      setUsersLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      setActivityLoading(true);

      const response =
        await axiosInstance.get(
          "/api/admin/activity",
        );

      setStatistics(
        response.data.statistics ||
          null,
      );

      setActivity({
        recentUsers:
          response.data
            .recentUsers || [],

        recentInterviews:
          response.data
            .recentInterviews || [],
      });
    } catch (err: any) {
      console.error(
        "Failed to load activity:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load platform activity.",
      );
    } finally {
      setActivityLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      setSettingsLoading(true);

      const response =
        await axiosInstance.get(
          "/api/admin/settings",
        );

      setSettings(
        response.data.settings ||
          null,
      );
    } catch (err: any) {
      console.error(
        "Failed to load settings:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load system settings.",
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  const changeUserStatus = async (
    targetUser: User,
  ) => {
    const nextStatus =
      !targetUser.isActive;

    const confirmed =
      window.confirm(
        nextStatus
          ? `Activate ${targetUser.name}'s account?`
          : `Deactivate ${targetUser.name}'s account?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        `status-${targetUser._id}`,
      );

      setError("");
      setSuccess("");

      await axiosInstance.patch(
        `/api/admin/users/${targetUser._id}/status`,
        {
          isActive: nextStatus,
        },
      );

      setUsers((previous) =>
        previous.map((item) =>
          item._id === targetUser._id
            ? {
                ...item,
                isActive:
                  nextStatus,
              }
            : item,
        ),
      );

      setSuccess(
        nextStatus
          ? `${targetUser.name} has been activated.`
          : `${targetUser.name} has been deactivated.`,
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      console.error(
        "Failed to update user status:",
        err,
      );

      if (
        err?.response?.status === 403
      ) {
        setError(
          "You do not have permission to manage users.",
        );
      } else {
        setError(
          err?.response?.data?.message ||
            "Failed to update user status.",
        );
      }
    } finally {
      setActionLoading(null);
    }
  };

  const changeUserRole = async (
    targetUser: User,
    newRole: Role,
  ) => {
    if (
      targetUser.role === newRole
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Change ${targetUser.name}'s role from ${formatRole(
          targetUser.role,
        )} to ${formatRole(newRole)}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        `role-${targetUser._id}`,
      );

      setError("");
      setSuccess("");

      await axiosInstance.patch(
        `/api/admin/users/${targetUser._id}/role`,
        {
          role: newRole,
        },
      );

      setUsers((previous) =>
        previous.map((item) =>
          item._id === targetUser._id
            ? {
                ...item,
                role: newRole,
              }
            : item,
        ),
      );

      setSuccess(
        `${targetUser.name}'s role has been updated to ${formatRole(
          newRole,
        )}.`,
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      console.error(
        "Failed to update user role:",
        err,
      );

      if (
        err?.response?.status === 403
      ) {
        setError(
          "You do not have permission to manage user roles.",
        );
      } else {
        setError(
          err?.response?.data?.message ||
            "Failed to update user role.",
        );
      }
    } finally {
      setActionLoading(null);
    }
  };

  const formatRole = (
    role?: string,
  ) => {
    if (!role) {
      return "Unknown";
    }

    if (role === "admin") {
      return "Administrator";
    }

    if (role === "mentor") {
      return "Mentor";
    }

    if (role === "student") {
      return "Student";
    }

    return role;
  };

  const formatCandidateType = (
    type?: string,
  ) => {
    if (!type) {
      return "Candidate";
    }

    return type
      .split("-")
      .map(
        (word) =>
          word
            .charAt(0)
            .toUpperCase() +
          word.slice(1),
      )
      .join(" ");
  };

  const formatDate = (
    date?: string,
  ) => {
    if (!date) {
      return "—";
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return "—";
    }

    return parsed.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );
  };

  const formatDateTime = (
    date?: string,
  ) => {
    if (!date) {
      return "—";
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return "—";
    }

    return parsed.toLocaleString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      },
    );
  };

  const getScoreClass = (
    score?: number,
  ) => {
    const value =
      Number(score) || 0;

    if (value >= 80) {
      return "text-green-600";
    }

    if (value >= 60) {
      return "text-yellow-600";
    }

    return "text-red-600";
  };

  const filteredUsers =
    users.filter((item) => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return true;
      }

      return (
        item.name
          ?.toLowerCase()
          .includes(query) ||
        item.email
          ?.toLowerCase()
          .includes(query) ||
        item.role
          ?.toLowerCase()
          .includes(query) ||
        item.candidateType
          ?.toLowerCase()
          .includes(query)
      );
    });

  const switchTab = (
    tab: Tab,
  ) => {
    setActiveTab(tab);
    setError("");

    if (tab === "users") {
      loadUsers();
    }

    if (tab === "activity") {
      loadActivity();
    }

    if (tab === "settings") {
      loadSettings();
    }
  };

  /*
   * IMPORTANT:
   * Wait for authentication before rendering or redirecting.
   */
  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="font-semibold text-slate-800">
            Checking authentication...
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Please wait.
          </p>
        </div>
      </main>
    );
  }

  if (
    !isLoggedIn ||
    !user ||
    user.role !== "admin"
  ) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-blue-600">
              Administration
            </p>

            <h1 className="text-3xl font-bold text-slate-900">
              Admin Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-slate-600">
              Manage users, monitor platform activity,
              and control system-level access.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboard}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Refresh
            </button>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Signed in as
              </p>

              <p className="font-semibold text-slate-900">
                {user.name || "Administrator"}
              </p>

              <p className="text-xs font-semibold text-blue-600">
                Administrator
              </p>
            </div>
          </div>
        </div>

        {/* ALERTS */}

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              onClick={() =>
                setError("")
              }
              className="font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        {/* TABS */}

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <TabButton
            active={
              activeTab ===
              "overview"
            }
            onClick={() =>
              switchTab("overview")
            }
          >
            📊 Overview
          </TabButton>

          <TabButton
            active={
              activeTab ===
              "users"
            }
            onClick={() =>
              switchTab("users")
            }
          >
            👥 User Management
          </TabButton>

          <TabButton
            active={
              activeTab ===
              "activity"
            }
            onClick={() =>
              switchTab("activity")
            }
          >
            📈 Platform Activity
          </TabButton>

          <TabButton
            active={
              activeTab ===
              "settings"
            }
            onClick={() =>
              switchTab("settings")
            }
          >
            ⚙️ System Settings
          </TabButton>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

            <p className="font-semibold text-slate-800">
              Loading admin dashboard...
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Gathering users and platform statistics.
            </p>
          </div>
        ) : (
          <>
            {/* ==================================================
                OVERVIEW
            ================================================== */}

            {activeTab ===
              "overview" && (
              <div className="space-y-6">

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <AdminMetric
                    title="Total Users"
                    value={
                      statistics?.totalUsers ||
                      0
                    }
                    description="All registered accounts"
                    icon="👥"
                  />

                  <AdminMetric
                    title="Students"
                    value={
                      statistics?.students ||
                      0
                    }
                    description="Student accounts"
                    icon="🎓"
                  />

                  <AdminMetric
                    title="Mentors"
                    value={
                      statistics?.mentors ||
                      0
                    }
                    description="Mentor accounts"
                    icon="🧑‍🏫"
                  />

                  <AdminMetric
                    title="Administrators"
                    value={
                      statistics?.admins ||
                      0
                    }
                    description="Admin accounts"
                    icon="🛡️"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <AdminMetric
                    title="Active Users"
                    value={
                      statistics?.activeUsers ||
                      0
                    }
                    description="Currently active accounts"
                    icon="🟢"
                  />

                  <AdminMetric
                    title="Total Interviews"
                    value={
                      statistics?.totalInterviews ||
                      0
                    }
                    description="All interview sessions"
                    icon="🎤"
                  />

                  <AdminMetric
                    title="Completed Interviews"
                    value={
                      statistics?.completedInterviews ||
                      0
                    }
                    description="Finished sessions"
                    icon="✅"
                  />

                  <AdminMetric
                    title="Challenge Attempts"
                    value={
                      statistics?.totalChallengeAttempts ||
                      0
                    }
                    description="Arena submissions"
                    icon="🏆"
                  />
                </div>

                {/* ROLE BREAKDOWN */}

                <div className="grid gap-6 lg:grid-cols-2">

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">
                      Role Distribution
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Current distribution of platform roles.
                    </p>

                    <div className="mt-6 space-y-5">
                      <RoleBar
                        label="Students"
                        value={
                          statistics?.students ||
                          0
                        }
                        total={
                          statistics?.totalUsers ||
                          0
                        }
                        icon="🎓"
                      />

                      <RoleBar
                        label="Mentors"
                        value={
                          statistics?.mentors ||
                          0
                        }
                        total={
                          statistics?.totalUsers ||
                          0
                        }
                        icon="🧑‍🏫"
                      />

                      <RoleBar
                        label="Administrators"
                        value={
                          statistics?.admins ||
                          0
                        }
                        total={
                          statistics?.totalUsers ||
                          0
                        }
                        icon="🛡️"
                      />
                    </div>
                  </div>

                  {/* QUICK ACTIONS */}

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">
                      Administration
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Quickly access the areas you manage.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <QuickAction
                        icon="👥"
                        title="Manage Users"
                        description="Roles and account status"
                        onClick={() =>
                          switchTab(
                            "users",
                          )
                        }
                      />

                      <QuickAction
                        icon="📈"
                        title="Activity"
                        description="Monitor platform usage"
                        onClick={() =>
                          switchTab(
                            "activity",
                          )
                        }
                      />

                      <QuickAction
                        icon="⚙️"
                        title="Settings"
                        description="View security configuration"
                        onClick={() =>
                          switchTab(
                            "settings",
                          )
                        }
                      />

                      <QuickAction
                        icon="🧑‍🏫"
                        title="Mentor Portal"
                        description="Review candidate performance"
                        onClick={() =>
                          router.push(
                            "/mentor",
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* RECENT USERS */}

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Recent Users
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Latest accounts created on the platform.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        switchTab(
                          "users",
                        )
                      }
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      View All Users
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    {activity?.recentUsers &&
                    activity.recentUsers
                      .length > 0 ? (
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              User
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Role
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Status
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Joined
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {activity.recentUsers.map(
                            (item) => (
                              <tr
                                key={
                                  item._id
                                }
                                className="hover:bg-slate-50"
                              >
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-slate-900">
                                    {item.name}
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    {item.email}
                                  </p>
                                </td>

                                <td className="px-6 py-4">
                                  <RoleBadge
                                    role={
                                      item.role
                                    }
                                  />
                                </td>

                                <td className="px-6 py-4">
                                  <StatusBadge
                                    active={
                                      item.isActive !==
                                      false
                                    }
                                  />
                                </td>

                                <td className="px-6 py-4 text-sm text-slate-500">
                                  {formatDate(
                                    item.createdAt,
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <EmptyState
                        icon="👥"
                        title="No users yet"
                        description="New accounts will appear here."
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================
                USERS
            ================================================== */}

            {activeTab ===
              "users" && (
              <div className="space-y-6">

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        User Management
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Manage account status and platform roles.
                      </p>
                    </div>

                    <button
                      onClick={
                        loadUsers
                      }
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Refresh Users
                    </button>
                  </div>

                  <div className="mt-5">
                    <input
                      value={search}
                      onChange={(
                        event,
                      ) =>
                        setSearch(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Search by name, email, role, or candidate type..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {usersLoading ? (
                    <div className="p-12 text-center">
                      <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

                      <p className="font-semibold text-slate-800">
                        Loading users...
                      </p>
                    </div>
                  ) : filteredUsers.length ===
                    0 ? (
                    <EmptyState
                      icon="🔎"
                      title="No matching users"
                      description="Try a different search."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1100px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              User
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Candidate Type
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Role
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Verification
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Status
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Joined
                            </th>

                            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {filteredUsers.map(
                            (
                              item,
                            ) => {
                              const statusLoading =
                                actionLoading ===
                                `status-${item._id}`;

                              const roleLoading =
                                actionLoading ===
                                `role-${item._id}`;

                              return (
                                <tr
                                  key={
                                    item._id
                                  }
                                  className="hover:bg-slate-50"
                                >
                                  <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
                                        {item.name
                                          ?.charAt(
                                            0,
                                          )
                                          ?.toUpperCase() ||
                                          "U"}
                                      </div>

                                      <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-900">
                                          {
                                            item.name
                                          }
                                        </p>

                                        <p className="truncate text-xs text-slate-500">
                                          {
                                            item.email
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-6 py-5 text-sm text-slate-600">
                                    {formatCandidateType(
                                      item.candidateType,
                                    )}
                                  </td>

                                  <td className="px-6 py-5">
                                    <select
                                      value={
                                        item.role
                                      }
                                      disabled={
                                        roleLoading ||
                                        item._id ===
                                          user._id
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        changeUserRole(
                                          item,
                                          event
                                            .target
                                            .value as Role,
                                        )
                                      }
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    >
                                      <option value="student">
                                        Student
                                      </option>

                                      <option value="mentor">
                                        Mentor
                                      </option>

                                      <option value="admin">
                                        Administrator
                                      </option>
                                    </select>
                                  </td>

                                  <td className="px-6 py-5">
                                    {item.emailVerified ? (
                                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                        ✓ Verified
                                      </span>
                                    ) : (
                                      <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                                        Pending
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-6 py-5">
                                    <StatusBadge
                                      active={
                                        item.isActive !==
                                        false
                                      }
                                    />
                                  </td>

                                  <td className="px-6 py-5 text-sm text-slate-500">
                                    {formatDate(
                                      item.createdAt,
                                    )}
                                  </td>

                                  <td className="px-6 py-5 text-right">
                                    {item._id ===
                                    user._id ? (
                                      <span className="text-xs font-semibold text-slate-400">
                                        Current account
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          changeUserStatus(
                                            item,
                                          )
                                        }
                                        disabled={
                                          statusLoading
                                        }
                                        className={`rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                          item.isActive !==
                                          false
                                            ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                            : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                        }`}
                                      >
                                        {statusLoading
                                          ? "Updating..."
                                          : item.isActive !==
                                            false
                                          ? "Deactivate"
                                          : "Activate"}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================================================
                ACTIVITY
            ================================================== */}

            {activeTab ===
              "activity" && (
              <div className="space-y-6">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Platform Activity
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Monitor usage and recent activity across the platform.
                    </p>
                  </div>

                  <button
                    onClick={
                      loadActivity
                    }
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {activityLoading
                      ? "Refreshing..."
                      : "Refresh Activity"}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <AdminMetric
                    title="Registered Users"
                    value={
                      statistics?.totalUsers ||
                      0
                    }
                    icon="👥"
                  />

                  <AdminMetric
                    title="Active Accounts"
                    value={
                      statistics?.activeUsers ||
                      0
                    }
                    icon="🟢"
                  />

                  <AdminMetric
                    title="Completed Interviews"
                    value={
                      statistics?.completedInterviews ||
                      0
                    }
                    icon="🎤"
                  />

                  <AdminMetric
                    title="Arena Attempts"
                    value={
                      statistics?.totalChallengeAttempts ||
                      0
                    }
                    icon="🏆"
                  />
                </div>

                {/* RECENT INTERVIEWS */}

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-900">
                      Recent Interviews
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Latest interview activity across candidates.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    {activity?.recentInterviews &&
                    activity
                      .recentInterviews
                      .length > 0 ? (
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Candidate
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Domain
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Score
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Status
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Date
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {activity.recentInterviews.map(
                            (
                              interview,
                            ) => {
                              const score =
                                Number(
                                  interview.score,
                                ) || 0;

                              return (
                                <tr
                                  key={
                                    interview._id
                                  }
                                  className="hover:bg-slate-50"
                                >
                                  <td className="px-6 py-4">
                                    <p className="font-semibold text-slate-900">
                                      {interview
                                        .userId
                                        ?.name ||
                                        "Unknown"}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {interview
                                        .userId
                                        ?.email ||
                                        "—"}
                                    </p>
                                  </td>

                                  <td className="px-6 py-4 font-medium text-slate-700">
                                    {interview.domain ||
                                      "General"}
                                  </td>

                                  <td className="px-6 py-4">
                                    <span
                                      className={`font-bold ${getScoreClass(
                                        score,
                                      )}`}
                                    >
                                      {score}%
                                    </span>
                                  </td>

                                  <td className="px-6 py-4">
                                    {interview.isComplete ? (
                                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                        Completed
                                      </span>
                                    ) : (
                                      <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                                        In Progress
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-6 py-4 text-sm text-slate-500">
                                    {formatDateTime(
                                      interview.completedAt ||
                                        interview.createdAt,
                                    )}
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <EmptyState
                        icon="🎤"
                        title="No interview activity"
                        description="Interview sessions will appear here."
                      />
                    )}
                  </div>
                </div>

                {/* RECENT USERS */}

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-900">
                      Recent Registrations
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Latest users joining the platform.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    {activity?.recentUsers &&
                    activity.recentUsers
                      .length > 0 ? (
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              User
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Role
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Status
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Last Login
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Joined
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {activity.recentUsers.map(
                            (
                              item,
                            ) => (
                              <tr
                                key={
                                  item._id
                                }
                                className="hover:bg-slate-50"
                              >
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-slate-900">
                                    {item.name}
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    {item.email}
                                  </p>
                                </td>

                                <td className="px-6 py-4">
                                  <RoleBadge
                                    role={
                                      item.role
                                    }
                                  />
                                </td>

                                <td className="px-6 py-4">
                                  <StatusBadge
                                    active={
                                      item.isActive !==
                                      false
                                    }
                                  />
                                </td>

                                <td className="px-6 py-4 text-sm text-slate-500">
                                  {formatDateTime(
                                    item.lastLoginAt,
                                  )}
                                </td>

                                <td className="px-6 py-4 text-sm text-slate-500">
                                  {formatDate(
                                    item.createdAt,
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <EmptyState
                        icon="👥"
                        title="No recent registrations"
                        description="New users will appear here."
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================
                SETTINGS
            ================================================== */}

            {activeTab ===
              "settings" && (
              <div className="space-y-6">

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        System Settings
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Current security and platform configuration.
                      </p>
                    </div>

                    <button
                      onClick={
                        loadSettings
                      }
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {settingsLoading
                        ? "Refreshing..."
                        : "Refresh Settings"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <SettingCard
                    title="Registration"
                    description="Whether new candidates can create accounts."
                    value={
                      settings?.registrationEnabled
                    }
                  />

                  <SettingCard
                    title="Email Verification"
                    description="Whether newly registered users must verify their email."
                    value={
                      settings?.emailVerificationRequired
                    }
                  />

                  <SettingValueCard
                    title="Maximum Login Attempts"
                    description="Failed attempts before account lockout."
                    value={
                      settings?.maxLoginAttempts ??
                      "—"
                    }
                  />

                  <SettingValueCard
                    title="Account Lockout"
                    description="Duration of the login lockout period."
                    value={
                      settings?.accountLockoutMinutes !==
                      undefined
                        ? `${settings.accountLockoutMinutes} minutes`
                        : "—"
                    }
                  />

                  <SettingValueCard
                    title="Password Expiry"
                    description="Password update policy."
                    value={
                      settings?.passwordExpiryDays !==
                      undefined
                        ? `${settings.passwordExpiryDays} days`
                        : "—"
                    }
                  />

                  <SettingValueCard
                    title="Session Duration"
                    description="Maximum lifetime of an authenticated session."
                    value={
                      settings?.sessionDurationHours !==
                      undefined
                        ? `${settings.sessionDurationHours} hours`
                        : "—"
                    }
                  />
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">
                      🛡️
                    </div>

                    <div>
                      <h3 className="font-bold text-blue-900">
                        Enterprise Security Controls
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-blue-800">
                        Authentication policies are enforced by the backend.
                        Password hashing, email verification, account
                        lockouts, session management, login tracking, and
                        security alerts are handled server-side.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">
                    Supported Roles
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Roles currently supported by the RBAC system.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {(
                      settings?.supportedRoles ||
                      [
                        "student",
                        "mentor",
                        "admin",
                      ]
                    ).map(
                      (role) => (
                        <RoleBadge
                          key={role}
                          role={
                            role as Role
                          }
                        />
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">
                      ⚠️
                    </div>

                    <div>
                      <h3 className="font-bold text-yellow-900">
                        Configuration Notice
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-yellow-800">
                        These values are currently displayed from the server
                        configuration. The next RBAC step will make the
                        system settings persistent and editable by
                        administrators.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/* ======================================================
   COMPONENTS
====================================================== */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function AdminMetric({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description?: string;
  icon?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
            {icon}
          </div>
        )}
      </div>

      {description && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function RoleBar({
  label,
  value,
  total,
  icon,
}: {
  label: string;
  value: number;
  total: number;
  icon: string;
}) {
  const percentage =
    total > 0
      ? Math.round(
          (value / total) * 100,
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{icon}</span>

          <span className="text-sm font-semibold text-slate-700">
            {label}
          </span>
        </div>

        <span className="text-sm font-bold text-slate-900">
          {value}{" "}
          <span className="font-normal text-slate-400">
            ({percentage}%)
          </span>
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="text-2xl">
        {icon}
      </div>

      <p className="mt-3 font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </button>
  );
}

function RoleBadge({
  role,
}: {
  role: Role;
}) {
  const styles: Record<
    Role,
    string
  > = {
    student:
      "bg-blue-50 text-blue-700",
    mentor:
      "bg-purple-50 text-purple-700",
    admin:
      "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[role] ||
        "bg-slate-100 text-slate-700"
      }`}
    >
      {role === "admin"
        ? "Administrator"
        : role === "mentor"
        ? "Mentor"
        : "Student"}
    </span>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return active ? (
    <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
      ● Active
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
      ● Inactive
    </span>
  );
}

function SettingCard({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h3 className="font-bold text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            value
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {value
            ? "Enabled"
            : "Disabled"}
        </span>
      </div>
    </div>
  );
}

function SettingValueCard({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
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
    <div className="p-12 text-center">
      <div className="mb-3 text-5xl">
        {icon}
      </div>

      <p className="font-bold text-slate-800">
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}