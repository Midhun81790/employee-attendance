// routes/employee.js - Employee Portal (Simplified)
const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const EmployeeCredential = require("../models/EmployeeCredential");
const Attendance = require("../models/Attendance");
const NotificationService = require("../services/whatsappService");
const fs = require('fs');
const path = require('path');

// Initialize notification service
const notificationService = new NotificationService();

// Load company location from config file
function getCompanyLocation() {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'location.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    return config.shopLocation;
  } catch (error) {
    console.error("Error loading location config:", error);
    // Fallback to default location
    return {
      latitude: 15.227778,
      longitude: 79.885556,
      address: "LG Best Shop-LAXMI MARUTHI ELECTRONICS, SOUTH SIDE KPR COMPLEX, 521/2, Pillutla Rd, beside POLICE STATION, Piduguralla, Andhra Pradesh 522413",
      radius: 200
    };
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Employee login page
router.get("/", (req, res) => {
  if (req.session.employeeLoggedIn) return res.redirect("/employee/dashboard");
  res.render("employee/login", { error: null });
});

// Handle employee login
router.post("/login", async (req, res) => {
  const { employeeId, password } = req.body;

  try {
    const credential = await EmployeeCredential.findOne({ 
      employeeId, 
      password, // Simple password comparison (in production, use bcrypt)
      isActive: true 
    }).populate("employee");

    if (!credential) {
      return res.render("employee/login", { error: "Invalid Employee ID or Password" });
    }

    // Update last login
    credential.lastLogin = new Date();
    await credential.save();

    req.session.employeeLoggedIn = true;
    req.session.employeeData = {
      id: credential.employee._id,
      name: credential.employee.name,
      employeeId: credential.employeeId
    };

    return res.redirect("/employee/dashboard");
  } catch (err) {
    console.error("Employee login error:", err);
    return res.render("employee/login", { error: "Login failed. Please try again." });
  }
});

// Employee dashboard - shows attendance options
router.get("/dashboard", async (req, res) => {
  if (!req.session.employeeLoggedIn) return res.redirect("/employee");
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's attendance records
    const todayAttendance = await Attendance.find({
      employee: req.session.employeeData.id,
      timestamp: { $gte: today, $lt: tomorrow }
    }).sort({ timestamp: 1 });

    // Determine next attendance type
    const attendanceTypes = ["MORNING_ENTRY", "LUNCH_EXIT", "LUNCH_ENTRY", "END_EXIT"];
    const completedTypes = todayAttendance.map(a => a.attendanceType);
    const nextType = attendanceTypes.find(type => !completedTypes.includes(type));

    res.render("employee/dashboard", {
      employee: req.session.employeeData,
      todayAttendance,
      nextType,
      companyLocation: getCompanyLocation()
    });
  } catch (err) {
    console.error("Error loading employee dashboard:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// Mark attendance page
router.get("/mark-attendance", (req, res) => {
  if (!req.session.employeeLoggedIn) return res.redirect("/employee");
  
  const { type } = req.query;
  if (!["MORNING_ENTRY", "LUNCH_EXIT", "LUNCH_ENTRY", "END_EXIT"].includes(type)) {
    return res.redirect("/employee/dashboard");
  }

  res.render("employee/mark_attendance", {
    employee: req.session.employeeData,
    attendanceType: type,
    companyLocation: getCompanyLocation()
  });
});

// Handle attendance marking
router.post("/mark-attendance", async (req, res) => {
  console.log("=== ATTENDANCE MARKING REQUEST ===");
  console.log("Session data:", req.session);
  console.log("Employee logged in:", req.session.employeeLoggedIn);
  console.log("Employee data:", req.session.employeeData);
  console.log("Request body:", req.body);
  
  if (!req.session.employeeLoggedIn) {
    console.log("ERROR: Employee not logged in");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { 
    attendanceType, 
    latitude, 
    longitude, 
    address, 
    accuracy 
  } = req.body;

  console.log("Parsed request data:", {
    attendanceType,
    latitude,
    longitude,
    address,
    accuracy
  });

  try {
    // Validate the employee ID exists first
    const employeeExists = await Employee.findById(req.session.employeeData.id);
    if (!employeeExists) {
      console.log("ERROR: Employee not found in database:", req.session.employeeData.id);
      return res.status(400).json({ message: "Employee not found" });
    }
    console.log("Employee found:", employeeExists.name);

    // Validate attendance type
    if (!["MORNING_ENTRY", "LUNCH_EXIT", "LUNCH_ENTRY", "END_EXIT"].includes(attendanceType)) {
      console.log("ERROR: Invalid attendance type:", attendanceType);
      return res.status(400).json({ message: "Invalid attendance type" });
    }

    // Check if this attendance type already marked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log("Checking existing attendance for employee:", req.session.employeeData.id);
    console.log("Date range:", today, "to", tomorrow);

    const existingAttendance = await Attendance.findOne({
      employee: req.session.employeeData.id,
      attendanceType,
      timestamp: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      console.log("ERROR: Attendance already marked:", existingAttendance);
      return res.status(400).json({ 
        message: `${attendanceType.replace('_', ' ')} already marked today` 
      });
    }

    // Get current company location from config
    const COMPANY_LOCATION = getCompanyLocation();

    // Calculate distance from company location
    const distance = calculateDistance(
      parseFloat(latitude), 
      parseFloat(longitude),
      COMPANY_LOCATION.latitude, 
      COMPANY_LOCATION.longitude
    );

    const isWithinGeofence = distance <= COMPANY_LOCATION.radius;
    console.log("📍 Location validation:", {
      employeeName: employeeExists.name,
      userCoordinates: { lat: latitude, lng: longitude },
      shopCoordinates: { lat: COMPANY_LOCATION.latitude, lng: COMPANY_LOCATION.longitude },
      calculatedDistance: Math.round(distance) + " meters",
      allowedRadius: COMPANY_LOCATION.radius + " meters",
      isWithinGeofence: isWithinGeofence,
      status: isWithinGeofence ? "✅ VALID LOCATION" : "❌ OUTSIDE GEOFENCE"
    });

    // STRICT ENFORCEMENT: Block attendance if not within geofence
    if (!isWithinGeofence) {
      console.log("ATTENDANCE BLOCKED: Employee outside geofence");
      return res.status(403).json({ 
        message: `Attendance denied: You are ${Math.round(distance)}m away from the office. You must be within ${COMPANY_LOCATION.radius}m to mark attendance.`,
        distance: Math.round(distance),
        requiredRadius: COMPANY_LOCATION.radius,
        isWithinGeofence: false
      });
    }

    console.log("✅ Location verified - Employee is within geofence");

    // Get device info
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      platform: req.headers['sec-ch-ua-platform'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress
    };

    console.log("Device info:", deviceInfo);

    // Create attendance record
    const attendanceData = {
      employee: req.session.employeeData.id,
      attendanceType,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address,
        accuracy: parseFloat(accuracy) || null
      },
      deviceInfo,
      isWithinGeofence
    };

    console.log("Creating attendance with data:", attendanceData);

    const attendance = new Attendance(attendanceData);
    
    // Validate the attendance object before saving
    const validationError = attendance.validateSync();
    if (validationError) {
      console.log("VALIDATION ERROR:", validationError);
      return res.status(400).json({ 
        message: "Validation error", 
        details: validationError.message 
      });
    }

    await attendance.save();

    console.log("SUCCESS: Attendance saved:", attendance);

    // Send notification (only for valid location attendance)
    if (isWithinGeofence) {
      try {
        // Convert attendance type to standard format
        let standardType = attendanceType.toLowerCase();
        if (attendanceType === 'MORNING_ENTRY') standardType = 'check_in';
        else if (attendanceType === 'END_EXIT') standardType = 'check_out';
        else if (attendanceType === 'LUNCH_EXIT') standardType = 'break_start';
        else if (attendanceType === 'LUNCH_ENTRY') standardType = 'break_end';

        console.log("📱 Attempting to send notification for:", employeeExists.name, "Type:", standardType);
        
        await notificationService.sendAttendanceNotification(
          employeeExists.name,
          standardType,
          attendance.timestamp,
          attendance.location,
          true
        );
        console.log("✅ Notification sent successfully for:", employeeExists.name);
      } catch (notificationError) {
        console.error("⚠️  Notification failed:", notificationError.message);
        console.error("⚠️  Notification error stack:", notificationError.stack);
        // Continue without failing the attendance marking
      }
    } else {
      console.log("🚫 No notification sent - Employee outside geofence:", {
        employee: employeeExists.name,
        distance: Math.round(distance),
        maxDistance: COMPANY_LOCATION.radius
      });
    }

    res.json({
      message: `${attendanceType.replace('_', ' ')} marked successfully`,
      distance: Math.round(distance),
      isWithinGeofence,
      timestamp: attendance.timestamp
    });

  } catch (err) {
    console.error("ERROR marking attendance:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      message: "Error marking attendance", 
      error: err.message 
    });
  }
});

// Employee logout
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    res.clearCookie("connect.sid");
    res.redirect("/employee");
  });
});

// TEST ROUTE - Create test employee and credential (remove in production)
router.get("/create-test-employee", async (req, res) => {
  try {
    // Check if test employee already exists
    let employee = await Employee.findOne({ employeeId: "TEST001" });
    
    if (!employee) {
      // Create test employee
      employee = new Employee({
        name: "Test Employee",
        employeeId: "TEST001",
        department: "Testing",
        position: "Test Position"
      });
      await employee.save();
      console.log("Test employee created:", employee);
    }

    // Check if credential exists
    let credential = await EmployeeCredential.findOne({ employeeId: "TEST001" });
    
    if (!credential) {
      // Create test credential
      credential = new EmployeeCredential({
        employeeId: "TEST001",
        password: "test123",
        employee: employee._id
      });
      await credential.save();
      console.log("Test credential created:", credential);
    }

    res.json({
      message: "Test employee and credential created/verified",
      employee: {
        name: employee.name,
        employeeId: employee.employeeId
      },
      credential: {
        employeeId: credential.employeeId,
        password: "test123"
      }
    });

  } catch (err) {
    console.error("Error creating test employee:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
