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

const allowedOrigins = [ "http://localhost:5173",
                         "http://127.0.0.1:5173",
                         "https://dev-track-fshm7fh47-edisonwilliams-projects.vercel.app", ].filter(Boolean);



app.use( cors({ origin: function (origin, callback) { 
    if (!origin) { return callback(null, true); } 
    if (allowedOrigins.includes(origin)) 
    { return callback(null, true); } 
    return callback(new Error("Not allowed by CORS")); }, 
    credentials: true, }) );


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

