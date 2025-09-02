import { QonsentService } from '../../services/qonsent.service';
import { QonsentRule } from '../../models/QonsentRule';
import { QonsentLog } from '../../models/QonsentLog';

const TEST_DID_1 = 'did:test:owner';
const TEST_DID_2 = 'did:test:target';
const TEST_RESOURCE = 'resource:123';

describe('QonsentService', () => {
  let qonsentService: QonsentService;

  beforeEach(() => {
    qonsentService = new QonsentService();
  });

  describe('setQonsent', () => {
    it('should create a new consent rule', async () => {
      const rule = await qonsentService.setQonsent({
        resourceId: TEST_RESOURCE,
        ownerDid: TEST_DID_1,
        targetDid: TEST_DID_2,
        permissions: ['read', 'write'],
      });

      expect(rule).toBeDefined();
      expect(rule.resourceId).toBe(TEST_RESOURCE);
      expect(rule.ownerDid).toBe(TEST_DID_1);
      expect(rule.targetDid).toBe(TEST_DID_2);
      expect(rule.permissions).toEqual(['read', 'write']);

      // Verify the rule was saved to the database
      const savedRule = await ConsentRule.findOne({
        resourceId: TEST_RESOURCE,
        ownerDid: TEST_DID_1,
        targetDid: TEST_DID_2,
      });

      expect(savedRule).toBeDefined();
      expect(savedRule?.permissions).toEqual(['read', 'write']);
    });

    it('should update an existing consent rule', async () => {
      // Create an initial rule
      await consentService.setConsent({
        resourceId: TEST_RESOURCE,
        ownerDid: TEST_DID_1,
        targetDid: TEST_DID_2,
        permissions: ['read'],
      });

      // Update the rule
      const updatedRule = await consentService.setConsent({
        resourceId: TEST_RESOURCE,
        ownerDid: TEST_DID_1,
        targetDid: TEST_DID_2,
        permissions: ['read', 'write'],
      });

      expect(updatedRule.permissions).toEqual(['read', 'write']);

      // Verify only one rule exists (updated, not duplicated)
      const rules = await ConsentRule.find({
        resourceId: TEST_RESOURCE,
        ownerDid: TEST_DID_1,
        targetDid: TEST_DID_2,
      });

      expect(rules.length).toBe(1);
    });
  });

  describe('getViewableResources', () => {
    it('should return resources viewable by a DID', async () => {
      // Create test data
      await consentService.setConsent({
        resourceId: 'resource:1',
        ownerDid: TEST_DID_1,
        targetDid: TEST_DID_2,
        permissions: ['read'],
      });

      await consentService.setConsent({
        resourceId: 'resource:2',
        ownerDid: TEST_DID_1,
        targetDid: TEST_DID_2,
        permissions: ['read', 'write'],
      });

      // Test the service method
      const { resources, total } = await consentService.getViewableResources({
        targetDid: TEST_DID_2,
        limit: 10,
        offset: 0,
      });

      expect(total).toBe(2);
      expect(resources).toHaveLength(2);
      expect(resources[0].resourceId).toBe('resource:2'); // Sorted by creation date
      expect(resources[1].resourceId).toBe('resource:1');
    });
  });

  describe('batchSyncPermissions', () => {
    it('should process batch updates', async () => {
      const items = [
        {
          resourceId: 'resource:1',
          ownerDid: TEST_DID_1,
          targetDid: TEST_DID_2,
          permissions: ['read'],
        },
        {
          resourceId: 'resource:2',
          ownerDid: TEST_DID_1,
          targetDid: TEST_DID_2,
          permissions: ['read', 'write'],
        },
      ];

      const processed = await consentService.batchSyncPermissions({
        items,
      });

      expect(processed).toBe(2);

      // Verify the rules were saved
      const rules = await ConsentRule.find({
        ownerDid: TEST_DID_1,
        targetDid: TEST_DID_2,
      });

      expect(rules).toHaveLength(2);
      expect(rules.some(r => r.resourceId === 'resource:1')).toBe(true);
      expect(rules.some(r => r.resourceId === 'resource:2')).toBe(true);
    });
  });

  describe('getConsentLogs', () => {
    it('should return consent logs with filters', async () => {
      // Create test logs
      await consentService.setConsent({
        resourceId: 'resource:1',
        ownerDid: TEST_DID_1,
        targetDid: TEST_DID_2,
        permissions: ['read'],
      });

      await consentService.setConsent({
        resourceId: 'resource:2',
        ownerDid: TEST_DID_1,
        targetDid: TEST_DID_2,
        permissions: ['read', 'write'],
      });

      // Test with no filters
      const { logs: allLogs, total: allTotal } = await consentService.getConsentLogs({
        limit: 10,
        offset: 0,
      });

      expect(allTotal).toBe(2);
      expect(allLogs).toHaveLength(2);

      // Test with resource filter
      const { logs: filteredLogs, total: filteredTotal } = await consentService.getConsentLogs({
        resourceId: 'resource:1',
        limit: 10,
        offset: 0,
      });

      expect(filteredTotal).toBe(1);
      expect(filteredLogs[0].resourceId).toBe('resource:1');
    });
  });
});
