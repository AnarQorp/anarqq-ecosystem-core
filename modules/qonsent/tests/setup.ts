import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.MONGODB_URI = 'mongodb://localhost:27017/qonsent-test';
process.env.EVENT_BUS_TYPE = 'mock';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.ENABLE_AUDIT_LOGGING = 'false';

// Global test setup
beforeAll(async () => {
  // Any global setup can go here
});

// Global test cleanup
afterAll(async () => {
  // Any global cleanup can go here
});