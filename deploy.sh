#!/bin/bash

echo "🚀 Starting Employee Attendance System Deployment..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial deployment commit"
    echo "✅ Git repository initialized"
else
    echo "📁 Git repository already exists"
fi

echo ""
echo "🌐 Deployment Options:"
echo "1. Render (Recommended - Free)"
echo "2. Railway"
echo "3. Heroku"
echo "4. Docker"
echo ""
echo "📖 Please follow the DEPLOYMENT.md guide for detailed instructions."
echo ""
echo "🔧 Next Steps:"
echo "1. Create MongoDB Atlas account (free)"
echo "2. Push code to GitHub"
echo "3. Connect GitHub to deployment platform"
echo "4. Set environment variables"
echo "5. Deploy!"
echo ""
echo "📱 Remember: Mobile features require HTTPS deployment"
echo "✅ All deployment platforms listed provide free HTTPS"
