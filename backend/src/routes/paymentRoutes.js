const express = require("express");

const {
  initializePayment,
  verifyPayment,
  getPayments,
  handlePaystackWebhook,
} = require("../controllers/paymentController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();


// ============================================================
// PAYSTACK WEBHOOK
// ============================================================
//
// This route MUST remain outside protect middleware because
// Paystack does not have our user's JWT.
//
router.post(
  "/webhook",
  handlePaystackWebhook
);


// ============================================================
// PROTECTED PAYMENT ROUTES
// ============================================================

router.use(protect);


// Get current user's payments.
router.get(
  "/",
  getPayments
);


// Initialize a payment.
router.post(
  "/initialize",
  initializePayment
);


// Verify a payment.
router.get(
  "/verify/:reference",
  verifyPayment
);


module.exports = router;