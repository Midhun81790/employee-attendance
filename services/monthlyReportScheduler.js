// services/monthlyReportScheduler.js - Automated Monthly Report Service
const cron = require('node-cron');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const WhatsAppService = require('./whatsappService');

class MonthlyReportScheduler {
  constructor() {
    this.emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    };
    
    // Initialize WhatsApp service
    this.whatsappService = new WhatsAppService();
    
    // Only create transporter if credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport(this.emailConfig);
    } else {
      console.log('⚠️  Email credentials not configured. Monthly reports will not be sent automatically.');
      this.transporter = null;
    }
    
    this.tempDir = path.join(__dirname, '../temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async generateMonthlyReport(year, month) {
    try {
      console.log(`📊 Generating monthly report for ${month}/${year}...`);
      
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      
      // Get all attendance records for the month
      const records = await Attendance.find({
        timestamp: { $gte: startDate, $lt: endDate }
      }).populate('employee', 'name').sort({ timestamp: 1 });

      // Get all employees for summary
      const allEmployees = await Employee.find({}, 'name');
      
      // Group data by employee
      const employeeData = {};
      const employeeStats = {};
      
      // Initialize all employees
      allEmployees.forEach(emp => {
        employeeData[emp._id.toString()] = {
          name: emp.name,
          records: []
        };
        employeeStats[emp._id.toString()] = {
          name: emp.name,
          totalDays: 0,
          checkIns: 0,
          checkOuts: 0,
          breakStarts: 0,
          breakEnds: 0,
          validRecords: 0,
          invalidRecords: 0
        };
      });

      // Process attendance records
      records.forEach(record => {
        const empId = record.employee?._id?.toString();
        if (empId && employeeData[empId]) {
          const recordData = {
            date: new Date(record.timestamp).toLocaleDateString('en-IN'),
            time: new Date(record.timestamp).toLocaleTimeString('en-IN'),
            type: record.attendanceType,
            location: record.location?.address || 'No address',
            distance: record.location?.distance ? Math.round(record.location.distance) : 'N/A',
            valid: record.isWithinGeofence,
            accuracy: record.location?.accuracy ? Math.round(record.location.accuracy) : 'N/A'
          };
          
          employeeData[empId].records.push(recordData);
          
          // Update statistics
          const stats = employeeStats[empId];
          if (record.attendanceType === 'check_in') stats.checkIns++;
          else if (record.attendanceType === 'check_out') stats.checkOuts++;
          else if (record.attendanceType === 'break_start') stats.breakStarts++;
          else if (record.attendanceType === 'break_end') stats.breakEnds++;
          
          if (record.isWithinGeofence) stats.validRecords++;
          else stats.invalidRecords++;
        }
      });

      // Calculate working days for each employee
      Object.keys(employeeStats).forEach(empId => {
        const empRecords = employeeData[empId].records;
        const uniqueDates = [...new Set(empRecords.map(r => r.date))];
        employeeStats[empId].totalDays = uniqueDates.length;
      });

      const monthName = new Date(year, month - 1).toLocaleDateString('en-IN', { 
        month: 'long', 
        year: 'numeric' 
      });

      // Generate files
      const files = await this.generateReportFiles(employeeData, employeeStats, monthName, records.length);
      
      // Send email
      await this.sendMonthlyEmail(files, monthName, employeeStats);
      
      // Cleanup files
      this.cleanupFiles(files);
      
      console.log(`✅ Monthly report for ${monthName} sent successfully!`);
      return {
        success: true,
        message: `Monthly report for ${monthName} generated and sent`,
        totalRecords: records.length,
        totalEmployees: allEmployees.length
      };
      
    } catch (error) {
      console.error('❌ Error generating monthly report:', error);
      throw error;
    }
  }

  async generateReportFiles(employeeData, employeeStats, monthName, totalRecords) {
    const files = [];
    
    // 1. Detailed attendance records CSV
    const detailsFile = path.join(this.tempDir, `detailed_attendance_${monthName.replace(' ', '_')}.csv`);
    const detailsCsvWriter = createCsvWriter({
      path: detailsFile,
      header: [
        { id: 'employeeName', title: 'Employee Name' },
        { id: 'date', title: 'Date' },
        { id: 'time', title: 'Time' },
        { id: 'type', title: 'Attendance Type' },
        { id: 'location', title: 'Location' },
        { id: 'distance', title: 'Distance (m)' },
        { id: 'accuracy', title: 'GPS Accuracy (m)' },
        { id: 'valid', title: 'Valid Location' }
      ]
    });

    const detailsData = [];
    Object.values(employeeData).forEach(emp => {
      emp.records.forEach(record => {
        detailsData.push({
          employeeName: emp.name,
          date: record.date,
          time: record.time,
          type: record.type.replace('_', ' ').toUpperCase(),
          location: record.location,
          distance: record.distance,
          accuracy: record.accuracy,
          valid: record.valid ? 'Yes' : 'No'
        });
      });
    });

    await detailsCsvWriter.writeRecords(detailsData);
    files.push(detailsFile);

    // 2. Employee summary CSV
    const summaryFile = path.join(this.tempDir, `employee_summary_${monthName.replace(' ', '_')}.csv`);
    const summaryCsvWriter = createCsvWriter({
      path: summaryFile,
      header: [
        { id: 'employeeName', title: 'Employee Name' },
        { id: 'totalDays', title: 'Working Days' },
        { id: 'checkIns', title: 'Check-ins' },
        { id: 'checkOuts', title: 'Check-outs' },
        { id: 'breakStarts', title: 'Break Starts' },
        { id: 'breakEnds', title: 'Break Ends' },
        { id: 'validRecords', title: 'Valid Records' },
        { id: 'invalidRecords', title: 'Invalid Records' },
        { id: 'totalRecords', title: 'Total Records' }
      ]
    });

    const summaryData = Object.values(employeeStats).map(stats => ({
      employeeName: stats.name,
      totalDays: stats.totalDays,
      checkIns: stats.checkIns,
      checkOuts: stats.checkOuts,
      breakStarts: stats.breakStarts,
      breakEnds: stats.breakEnds,
      validRecords: stats.validRecords,
      invalidRecords: stats.invalidRecords,
      totalRecords: stats.validRecords + stats.invalidRecords
    }));

    await summaryCsvWriter.writeRecords(summaryData);
    files.push(summaryFile);

    // 3. Create ZIP archive
    const zipFile = path.join(this.tempDir, `monthly_attendance_report_${monthName.replace(' ', '_')}.zip`);
    await this.createZipArchive(files, zipFile);
    
    return [zipFile];
  }

  async createZipArchive(files, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', reject);

      archive.pipe(output);

      files.forEach(file => {
        archive.file(file, { name: path.basename(file) });
      });

      archive.finalize();
    });
  }

  async sendMonthlyEmail(files, monthName, employeeStats) {
    if (!this.transporter) {
      console.log('⚠️  Email not configured. Skipping email send.');
      return;
    }

    const totalEmployees = Object.keys(employeeStats).length;
    const activeEmployees = Object.values(employeeStats).filter(s => s.totalRecords > 0).length;
    const totalRecords = Object.values(employeeStats).reduce((sum, s) => sum + s.totalRecords, 0);
    
    // Create summary text
    const employeeSummary = Object.values(employeeStats)
      .filter(s => s.totalRecords > 0)
      .map(s => `• ${s.name}: ${s.totalDays} days, ${s.totalRecords} records (${s.validRecords} valid, ${s.invalidRecords} invalid)`)
      .join('\n');

    const mailOptions = {
      from: process.env.SMTP_USER || 'system@company.com',
      to: 'manoharbachu@gmail.com',
      subject: `📊 Monthly Attendance Report - ${monthName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            📊 Monthly Attendance Report - ${monthName}
          </h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">📈 Summary Statistics</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="padding: 5px 0;"><strong>Total Employees:</strong> ${totalEmployees}</li>
              <li style="padding: 5px 0;"><strong>Active Employees:</strong> ${activeEmployees}</li>
              <li style="padding: 5px 0;"><strong>Total Records:</strong> ${totalRecords}</li>
              <li style="padding: 5px 0;"><strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-IN')}</li>
            </ul>
          </div>

          <div style="background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">👥 Employee Summary</h3>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${employeeSummary || 'No attendance records found for this month.'}</pre>
          </div>

          <div style="background: #e8f5e8; border: 1px solid #28a745; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #155724; margin-top: 0;">📎 Attached Files</h4>
            <ul style="margin: 0;">
              <li>Detailed attendance records (CSV)</li>
              <li>Employee summary statistics (CSV)</li>
            </ul>
          </div>

          <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; color: #6c757d; font-size: 12px;">
            <p>This is an automated monthly report generated by the Employee Attendance System.</p>
            <p>For questions or issues, please contact the system administrator.</p>
          </div>
        </div>
      `,
      attachments: files.map(file => ({
        filename: path.basename(file),
        path: file
      }))
    };

    await this.transporter.sendMail(mailOptions);
  }

  cleanupFiles(files) {
    files.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  }

  startScheduler() {
    // Run on the 1st day of every month at 9:00 AM
    cron.schedule('0 9 1 * *', async () => {
      try {
        const now = new Date();
        const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        
        console.log(`🚀 Starting automated monthly report generation...`);
        await this.generateMonthlyReport(year, lastMonth);
      } catch (error) {
        console.error('❌ Automated monthly report failed:', error);
      }
    });

    // Send daily WhatsApp summary at 8:00 PM every day
    cron.schedule('0 20 * * *', async () => {
      try {
        console.log('📱 Generating daily WhatsApp summary...');
        await this.sendDailyWhatsAppSummary();
      } catch (error) {
        console.error('❌ Daily WhatsApp summary failed:', error);
      }
    });

    console.log('📅 Monthly report scheduler started - Reports will be sent on the 1st of each month at 9:00 AM');
    console.log('📱 Daily WhatsApp summary scheduled - Summaries will be sent at 8:00 PM every day');
  }

  // Send daily WhatsApp summary
  async sendDailyWhatsAppSummary() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      // Get today's attendance records (only valid location ones)
      const todaysRecords = await Attendance.find({
        timestamp: { $gte: startOfDay, $lt: endOfDay },
        isWithinGeofence: true
      }).populate('employee', 'name');

      if (todaysRecords.length > 0) {
        const dateStr = today.toLocaleDateString('en-IN');
        await this.whatsappService.sendDailySummary(dateStr, todaysRecords);
        console.log(`✅ Daily WhatsApp summary sent for ${dateStr}`);
      } else {
        console.log('ℹ️  No valid attendance records today, skipping daily summary');
      }
    } catch (error) {
      console.error('❌ Error sending daily WhatsApp summary:', error);
    }
  }

  // Manual trigger for testing
  async generateCurrentMonthReport() {
    const now = new Date();
    return await this.generateMonthlyReport(now.getFullYear(), now.getMonth() + 1);
  }

  async generateLastMonthReport() {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return await this.generateMonthlyReport(year, lastMonth);
  }
}

module.exports = MonthlyReportScheduler;
