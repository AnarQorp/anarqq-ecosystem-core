import { DAOPolicyService } from '../../services/daoPolicy.service';
import { DAOVisibilityPolicy } from '../../models/DAOVisibilityPolicy';

const TEST_DAO_ID = 'dao:test';
const TEST_USER = 'did:test:admin';

describe('DAOPolicyService', () => {
  let daoPolicyService: DAOPolicyService;

  beforeEach(() => {
    daoPolicyService = new DAOPolicyService();
  });

  describe('upsertPolicy', () => {
    it('should create a new DAO policy', async () => {
      const policy = await daoPolicyService.upsertPolicy({
        daoId: TEST_DAO_ID,
        resourcePattern: 'resource:*',
        allowedRoles: ['admin', 'member'],
        createdBy: TEST_USER,
      });

      expect(policy).toBeDefined();
      expect(policy.daoId).toBe(TEST_DAO_ID);
      expect(policy.resourcePattern).toBe('resource:*');
      expect(policy.allowedRoles).toEqual(['admin', 'member']);
      expect(policy.createdBy).toBe(TEST_USER);
      expect(policy.updatedBy).toBe(TEST_USER);

      // Verify the policy was saved to the database
      const savedPolicy = await DAOVisibilityPolicy.findOne({
        daoId: TEST_DAO_ID,
        resourcePattern: 'resource:*',
      });

      expect(savedPolicy).toBeDefined();
      expect(savedPolicy?.allowedRoles).toEqual(['admin', 'member']);
    });

    it('should update an existing DAO policy', async () => {
      // Create an initial policy
      await daoPolicyService.upsertPolicy({
        daoId: TEST_DAO_ID,
        resourcePattern: 'resource:*',
        allowedRoles: ['admin'],
        createdBy: TEST_USER,
      });

      // Update the policy
      const updatedPolicy = await daoPolicyService.upsertPolicy({
        daoId: TEST_DAO_ID,
        resourcePattern: 'resource:*',
        allowedRoles: ['admin', 'member', 'guest'],
        createdBy: 'another:admin',
      });

      expect(updatedPolicy.allowedRoles).toEqual(['admin', 'member', 'guest']);
      expect(updatedPolicy.updatedBy).toBe('another:admin');

      // Verify only one policy exists (updated, not duplicated)
      const policies = await DAOVisibilityPolicy.find({
        daoId: TEST_DAO_ID,
        resourcePattern: 'resource:*',
      });

      expect(policies.length).toBe(1);
    });
  });

  describe('getPolicies', () => {
    it('should return policies for a DAO', async () => {
      // Create test policies
      await Promise.all([
        daoPolicyService.upsertPolicy({
          daoId: TEST_DAO_ID,
          resourcePattern: 'resource:1',
          allowedRoles: ['admin'],
          createdBy: TEST_USER,
        }),
        daoPolicyService.upsertPolicy({
          daoId: TEST_DAO_ID,
          resourcePattern: 'resource:2',
          allowedRoles: ['member'],
          createdBy: TEST_USER,
        }),
        daoPolicyService.upsertPolicy({
          daoId: 'another:dao',
          resourcePattern: 'resource:*',
          allowedRoles: ['admin'],
          createdBy: TEST_USER,
        }),
      ]);

      // Get policies for the test DAO
      const policies = await daoPolicyService.getPolicies({
        daoId: TEST_DAO_ID,
      });

      expect(policies).toHaveLength(2);
      expect(policies.some(p => p.resourcePattern === 'resource:1')).toBe(true);
      expect(policies.some(p => p.resourcePattern === 'resource:2')).toBe(true);
    });

    it('should filter policies by resource pattern', async () => {
      // Create test policies
      await Promise.all([
        daoPolicyService.upsertPolicy({
          daoId: TEST_DAO_ID,
          resourcePattern: 'resource:1',
          allowedRoles: ['admin'],
          createdBy: TEST_USER,
        }),
        daoPolicyService.upsertPolicy({
          daoId: TEST_DAO_ID,
          resourcePattern: 'resource:2',
          allowedRoles: ['member'],
          createdBy: TEST_USER,
        }),
      ]);

      // Get a specific policy by pattern
      const policies = await daoPolicyService.getPolicies({
        daoId: TEST_DAO_ID,
        resourcePattern: 'resource:1',
      });

      expect(policies).toHaveLength(1);
      expect(policies[0].resourcePattern).toBe('resource:1');
    });
  });

  describe('evaluateAccess', () => {
    it('should allow access based on role', async () => {
      // Create a test policy
      await daoPolicyService.upsertPolicy({
        daoId: TEST_DAO_ID,
        resourcePattern: 'resource:*',
        allowedRoles: ['admin', 'member'],
        createdBy: TEST_USER,
      });

      // Test with admin role
      const adminResult = await daoPolicyService.evaluateAccess(
        TEST_DAO_ID,
        'resource:123',
        ['admin']
      );

      expect(adminResult.allowed).toBe(true);

      // Test with member role
      const memberResult = await daoPolicyService.evaluateAccess(
        TEST_DAO_ID,
        'resource:123',
        ['member']
      );

      expect(memberResult.allowed).toBe(true);

      // Test with unauthorized role
      const unauthorizedResult = await daoPolicyService.evaluateAccess(
        TEST_DAO_ID,
        'resource:123',
        ['guest']
      );

      expect(unauthorizedResult.allowed).toBe(false);
      expect(unauthorizedResult.reason).toBe('Insufficient permissions');
    });

    it('should handle resource pattern matching', async () => {
      // Create test policies with different patterns
      await Promise.all([
        daoPolicyService.upsertPolicy({
          daoId: TEST_DAO_ID,
          resourcePattern: 'resource:public:*',
          allowedRoles: ['*'], // Public access
          createdBy: TEST_USER,
        }),
        daoPolicyService.upsertPolicy({
          daoId: TEST_DAO_ID,
          resourcePattern: 'resource:restricted:*',
          allowedRoles: ['admin'],
          createdBy: TEST_USER,
        }),
      ]);

      // Test public resource
      const publicResult = await daoPolicyService.evaluateAccess(
        TEST_DAO_ID,
        'resource:public:123',
        [] // No roles needed for public access
      );

      expect(publicResult.allowed).toBe(true);

      // Test restricted resource with admin role
      const adminResult = await daoPolicyService.evaluateAccess(
        TEST_DAO_ID,
        'resource:restricted:456',
        ['admin']
      );

      expect(adminResult.allowed).toBe(true);

      // Test restricted resource without admin role
      const unauthorizedResult = await daoPolicyService.evaluateAccess(
        TEST_DAO_ID,
        'resource:restricted:456',
        ['member']
      );

      expect(unauthorizedResult.allowed).toBe(false);

      // Test non-matching resource
      const noMatchResult = await daoPolicyService.evaluateAccess(
        TEST_DAO_ID,
        'unknown:resource',
        ['admin']
      );

      expect(noMatchResult.allowed).toBe(false);
      expect(noMatchResult.reason).toBe('No matching policy found');
    });
  });
});
