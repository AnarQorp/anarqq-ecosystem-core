import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

// Load environment variables
dotenv.config({ path: envPath });

// Configuration with defaults
const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3001,
  
  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 100, // Limit each IP to 100 requests per windowMs
  
  // Input validation
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 72, // bcrypt max length
  ALIAS_MIN_LENGTH: 3,
  ALIAS_MAX_LENGTH: 30,
};

// Validate required configuration
const requiredConfig = ['JWT_SECRET'];
const missingConfig = requiredConfig.filter(key => !process.env[key]);

if (missingConfig.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('Missing required environment variables:', missingConfig.join(', '));
  process.exit(1);
}

export default config;
