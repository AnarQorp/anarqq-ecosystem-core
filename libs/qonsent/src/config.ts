import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/qonsent'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
  JWT_SECRET: z.string().default('your-secret-key'),
  SQUID_API_URL: z.string().default('https://api.squid.xyz'),
});

type EnvConfig = z.infer<typeof envSchema>;

const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  host: env.HOST,
  mongoUri: env.MONGODB_URI,
  logLevel: env.LOG_LEVEL as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',
  cors: {
    origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  },
  jwt: {
    secret: env.JWT_SECRET,
  },
  squid: {
    apiUrl: env.SQUID_API_URL,
  },
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
} as const;
