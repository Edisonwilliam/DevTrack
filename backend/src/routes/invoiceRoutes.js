const express = require("express");

const {
  createInvoice,
  getInvoices,
  getInvoice,
  getPublicInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  sendReminder,
} = require("../controllers/invoiceController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// PUBLIC INVOICE ROUTE
router.get("/public/:token", getPublicInvoice);

// PROTECTED INVOICE ROUTES
router.use(protect);

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoice);

router.put("/:id", updateInvoice);

router.patch("/:id/send", sendInvoice);
router.patch("/:id/remind", sendReminder);

router.delete("/:id", deleteInvoice);

module.exports = router;