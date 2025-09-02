# Deployment Guide for DAO Dashboard Enhancement

## Overview

This guide provides comprehensive instructions for deploying the enhanced DAO dashboard components to production environments. It covers configuration, build optimization, monitoring setup, and troubleshooting procedures.

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Memory**: Minimum 4GB RAM for build process
- **Storage**: Minimum 10GB available space
- **Network**: Stable internet connection for dependency installation

### Environment Setup

```bash
# Verify Node.js version
node --version  # Should be 18.0.0+

# Verify npm version
npm --version   # Should be 9.0.0+

# Install global dependencies
npm install -g pm2  # For production process management
```

## Configuration

### Environment Variables

Create environment-specific configuration files:

#### Production Environment (`.env.production`)

```env
# Application Configuration
VITE_APP_NAME=AnarQ Nexus Core
VITE_APP_VERSION=2.0.0
VITE_ENVIRONMENT=production

# API Configuration
VITE_API_URL=https://api.anarq.com/api
VITE_WS_URL=wss://api.anarq.com/ws

# Blockchain Configuration
VITE_PRODUCTION_RPC=https://polygon-rpc.com
VITE_PRODUCTION_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
VITE_PRODUCTION_CHAIN_ID=137

# DAO Dashboard Configuration
VITE_DAO_CACHE_TIMEOUT=300000
VITE_WALLET_REFRESH_INTERVAL=60000
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_DEBUG_LOGGING=false

# Security Configuration
VITE_CSP_ENABLED=true
VITE_SECURE_COOKIES=true

# Analytics Configuration
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_ID=GA-XXXXXXXXX

# Feature Flags
VITE_ENABLE_DAO_WALLET_OVERVIEW=true
VITE_ENABLE_QUICK_ACTIONS=true
VITE_ENABLE_PROPOSAL_STATS=true
VITE_ENABLE_TOKEN_OVERVIEW=true
```

#### Staging Environment (`.env.staging`)

```env
# Application Configuration
VITE_APP_NAME=AnarQ Nexus Core (Staging)
VITE_APP_VERSION=2.0.0-staging
VITE_ENVIRONMENT=staging

# API Configuration
VITE_API_URL=https://staging-api.anarq.com/api
VITE_WS_URL=wss://staging-api.anarq.com/ws

# Blockchain Configuration
VITE_STAGING_RPC=https://polygon-mumbai.g.alchemy.com/v2/YOUR-API-KEY
VITE_STAGING_CONTRACT_ADDRESS=0x0987654321098765432109876543210987654321
VITE_STAGING_CHAIN_ID=80001

# DAO Dashboard Configuration
VITE_DAO_CACHE_TIMEOUT=60000
VITE_WALLET_REFRESH_INTERVAL=30000
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_DEBUG_LOGGING=true

# Security Configuration
VITE_CSP_ENABLED=true
VITE_SECURE_COOKIES=false

# Analytics Configuration
VITE_ANALYTICS_ENABLED=false

# Feature Flags
VITE_ENABLE_DAO_WALLET_OVERVIEW=true
VITE_ENABLE_QUICK_ACTIONS=true
VITE_ENABLE_PROPOSAL_STATS=true
VITE_ENABLE_TOKEN_OVERVIEW=true
```

### Build Configuration

#### Vite Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@dao': resolve(__dirname, './src/components/dao'),
      '@hooks': resolve(__dirname, './src/composables'),
      '@utils': resolve(__dirname, './src/utils')
    }
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'esbuild' : false,
    
    // Chunk splitting for optimal loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          
          // UI libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-progress',
            '@radix-ui/react-badge'
          ],
          
          // DAO components
          'dao-components': [
            './src/components/dao/TokenOverviewPanel',
            './src/components/dao/DAOWalletOverview',
            './src/components/dao/QuickActionsPanel',
            './src/components/dao/ProposalStatsSidebar'
          ],
          
          // Hooks and utilities
          'dao-hooks': [
            './src/composables/useDAO',
            './src/composables/useQwallet'
          ],
          
          // Accessibility utilities
          'accessibility': [
            './src/utils/accessibility'
          ]
        }
      }
    },
    
    // Asset optimization
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    
    // Performance optimization
    target: 'es2020',
    chunkSizeWarningLimit: 1000
  },
  
  // Development server
  server: {
    port: 5173,
    host: true,
    cors: true
  },
  
  // Preview server
  preview: {
    port: 4173,
    host: true
  },
  
  // Optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid'
    ]
  }
}));
```

## Build Process

### Development Build

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Run accessibility tests
npm run test:a11y

# Run performance tests
npm run test:performance
```

### Production Build

```bash
# Clean previous builds
rm -rf dist/

# Install production dependencies
npm ci --production=false

# Run tests
npm run test

# Build for production
npm run build

# Verify build
npm run preview

# Run build analysis (optional)
npm run build:analyze
```

### Build Optimization

#### Bundle Analysis

```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Generate bundle analysis
npm run build:analyze

# View analysis report
open dist/stats.html
```

#### Performance Optimization

```json
{
  "scripts": {
    "build:optimize": "npm run build && npm run optimize:images && npm run optimize:fonts",
    "optimize:images": "imagemin 'dist/**/*.{jpg,png,svg}' --out-dir=dist --plugin=imagemin-mozjpeg --plugin=imagemin-pngquant --plugin=imagemin-svgo",
    "optimize:fonts": "subfont dist/*.html --inline-css --inline-fonts"
  }
}
```

## Deployment Strategies

### Static Hosting (Recommended)

#### Netlify Deployment

```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[headers]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: wss:;"

[headers]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

#### Vercel Deployment

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Docker Deployment

#### Dockerfile

```dockerfile
# Multi-stage build for optimal image size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: wss:;" always;
    
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;
        
        # Enable caching for static assets
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  anarq-frontend:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.anarq.rule=Host(`anarq.com`)"
      - "traefik.http.routers.anarq.tls=true"
      - "traefik.http.routers.anarq.tls.certresolver=letsencrypt"
```

## Monitoring and Analytics

### Performance Monitoring

#### Web Vitals Integration

```typescript
// src/utils/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export const initPerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'production') {
    getCLS(sendToAnalytics);
    getFID(sendToAnalytics);
    getFCP(sendToAnalytics);
    getLCP(sendToAnalytics);
    getTTFB(sendToAnalytics);
  }
};

const sendToAnalytics = (metric: any) => {
  // Send to your analytics service
  if (window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
};
```

#### Error Monitoring

```typescript
// src/utils/errorMonitoring.ts
export const initErrorMonitoring = () => {
  // Global error handler
  window.addEventListener('error', (event) => {
    logError({
      type: 'javascript',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  });
  
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    logError({
      type: 'promise',
      message: event.reason?.message || 'Unhandled promise rejection',
      stack: event.reason?.stack
    });
  });
};

const logError = (error: any) => {
  // Send to error monitoring service
  console.error('Application Error:', error);
  
  // Send to analytics
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: error.message,
      fatal: false
    });
  }
};
```

### Health Checks

#### Application Health Check

```typescript
// src/utils/healthCheck.ts
export const performHealthCheck = async (): Promise<HealthStatus> => {
  const checks = await Promise.allSettled([
    checkAPIConnection(),
    checkWalletService(),
    checkDAOService(),
    checkLocalStorage(),
    checkWebSocket()
  ]);
  
  const results = checks.map((check, index) => ({
    name: ['API', 'Wallet', 'DAO', 'Storage', 'WebSocket'][index],
    status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
    details: check.status === 'fulfilled' ? check.value : check.reason
  }));
  
  const overallStatus = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded';
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: results
  };
};
```

## Security Configuration

### Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https: wss:;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

### Environment Security

```bash
# Production environment security checklist

# 1. Remove development dependencies
npm prune --production

# 2. Set secure environment variables
export NODE_ENV=production
export VITE_SECURE_COOKIES=true
export VITE_CSP_ENABLED=true

# 3. Enable HTTPS
export VITE_FORCE_HTTPS=true

# 4. Configure secure headers
export VITE_SECURITY_HEADERS=true
```

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+

# Check for TypeScript errors
npm run type-check
```

#### Performance Issues

```bash
# Analyze bundle size
npm run build:analyze

# Check for memory leaks
npm run test:memory

# Profile component performance
npm run dev -- --profile
```

#### Deployment Issues

```bash
# Verify environment variables
npm run env:check

# Test production build locally
npm run build && npm run preview

# Check health endpoints
curl -f http://localhost/health
```

### Debugging Tools

#### Development Tools

```typescript
// src/utils/debug.ts
export const enableDebugMode = () => {
  if (process.env.NODE_ENV === 'development') {
    // Enable React DevTools
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot = (id, root) => {
      console.log('React render:', { id, root });
    };
    
    // Enable performance monitoring
    window.performance.mark('app-start');
    
    // Log component renders
    const originalLog = console.log;
    console.log = (...args) => {
      if (args[0]?.includes?.('render')) {
        originalLog('[RENDER]', ...args);
      } else {
        originalLog(...args);
      }
    };
  }
};
```

#### Production Debugging

```typescript
// src/utils/productionDebug.ts
export const enableProductionDebugging = () => {
  // Safe debugging for production
  if (localStorage.getItem('debug') === 'true') {
    window.debugApp = {
      getState: () => ({
        dao: window.__DAO_STATE__,
        wallet: window.__WALLET_STATE__,
        session: window.__SESSION_STATE__
      }),
      clearCache: () => {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
      },
      exportLogs: () => {
        const logs = JSON.stringify(window.__APP_LOGS__ || []);
        const blob = new Blob([logs], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'app-logs.json';
        a.click();
      }
    };
  }
};
```

## Rollback Procedures

### Automated Rollback

```bash
#!/bin/bash
# rollback.sh

# Get previous deployment
PREVIOUS_VERSION=$(git describe --tags --abbrev=0 HEAD~1)

echo "Rolling back to version: $PREVIOUS_VERSION"

# Checkout previous version
git checkout $PREVIOUS_VERSION

# Rebuild application
npm ci
npm run build

# Deploy to production
npm run deploy:production

echo "Rollback completed successfully"
```

### Manual Rollback

```bash
# 1. Identify last known good version
git log --oneline -10

# 2. Create rollback branch
git checkout -b rollback-$(date +%Y%m%d-%H%M%S)

# 3. Reset to previous version
git reset --hard <commit-hash>

# 4. Rebuild and deploy
npm run build
npm run deploy
```

## Maintenance

### Regular Maintenance Tasks

```bash
#!/bin/bash
# maintenance.sh

# Update dependencies
npm update

# Run security audit
npm audit

# Clean up old builds
find ./dist -name "*.old" -delete

# Optimize images
npm run optimize:images

# Update documentation
npm run docs:generate

# Run health checks
npm run health:check
```

### Monitoring Checklist

- [ ] Application health status
- [ ] Performance metrics (Core Web Vitals)
- [ ] Error rates and types
- [ ] User engagement metrics
- [ ] Security alerts
- [ ] Dependency vulnerabilities
- [ ] Build pipeline status
- [ ] CDN performance
- [ ] Database connectivity
- [ ] Third-party service status

## Support

### Getting Help

- **Documentation**: Check the [Integration Guide](./src/components/dao/DAO-INTEGRATION-GUIDE.md)
- **Issues**: Report bugs on GitHub Issues
- **Community**: Join the Discord community
- **Enterprise**: Contact support for enterprise deployments

### Emergency Contacts

- **Technical Lead**: technical-lead@anarq.com
- **DevOps Team**: devops@anarq.com
- **Security Team**: security@anarq.com
- **On-call Engineer**: +1-XXX-XXX-XXXX

---

This deployment guide ensures a smooth and secure deployment of the enhanced DAO dashboard components. Follow the procedures carefully and maintain regular monitoring to ensure optimal performance and user experience.