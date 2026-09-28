const User = require("../models/User.js");
const Interview = require("../models/Interview.js");

// ============================================================
// GET STUDENTS
// Mentor can see students on the platform
// ============================================================

const getStudents = async (req, res) => {
  try {
    const students = await User.find({
      role: "student",
      isActive: true,
    })
      .select(
        "_id name email candidateType createdAt interviewPerformance placementReadiness"
      )
      .sort({ createdAt: -1 })
      .lean();

    const formattedStudents = students.map((student) => ({
      id: student._id,
      name: student.name,
      email: student.email,
      candidateType: student.candidateType || "fresher",
      joinedAt: student.createdAt,

      interviewPerformance: student.interviewPerformance || {
        totalInterviews: 0,
        averageScore: 0,
        bestScore: 0,
      },

      placementReadiness: student.placementReadiness || null,
    }));

    return res.status(200).json({
      success: true,
      count: formattedStudents.length,
      students: formattedStudents,
    });
  } catch (error) {
    console.error("Get students error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
};

// ============================================================
// GET STUDENT PERFORMANCE
// ============================================================

const getStudentPerformance = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findOne({
      _id: studentId,
      role: "student",
    })
      .select(
        "_id name email candidateType createdAt interviewPerformance placementReadiness skills resumeAnalysis"
      )
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const interviews = await Interview.find({
      userId: studentId,
      isComplete: true,
    })
      .select(
        "_id domain score duration questionsAnswered questionsSkipped createdAt completedAt currentDifficulty startingDifficulty difficultyHistory progress"
      )
      .sort({ completedAt: -1 })
      .lean();

    const averageScore =
      interviews.length > 0
        ? Math.round(
            interviews.reduce(
              (sum, interview) => sum + (interview.score || 0),
              0
            ) / interviews.length
          )
        : 0;

    const bestScore =
      interviews.length > 0
        ? Math.max(...interviews.map((interview) => interview.score || 0))
        : 0;

    const weakInterviews = interviews.filter(
      (interview) => (interview.score || 0) < 60
    ).length;

    const strongInterviews = interviews.filter(
      (interview) => (interview.score || 0) >= 80
    ).length;

    return res.status(200).json({
      success: true,

      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        candidateType: student.candidateType || "fresher",
        createdAt: student.createdAt,
      },

      summary: {
        totalInterviews: interviews.length,
        averageScore,
        bestScore,
        weakInterviews,
        strongInterviews,
      },

      interviewPerformance: student.interviewPerformance || null,

      placementReadiness: student.placementReadiness || null,

      skills: student.skills || [],

      resumeAnalysis: student.resumeAnalysis || null,

      interviews: interviews.map((interview) => ({
        id: interview._id,
        domain: interview.domain,
        score: interview.score,
        duration: interview.duration,
        questionsAnswered: interview.questionsAnswered,
        questionsSkipped: interview.questionsSkipped,
        startingDifficulty: interview.startingDifficulty,
        endingDifficulty: interview.currentDifficulty,
        difficultyHistory: interview.difficultyHistory || [],
        progress: interview.progress || [],
        createdAt: interview.createdAt,
        completedAt: interview.completedAt,
      })),
    });
  } catch (error) {
    console.error("Get student performance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student performance",
    });
  }
};

// ============================================================
// CREATE MENTOR FEEDBACK
// ============================================================

const createStudentFeedback = async (req, res) => {
  try {
    const { studentId } = req.params;

    const {
      feedback,
      strengths = [],
      improvements = [],
      rating,
    } = req.body;

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({
        success: false,
        message: "Feedback is required",
      });
    }

    const student = await User.findOne({
      _id: studentId,
      role: "student",
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // --------------------------------------------------------
    // Store mentor feedback on the student document.
    //
    // This is intentionally defensive because older User
    // schemas may not have mentorFeedback yet.
    // --------------------------------------------------------

    if (!Array.isArray(student.mentorFeedback)) {
      student.mentorFeedback = [];
    }

    const feedbackEntry = {
      mentorId: req.userId,
      feedback: feedback.trim(),
      strengths: Array.isArray(strengths) ? strengths : [],
      improvements: Array.isArray(improvements) ? improvements : [],
      rating:
        rating !== undefined && rating !== null
          ? Math.max(1, Math.min(5, Number(rating)))
          : null,
      createdAt: new Date(),
    };

    student.mentorFeedback.push(feedbackEntry);

    await student.save();

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: feedbackEntry,
    });
  } catch (error) {
    console.error("Create student feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
    });
  }
};

// ============================================================
// GET STUDENT FEEDBACK
// ============================================================

const getStudentFeedback = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findOne({
      _id: studentId,
      role: "student",
    })
      .select("_id name mentorFeedback")
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
      },
      feedback: student.mentorFeedback || [],
    });
  } catch (error) {
    console.error("Get student feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student feedback",
    });
  }
};

module.exports = {
  getStudents,
  getStudentPerformance,
  createStudentFeedback,
  getStudentFeedback,
};