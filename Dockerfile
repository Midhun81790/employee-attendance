# Use Node.js 18 Alpine image  
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create config directory
RUN mkdir -p config

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]