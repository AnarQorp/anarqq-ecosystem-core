FROM node:18-alpine

# Install system dependencies for media processing
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    vips-dev \
    python3 \
    make \
    g++ \
    libc6-compat

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create storage directories
RUN mkdir -p /app/storage /app/cache

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3008/api/v1/health || exit 1

# Start the application
CMD ["npm", "start"]