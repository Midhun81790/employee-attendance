#!/usr/bin/env bash
# Render Build Script

echo "🚀 Starting Render build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create temp directory for file operations
echo "📁 Creating temp directory..."
mkdir -p temp

echo "✅ Build process completed successfully!"
