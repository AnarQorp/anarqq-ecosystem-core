import mongoose from 'mongoose';
import { config } from '../config';

// Cache the connection to avoid multiple connections in development
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Establishes a connection to MongoDB using the connection string from the environment variables.
 * Uses connection pooling and caches the connection to avoid multiple connections in development.
 * 
 * @returns {Promise<mongoose.Connection>} A promise that resolves to the MongoDB connection
 */
async function connectToDatabase(): Promise<mongoose.Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable mongoose buffering
      maxPoolSize: 10, // Maximum number of connections in the connection pool
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    cached.promise = mongoose.connect(config.mongoUri, opts).then((mongoose) => {
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Closes the MongoDB connection if it's open
 */
async function closeDatabaseConnection(): Promise<void> {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
  }
}

// Handle application termination
process.on('SIGINT', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

// Handle process termination
process.on('SIGTERM', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

export { connectToDatabase, closeDatabaseConnection };
