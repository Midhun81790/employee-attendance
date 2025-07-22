// app.js
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for HTTPS deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Add JSON parsing middleware
app.use(cookieParser());

// Add CORS and CSP headers for better compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Embedder-Policy', 'cross-origin');
  res.header('Cross-Origin-Opener-Policy', 'cross-origin');
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || "secretkey",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Enable secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/models", express.static(path.join(__dirname, "public/models")));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Database connection with better error handling
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("✅ MongoDB Connected Successfully");
  
  // Initialize monthly report scheduler after DB connection
  const MonthlyReportScheduler = require('./services/monthlyReportScheduler');
  const scheduler = new MonthlyReportScheduler();
  scheduler.startScheduler();
  
  // Make scheduler available globally for manual triggers
  global.monthlyScheduler = scheduler;
})
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err.message);
  process.exit(1);
});

// Routes
const mainRoutes = require("./routes/main");
const employeeRoutes = require("./routes/employee");
const attendanceAPIRoutes = require("./routes/attendanceAPI");
const adminSettingsRoutes = require("./routes/adminSettings");

// The more specific employee routes must be registered before the general routes
// to avoid being caught by the main router's wildcard handlers.
app.use("/employee", employeeRoutes);
app.use("/api/attendance", attendanceAPIRoutes);
app.use("/admin", adminSettingsRoutes);
app.use("/", mainRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).render("error", { 
    error: "Something went wrong!",
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("error", { 
    error: "Page Not Found",
    message: "The page you're looking for doesn't exist." 
  });
});

// Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});
