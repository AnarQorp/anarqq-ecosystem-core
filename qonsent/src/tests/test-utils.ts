import { FastifyInstance } from 'fastify';
import { buildApp } from '../index';
import { config } from '../config';
import { connectToDatabase } from '../utils/db';
import { QonsentRule } from '../models/QonsentRule';
import { DAOVisibilityPolicy } from '../models/DAOVisibilityPolicy';
import { Delegation } from '../models/Delegation';
import { QonsentLog } from '../models/QonsentLog';

export interface TestContext {
  app: FastifyInstance;
  token: string;
}

const TEST_USER = {
  did: 'did:test:user',
  address: '0x1234567890abcdef',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
};

/**
 * Create a test Fastify instance with a clean database
 */
export async function createTestApp(): Promise<TestContext> {
  // Connect to the test database
  await connectToDatabase();

  // Create a test Fastify instance
  const app = await buildApp();
  
  // Add test authentication middleware
  app.addHook('onRequest', async (request) => {
    // Skip authentication for health check endpoint
    if (request.routerPath === '/health') return;
    
    // For testing purposes, we'll use a simple token
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    // Verify the token (in a real app, this would verify a JWT)
    const token = authHeader.split(' ')[1];
    if (token !== 'test-token') {
      throw new Error('Invalid token');
    }

    // Attach the test user to the request
    request.user = TEST_USER;
  });

  return {
    app,
    token: 'test-token',
  };
}

/**
 * Clean up the test database
 */
export async function clearDatabase(): Promise<void> {
  await Promise.all([
    QonsentRule.deleteMany({}),
    DAOVisibilityPolicy.deleteMany({}),
    Delegation.deleteMany({}),
    QonsentLog.deleteMany({}),
  ]);
}

/**
 * Generate test data for integration tests
 */
export async function generateTestData() {
  // Create test qonsent rules
  const qonsentRules = await QonsentRule.insertMany([
    {
      resourceId: 'resource:1',
      ownerDid: TEST_USER.did,
      targetDid: 'did:test:target1',
      permissions: ['read'],
    },
    {
      resourceId: 'resource:2',
      ownerDid: TEST_USER.did,
      targetDid: 'did:test:target2',
      permissions: ['read', 'write'],
    },
  ]);

  // Create test DAO policies
  const daoPolicies = await DAOVisibilityPolicy.insertMany([
    {
      daoId: 'dao:test',
      resourcePattern: 'resource:*',
      allowedRoles: ['admin', 'member'],
      createdBy: TEST_USER.did,
      updatedBy: TEST_USER.did,
    },
    {
      daoId: 'dao:test',
      resourcePattern: 'resource:restricted:*',
      allowedRoles: ['admin'],
      createdBy: TEST_USER.did,
      updatedBy: TEST_USER.did,
    },
  ]);

  // Create test delegations
  const delegations = await Delegation.insertMany([
    {
      delegatorDid: TEST_USER.did,
      delegateeDid: 'did:test:delegatee1',
      scope: ['read:documents'],
      capabilities: ['read:documents:123'],
      status: 'active',
    },
    {
      delegatorDid: 'did:test:delegator1',
      delegateeDid: TEST_USER.did,
      scope: ['write:documents'],
      capabilities: ['write:documents:123'],
      status: 'active',
    },
  ]);

  return {
    qonsentRules,
    daoPolicies,
    delegations,
    qonsentLogs: [],
  };
}

/**
 * Generate an authentication header for API requests
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  };
}
