const User = require("../models/User");
const Project = require("../models/Project");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");


// ============================================================
// ADMIN STATS
// ============================================================

const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProjects,
      totalInvoices,
      totalPayments,
      successfulPayments,
      pendingPayments,
    ] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      Invoice.countDocuments(),
      Payment.countDocuments(),
      Payment.countDocuments({
        status: "success",
      }),
      Payment.countDocuments({
        status: "pending",
      }),
    ]);

    // Payment.amount is stored in KOBO.
    const revenueStats = await Payment.aggregate([
      {
        $match: {
          status: "success",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenueKobo: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const totalRevenue =
      revenueStats.length > 0
        ? revenueStats[0].totalRevenueKobo / 100
        : 0;

    res.status(200).json({
      totalUsers,
      totalProjects,
      totalInvoices,
      totalPayments,
      successfulPayments,
      pendingPayments,

      // Revenue returned to frontend in NAIRA.
      totalRevenue,
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// ============================================================
// ALL USERS
// ============================================================

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.error("Get all users error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// ============================================================
// ALL PROJECTS
// ============================================================

const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("user", "name email")
      .populate("client", "name email company")
      .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    console.error("Get all projects error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// ============================================================
// ALL INVOICES
// ============================================================

const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("user", "name email")
      .populate("client", "name email company")
      .populate("project", "name status")
      .sort({ createdAt: -1 });

    res.status(200).json(invoices);
  } catch (error) {
    console.error("Get all invoices error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// ============================================================
// ALL PAYMENTS
// ============================================================

const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("user", "name email")
      .populate({
        path: "invoice",
        select: "invoiceNumber total status dueDate",
        populate: {
          path: "client",
          select: "name email company",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
  } catch (error) {
    console.error("Get all payments error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


module.exports = {
  getAdminStats,
  getAllUsers,
  getAllProjects,
  getAllInvoices,
  getAllPayments,
};