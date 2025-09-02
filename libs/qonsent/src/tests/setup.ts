import { config } from '../config';
import { connectToDatabase } from '../utils/db';

// Global test setup
beforeAll(async () => {
  // Connect to the test database
  await connectToDatabase();
});

afterAll(async () => {
  // Disconnect from the database after all tests are done
  const mongoose = await import('mongoose');
  await mongoose.connection.close();
});

// Global test teardown
afterEach(async () => {
  // Clean up the database after each test
  const collections = Object.values((await import('mongoose')).connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

// Global test timeout
jest.setTimeout(30000); // 30 seconds
