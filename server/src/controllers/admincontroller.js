const User = require("../models/User.js");
const Interview = require("../models/Interview.js");
const ChallengeAttempt = require("../models/ChallengeAttempt.js");

const getUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select(
        "_id name email role candidateType isActive emailVerified createdAt lastLoginAt lastLoginIP",
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    if (req.userId === userId && !isActive) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own admin account",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = isActive;

    if (!isActive) {
      user.deactivatedAt = new Date();

      if (Array.isArray(user.sessions)) {
        user.sessions.forEach((session) => {
          session.revoked = true;
          session.revokedAt = new Date();
        });
      }
    } else {
      user.deactivatedAt = null;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: isActive
        ? "User activated successfully"
        : "User deactivated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const allowedRoles = ["student", "mentor", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    if (req.userId === userId && role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin role",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = role;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  }
};

const getPlatformActivity = async (req, res) => {
  try {
    const [
      totalUsers,
      students,
      mentors,
      admins,
      activeUsers,
      totalInterviews,
      completedInterviews,
      totalChallengeAttempts,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "mentor" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ isActive: true }),
      Interview.countDocuments({}),
      Interview.countDocuments({ isComplete: true }),
      ChallengeAttempt.countDocuments({}),
    ]);

    const recentUsers = await User.find({})
      .select("_id name email role createdAt lastLoginAt")
      .sort({ createdAt: -1 })
      .limit(10);

    const recentInterviews = await Interview.find({})
      .select(
        "_id userId domain score isComplete createdAt completedAt",
      )
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      statistics: {
        totalUsers,
        students,
        mentors,
        admins,
        activeUsers,
        totalInterviews,
        completedInterviews,
        totalChallengeAttempts,
      },
      recentUsers,
      recentInterviews,
    });
  } catch (error) {
    console.error("Platform activity error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch platform activity",
    });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      settings: {
        registrationEnabled: true,
        emailVerificationRequired: true,
        maxLoginAttempts: 5,
        accountLockoutMinutes: 15,
        passwordExpiryDays: 90,
        sessionDurationHours: 24,
        supportedRoles: ["student", "mentor", "admin"],
      },
    });
  } catch (error) {
    console.error("System settings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch system settings",
    });
  }
};

module.exports = {
  getUsers,
  updateUserStatus,
  updateUserRole,
  getPlatformActivity,
  getSystemSettings,
};