# Qmail Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S qmail && \
    adduser -S qmail -u 1001

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R qmail:qmail /app

# Switch to non-root user
USER qmail

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start command
CMD ["npm", "start"]