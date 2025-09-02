FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY contracts/ ./contracts/
COPY events/ ./events/
COPY security/ ./security/
COPY storage/ ./storage/
COPY observability/ ./observability/

# Create non-root user
RUN addgroup -g 1001 -S qlock && \
    adduser -S qlock -u 1001

# Set permissions
RUN chown -R qlock:qlock /app
USER qlock

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000

CMD ["npm", "start"]