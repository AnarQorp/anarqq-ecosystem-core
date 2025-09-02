FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S qnet && \
    adduser -S qnet -u 1001

# Change ownership
RUN chown -R qnet:qnet /app
USER qnet

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${QNET_PORT:-3014}/health || exit 1

EXPOSE 3014

CMD ["npm", "start"]