// routes/main.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const Employee = require("../models/Employee");
const EmployeeCredential = require("../models/EmployeeCredential");
const Attendance = require("../models/Attendance");

// Load environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Login Page
router.get("/", (req, res) => {
  if (req.session.isLoggedIn) return res.redirect("/dashboard");
  res.render("login", { error: null });
});

// Handle Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.isLoggedIn = true;
    return res.redirect("/dashboard");
  } else {
    return res.render("login", { error: "Invalid Email or Password" });
  }
});

// Dashboard (protected)
router.get("/dashboard", (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/");
  res.render("dashboard");
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/register", (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/");
  res.render("register");
});

router.post("/register", upload.none(), async (req, res) => {
  const { name, faceId } = req.body;
  console.log("Registration attempt:", { name, faceIdLength: faceId ? faceId.length : 0 });

  try {
    // Parse the faceId JSON string to array
    let faceDescriptor;
    try {
      faceDescriptor = JSON.parse(faceId);
      console.log("Parsed face descriptor length:", faceDescriptor.length);
    } catch (err) {
      console.error("Face descriptor parsing error:", err);
      return res.status(400).send("Invalid face data. Please capture face again.");
    }

    const existing = await Employee.findOne({ name });
    if (existing) {
      console.log("Employee already exists:", name);
      return res.status(400).send("Employee with this name already exists!");
    }

    const employee = new Employee({ name, faceId: faceDescriptor });
    await employee.save();
    console.log("Employee registered successfully:", name);

    res.redirect("/dashboard?success=Employee registered successfully");
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).send("Error registering employee: " + err.message);
  }
});
router.get("/mark", (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/");
  res.render("mark");
});

// Auto scanning attendance page
router.get("/mark-auto", (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/");
  res.render("mark_auto");
});

router.post("/mark-attendance", async (req, res) => {
  const { name } = req.body;
  console.log("Admin panel attendance marking attempt for:", name);
  
  try {
    if (name === "unknown") {
      console.log("Face not recognized");
      return res.json({ message: "Face not recognized!" });
    }

    const employee = await Employee.findOne({ name });
    if (!employee) {
      console.log("Employee not found:", name);
      return res.json({ message: "Employee not found!" });
    }

    // Check if attendance already marked today for MORNING_ENTRY
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      employee: employee._id,
      attendanceType: "MORNING_ENTRY", // Admin face recognition marks morning entry
      timestamp: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      console.log("Morning attendance already marked today for:", name);
      return res.json({ message: `Morning attendance already marked today for ${employee.name}` });
    }

    // Create attendance record with default location (office location)
    const attendance = new Attendance({ 
      employee: employee._id,
      attendanceType: "MORNING_ENTRY",
      location: {
        latitude: 15.227778, // Default to office location
        longitude: 79.885556,
        address: "LG Best Shop-LAXMI MARUTHI ELECTRONICS, Piduguralla (Face Recognition Entry)",
        accuracy: 0
      },
      deviceInfo: {
        userAgent: req.headers['user-agent'] || 'Admin Panel',
        platform: 'Admin Panel',
        ipAddress: req.ip || req.connection.remoteAddress
      },
      isWithinGeofence: true // Admin panel marking is always considered valid
    });
    
    await attendance.save();
    console.log("Attendance marked successfully for:", name);

    res.json({ message: `Morning attendance marked for ${employee.name}` });
  } catch (err) {
    console.error("Error marking attendance:", err);
    res.status(500).json({ message: "Error marking attendance: " + err.message });
  }
});
router.get("/get-employees", async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching employees" });
  }
});

router.get("/get-descriptors", async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching descriptors" });
  }
});
router.get("/attendance", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/");
  
  try {
    const attendances = await Attendance.find()
      .populate("employee", "name employeeId")
      .sort({ timestamp: -1 });
    
    // Filter out records where employee populate failed
    const validAttendances = attendances.filter(record => record.employee != null);
    
    res.render("attendance", { attendances: validAttendances });
  } catch (err) {
    console.error("Error fetching attendance records:", err);
    res.status(500).send("Error fetching attendance records.");
  }
});

// Delete employee route
router.delete("/delete-employee/:id", async (req, res) => {
  if (!req.session.isLoggedIn) return res.status(401).json({ message: "Unauthorized" });
  
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting employee" });
  }
});

// Get today's attendance count
router.get("/today-attendance", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Count unique employees who marked at least one attendance today
    const uniqueEmployeesToday = await Attendance.distinct("employee", {
      timestamp: { $gte: today, $lt: tomorrow }
    });
    
    const count = uniqueEmployeesToday.length;
    
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching today's attendance" });
  }
});

// Create employee credential
router.post("/create-employee-credential", async (req, res) => {
  if (!req.session.isLoggedIn) return res.status(401).json({ message: "Unauthorized" });
  
  try {
    const { employeeId, password, employeeObjectId } = req.body;
    
    // Check if employee exists
    const employee = await Employee.findById(employeeObjectId);
    if (!employee) {
      return res.status(400).json({ message: "Employee not found" });
    }
    
    // Check if credential already exists
    const existingCredential = await EmployeeCredential.findOne({ 
      $or: [{ employeeId }, { employee: employeeObjectId }]
    });
    
    if (existingCredential) {
      return res.status(400).json({ message: "Employee credential already exists" });
    }
    
    // Create new credential
    const credential = new EmployeeCredential({
      employeeId,
      password,
      employee: employeeObjectId
    });
    
    await credential.save();
    res.json({ message: "Employee credential created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating employee credential" });
  }
});

// Get employee credentials
router.get("/employee-credentials", async (req, res) => {
  if (!req.session.isLoggedIn) return res.status(401).json({ message: "Unauthorized" });
  
  try {
    const credentials = await EmployeeCredential.find({ isActive: true })
      .populate("employee", "name")
      .sort({ createdAt: -1 });
    
    res.json(credentials);
  } catch (err) {
    console.error("Error fetching employee credentials:", err);
    res.status(500).json({ message: "Error fetching employee credentials" });
  }
});

// Delete employee credential
router.delete("/employee-credential/:id", async (req, res) => {
  if (!req.session.isLoggedIn) return res.status(401).json({ message: "Unauthorized" });
  
  try {
    await EmployeeCredential.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Employee credential deactivated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deactivating employee credential" });
  }
});

// Test route to check if models are accessible
router.get("/test-models", (req, res) => {
  const path = require('path');
  const fs = require('fs');
  
  const modelsPath = path.join(__dirname, '../public/models');
  const modelsExist = {
    tinyFaceDetector: fs.existsSync(path.join(modelsPath, 'tiny_face_detector', 'tiny_face_detector_model-weights_manifest.json')),
    faceRecognition: fs.existsSync(path.join(modelsPath, 'face_recognition', 'face_recognition_model-weights_manifest.json')),
    faceLandmark68: fs.existsSync(path.join(modelsPath, 'face_landmark_68', 'face_landmark_68_model-weights_manifest.json'))
  };
  
  res.json({
    message: "Model accessibility test",
    modelsPath: modelsPath,
    modelsExist: modelsExist,
    allModelsPresent: Object.values(modelsExist).every(exists => exists)
  });
});


module.exports = router;