const crypto = require("crypto");

const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");

const {
  initializeTransaction,
  verifyTransaction,
} = require("../services/paystackService");


// ============================================================
// HELPER: GET EXPECTED PAYMENT AMOUNT
// ============================================================
//
// Invoice.total is stored in NAIRA.
//
// Payment.amount and Paystack amount are stored in KOBO.
//
// Example:
// Invoice total = ₦50,000
// Expected payment = 5,000,000 kobo
//

const getInvoiceAmountInKobo = (invoice) => {
  if (!invoice) {
    return 0;
  }

  if (
    !Number.isFinite(invoice.total) ||
    invoice.total <= 0
  ) {
    return 0;
  }

  return Math.round(invoice.total * 100);
};


// ============================================================
// INITIALIZE PAYMENT
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

    // Already paid invoices cannot be paid again.
    if (invoice.status === "paid") {
      return res.status(400).json({
        message: "This invoice has already been paid",
      });
    }

    // Cancelled invoices cannot be paid.
    if (invoice.status === "cancelled") {
      return res.status(400).json({
        message: "Cancelled invoices cannot be paid",
      });
    }

    // Invoice must have a client.
    if (!invoice.client) {
      return res.status(400).json({
        message: "This invoice does not have a client",
      });
    }

    // Paystack requires an email.
    if (!invoice.client.email) {
      return res.status(400).json({
        message:
          "The invoice client does not have an email address",
      });
    }

    // Validate invoice total.
    if (
      !Number.isFinite(invoice.total) ||
      invoice.total <= 0
    ) {
      return res.status(400).json({
        message:
          "Invoice total must be greater than zero",
      });
    }

    // Convert invoice amount from NAIRA to KOBO.
    const amountInKobo =
      getInvoiceAmountInKobo(invoice);

    if (amountInKobo <= 0) {
      return res.status(400).json({
        message:
          "Payment amount must be greater than zero",
      });
    }

    // ========================================================
    // CHECK FOR EXISTING PENDING PAYMENT
    // ========================================================

    const existingPayment =
      await Payment.findOne({
        invoice: invoice._id,
        user: req.user.userId,
        status: "pending",
      }).sort({
        createdAt: -1,
      });

    if (existingPayment) {
      // The invoice may have changed since the payment
      // was created.
      if (
        existingPayment.amount !== amountInKobo
      ) {
        console.warn(
          "Existing payment amount no longer matches invoice."
        );

        existingPayment.status = "abandoned";

        await existingPayment.save();
      } else {
        // Try to resume the existing Paystack transaction.
        try {
          const callbackUrl = `${
            process.env.FRONTEND_URL ||
            "http://localhost:5173"
          }/payment/callback`;

          const paystackResponse =
            await initializeTransaction({
              email: invoice.client.email,

              amount: existingPayment.amount,

              reference:
                existingPayment.reference,

              metadata: {
                invoiceId:
                  invoice._id.toString(),

                paymentId:
                  existingPayment._id.toString(),

                userId:
                  req.user.userId.toString(),
              },

              callbackUrl,
            });

          if (
            paystackResponse?.status &&
            paystackResponse?.data
              ?.authorization_url
          ) {
            return res.status(200).json({
              message:
                "Existing payment resumed",

              checkoutUrl:
                paystackResponse.data
                  .authorization_url,

              accessCode:
                paystackResponse.data
                  .access_code,

              reference:
                paystackResponse.data
                  .reference ||
                existingPayment.reference,

              amount:
                existingPayment.amount,

              currency:
                existingPayment.currency,
            });
          }
        } catch (error) {
          console.error(
            "Failed to resume existing Paystack payment:",
            error.response?.data ||
              error.message
          );
        }

        // Existing transaction could not be resumed.
        existingPayment.status = "abandoned";

        await existingPayment.save();
      }
    }

    // ========================================================
    // CREATE NEW PAYMENT
    // ========================================================

    const reference =
      `DEVTRACK-${invoice._id}-${Date.now()}`;

    const payment = await Payment.create({
      invoice: invoice._id,

      user: req.user.userId,

      reference,

      // KOBO
      amount: amountInKobo,

      currency: "NGN",

      status: "pending",
    });

    try {
      const callbackUrl = `${
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
      }/payment/callback`;

      const paystackResponse =
        await initializeTransaction({
          email: invoice.client.email,

          // KOBO
          amount: amountInKobo,

          reference,

          metadata: {
            invoiceId:
              invoice._id.toString(),

            paymentId:
              payment._id.toString(),

            userId:
              req.user.userId.toString(),
          },

          callbackUrl,
        });

      if (
        !paystackResponse?.status ||
        !paystackResponse?.data
          ?.authorization_url
      ) {
        await Payment.findByIdAndDelete(
          payment._id
        );

        return res.status(502).json({
          message:
            "Paystack payment initialization failed",
        });
      }

      return res.status(200).json({
        message:
          "Payment initialized successfully",

        checkoutUrl:
          paystackResponse.data
            .authorization_url,

        accessCode:
          paystackResponse.data
            .access_code,

        reference:
          paystackResponse.data.reference ||
          reference,

        amount: amountInKobo,

        currency: "NGN",
      });
    } catch (error) {
      console.error(
        "Paystack initialization error:",
        error.response?.data ||
          error.message
      );

      await Payment.findByIdAndDelete(
        payment._id
      );

      return res.status(502).json({
        message:
          "Failed to initialize payment with Paystack",
      });
    }
  } catch (error) {
    console.error(
      "Initialize payment error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};


// ============================================================
// VERIFY PAYMENT
// ============================================================

const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        message:
          "Payment reference is required",
      });
    }

    // Only allow the owner of the payment to verify it.
    const payment = await Payment.findOne({
      reference,
      user: req.user.userId,
    }).populate("invoice");

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    if (!payment.invoice) {
      return res.status(400).json({
        message:
          "The invoice associated with this payment was not found",
      });
    }

    // ========================================================
    // IDEMPOTENCY
    // ========================================================
    //
    // If already successful, don't verify again.
    //

    if (payment.status === "success") {
      const updatedPayment =
        await Payment.findById(payment._id)
          .populate({
            path: "invoice",
            select:
              "invoiceNumber total status dueDate",
            populate: {
              path: "client",
              select: "name email",
            },
          });

      return res.status(200).json({
        message:
          "Payment already verified",

        status: "success",

        payment: updatedPayment,
      });
    }

    // ========================================================
    // CHECK INVOICE STATUS
    // ========================================================

    if (payment.invoice.status === "paid") {
      return res.status(400).json({
        message:
          "This invoice has already been marked as paid",
      });
    }

    // ========================================================
    // CHECK INTERNAL AMOUNT
    // ========================================================

    const expectedAmountInKobo =
      getInvoiceAmountInKobo(
        payment.invoice
      );

    if (
      payment.amount !==
      expectedAmountInKobo
    ) {
      console.error(
        "Payment amount mismatch:",
        {
          paymentId:
            payment._id.toString(),

          invoiceId:
            payment.invoice._id.toString(),

          invoiceTotalNaira:
            payment.invoice.total,

          expectedAmountInKobo,

          paymentAmountInKobo:
            payment.amount,
        }
      );

      return res.status(400).json({
        message:
          "Payment amount does not match the invoice amount",
      });
    }

    // ========================================================
    // VERIFY WITH PAYSTACK
    // ========================================================

    let paystackResponse;

    try {
      paystackResponse =
        await verifyTransaction(reference);
    } catch (error) {
      console.error(
        "Paystack verification error:",
        error.response?.data ||
          error.message
      );

      return res.status(502).json({
        message:
          "Failed to verify payment with Paystack",
      });
    }

    const transaction =
      paystackResponse?.data;

    if (!transaction) {
      return res.status(400).json({
        message:
          "Invalid response from Paystack",
      });
    }

    // ========================================================
    // PAYMENT STATUS
    // ========================================================

    if (transaction.status !== "success") {
      return res.status(400).json({
        message:
          transaction.gateway_response ||
          "Payment has not been completed",

        status:
          transaction.status,
      });
    }

    // ========================================================
    // AMOUNT CHECK
    // ========================================================
    //
    // Paystack amount = KOBO
    // Payment.amount = KOBO
    //
    // Therefore compare directly.
    //

    if (
      Number(transaction.amount) !==
      Number(payment.amount)
    ) {
      console.error(
        "Paystack amount mismatch:",
        {
          reference,

          paystackAmount:
            transaction.amount,

          paymentAmount:
            payment.amount,
        }
      );

      return res.status(400).json({
        message:
          "The Paystack payment amount does not match the invoice amount",
      });
    }

    // ========================================================
    // CURRENCY CHECK
    // ========================================================

    if (
      transaction.currency !==
      payment.currency
    ) {
      return res.status(400).json({
        message:
          "Payment currency does not match",
      });
    }

    // ========================================================
    // MARK PAYMENT SUCCESS
    // ========================================================

    payment.status = "success";

    payment.paidAt =
      transaction.paid_at
        ? new Date(
            transaction.paid_at
          )
        : new Date();

    await payment.save();

    // Mark invoice paid.
    await Invoice.findByIdAndUpdate(
      payment.invoice._id,
      {
        status: "paid",
      }
    );

    // Return updated payment.
    const updatedPayment =
      await Payment.findById(
        payment._id
      ).populate({
        path: "invoice",
        select:
          "invoiceNumber total status dueDate",
        populate: {
          path: "client",
          select: "name email",
        },
      });

    return res.status(200).json({
      message:
        "Payment verified successfully",

      status: "success",

      payment: updatedPayment,
    });
  } catch (error) {
    console.error(
      "Verify payment error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};


// ============================================================
// GET PAYMENTS
// ============================================================

const getPayments = async (req, res) => {
  try {
    const payments =
      await Payment.find({
        user: req.user.userId,
      })
        .populate({
          path: "invoice",
          select:
            "invoiceNumber total status dueDate",
          populate: {
            path: "client",
            select: "name email",
          },
        })
        .sort({
          createdAt: -1,
        });

    return res.status(200).json(
      payments
    );
  } catch (error) {
    console.error(
      "Get payments error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch payments",
    });
  }
};


// ============================================================
// PAYSTACK WEBHOOK
// ============================================================

const handlePaystackWebhook = async (
  req,
  res
) => {
  try {
    const signature =
      req.headers[
        "x-paystack-signature"
      ];

    if (!signature) {
      return res.status(401).json({
        message:
          "Missing Paystack signature",
      });
    }

    if (!req.rawBody) {
      return res.status(400).json({
        message:
          "Raw webhook body is missing",
      });
    }

    // ========================================================
    // VERIFY WEBHOOK SIGNATURE
    // ========================================================

    const expectedSignature =
      crypto
        .createHmac(
          "sha512",
          process.env.PAYSTACK_SECRET_KEY
        )
        .update(req.rawBody)
        .digest("hex");

    const receivedBuffer =
      Buffer.from(signature);

    const expectedBuffer =
      Buffer.from(
        expectedSignature
      );

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return res.status(401).json({
        message:
          "Invalid Paystack signature",
      });
    }

    const signaturesMatch =
      crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      );

    if (!signaturesMatch) {
      return res.status(401).json({
        message:
          "Invalid Paystack signature",
      });
    }

    const event = req.body;

    // We only care about successful charges.
    if (
      event.event !==
      "charge.success"
    ) {
      return res.status(200).json({
        received: true,
      });
    }

    const transaction =
      event.data;

    if (!transaction?.reference) {
      return res.status(200).json({
        received: true,
      });
    }

    // ========================================================
    // FIND PAYMENT
    // ========================================================

    const payment =
      await Payment.findOne({
        reference:
          transaction.reference,
      }).populate("invoice");

    if (!payment) {
      console.warn(
        "Webhook payment not found:",
        transaction.reference
      );

      // Return 200 so Paystack doesn't keep retrying
      // an event for a payment our database doesn't know.
      return res.status(200).json({
        received: true,
      });
    }

    if (!payment.invoice) {
      console.warn(
        "Webhook invoice not found:",
        payment._id.toString()
      );

      return res.status(200).json({
        received: true,
      });
    }

    // ========================================================
    // IDEMPOTENCY
    // ========================================================

    if (payment.status === "success") {
      return res.status(200).json({
        received: true,
      });
    }

    // ========================================================
    // CHECK INVOICE STATUS
    // ========================================================

    if (
      payment.invoice.status === "paid"
    ) {
      console.warn(
        "Invoice already paid:",
        payment.invoice._id.toString()
      );

      return res.status(200).json({
        received: true,
      });
    }

    // ========================================================
    // CHECK INTERNAL AMOUNT
    // ========================================================

    const expectedAmountInKobo =
      getInvoiceAmountInKobo(
        payment.invoice
      );

    if (
      payment.amount !==
      expectedAmountInKobo
    ) {
      console.error(
        "Webhook invoice/payment amount mismatch:",
        {
          reference:
            payment.reference,

          invoiceTotal:
            payment.invoice.total,

          expectedAmountInKobo,

          paymentAmount:
            payment.amount,
        }
      );

      return res.status(200).json({
        received: true,
      });
    }

    // ========================================================
    // CHECK PAYSTACK AMOUNT
    // ========================================================

    if (
      Number(transaction.amount) !==
      Number(payment.amount)
    ) {
      console.error(
        "Webhook Paystack amount mismatch:",
        {
          reference:
            payment.reference,

          paystackAmount:
            transaction.amount,

          paymentAmount:
            payment.amount,
        }
      );

      return res.status(200).json({
        received: true,
      });
    }

    // ========================================================
    // CHECK CURRENCY
    // ========================================================

    if (
      transaction.currency !==
      payment.currency
    ) {
      console.error(
        "Webhook currency mismatch:",
        {
          reference:
            payment.reference,

          paystackCurrency:
            transaction.currency,

          paymentCurrency:
            payment.currency,
        }
      );

      return res.status(200).json({
        received: true,
      });
    }

    // ========================================================
    // MARK PAYMENT SUCCESS
    // ========================================================

    payment.status = "success";

    payment.paidAt =
      transaction.paid_at
        ? new Date(
            transaction.paid_at
          )
        : new Date();

    await payment.save();

    // Mark invoice paid.
    await Invoice.findByIdAndUpdate(
      payment.invoice._id,
      {
        status: "paid",
      }
    );

    console.log(
      "Payment confirmed by Paystack webhook:",
      payment.reference
    );

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Paystack webhook error:",
      error
    );

    // Paystack should receive a response.
    return res.status(200).json({
      received: true,
    });
  }
};


module.exports = {
  initializePayment,
  verifyPayment,
  getPayments,
  handlePaystackWebhook,
};