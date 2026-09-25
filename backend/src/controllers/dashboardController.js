const mongoose = require("mongoose");

const Client = require("../models/Client");
const Project = require("../models/Project");
const Task = require("../models/Task");

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Convert user ID to ObjectId for MongoDB aggregation
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // =========================
    // CLIENT STATS
    // =========================

    const totalClients = await Client.countDocuments({
      user: userId,
    });

    // =========================
    // PROJECT STATS
    // =========================

    const totalProjects = await Project.countDocuments({
      user: userId,
    });

    const activeProjects = await Project.countDocuments({
      user: userId,
      status: "in-progress",
    });

    const completedProjects = await Project.countDocuments({
      user: userId,
      status: "completed",
    });

    // =========================
    // TASK STATS
    // =========================

    const totalTasks = await Task.countDocuments({
      user: userId,
    });

    const completedTasks = await Task.countDocuments({
      user: userId,
      status: "completed",
    });

    const pendingTasks = await Task.countDocuments({
      user: userId,
      status: {
        $ne: "completed",
      },
    });

    // =========================
    // TOTAL PROJECT VALUE
    // =========================

    const projectValue = await Project.aggregate([
      {
        $match: {
          user: userObjectId,
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $ifNull: ["$budget", 0],
            },
          },
        },
      },
    ]);

    const totalProjectValue =
      projectValue.length > 0 ? projectValue[0].total : 0;

    // =========================
    // PROJECT STATUS BREAKDOWN
    // =========================

    const projectStatusStats = await Project.aggregate([
      {
        $match: {
          user: userObjectId,
        },
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    // =========================
    // RESPONSE
    // =========================

    res.status(200).json({
      clients: totalClients,
      projects: totalProjects,
      activeProjects,
      completedProjects,
      tasks: totalTasks,
      completedTasks,
      pendingTasks,
      totalProjectValue,
      projectStatusStats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getDashboardStats,
};