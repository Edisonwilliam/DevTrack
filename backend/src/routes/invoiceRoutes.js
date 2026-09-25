const express = require("express");

const {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
} = require("../controllers/invoiceController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createInvoice);

router.get("/", getInvoices);

router.get("/:id", getInvoice);

router.put("/:id", updateInvoice);

router.delete("/:id", deleteInvoice);

module.exports = router;