// Admin Settings for Location Management
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const NotificationService = require("../services/whatsappService");

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

// Admin settings interface
router.get("/settings", (req, res) => {
  if (!req.session.adminLoggedIn) return res.redirect("/");
  
  // Get current location from config file
  let currentLocation;
  try {
    const configPath = path.join(__dirname, '..', 'config', 'location.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    currentLocation = config.shopLocation;
  } catch (error) {
    // Fallback to default
    currentLocation = {
      latitude: 15.227778,
      longitude: 79.885556,
      address: "LG Best Shop-LAXMI MARUTHI ELECTRONICS, SOUTH SIDE KPR COMPLEX, 521/2, Pillutla Rd, beside POLICE STATION, Piduguralla, Andhra Pradesh 522413",
      radius: 200
    };
  }
  
  res.render("admin/settings", { 
    currentLocation,
    success: req.query.success,
    error: req.query.error 
  });
});

// Update company location
router.post("/update-location", async (req, res) => {
  if (!req.session.adminLoggedIn) return res.redirect("/");
  
  try {
    const { latitude, longitude, address, radius } = req.body;
    
    // Validate inputs
    if (!latitude || !longitude || !address || !radius) {
      return res.redirect("/admin/settings?error=" + encodeURIComponent("All fields are required"));
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseInt(radius);
    
    if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
      return res.redirect("/admin/settings?error=" + encodeURIComponent("Invalid coordinates or radius"));
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.redirect("/admin/settings?error=" + encodeURIComponent("Invalid latitude/longitude values"));
    }
    
    if (rad < 10 || rad > 1000) {
      return res.redirect("/admin/settings?error=" + encodeURIComponent("Radius must be between 10 and 1000 meters"));
    }
    
    // Create updated configuration with enhanced features
    const newConfig = {
      shopLocation: {
        latitude: lat,
        longitude: lng,
        address: address.trim(),
        radius: rad,
        backupRadius: Math.max(rad * 2, 2000), // Automatic backup radius
        allowLowAccuracy: true // Enable smart location validation
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: "admin"
    };
    
    // Save to config file
    const configPath = path.join(__dirname, '..', 'config', 'location.json');
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
    
    console.log(`📍 Admin updated company location: ${lat}, ${lng} (${rad}m radius)`);
    
    res.redirect("/admin/settings?success=" + encodeURIComponent("Location updated successfully! Changes are now active."));
    
  } catch (error) {
    console.error("Error updating location:", error);
    res.redirect("/admin/settings?error=" + encodeURIComponent("Error updating location: " + error.message));
  }
});

// Get current location (API endpoint)
router.get("/api/current-location", (req, res) => {
  if (!req.session.adminLoggedIn) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const configPath = path.join(__dirname, '..', 'config', 'location.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    res.json(config.shopLocation);
  } catch (error) {
    // Fallback to default
    const defaultLocation = {
      latitude: 15.227778,
      longitude: 79.885556,
      address: "LG Best Shop-LAXMI MARUTHI ELECTRONICS, SOUTH SIDE KPR COMPLEX, 521/2, Pillutla Rd, beside POLICE STATION, Piduguralla, Andhra Pradesh 522413",
      radius: 200
    };
    res.json(defaultLocation);
  }
});

// Admin scanner page
router.get("/scanner", (req, res) => {
  if (!req.session.adminLoggedIn) return res.redirect("/");
  res.render("admin/scanner");
});

// Admin attendance marking with face recognition
router.post("/mark-attendance", async (req, res) => {
  if (!req.session.adminLoggedIn) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { faceId, attendanceType, adminOverride } = req.body;

    console.log("Admin attendance marking attempt:", {
      attendanceType,
      faceIdLength: faceId ? faceId.length : 0,
      adminOverride
    });

    // Validate inputs
    if (!faceId || !Array.isArray(faceId) || faceId.length !== 128) {
      return res.status(400).json({
        success: false,
        message: "Invalid face descriptor provided"
      });
    }

    if (!attendanceType) {
      return res.status(400).json({
        success: false,
        message: "Attendance type is required"
      });
    }

    // Find employee by face recognition
    const employees = await Employee.find({ isActive: true });
    let recognizedEmployee = null;
    let minDistance = Infinity;
    const threshold = 0.6; // Face recognition threshold

    for (const employee of employees) {
      if (employee.faceId && employee.faceId.length === 128) {
        const distance = euclideanDistance(faceId, employee.faceId);
        console.log(`Distance to ${employee.name}: ${distance}`);
        
        if (distance < threshold && distance < minDistance) {
          minDistance = distance;
          recognizedEmployee = employee;
        }
      }
    }

    if (!recognizedEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not recognized. Please register the face first."
      });
    }

    console.log(`Employee recognized: ${recognizedEmployee.name} (distance: ${minDistance})`);

    // Check if attendance already marked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      employee: recognizedEmployee._id,
      attendanceType,
      timestamp: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: `${attendanceType.replace('_', ' ')} already marked today for ${recognizedEmployee.name}`
      });
    }

    // Get current location from config file
    const currentLocation = getCompanyLocation();

    // Create attendance record with admin override
    const attendance = new Attendance({
      employee: recognizedEmployee._id,
      attendanceType,
      timestamp: new Date(),
      location: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        address: `${currentLocation.address} (Admin Scanner)`,
        accuracy: 0
      },
      deviceInfo: {
        userAgent: 'Admin Scanner',
        platform: 'Admin Panel',
        ipAddress: req.ip || req.connection.remoteAddress
      },
      isWithinGeofence: true, // Admin override
      adminMarked: true,
      markedBy: "admin"
    });

    await attendance.save();

    // Send notification
    try {
      let standardType = attendanceType.toLowerCase();
      if (attendanceType === 'MORNING_ENTRY') standardType = 'check_in';
      else if (attendanceType === 'END_EXIT') standardType = 'check_out';
      else if (attendanceType === 'LUNCH_EXIT') standardType = 'break_start';
      else if (attendanceType === 'LUNCH_ENTRY') standardType = 'break_end';

      await notificationService.sendAttendanceNotification(
        recognizedEmployee.name,
        standardType,
        attendance.timestamp,
        attendance.location,
        true
      );
      console.log("✅ Notification sent for admin-marked attendance:", recognizedEmployee.name);
    } catch (notificationError) {
      console.error("⚠️  Notification failed:", notificationError.message);
    }

    console.log(`✅ Admin marked attendance: ${recognizedEmployee.name} - ${attendanceType}`);

    res.json({
      success: true,
      message: "Attendance marked successfully",
      employee: {
        name: recognizedEmployee.name,
        id: recognizedEmployee._id
      },
      attendanceType,
      timestamp: attendance.timestamp,
      adminOverride: true
    });

  } catch (error) {
    console.error("Error in admin attendance marking:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message
    });
  }
});

// Helper function for face recognition
function euclideanDistance(face1, face2) {
  if (!face1 || !face2 || face1.length !== face2.length) {
    return Infinity;
  }
  
  let sum = 0;
  for (let i = 0; i < face1.length; i++) {
    sum += Math.pow(face1[i] - face2[i], 2);
  }
  return Math.sqrt(sum);
}

module.exports = router;
