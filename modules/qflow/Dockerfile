# Qflow Production Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Run centralization check and build
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S qflow && \
    adduser -S qflow -u 1001 -G qflow

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/schemas ./schemas
COPY --from=builder /app/scripts ./scripts

# Create data directory with proper permissions
RUN mkdir -p /app/data && \
    chown -R qflow:qflow /app

# Switch to non-root user
USER qflow

# Expose ports
EXPOSE 8080 4001 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]