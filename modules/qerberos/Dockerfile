FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S qerberos && \
    adduser -S qerberos -u 1001

# Create data directory
RUN mkdir -p /app/data && chown -R qerberos:qerberos /app/data

# Switch to non-root user
USER qerberos

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]