import { DelegationService } from '../../services/delegation.service';
import { Delegation } from '../../models/Delegation';

const TEST_DELEGATOR = 'did:test:delegator';
const TEST_DELEGATEE = 'did:test:delegatee';
const TEST_SCOPE = ['read:documents', 'write:documents'];
const TEST_CAPABILITIES = ['read:documents:123', 'write:documents:123'];

describe('DelegationService', () => {
  let delegationService: DelegationService;

  beforeEach(() => {
    delegationService = new DelegationService();
  });

  describe('createDelegation', () => {
    it('should create a new delegation', async () => {
      const delegation = await delegationService.createDelegation({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
        scope: TEST_SCOPE,
        capabilities: TEST_CAPABILITIES,
      });

      expect(delegation).toBeDefined();
      expect(delegation.delegatorDid).toBe(TEST_DELEGATOR);
      expect(delegation.delegateeDid).toBe(TEST_DELEGATEE);
      expect(delegation.scope).toEqual(TEST_SCOPE);
      expect(delegation.capabilities).toEqual(TEST_CAPABILITIES);
      expect(delegation.status).toBe('active');

      // Verify the delegation was saved to the database
      const savedDelegation = await Delegation.findOne({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
      });

      expect(savedDelegation).toBeDefined();
      expect(savedDelegation?.scope).toEqual(TEST_SCOPE);
    });

    it('should update an existing delegation with the same scope', async () => {
      // Create initial delegation
      await delegationService.createDelegation({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
        scope: TEST_SCOPE,
        capabilities: ['read:documents'],
      });

      // Update the delegation with new capabilities
      const updatedDelegation = await delegationService.createDelegation({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
        scope: TEST_SCOPE,
        capabilities: [...TEST_CAPABILITIES, 'admin:documents'],
      });

      expect(updatedDelegation.capabilities).toEqual([...TEST_CAPABILITIES, 'admin:documents']);

      // Verify only one delegation exists (updated, not duplicated)
      const delegations = await Delegation.find({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
      });

      expect(delegations.length).toBe(1);
    });
  });

  describe('listDelegations', () => {
    it('should list outgoing delegations', async () => {
      // Create test delegations
      await Promise.all([
        delegationService.createDelegation({
          delegatorDid: TEST_DELEGATOR,
          delegateeDid: TEST_DELEGATEE,
          scope: ['read:documents'],
        }),
        delegationService.createDelegation({
          delegatorDid: TEST_DELEGATOR,
          delegateeDid: 'did:test:another',
          scope: ['write:documents'],
        }),
        delegationService.createDelegation({
          delegatorDid: 'did:test:other',
          delegateeDid: TEST_DELEGATOR,
          scope: ['admin:documents'],
        }),
      ]);

      // List outgoing delegations
      const { delegations, total } = await delegationService.listDelegations({
        did: TEST_DELEGATOR,
        type: 'outgoing',
        limit: 10,
        offset: 0,
      });

      expect(total).toBe(2);
      expect(delegations).toHaveLength(2);
      expect(delegations.every(d => d.delegatorDid === TEST_DELEGATOR)).toBe(true);
    });

    it('should list incoming delegations', async () => {
      // Create test delegations
      await Promise.all([
        delegationService.createDelegation({
          delegatorDid: 'did:test:delegator1',
          delegateeDid: TEST_DELEGATEE,
          scope: ['read:documents'],
        }),
        delegationService.createDelegation({
          delegatorDid: 'did:test:delegator2',
          delegateeDid: TEST_DELEGATEE,
          scope: ['write:documents'],
        }),
        delegationService.createDelegation({
          delegatorDid: TEST_DELEGATEE,
          delegateeDid: 'did:test:someone',
          scope: ['admin:documents'],
        }),
      ]);

      // List incoming delegations
      const { delegations, total } = await delegationService.listDelegations({
        did: TEST_DELEGATEE,
        type: 'incoming',
        limit: 10,
        offset: 0,
      });

      expect(total).toBe(2);
      expect(delegations).toHaveLength(2);
      expect(delegations.every(d => d.delegateeDid === TEST_DELEGATEE)).toBe(true);
    });
  });

  describe('revokeDelegation', () => {
    it('should revoke an active delegation', async () => {
      // Create a test delegation
      const delegation = await delegationService.createDelegation({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
        scope: TEST_SCOPE,
      });

      // Revoke the delegation
      const result = await delegationService.revokeDelegation(delegation._id.toString());
      expect(result).toBe(true);

      // Verify the delegation was revoked
      const revokedDelegation = await Delegation.findById(delegation._id);
      expect(revokedDelegation?.status).toBe('revoked');
    });

    it('should return false for non-existent delegation', async () => {
      const result = await delegationService.revokeDelegation('5f8d04b3ab35b62e00c2e4d4');
      expect(result).toBe(false);
    });
  });

  describe('verifyDelegation', () => {
    it('should verify a valid direct delegation', async () => {
      // Create a test delegation
      await delegationService.createDelegation({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
        scope: TEST_SCOPE,
        capabilities: TEST_CAPABILITIES,
      });

      // Verify the delegation
      const result = await delegationService.verifyDelegation({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
        scope: 'read:documents',
        capability: 'read:documents:123',
      });

      expect(result.isValid).toBe(true);
      expect(result.delegation).toBeDefined();
      expect(result.isTransitive).toBeFalsy();
    });

    it('should reject invalid delegations', async () => {
      // Create a test delegation with different scope
      await delegationService.createDelegation({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
        scope: ['write:documents'],
        capabilities: ['write:documents:123'],
      });

      // Try to verify with a different scope
      const result = await delegationService.verifyDelegation({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
        scope: 'read:documents',
      });

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No valid delegation found');
    });

    it('should handle expired delegations', async () => {
      // Create a test delegation with expiration in the past
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await delegationService.createDelegation({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
        scope: TEST_SCOPE,
        expiresAt: pastDate,
      });

      // Verify the delegation
      const result = await delegationService.verifyDelegation({
        delegatorDid: TEST_DELEGATOR,
        delegateeDid: TEST_DELEGATEE,
        scope: 'read:documents',
      });

      expect(result.isValid).toBe(false);
    });
  });
});
