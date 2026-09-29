const express = require("express");

const {
  initializePayment,
  initializePublicPayment,
  verifyPayment,
  verifyPublicPayment,
  getPayments,
  handlePaystackWebhook,
} = require("../controllers/paymentController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Paystack webhook
router.post("/webhook", handlePaystackWebhook);

// Public invoice payment routes
router.post("/public/initialize", initializePublicPayment);
router.get("/public/verify/:reference", verifyPublicPayment);

// Everything below this point requires authentication
router.use(protect);

router.get("/", getPayments);
router.post("/initialize", initializePayment);
router.get("/verify/:reference", verifyPayment);

module.exports = router;