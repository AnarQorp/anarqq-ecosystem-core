/**
 * IPFS Configuration with Storacha Integration
 * 
 * This file contains configuration for the IPFS service with Storacha,
 * including API endpoints, default settings, and environment variables.
 */

// Default configuration
const defaultConfig = {
  // Storacha API configuration
  storacha: {
    // Storacha API key (required)
    apiKey: import.meta.env.VITE_STORACHA_API_KEY || '',
    // Storacha API base URL
    apiUrl: import.meta.env.VITE_STORACHA_API_URL || 'https://api.storacha.com/v1',
  },
  
  // IPFS Gateway URL (for fetching content)
  gatewayUrl: import.meta.env.VITE_IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs',
  
  // API base URL (points to our backend)
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  
  // Default timeout for API requests (in ms)
  requestTimeout: 30000,
  
  // Maximum file size for uploads (in bytes)
  maxFileSize: 100 * 1024 * 1024, // 100MB
  
  // List of supported MIME types for preview
  previewableMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json',
    'video/mp4',
    'audio/mpeg',
    'application/zip',
  ],
  
  // Default space configuration
  defaultSpace: {
    id: import.meta.env.VITE_DEFAULT_SPACE_ID || 'default',
    name: 'default',
    description: 'Default storage space',
    isPrivate: true,
  },
  
  // Feature flags
  features: {
    // Enable/disable IPFS features
    enabled: import.meta.env.VITE_ENABLE_IPFS !== 'false',
    // Enable/disable encryption
    encryption: true,
    // Enable/disable pinning
    pinning: true,
  },
};

// Type for environment-specific configurations
interface EnvironmentConfig {
  gatewayUrl?: string;
  storacha?: {
    apiUrl?: string;
    // Add other Storacha-specific overrides here
  };
  features?: {
    enabled?: boolean;
    encryption?: boolean;
    pinning?: boolean;
  };
}

// Environment-specific overrides
const envConfig: Record<string, EnvironmentConfig> = {
  development: {
    // Use local gateway in development if available
    gatewayUrl: 'http://localhost:8080/ipfs',
    storacha: {
      // You can override Storacha settings for development here
      // apiUrl: 'http://localhost:3001/v1',
    },
  },
  production: {
    // Production-specific overrides
  },
  test: {
    // Test-specific overrides
    gatewayUrl: 'https://test-ipfs-gateway.example.com/ipfs',
  },
};

// Get current environment
const env = import.meta.env.MODE || 'development';

// Merge configurations
const config = {
  ...defaultConfig,
  ...(envConfig[env as keyof typeof envConfig] || {}),
  // Ensure nested objects are properly merged
  storacha: {
    ...defaultConfig.storacha,
    ...(envConfig[env as keyof typeof envConfig]?.storacha || {}),
  },
  features: {
    ...defaultConfig.features,
    ...(envConfig[env as keyof typeof envConfig]?.features || {}),
  },
};

// Validate required configuration
if (!config.storacha.apiKey) {
  console.warn(
    'STORACHA_API_KEY is not set. IPFS features will not work correctly.\n' +
    'Please set VITE_STORACHA_API_KEY in your environment variables.'
  );
}

// Type definitions for the config object
export interface IPFSConfig {
  storacha: {
    apiKey: string;
    apiUrl: string;
  };
  gatewayUrl: string;
  apiBaseUrl: string;
  requestTimeout: number;
  maxFileSize: number;
  previewableMimeTypes: string[];
  defaultSpace: {
    id: string;
    name: string;
    description: string;
    isPrivate: boolean;
  };
  features: {
    enabled: boolean;
    encryption: boolean;
    pinning: boolean;
  };
}

// Export the typed config
export default config as IPFSConfig;
