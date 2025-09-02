FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY openapi.yaml ./
COPY mcp.json ./

# Create data directory
RUN mkdir -p /data

# Set permissions
RUN chown -R node:node /app /data
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3006/health || exit 1

EXPOSE 3006

CMD ["npm", "start"]