const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

   
    amount: {
      type: Number,
      required: true,
      min: [1, "Payment amount must be greater than zero"],

      validate: {
        validator: Number.isInteger,
        message: "Payment amount must be a whole number of kobo",
      },
    },

    currency: {
      type: String,
      required: true,
      enum: {
        values: ["NGN"],
        message: "Only NGN payments are supported",
      },
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed", "abandoned"],
      default: "pending",
    },

    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;

