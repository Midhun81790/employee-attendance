# 📱 Get Attendance Notifications on Your Phone (FREE)

## Quick Setup - 5 Minutes to Get Phone Notifications!

### Step 1: Create Telegram Bot (2 minutes)
1. Open Telegram app on your phone
2. Search for `@BotFather` and start chat
3. Send `/newbot` command
4. Choose a name: `Employee Attendance Bot`
5. Choose username: `your_attendance_bot` (must end with 'bot')
6. Copy the **Bot Token** (looks like: `123456789:ABCdefGHIjklMNOpqrSTUvwxyz`)

### Step 2: Get Your Chat ID (1 minute)
1. Search for `@userinfobot` in Telegram
2. Start chat and send any message
3. Copy your **Chat ID** (looks like: `123456789`)

### Step 3: Add to Environment Variables (1 minute)
Add these lines to your `.env` file:

```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxyz
TELEGRAM_CHAT_ID=123456789
```

### Step 4: Restart Application (30 seconds)
```
npm start
```

## ✅ You're Done! 

Now you'll get **instant notifications** on your phone for:
- ✅ Employee check-in/check-out
- 📊 Daily attendance summaries
- 🚨 Invalid location attempts

## 📱 What You'll Receive:

```
🏢 EMPLOYEE ATTENDANCE ALERT

🟢 MORNING ENTRY - John Doe has checked in at 9:15 AM on 22/07/2025. Status: Present at Shop ✅
```

## 🔒 Security Benefits:
- ✅ FREE forever (no API costs)
- ✅ End-to-end encrypted
- ✅ Works from anywhere in the world
- ✅ Instant delivery
- ✅ No connection issues

## 🆘 Alternative Options:

### Option 2: Email Notifications
Add to `.env`:
```
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Option 3: Webhook Integration
For Slack, Discord, or custom systems:
```
WEBHOOK_URL=https://your-webhook-url.com/notifications
```

---
**💡 Tip**: Telegram is the most reliable option for real-time phone notifications!
