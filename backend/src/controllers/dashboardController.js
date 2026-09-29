const mongoose = require("mongoose");

const Client = require("../models/Client");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Validate user ID before creating ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // =========================
    // CLIENT STATS
    // =========================

    const totalClients = await Client.countDocuments({
      user: userId,
    });

    // Active clients = clients that have at least one project
    const activeClientStats = await Project.aggregate([
      {
        $match: {
          user: userObjectId,
        },
      },
      {
        $group: {
          _id: "$client",
        },
      },
      {
        $count: "count",
      },
    ]);

    const activeClients =
      activeClientStats.length > 0 ? activeClientStats[0].count : 0;

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
    // INVOICE STATS
    // =========================

    const totalInvoices = await Invoice.countDocuments({
      user: userId,
    });

    const paidInvoices = await Invoice.countDocuments({
      user: userId,
      status: "paid",
    });

    const unpaidInvoices = await Invoice.countDocuments({
      user: userId,
      status: {
        $in: ["sent", "overdue"],
      },
    });

    // =========================
    // INVOICE VALUE STATS
    // =========================

    const invoiceValueStats = await Invoice.aggregate([
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
              $ifNull: ["$total", 0],
            },
          },

          paid: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "paid"],
                },
                {
                  $ifNull: ["$total", 0],
                },
                0,
              ],
            },
          },

          outstanding: {
            $sum: {
              $cond: [
                {
                  $in: ["$status", ["sent", "overdue"]],
                },
                {
                  $ifNull: ["$total", 0],
                },
                0,
              ],
            },
          },
        },
      },
    ]);

    const totalInvoiceValue =
      invoiceValueStats.length > 0 ? invoiceValueStats[0].total : 0;

    const paidInvoiceValue =
      invoiceValueStats.length > 0 ? invoiceValueStats[0].paid : 0;

    const outstandingInvoiceValue =
      invoiceValueStats.length > 0
        ? invoiceValueStats[0].outstanding
        : 0;

    // =========================
    // PAYMENT STATS
    // =========================

    const paymentStats = await Payment.aggregate([
      {
        $match: {
          user: userObjectId,
          status: "success",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },
    ]);

    // Payment amounts are stored in kobo.
    // Convert to naira before sending to frontend.
    const totalRevenue =
      paymentStats.length > 0 ? paymentStats[0].total / 100 : 0;

    // =========================
    // PAYMENT STATUS BREAKDOWN
    // =========================

    const paymentStatusStats = await Payment.aggregate([
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
          amount: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    const formattedPaymentStatusStats = paymentStatusStats.map(
      (payment) => ({
        _id: payment._id,
        count: payment.count,
        amount: payment.amount / 100,
      })
    );

    // =========================
    // INVOICE STATUS BREAKDOWN
    // =========================

    const invoiceStatusStats = await Invoice.aggregate([
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
          amount: {
            $sum: {
              $ifNull: ["$total", 0],
            },
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

    return res.status(200).json({
      clients: totalClients,
      activeClients,

      projects: totalProjects,
      activeProjects,
      completedProjects,

      tasks: totalTasks,
      completedTasks,
      pendingTasks,

      totalProjectValue,

      invoices: totalInvoices,
      paidInvoices,
      unpaidInvoices,

      totalInvoiceValue,
      paidInvoiceValue,
      outstandingInvoiceValue,

      totalRevenue,

      projectStatusStats,
      invoiceStatusStats,
      paymentStatusStats: formattedPaymentStatusStats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getDashboardStats,
};
