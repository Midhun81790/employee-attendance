# Employee Attendance System - Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Render (Recommended - Free)

1. **Prepare your code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub:**
   - Create a new repository on GitHub
   - Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/employee-attendance.git
   git push -u origin main
   ```

3. **Deploy on Render:**
   - Go to [render.com](https://render.com)
   - Sign up/login with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: employee-attendance-system
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   
4. **Set Environment Variables:**
   ```
   NODE_ENV=production
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/attendanceDB
   ADMIN_EMAIL=admin@yourcompany.com
   ADMIN_PASSWORD=YourSecurePassword123
   SESSION_SECRET=your-super-secure-random-key
   ```

5. **Setup MongoDB Atlas:**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Create free cluster
   - Get connection string
   - Whitelist Render IPs (0.0.0.0/0 for simplicity)

### Option 2: Railway

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Add Environment Variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set MONGO_URI=your_mongodb_atlas_uri
   railway variables set ADMIN_EMAIL=admin@yourcompany.com
   railway variables set ADMIN_PASSWORD=YourSecurePassword123
   railway variables set SESSION_SECRET=your-super-secure-random-key
   ```

### Option 3: Heroku

1. **Install Heroku CLI and login:**
   ```bash
   heroku login
   ```

2. **Create and deploy:**
   ```bash
   heroku create employee-attendance-system
   git push heroku main
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGO_URI=your_mongodb_atlas_uri
   heroku config:set ADMIN_EMAIL=admin@yourcompany.com
   heroku config:set ADMIN_PASSWORD=YourSecurePassword123
   heroku config:set SESSION_SECRET=your-super-secure-random-key
   ```

### Option 4: Docker Deployment

1. **Build Docker image:**
   ```bash
   docker build -t employee-attendance .
   ```

2. **Run container:**
   ```bash
   docker run -p 3000:3000 \
     -e NODE_ENV=production \
     -e MONGO_URI=your_mongodb_uri \
     -e ADMIN_EMAIL=admin@company.com \
     -e ADMIN_PASSWORD=password \
     -e SESSION_SECRET=secret \
     employee-attendance
   ```

## 📱 Mobile Setup Requirements

### For Mobile Geolocation & Camera:

1. **HTTPS is Required:**
   - All modern browsers require HTTPS for geolocation and camera access
   - Free SSL is included with Render, Railway, and Heroku

2. **Domain Setup:**
   - Use provided subdomain (e.g., `your-app.onrender.com`)
   - Or configure custom domain with SSL

3. **Test on Mobile:**
   - Open deployed URL on mobile browser
   - Grant location and camera permissions when prompted
   - Verify geolocation accuracy and face recognition

## 🔧 Post-Deployment Setup

1. **Access Admin Panel:**
   - Go to `https://your-domain.com`
   - Login with admin credentials set in environment variables

2. **Register Employees:**
   - Use face recognition registration
   - Create employee credentials for portal access

3. **Test Employee Portal:**
   - Go to `https://your-domain.com/employee`
   - Test login and attendance marking

## 🛡️ Security Checklist

- ✅ Change default admin password
- ✅ Use strong SESSION_SECRET
- ✅ MongoDB connection secured
- ✅ HTTPS enabled
- ✅ Environment variables configured
- ✅ Firewall rules applied (if using VPS)

## 📊 Monitoring

- Check application logs in platform dashboard
- Monitor MongoDB Atlas metrics
- Set up uptime monitoring (UptimeRobot, etc.)

## 🆘 Troubleshooting

### Common Issues:

1. **Face models not loading:**
   - Ensure `/public/models/` files are deployed
   - Check HTTPS is working

2. **Geolocation not working:**
   - Verify HTTPS deployment
   - Check mobile browser permissions

3. **MongoDB connection issues:**
   - Verify Atlas whitelist settings
   - Check connection string format

4. **Session issues:**
   - Ensure SESSION_SECRET is set
   - Check cookie settings for HTTPS

## 🎯 Recommended: Render Deployment

Render is recommended because:
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Easy GitHub integration
- ✅ Good performance
- ✅ Simple environment variable management

**Estimated setup time: 15-30 minutes**
