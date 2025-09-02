import dotenv from 'dotenv';
import path from 'path';

const requiredEnvVars = [
  'JWT_SECRET',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX',
  'ALIAS_MIN_LENGTH',
  'ALIAS_MAX_LENGTH',
  'PASSWORD_MIN_LENGTH',
  'PASSWORD_MAX_LENGTH',
  'JWT_EXPIRES_IN',
];

export const validateEnv = () => {
  // Load environment variables
  const envPath = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.error('❌ Error loading .env file:', result.error);
    process.exit(1);
  }

  // Validate required environment variables
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }

  // Validate JWT secret length
  if (process.env.JWT_SECRET?.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long for security reasons');
    process.exit(1);
  }

  // Validate numeric environment variables
  const numericVars = ['RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX', 'ALIAS_MIN_LENGTH', 'ALIAS_MAX_LENGTH', 'PASSWORD_MIN_LENGTH', 'PASSWORD_MAX_LENGTH'];
  
  numericVars.forEach(varName => {
    if (process.env[varName] && isNaN(Number(process.env[varName]))) {
      console.error(`❌ ${varName} must be a number`);
      process.exit(1);
    }
  });

  // Validate password length requirements
  const passwordMin = Number(process.env.PASSWORD_MIN_LENGTH);
  const passwordMax = Number(process.env.PASSWORD_MAX_LENGTH);
  
  if (passwordMin < 8) {
    console.error('❌ PASSWORD_MIN_LENGTH must be at least 8');
    process.exit(1);
  }
  if (passwordMax < passwordMin) {
    console.error('❌ PASSWORD_MAX_LENGTH must be greater than PASSWORD_MIN_LENGTH');
    process.exit(1);
  }

  // Validate alias length requirements
  const aliasMin = Number(process.env.ALIAS_MIN_LENGTH);
  const aliasMax = Number(process.env.ALIAS_MAX_LENGTH);
  
  if (aliasMin < 3) {
    console.error('❌ ALIAS_MIN_LENGTH must be at least 3');
    process.exit(1);
  }
  if (aliasMax < aliasMin) {
    console.error('❌ ALIAS_MAX_LENGTH must be greater than ALIAS_MIN_LENGTH');
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
};

// Export a default configuration object
export default {
  JWT_SECRET: process.env.JWT_SECRET,
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX),
  ALIAS_MIN_LENGTH: Number(process.env.ALIAS_MIN_LENGTH),
  ALIAS_MAX_LENGTH: Number(process.env.ALIAS_MAX_LENGTH),
  PASSWORD_MIN_LENGTH: Number(process.env.PASSWORD_MIN_LENGTH),
  PASSWORD_MAX_LENGTH: Number(process.env.PASSWORD_MAX_LENGTH),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
};
