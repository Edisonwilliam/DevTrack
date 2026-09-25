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



app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);


app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);



app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "DevTrack API is healthy",
  });
});



app.get("/", (req, res) => {
  res.json({
    message: "DevTrack API is running",
  });
});



app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);



app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "You accessed a protected route",
    user: req.user,
  });
});


app.use(errorHandler);

module.exports = app;

