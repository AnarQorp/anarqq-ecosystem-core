FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create storage directory
RUN mkdir -p /app/storage

# Create non-root user
RUN addgroup -g 1001 -S qdrive && \
    adduser -S qdrive -u 1001 -G qdrive

# Change ownership
RUN chown -R qdrive:qdrive /app

USER qdrive

EXPOSE 3008

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/healthcheck.js

CMD ["npm", "start"]