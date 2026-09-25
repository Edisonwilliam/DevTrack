const express = require("express");

const { getDashboardStats } = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Protect all dashboard routes
router.use(protect);

// GET /api/dashboard
router.get("/", getDashboardStats);

module.exports = router;
