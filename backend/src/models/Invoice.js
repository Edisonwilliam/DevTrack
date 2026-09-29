const mongoose = require("mongoose");
const crypto = require("crypto");

// =========================
// MONEY VALIDATOR
// =========================

const moneyValidator = {
  validator: (value) =>
    Number.isFinite(value) &&
    value >= 0 &&
    Math.round(value * 100) === value * 100,

  message:
    "Amount must be a valid monetary value with up to 2 decimal places",
};

// =========================
// INVOICE ITEM SCHEMA
// =========================

const invoiceItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: moneyValidator,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: moneyValidator,
    },
  },
  {
    _id: false,
  }
);

// =========================
// INVOICE SCHEMA
// =========================

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // =========================
    // PUBLIC INVOICE TOKEN
    // =========================

    publicToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    // Project is optional
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    items: {
      type: [invoiceItemSchema],
      required: true,

      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,

        message: "Invoice must contain at least one item",
      },
    },

    // =========================
    // FINANCIAL VALUES
    // =========================

    subtotal: {
      type: Number,
      required: true,
      min: 0,
      validate: moneyValidator,
    },

    // Tax percentage
    // Example: 7.5 means 7.5%
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax percentage cannot be negative"],
      max: [100, "Tax percentage cannot exceed 100%"],

      validate: {
        validator: (value) =>
          Number.isFinite(value) &&
          value >= 0 &&
          value <= 100,

        message:
          "Tax percentage must be between 0% and 100%",
      },
    },

    // Actual tax amount in Naira
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
      validate: moneyValidator,
    },

    // Final invoice amount in Naira
    total: {
      type: Number,
      required: true,
      min: 0,
      validate: moneyValidator,
    },

    // =========================
    // STATUS
    // =========================

    status: {
      type: String,
      enum: [
        "draft",
        "sent",
        "paid",
        "overdue",
        "cancelled",
      ],
      default: "draft",
    },

    // =========================
    // DATES
    // =========================

    issueDate: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    // =========================
    // OWNER
    // =========================

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// GENERATE PUBLIC TOKEN
// =========================

invoiceSchema.pre("validate", async function () {
  if (!this.publicToken) {
    this.publicToken = crypto.randomBytes(32).toString("hex");
  }

  // =========================
  // INVOICE VALIDATION
  // =========================

  if (!Array.isArray(this.items) || this.items.length === 0) {
    throw new Error(
      "Invoice must contain at least one item"
    );
  }

  // =========================
  // VALIDATE ITEM AMOUNTS
  // =========================

  for (const item of this.items) {
    const calculatedAmount =
      Math.round(
        Number(item.quantity) *
          Number(item.unitPrice) *
          100
      ) / 100;

    if (
      Math.abs(
        calculatedAmount - Number(item.amount)
      ) > 0.001
    ) {
      throw new Error(
        "Invoice item amount does not match quantity × unit price"
      );
    }
  }

  // =========================
  // VALIDATE SUBTOTAL
  // =========================

  const calculatedSubtotal =
    Math.round(
      this.items.reduce(
        (sum, item) =>
          sum + Number(item.amount),
        0
      ) * 100
    ) / 100;

  if (
    Math.abs(
      calculatedSubtotal -
        Number(this.subtotal)
    ) > 0.001
  ) {
    throw new Error(
      "Invoice subtotal does not match invoice items"
    );
  }

  // =========================
  // VALIDATE TAX
  // =========================

  const calculatedTaxAmount =
    Math.round(
      calculatedSubtotal *
        (Number(this.tax || 0) / 100) *
        100
    ) / 100;

  if (
    Math.abs(
      calculatedTaxAmount -
        Number(this.taxAmount || 0)
    ) > 0.001
  ) {
    throw new Error(
      "Invoice tax amount does not match tax percentage"
    );
  }

  // =========================
  // VALIDATE TOTAL
  // =========================

  const calculatedTotal =
    Math.round(
      (calculatedSubtotal +
        calculatedTaxAmount) *
        100
    ) / 100;

  if (
    Math.abs(
      calculatedTotal -
        Number(this.total)
    ) > 0.001
  ) {
    throw new Error(
      "Invoice total does not match subtotal + tax"
    );
  }
});

// =========================
// MODEL
// =========================

const Invoice = mongoose.model(
  "Invoice",
  invoiceSchema
);

module.exports = Invoice;
