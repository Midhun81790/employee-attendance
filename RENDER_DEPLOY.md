# Render Configuration for Employee Attendance System

## Environment Variables Required:

### Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/employee-attendance

### Session Security
SESSION_SECRET=your-super-secret-session-key-for-production

### Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

### Application
NODE_ENV=production
PORT=10000

## Render Service Settings:
- Build Command: npm run build
- Start Command: npm start
- Environment: Node
- Auto-Deploy: Yes

## Email Setup for Gmail:
1. Enable 2-Factor Authentication on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password (not regular password) for SMTP_PASS

## MongoDB Atlas Setup:
1. Create free cluster at https://cloud.mongodb.com
2. Add IP 0.0.0.0/0 to network access (for Render)
3. Create database user
4. Get connection string and add to MONGO_URI

## Deployment Steps:
1. Push code to GitHub
2. Connect GitHub repo to Render
3. Add environment variables
4. Deploy!
