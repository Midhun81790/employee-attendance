// routes/attendanceAPI.js - Enhanced Attendance API Routes
const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
};

// Get filtered attendance records
router.get('/filtered', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      dateFrom,
      dateTo,
      employee,
      type
    } = req.query;

    // Build filter query
    let filter = {};
    
    // Date range filter
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = endDate;
      }
    }
    
    // Employee filter
    if (employee) {
      filter.employee = employee;
    }
    
    // Attendance type filter
    if (type) {
      filter.attendanceType = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const records = await Attendance.find(filter)
      .populate('employee', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      records,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasMore: page < totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching filtered attendance:', error);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
});

// Get attendance statistics
router.get('/statistics', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [totalEmployees, todayRecords, thisMonthRecords] = await Promise.all([
      Employee.countDocuments(),
      Attendance.countDocuments({
        timestamp: { $gte: today, $lt: tomorrow }
      }),
      Attendance.countDocuments({
        timestamp: { $gte: thisMonth, $lt: nextMonth }
      })
    ]);

    res.json({
      totalEmployees,
      todayRecords,
      thisMonthRecords
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Export attendance records as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      employee,
      type
    } = req.query;

    // Build filter query
    let filter = {};
    
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = endDate;
      }
    }
    
    if (employee) filter.employee = employee;
    if (type) filter.attendanceType = type;

    // Fetch all matching records
    const records = await Attendance.find(filter)
      .populate('employee', 'name')
      .sort({ timestamp: -1 });

    // Generate CSV filename
    const filename = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`;
    const filepath = path.join(__dirname, '../temp', filename);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create CSV writer
    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'employeeName', title: 'Employee Name' },
        { id: 'date', title: 'Date' },
        { id: 'time', title: 'Time' },
        { id: 'attendanceType', title: 'Attendance Type' },
        { id: 'location', title: 'Location' },
        { id: 'distance', title: 'Distance (m)' },
        { id: 'accuracy', title: 'GPS Accuracy (m)' },
        { id: 'isWithinGeofence', title: 'Valid Location' },
        { id: 'deviceInfo', title: 'Device Info' }
      ]
    });

    // Transform data for CSV
    const csvData = records.map(record => ({
      employeeName: record.employee?.name || 'Unknown',
      date: new Date(record.timestamp).toLocaleDateString('en-IN'),
      time: new Date(record.timestamp).toLocaleTimeString('en-IN'),
      attendanceType: record.attendanceType?.replace('_', ' ').toUpperCase() || 'Unknown',
      location: record.location?.address || 'No address',
      distance: record.location?.distance ? Math.round(record.location.distance) : 'N/A',
      accuracy: record.location?.accuracy ? Math.round(record.location.accuracy) : 'N/A',
      isWithinGeofence: record.isWithinGeofence ? 'Yes' : 'No',
      deviceInfo: record.deviceInfo?.userAgent || 'Unknown'
    }));

    // Write CSV file
    await csvWriter.writeRecords(csvData);

    // Send file for download
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending CSV file:', err);
      }
      
      // Clean up temporary file
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 10000); // Delete after 10 seconds
    });

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ message: 'Failed to export CSV' });
  }
});

// Generate and email monthly report
router.get('/export/monthly', async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all attendance records for last month
    const records = await Attendance.find({
      timestamp: { $gte: lastMonth, $lt: thisMonth }
    }).populate('employee', 'name').sort({ timestamp: 1 });

    // Group by employee
    const employeeData = {};
    records.forEach(record => {
      const empId = record.employee?._id?.toString();
      const empName = record.employee?.name || 'Unknown';
      
      if (!employeeData[empId]) {
        employeeData[empId] = {
          name: empName,
          checkIns: 0,
          checkOuts: 0,
          breakStarts: 0,
          breakEnds: 0,
          totalRecords: 0,
          records: []
        };
      }
      
      employeeData[empId].totalRecords++;
      employeeData[empId][record.attendanceType.replace('_', '') + 's']++;
      employeeData[empId].records.push({
        date: new Date(record.timestamp).toLocaleDateString('en-IN'),
        time: new Date(record.timestamp).toLocaleTimeString('en-IN'),
        type: record.attendanceType,
        location: record.location?.address || 'No address',
        valid: record.isWithinGeofence
      });
    });

    // Generate CSV for monthly report
    const monthName = lastMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const filename = `monthly_attendance_report_${monthName.replace(' ', '_')}.csv`;
    const filepath = path.join(__dirname, '../temp', filename);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create detailed CSV
    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'employeeName', title: 'Employee Name' },
        { id: 'date', title: 'Date' },
        { id: 'time', title: 'Time' },
        { id: 'attendanceType', title: 'Type' },
        { id: 'location', title: 'Location' },
        { id: 'valid', title: 'Valid' }
      ]
    });

    // Transform data for CSV
    const csvData = [];
    Object.values(employeeData).forEach(emp => {
      emp.records.forEach(record => {
        csvData.push({
          employeeName: emp.name,
          date: record.date,
          time: record.time,
          attendanceType: record.type.replace('_', ' ').toUpperCase(),
          location: record.location,
          valid: record.valid ? 'Yes' : 'No'
        });
      });
    });

    await csvWriter.writeRecords(csvData);

    // Send email with attachment
    const transporter = nodemailer.createTransporter(emailConfig);

    // Create summary
    const summary = Object.values(employeeData).map(emp => 
      `${emp.name}: ${emp.totalRecords} records (Check-ins: ${emp.checkIns}, Check-outs: ${emp.checkOuts})`
    ).join('\n');

    const mailOptions = {
      from: process.env.SMTP_USER || 'system@company.com',
      to: 'manoharbachu@gmail.com',
      subject: `Monthly Attendance Report - ${monthName}`,
      text: `Please find the monthly attendance report for ${monthName}.\n\nSummary:\n${summary}\n\nTotal employees: ${Object.keys(employeeData).length}\nTotal records: ${records.length}`,
      attachments: [
        {
          filename: filename,
          path: filepath
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    // Clean up file
    setTimeout(() => {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }, 60000); // Delete after 1 minute

    res.json({
      message: 'Monthly report generated and sent successfully',
      email: 'manoharbachu@gmail.com',
      records: records.length,
      employees: Object.keys(employeeData).length
    });

  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ message: 'Failed to generate monthly report' });
  }
});

// Manual trigger for monthly report (for testing)
router.post('/trigger/monthly-report', async (req, res) => {
  try {
    if (!global.monthlyScheduler) {
      return res.status(500).json({ message: 'Monthly scheduler not initialized' });
    }

    const { period = 'last' } = req.body; // 'last' or 'current'
    
    let result;
    if (period === 'current') {
      result = await global.monthlyScheduler.generateCurrentMonthReport();
    } else {
      result = await global.monthlyScheduler.generateLastMonthReport();
    }

    res.json(result);
  } catch (error) {
    console.error('Error triggering monthly report:', error);
    res.status(500).json({ message: 'Failed to trigger monthly report', error: error.message });
  }
});

module.exports = router;
