import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createClient } from 'redis';
import { config } from '../src/config';

let mongoServer: MongoMemoryServer;
let redisClient: any;

beforeAll(async () => {
  // Setup in-memory MongoDB for testing
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);

  // Setup Redis mock or in-memory Redis
  redisClient = createClient({
    url: 'redis://localhost:6379'
  });
  
  // Mock Redis if not available
  if (!process.env.REDIS_URL) {
    redisClient = {
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve(),
      ping: () => Promise.resolve('PONG'),
      incr: () => Promise.resolve(1),
      expire: () => Promise.resolve(1),
      get: () => Promise.resolve(null),
      set: () => Promise.resolve('OK'),
      del: () => Promise.resolve(1)
    };
  }
});

afterAll(async () => {
  // Cleanup
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  if (redisClient && redisClient.disconnect) {
    await redisClient.disconnect();
  }
});

beforeEach(async () => {
  // Clear database before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterEach(async () => {
  // Cleanup after each test if needed
});

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    squidId: 'test-user-123',
    subId: 'test-sub-456',
    daoId: 'test-dao-789',
    permissions: ['media:upload', 'media:download', 'media:transcode']
  }),
  
  createMockMediaFile: () => ({
    id: 'test-media-123',
    cid: 'QmTestCID123',
    filename: 'test-image.jpg',
    originalFilename: 'test-image.jpg',
    format: 'image/jpeg',
    size: 1024000,
    status: 'ready',
    uploadedBy: 'test-user-123',
    metadata: {
      technical: {
        format: 'image/jpeg',
        dimensions: { width: 1920, height: 1080 },
        fileSize: 1024000
      },
      descriptive: {
        title: 'Test Image',
        description: 'A test image',
        tags: ['test', 'image'],
        category: 'test',
        keywords: ['test']
      },
      rights: {
        license: 'PROPRIETARY',
        usage: ['personal'],
        restrictions: []
      },
      provenance: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        uploadedBy: 'test-user-123',
        originalFilename: 'test-image.jpg',
        processingHistory: []
      }
    },
    thumbnails: [],
    formats: [],
    access: {
      public: false,
      permissions: [],
      downloadable: true,
      streamable: false,
      viewCount: 0,
      downloadCount: 0
    },
    ipfsHash: 'QmTestCID123',
    storageProvider: 'ipfs',
    backupCids: [],
    processingJobs: [],
    auditLog: []
  })
};

// Mock external services for testing
process.env.NODE_ENV = 'test';
process.env.SQUID_URL = 'http://localhost:3008/mock/squid';
process.env.QONSENT_URL = 'http://localhost:3008/mock/qonsent';
process.env.QMASK_URL = 'http://localhost:3008/mock/qmask';
process.env.QERBEROS_URL = 'http://localhost:3008/mock/qerberos';
process.env.QINDEX_URL = 'http://localhost:3008/mock/qindex';
process.env.QMARKET_URL = 'http://localhost:3008/mock/qmarket';