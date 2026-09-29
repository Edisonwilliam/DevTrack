const express = require("express");
const cors = require("cors");

const { protect } = require("./middleware/authMiddleware");

const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");

const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
  "http://localhost:5173",
  "https://dev-track-olive-five.vercel.app",
  process.env.FRONTEND_URL?.trim(),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as server-to-server requests and health checks.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log(`CORS blocked origin: ${origin}`);

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
  })
);

// ============================================================
// BODY PARSER
// ============================================================

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "DevTrack API is healthy",
  });
});

// ============================================================
// ROOT
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "DevTrack API is running",
  });
});

// ============================================================
// ROUTES
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

// ============================================================
// PROTECTED TEST ROUTE
// ============================================================

app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "You accessed a protected route",
    user: req.user,
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(errorHandler);

module.exports = app;