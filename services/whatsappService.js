// services/notificationService.js - Simple & Reliable Notification System
const axios = require('axios');

class NotificationService {
  constructor() {
    this.adminPhone = process.env.ADMIN_WHATSAPP_NUMBER || '918179098630';
    this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
    this.webhookUrl = process.env.WEBHOOK_URL; // Optional webhook for notifications
    this.isReady = true; // Always ready since we're using simple methods
    
    console.log(`📱 Notification service initialized for admin: ${this.adminPhone}`);
    
    if (this.telegramBotToken && this.telegramChatId) {
      console.log('✅ Telegram notifications enabled - You will get phone notifications!');
    } else if (this.webhookUrl) {
      console.log('✅ Webhook notifications enabled');
    } else {
      console.log('✅ Using console logging + email notifications (reliable & free)');
      console.log('💡 Tip: Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env for phone notifications');
    }
  }

  // Send immediate attendance notification
  async sendAttendanceNotification(employeeName, attendanceType, timestamp, location, isValidLocation) {
    try {
      // Only send notification if employee is at valid location
      if (!isValidLocation) {
        console.log(`⚠️  Skipping notification for ${employeeName} - Not at valid location`);
        return { success: false, message: 'Invalid location' };
      }

      const time = new Date(timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      const date = new Date(timestamp).toLocaleDateString('en-IN');
      
      // Create appropriate message based on attendance type
      let message = '';
      let emoji = '';
      
      switch (attendanceType) {
        case 'check_in':
        case 'MORNING_ENTRY':
          emoji = '🟢';
          message = `${emoji} MORNING ENTRY - ${employeeName} has checked in at ${time} on ${date}. Status: Present at Shop ✅`;
          break;
        case 'check_out':
        case 'END_EXIT':
          emoji = '🔴';
          message = `${emoji} EVENING EXIT - ${employeeName} has checked out at ${time} on ${date}. Status: Left Shop ✅`;
          break;
        case 'break_start':
        case 'LUNCH_EXIT':
          emoji = '🟡';
          message = `${emoji} LUNCH BREAK - ${employeeName} started lunch break at ${time} on ${date}. Status: On Break ⏸️`;
          break;
        case 'break_end':
        case 'LUNCH_ENTRY':
          emoji = '🟢';
          message = `${emoji} BACK FROM LUNCH - ${employeeName} returned from lunch at ${time} on ${date}. Status: Back to Work ▶️`;
          break;
        default:
          message = `📋 ATTENDANCE UPDATE - ${employeeName} marked attendance at ${time} on ${date}. Status: Present at Shop`;
      }

      // Console notification (always works)
      console.log('\n' + '='.repeat(80));
      console.log(`📱 ADMIN NOTIFICATION (${this.adminPhone})`);
      console.log(`${message}`);
      console.log('='.repeat(80) + '\n');

      // Send Telegram notification if configured
      if (this.telegramBotToken && this.telegramChatId) {
        try {
          await this.sendTelegramMessage(message);
          console.log('✅ Telegram notification sent to your phone!');
        } catch (telegramError) {
          console.log('⚠️  Telegram notification failed:', telegramError.message);
        }
      }

      // Try webhook notification if configured
      if (this.webhookUrl) {
        try {
          await axios.post(this.webhookUrl, {
            phone: this.adminPhone,
            message: message,
            employee: employeeName,
            type: attendanceType,
            timestamp: timestamp
          });
          console.log('✅ Webhook notification sent successfully');
        } catch (webhookError) {
          console.log('⚠️  Webhook notification failed:', webhookError.message);
        }
      }

      return {
        success: true,
        to: this.adminPhone,
        employee: employeeName,
        type: attendanceType,
        method: 'console_log'
      };

    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send daily summary
  async sendDailySummary(date, attendanceRecords) {
    try {
      // Filter only valid location records
      const validRecords = attendanceRecords.filter(record => record.isWithinGeofence);
      
      if (validRecords.length === 0) {
        console.log('ℹ️  No valid attendance records for daily summary');
        return { success: false, message: 'No valid records' };
      }

      // Group by employee
      const employeeSummary = {};
      validRecords.forEach(record => {
        const empName = record.employee?.name || 'Unknown';
        if (!employeeSummary[empName]) {
          employeeSummary[empName] = {
            checkIn: null,
            checkOut: null,
            breaks: 0
          };
        }
        
        const timeStr = new Date(record.timestamp).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        if (record.attendanceType === 'check_in' || record.attendanceType === 'MORNING_ENTRY') {
          employeeSummary[empName].checkIn = timeStr;
        } else if (record.attendanceType === 'check_out' || record.attendanceType === 'END_EXIT') {
          employeeSummary[empName].checkOut = timeStr;
        } else if (record.attendanceType === 'break_start' || record.attendanceType === 'LUNCH_EXIT') {
          employeeSummary[empName].breaks++;
        }
      });

      // Create summary message
      let summary = `📊 DAILY ATTENDANCE SUMMARY - ${date}\n`;
      
      const employeeList = Object.entries(employeeSummary);
      if (employeeList.length > 0) {
        summary += `👥 Present Employees (${employeeList.length}):\n\n`;
        
        employeeList.forEach(([name, data]) => {
          summary += `👤 ${name}\n`;
          if (data.checkIn) summary += `   🟢 In: ${data.checkIn}\n`;
          if (data.checkOut) summary += `   🔴 Out: ${data.checkOut}\n`;
          if (data.breaks > 0) summary += `   ☕ Breaks: ${data.breaks}\n`;
          summary += '\n';
        });
      } else {
        summary += `❌ No employees present today at shop location.\n`;
      }

      summary += `📍 Note: Only shop location attendance counted\n`;
      summary += `⏰ Report Time: ${new Date().toLocaleTimeString('en-IN')}\n`;

      // Console summary (always works)
      console.log('\n' + '='.repeat(100));
      console.log(`📱 DAILY SUMMARY FOR ADMIN (${this.adminPhone})`);
      console.log(summary);
      console.log('='.repeat(100) + '\n');

      // Send Telegram summary if configured
      if (this.telegramBotToken && this.telegramChatId) {
        try {
          await this.sendTelegramMessage(summary);
          console.log('✅ Daily summary sent to your Telegram!');
        } catch (telegramError) {
          console.log('⚠️  Telegram daily summary failed:', telegramError.message);
        }
      }

      // Try webhook if configured
      if (this.webhookUrl) {
        try {
          await axios.post(this.webhookUrl, {
            phone: this.adminPhone,
            message: summary,
            type: 'daily_summary',
            date: date,
            employeeCount: employeeList.length
          });
          console.log('✅ Daily summary webhook sent successfully');
        } catch (webhookError) {
          console.log('⚠️  Daily summary webhook failed:', webhookError.message);
        }
      }

      return {
        success: true,
        employeeCount: employeeList.length,
        to: this.adminPhone,
        method: 'console_log'
      };

    } catch (error) {
      console.error('❌ Error sending daily summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const testMessage = `🧪 TEST NOTIFICATION\n\nEmployee Attendance System notification service is working!\n\nTime: ${new Date().toLocaleString('en-IN')}\nAdmin Phone: ${this.adminPhone}\n\n✅ Console logging is active and reliable!`;
      
      console.log('\n' + '='.repeat(80));
      console.log(`📱 TEST NOTIFICATION FOR ADMIN (${this.adminPhone})`);
      console.log(testMessage);
      console.log('='.repeat(80) + '\n');

      if (this.webhookUrl) {
        await axios.post(this.webhookUrl, {
          phone: this.adminPhone,
          message: testMessage,
          type: 'test'
        });
      }

      return {
        success: true,
        message: 'Test notification sent successfully via console',
        to: this.adminPhone,
        method: 'console_log'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to send test notification'
      };
    }
  }

  // Telegram helper method
  async sendTelegramMessage(message) {
    if (!this.telegramBotToken || !this.telegramChatId) {
      throw new Error('Telegram not configured');
    }

    const telegramUrl = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
    
    const response = await axios.post(telegramUrl, {
      chat_id: this.telegramChatId,
      text: `🏢 *EMPLOYEE ATTENDANCE ALERT*\n\n${message}`,
      parse_mode: 'Markdown'
    });

    return response.data;
  }

  // Get connection status
  getStatus() {
    return { 
      status: 'ready', 
      message: 'Notification service is ready (console logging + optional webhook)',
      adminPhone: this.adminPhone,
      webhookConfigured: !!this.webhookUrl
    };
  }
}

module.exports = NotificationService;
