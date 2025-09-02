FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create storage directory
RUN mkdir -p storage

# Create non-root user
RUN addgroup -g 1001 -S dao && \
    adduser -S dao -u 1001

# Change ownership of app directory
RUN chown -R dao:dao /app

# Switch to non-root user
USER dao

# Expose port
EXPOSE 3014

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3014/health || exit 1

# Start the application
CMD ["npm", "start"]