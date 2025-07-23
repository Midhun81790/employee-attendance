# LocationIQ API Setup Guide

## 🗺️ Setting up LocationIQ + Leaflet.js for Location Detection

This guide will help you set up **LocationIQ API** for reliable location detection in your employee attendance system.

## 🆓 Getting a Free LocationIQ API Token

### Step 1: Sign up for LocationIQ
1. Go to [locationiq.com](https://locationiq.com/)
2. Click "Sign Up" (Free tier: 5,000 requests/day)
3. Create your account with email verification

### Step 2: Get Your API Token
1. After signing up, go to your **Dashboard**
2. Navigate to **"Access Tokens"**
3. Copy your **"pk...."** token (this is your public token)

### Step 3: Update Your Environment Variables
1. Open your `.env` file
2. Find the line: `LOCATIONIQ_TOKEN=pk.test.your_locationiq_token_here`
3. Replace it with your actual token: `LOCATIONIQ_TOKEN=pk.your_actual_token_here`

## 🔧 Features of LocationIQ + Leaflet.js Integration

### ✅ Multiple Detection Methods
1. **GPS + LocationIQ Reverse Geocoding** - Most accurate
2. **IP Location + LocationIQ** - Good fallback
3. **Manual Map Picker** - User selects location on map
4. **Development Mode** - Instant coordinates for localhost

### 🌐 Browser Compatibility
- Works on all modern browsers
- Mobile-optimized detection
- No external dependencies (except LocationIQ API)

### 🚀 Performance Benefits
- **Fast detection** - Multiple fallback methods
- **Reliable addresses** - LocationIQ reverse geocoding
- **Interactive maps** - Leaflet.js integration
- **Production ready** - Handles API failures gracefully

## 📱 Testing the Location Detection

### For Development (localhost):
1. Start your server: `npm start`
2. Go to employee attendance page
3. Location will be detected instantly with default coordinates

### For Production Testing:
1. Use the coordinate picker: http://localhost:3000/get-coordinates.html
2. Test different detection methods
3. Verify accuracy and addresses

## 🛠️ Files Updated

### New Files:
- `public/js/locationiq-detector.js` - Main LocationIQ detection class
- `LOCATIONIQ_SETUP.md` - This setup guide

### Updated Files:
- `views/employee/mark_attendance.ejs` - Uses LocationIQ detection
- `get-coordinates.html` - Enhanced with map picker
- `routes/employee.js` - Passes LocationIQ token
- `.env` - Added LOCATIONIQ_TOKEN variable

## 🔍 How It Works

### Location Detection Flow:
```
1. Check if development mode → Use instant coordinates  
   ↓
2. Try GPS + LocationIQ reverse geocoding → Get accurate location + address
   ↓  
3. Try IP location + LocationIQ → Get city-level location + address
   ↓
4. Show manual map picker → User selects location on map
```

### Address Enhancement:
- GPS coordinates → LocationIQ API → Full address
- IP location → LocationIQ API → Detailed address
- Manual selection → LocationIQ reverse geocoding → Address

## 🆓 Free Tier Limits

**LocationIQ Free Tier:**
- 5,000 requests per day
- No credit card required
- Reverse geocoding included
- Global coverage

**Usage Tips:**
- Cache location results when possible
- Use development mode for testing
- Production deployment optimized for API efficiency

## 🚀 Ready to Test!

After setting up your LocationIQ token:

1. **Employee Attendance**: Location detection will work reliably on mobile and desktop
2. **Get Coordinates Tool**: Enhanced with interactive map picker
3. **Production Ready**: Handles all edge cases and API failures

The system now uses **LocationIQ + Leaflet.js** for robust, reliable location detection! 🎯
