const express = require("express");

const {
  getAdminStats,
  getAllUsers,
  getAllProjects,
  getAllInvoices,
  getAllPayments,
} = require("../controllers/adminController");

const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.use(protect);
router.use(admin);

router.get("/stats", getAdminStats);
router.get("/users", getAllUsers);
router.get("/projects", getAllProjects);
router.get("/invoices", getAllInvoices);
router.get("/payments", getAllPayments);

module.exports = router;