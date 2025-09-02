FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S qwallet && \
    adduser -S qwallet -u 1001

# Set ownership
RUN chown -R qwallet:qwallet /app
USER qwallet

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/health-check.mjs

# Start the application
CMD ["npm", "start"]