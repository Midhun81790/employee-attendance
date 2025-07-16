# 🕐 Employee Attendance System

A comprehensive **Face Recognition** and **Geolocation-based** employee attendance management system with advanced reporting and automated email features.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

## ✨ Features

### 🔐 Core Attendance System
- **Face Recognition Authentication** using face-api.js
- **Strict Geofence Enforcement** (50m radius from office)
- **Real-time Location Validation** with GPS accuracy
- **Multi-type Attendance** (Check-in, Check-out, Break Start/End)
- **Secure Admin Dashboard** with employee management

### 📊 Advanced Reporting & Analytics
- **Real-time Statistics Dashboard** with live metrics
- **Advanced Filtering System** (Date range, Employee, Type)
- **CSV Export Functionality** with filtered data
- **Automated Monthly Reports** via email
- **Employee Performance Analytics**

### 🚀 Modern Technology Stack
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: EJS, Bootstrap 5, Face-api.js
- **Email**: Nodemailer with Gmail integration
- **Scheduling**: Node-cron for automated tasks
- **Security**: Session management, HTTPS-ready

## 🚀 Quick Deploy to Render

### Prerequisites
1. **MongoDB Atlas** account (free tier available)
2. **Gmail** account with App Password enabled
3. **GitHub** account for code repository

### One-Click Deploy Steps

#### 1. **MongoDB Atlas Setup**
```bash
# Create free cluster at https://cloud.mongodb.com
# Add network access: 0.0.0.0/0 (for Render)
# Create database user and get connection string
```

#### 2. **Gmail App Password Setup**
```bash
# Enable 2-Factor Authentication
# Generate App Password: https://myaccount.google.com/apppasswords
# Use App Password (not regular password) for SMTP_PASS
```

#### 3. **Deploy to Render**
1. Fork this repository to your GitHub
2. Connect GitHub repo to Render
3. Add environment variables (see below)
4. Deploy!

### Environment Variables for Render
```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/employee-attendance

# Security
SESSION_SECRET=your-super-secret-production-key
NODE_ENV=production

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

### Render Service Configuration
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Environment**: Node
- **Auto-Deploy**: Enabled

## 🛠️ Local Development

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/employee-attendance.git
cd employee-attendance

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configurations
# Start development server
npm run dev
```

### Local Environment Setup
```env
MONGO_URI=mongodb://localhost:27017/employee-attendance
SESSION_SECRET=local-development-secret
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
NODE_ENV=development
PORT=3000
```

## 📱 Usage Guide

### For Administrators
1. **Access Dashboard**: `https://your-app.onrender.com/dashboard`
2. **Manage Employees**: Add/edit employee profiles
3. **View Attendance**: Real-time filtering and analytics
4. **Export Reports**: CSV downloads and automated emails
5. **System Settings**: Configure geofence and email settings

### For Employees
1. **Mark Attendance**: `https://your-app.onrender.com/employee`
2. **Face Recognition**: Camera-based authentication
3. **Location Validation**: Automatic GPS verification
4. **Attendance Types**: Check-in, Check-out, Breaks

## 🔧 API Endpoints

### Attendance Management
```javascript
GET  /api/attendance/filtered     # Get filtered attendance records
GET  /api/attendance/statistics   # Get dashboard statistics  
GET  /api/attendance/export/csv   # Export CSV with filters
POST /api/attendance/trigger/monthly-report  # Manual monthly report
```

### Employee Portal
```javascript
POST /employee/mark-attendance    # Mark attendance with face recognition
GET  /employee                   # Employee portal access
```

## 🛡️ Security Features

- **Strict Geofence Enforcement**: 50m radius validation
- **Face Recognition Authentication**: Prevents proxy attendance
- **Session Management**: Secure admin authentication
- **HTTPS-Ready**: Production security headers
- **Input Validation**: Comprehensive data validation

## 📧 Automated Reporting

### Monthly Email Reports
- **Automatic Generation**: 1st of every month at 9:00 AM
- **Comprehensive Data**: Employee statistics and detailed records
- **ZIP Archives**: Organized CSV files with summaries
- **Email Integration**: Direct delivery to specified recipients

### Manual Report Generation
```bash
# Trigger monthly report manually
POST /api/attendance/trigger/monthly-report
{
  "period": "last"  // or "current"
}
```

## 🎯 Production Considerations

### Performance Optimizations
- **MongoDB Indexing**: Optimized queries for large datasets
- **Pagination**: Efficient data loading for large records
- **Caching**: Session and static file caching
- **Compression**: Gzip compression enabled

### Monitoring & Maintenance
- **Health Checks**: Built-in endpoint monitoring
- **Error Logging**: Comprehensive error tracking
- **Automated Cleanup**: Temporary file management
- **Database Backup**: Regular MongoDB backups recommended

## 🆘 Troubleshooting

### Common Issues

#### Geolocation Not Working
```bash
# Ensure HTTPS is enabled in production
# Check browser location permissions
# Verify GPS accuracy settings
```

#### Email Reports Not Sending
```bash
# Verify Gmail App Password
# Check SMTP environment variables
# Ensure 2FA is enabled on Gmail
```

#### Face Recognition Issues
```bash
# Ensure camera permissions
# Check HTTPS requirement
# Verify model files are accessible
```

## 📝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support and questions:
- **Issues**: GitHub Issues tab
- **Documentation**: Check deployment guides
- **Email**: Contact project maintainers

---

**Made with ❤️ for modern workforce management**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)
