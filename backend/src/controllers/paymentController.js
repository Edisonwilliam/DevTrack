const crypto = require("crypto");

const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");

const {
  initializeTransaction,
  verifyTransaction,
} = require("../services/paystackService");

// ============================================================
// HELPERS
// ============================================================

const getInvoiceAmountInKobo = (invoice) => {
  if (!invoice) return 0;

  if (!Number.isFinite(invoice.total) || invoice.total <= 0) {
    return 0;
  }

  return Math.round(invoice.total * 100);
};

const generatePaymentReference = (invoiceId) => {
  return `DEVTRACK-${invoiceId}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
};

// ============================================================
// INITIALIZE AUTHENTICATED PAYMENT
// ============================================================

const initializePayment = async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        message: "Invoice ID is required",
      });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      user: req.user.userId,
    }).populate("client", "name email");

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.status === "paid") {
      return res.status(400).json({
        message: "This invoice has already been paid",
      });
    }

    if (invoice.status === "cancelled") {
      return res.status(400).json({
        message: "This invoice has been cancelled",
      });
    }

    if (!invoice.client) {
      return res.status(400).json({
        message: "Invoice client not found",
      });
    }

    if (!invoice.client.email) {
      return res.status(400).json({
        message: "Client email is required for payment",
      });
    }

    const amountInKobo = getInvoiceAmountInKobo(invoice);

    if (!amountInKobo) {
      return res.status(400).json({
        message: "Invoice total must be greater than zero",
      });
    }

    let payment = await Payment.findOne({
      invoice: invoice._id,
      user: req.user.userId,
      status: "pending",
    });

    if (!payment) {
      payment = await Payment.create({
        invoice: invoice._id,
        user: req.user.userId,
        reference: generatePaymentReference(invoice._id),
        amount: amountInKobo,
        currency: "NGN",
        status: "pending",
      });
    } else {
      payment.reference = generatePaymentReference(invoice._id);
      payment.amount = amountInKobo;
      payment.currency = "NGN";

      await payment.save();
    }

    try {
      const callbackUrl = `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/payment/callback`;

      const transaction = await initializeTransaction({
        email: invoice.client.email,
        amount: amountInKobo,
        reference: payment.reference,
        callbackUrl,
        metadata: {
          invoiceId: invoice._id.toString(),
          paymentId: payment._id.toString(),
          userId: req.user.userId.toString(),
        },
      });

      return res.status(200).json({
        message: "Payment initialized successfully",
        checkoutUrl: transaction.checkoutUrl,
        accessCode: transaction.accessCode,
        reference: transaction.reference || payment.reference,
        paymentId: payment._id,
        amount: amountInKobo,
        currency: "NGN",
      });
    } catch (error) {
      console.error(
        "Paystack initialization error:",
        error.response?.data || error.message
      );

      return res.status(500).json({
        message: "Unable to initialize payment",
      });
    }
  } catch (error) {
    console.error("Initialize payment error:", error);

    return res.status(500).json({
      message: "Server error while initializing payment",
    });
  }
};

// ============================================================
// INITIALIZE PUBLIC INVOICE PAYMENT
// ============================================================

const initializePublicPayment = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Invoice token is required",
      });
    }

    const invoice = await Invoice.findOne({
      publicToken: token,
    }).populate("client", "name email");

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.status === "paid") {
      return res.status(400).json({
        message: "This invoice has already been paid",
      });
    }

    if (invoice.status === "cancelled") {
      return res.status(400).json({
        message: "This invoice has been cancelled",
      });
    }

    if (!invoice.client) {
      return res.status(400).json({
        message: "Invoice client not found",
      });
    }

    if (!invoice.client.email) {
      return res.status(400).json({
        message: "This invoice does not have a client email address",
      });
    }

    const amountInKobo = getInvoiceAmountInKobo(invoice);

    if (!amountInKobo) {
      return res.status(400).json({
        message: "Invoice total must be greater than zero",
      });
    }

    if (!invoice.user) {
      return res.status(400).json({
        message: "Invoice owner not found",
      });
    }

    // ========================================================
    // FIND EXISTING PENDING PAYMENT
    // ========================================================

    let payment = await Payment.findOne({
      invoice: invoice._id,
      user: invoice.user,
      status: "pending",
    });

    // ========================================================
    // CREATE OR REFRESH PAYMENT
    // ========================================================

    if (!payment) {
      payment = await Payment.create({
        invoice: invoice._id,
        user: invoice.user,
        reference: generatePaymentReference(invoice._id),
        amount: amountInKobo,
        currency: "NGN",
        status: "pending",
      });
    } else {
      /*
       * Paystack references can only be used once.
       *
       * The old reference may already exist on Paystack,
       * even though our database payment is still pending.
       *
       * Therefore generate a completely new reference.
       */
      payment.reference = generatePaymentReference(invoice._id);
      payment.amount = amountInKobo;
      payment.currency = "NGN";

      await payment.save();
    }

    // ========================================================
    // INITIALIZE PAYSTACK
    // ========================================================

    try {
      const callbackUrl = `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/payment/callback`;

      const transaction = await initializeTransaction({
        email: invoice.client.email,
        amount: amountInKobo,
        reference: payment.reference,
        callbackUrl,
        metadata: {
          invoiceId: invoice._id.toString(),
          paymentId: payment._id.toString(),
          userId: invoice.user.toString(),
          publicPayment: true,
        },
      });

      return res.status(200).json({
        message: "Payment initialized successfully",
        checkoutUrl: transaction.checkoutUrl,
        accessCode: transaction.accessCode,
        reference: transaction.reference || payment.reference,
        paymentId: payment._id,
        amount: amountInKobo,
        currency: "NGN",
      });
    } catch (error) {
      console.error(
        "Public Paystack initialization error:",
        error.response?.data || error.message
      );

      return res.status(500).json({
        message: "Unable to initialize payment",
      });
    }
  } catch (error) {
    console.error("Initialize public payment error:", error);

    return res.status(500).json({
      message: "Server error while initializing public payment",
    });
  }
};

// ============================================================
// VERIFY AUTHENTICATED PAYMENT
// ============================================================

const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        message: "Payment reference is required",
      });
    }

    const payment = await Payment.findOne({
      reference,
      user: req.user.userId,
    }).populate("invoice");

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    if (payment.status === "success") {
      return res.status(200).json({
        message: "Payment already verified",
        status: "success",
        payment,
        invoice: payment.invoice,
      });
    }

    const invoice = payment.invoice;

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice associated with payment not found",
      });
    }

    if (invoice.status === "paid") {
      payment.status = "success";
      payment.paidAt = payment.paidAt || new Date();

      await payment.save();

      return res.status(200).json({
        message: "Invoice is already marked as paid",
        status: "success",
        payment,
        invoice,
      });
    }

    const invoiceAmount = getInvoiceAmountInKobo(invoice);

    if (payment.amount !== invoiceAmount) {
      return res.status(400).json({
        message: "Payment amount does not match invoice amount",
      });
    }

    const transaction = await verifyTransaction(reference);

    if (!transaction || transaction.status !== "success") {
      return res.status(400).json({
        message: "Payment has not been completed",
        status: transaction?.status || "unknown",
      });
    }

    if (Number(transaction.amount) !== payment.amount) {
      return res.status(400).json({
        message: "Verified payment amount does not match invoice amount",
      });
    }

    if (
      transaction.currency &&
      transaction.currency.toUpperCase() !== payment.currency
    ) {
      return res.status(400).json({
        message: "Payment currency does not match",
      });
    }

    payment.status = "success";
    payment.paidAt = new Date();

    await payment.save();

    invoice.status = "paid";

    await invoice.save();

    return res.status(200).json({
      message: "Payment verified successfully",
      status: "success",
      payment,
      invoice,
    });
  } catch (error) {
    console.error("Verify payment error:", error);

    return res.status(500).json({
      message: "Server error while verifying payment",
    });
  }
};

// ============================================================
// VERIFY PUBLIC INVOICE PAYMENT
// ============================================================

const verifyPublicPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        message: "Payment reference is required",
      });
    }

    const payment = await Payment.findOne({
      reference,
    }).populate("invoice");

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    const invoice = payment.invoice;

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice associated with payment not found",
      });
    }

    if (!invoice.publicToken) {
      return res.status(400).json({
        message: "This payment is not a public invoice payment",
      });
    }

    if (payment.status === "success") {
      return res.status(200).json({
        message: "Payment already verified",
        status: "success",
        payment,
        invoice,
      });
    }

    if (invoice.status === "paid") {
      payment.status = "success";
      payment.paidAt = payment.paidAt || new Date();

      await payment.save();

      return res.status(200).json({
        message: "Invoice is already marked as paid",
        status: "success",
        payment,
        invoice,
      });
    }

    const invoiceAmount = getInvoiceAmountInKobo(invoice);

    if (!invoiceAmount) {
      return res.status(400).json({
        message: "Invoice total must be greater than zero",
      });
    }

    if (payment.amount !== invoiceAmount) {
      return res.status(400).json({
        message: "Payment amount does not match invoice amount",
      });
    }

    const transaction = await verifyTransaction(reference);

    if (!transaction || transaction.status !== "success") {
      return res.status(400).json({
        message: "Payment has not been completed",
        status: transaction?.status || "unknown",
      });
    }

    if (Number(transaction.amount) !== payment.amount) {
      return res.status(400).json({
        message: "Verified payment amount does not match invoice amount",
      });
    }

    if (
      transaction.currency &&
      transaction.currency.toUpperCase() !== payment.currency
    ) {
      return res.status(400).json({
        message: "Payment currency does not match",
      });
    }

    payment.status = "success";
    payment.paidAt = new Date();

    await payment.save();

    invoice.status = "paid";

    await invoice.save();

    return res.status(200).json({
      message: "Payment verified successfully",
      status: "success",
      payment,
      invoice,
    });
  } catch (error) {
    console.error("Verify public payment error:", error);

    return res.status(500).json({
      message: "Server error while verifying public payment",
    });
  }
};

// ============================================================
// GET CURRENT USER PAYMENTS
// ============================================================

const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      user: req.user.userId,
    })
      .populate({
        path: "invoice",
        select:
          "invoiceNumber client project total status issueDate dueDate",
        populate: [
          {
            path: "client",
            select: "name email company",
          },
          {
            path: "project",
            select: "name status",
          },
        ],
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(payments);
  } catch (error) {
    console.error("Get payments error:", error);

    return res.status(500).json({
      message: "Server error while fetching payments",
    });
  }
};

// ============================================================
// PAYSTACK WEBHOOK
// ============================================================

const handlePaystackWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];

    if (!signature) {
      return res.status(401).json({
        message: "Missing Paystack signature",
      });
    }

    if (!req.rawBody) {
      console.error("Webhook raw body is unavailable");

      return res.status(400).json({
        message: "Webhook raw body is required",
      });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY is not configured");

      return res.status(500).json({
        message: "Payment configuration error",
      });
    }

    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(req.rawBody)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "utf8");
    const hashBuffer = Buffer.from(hash, "utf8");

    if (
      signatureBuffer.length !== hashBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, hashBuffer)
    ) {
      return res.status(401).json({
        message: "Invalid Paystack signature",
      });
    }

    const event = req.body;

    if (event?.event !== "charge.success") {
      return res.status(200).json({
        received: true,
      });
    }

    const transaction = event.data;

    if (!transaction?.reference) {
      return res.status(200).json({
        received: true,
      });
    }

    const payment = await Payment.findOne({
      reference: transaction.reference,
    }).populate("invoice");

    if (!payment) {
      console.error(
        `Payment not found for reference: ${transaction.reference}`
      );

      return res.status(200).json({
        received: true,
      });
    }

    if (payment.status === "success") {
      return res.status(200).json({
        received: true,
      });
    }

    const invoice = payment.invoice;

    if (!invoice) {
      console.error(
        `Invoice not found for payment: ${payment.reference}`
      );

      return res.status(200).json({
        received: true,
      });
    }

    if (invoice.status === "paid") {
      payment.status = "success";
      payment.paidAt = payment.paidAt || new Date();

      await payment.save();

      return res.status(200).json({
        received: true,
      });
    }

    const invoiceAmount = getInvoiceAmountInKobo(invoice);

    if (payment.amount !== invoiceAmount) {
      console.error(
        `Amount mismatch for payment ${payment.reference}`
      );

      return res.status(200).json({
        received: true,
      });
    }

    if (Number(transaction.amount) !== payment.amount) {
      console.error(
        `Paystack amount mismatch for payment ${payment.reference}`
      );

      return res.status(200).json({
        received: true,
      });
    }

    if (
      transaction.currency &&
      transaction.currency.toUpperCase() !== payment.currency
    ) {
      console.error(
        `Currency mismatch for payment ${payment.reference}`
      );

      return res.status(200).json({
        received: true,
      });
    }

    payment.status = "success";
    payment.paidAt = new Date();

    await payment.save();

    invoice.status = "paid";

    await invoice.save();

    console.log(
      `Payment ${payment.reference} successfully verified via webhook`
    );

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error("Paystack webhook error:", error);

    return res.status(200).json({
      received: true,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  initializePayment,
  initializePublicPayment,
  verifyPayment,
  verifyPublicPayment,
  getPayments,
  handlePaystackWebhook,
};