/**
 * Configuration validation utility
 */

/**
 * Required environment variables for auth service
 */
export const REQUIRED_ENV_VARS = {
  JWT_SECRET: {
    type: 'string',
    required: true,
    description: 'JWT signing secret',
  },
  JWT_EXPIRES_IN: {
    type: 'string',
    required: true,
    description: 'JWT expiration time',
    default: '24h',
  },
  RATE_LIMIT_WINDOW_MS: {
    type: 'number',
    required: true,
    description: 'Rate limiting window in milliseconds',
    default: 15 * 60 * 1000, // 15 minutes
  },
  RATE_LIMIT_MAX: {
    type: 'number',
    required: true,
    description: 'Maximum requests per window',
    default: 100,
  },
  ALIAS_MIN_LENGTH: {
    type: 'number',
    required: true,
    description: 'Minimum alias length',
    default: 3,
  },
  ALIAS_MAX_LENGTH: {
    type: 'number',
    required: true,
    description: 'Maximum alias length',
    default: 20,
  },
  PASSWORD_MIN_LENGTH: {
    type: 'number',
    required: true,
    description: 'Minimum password length',
    default: 8,
  },
  PASSWORD_MAX_LENGTH: {
    type: 'number',
    required: true,
    description: 'Maximum password length',
    default: 100,
  },
};

/**
 * Validate environment variables
 * @param {Object} env - Environment variables object
 * @returns {Object} Validated configuration
 * @throws {Error} If required variables are missing or invalid
 */
export const validateConfig = (env) => {
  const config = {};
  
  for (const [key, { type, required, description, default: defaultValue }] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = env[key];
    
    if (required && !value) {
      throw new Error(`Missing required environment variable: ${key} (${description})`);
    }
    
    switch (type) {
      case 'string':
        if (value && typeof value !== 'string') {
          throw new Error(`Invalid type for ${key}: expected string, got ${typeof value}`);
        }
        config[key] = value || defaultValue;
        break;
      
      case 'number':
        if (value && typeof value !== 'string' && typeof value !== 'number') {
          throw new Error(`Invalid type for ${key}: expected number or string, got ${typeof value}`);
        }
        config[key] = value ? Number(value) : defaultValue;
        break;
      
      default:
        throw new Error(`Unknown type ${type} for variable ${key}`);
    }
  }
  
  return config;
};

/**
 * Generate .env.example file with configuration documentation
 * @returns {string} .env.example file content
 */
export const generateEnvExample = () => {
  let content = '# Auth Service Configuration\n\n';
  
  for (const [key, { description, type, default: defaultValue }] of Object.entries(REQUIRED_ENV_VARS)) {
    content += `# ${description}\n`;
    content += `# Type: ${type}\n`;
    if (defaultValue) {
      content += `# Default: ${defaultValue}\n`;
    }
    content += `${key}=${defaultValue ? defaultValue : ''}\n\n`;
  }
  
  return content;
};
