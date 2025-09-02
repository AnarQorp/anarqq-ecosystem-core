import { describe, it, expect, beforeEach } from 'vitest';
import { ReIdentificationService } from '../../src/services/ReIdentificationService';

describe('ReIdentificationService', () => {
  let service: ReIdentificationService;

  beforeEach(() => {
    service = new ReIdentificationService();
  });

  describe('assessReIdentificationRisk', () => {
    it('should assess risk for a simple dataset', async () => {
      const dataset = [
        { name: 'John', age: 25, city: 'New York', salary: 50000 },
        { name: 'Jane', age: 30, city: 'Boston', salary: 60000 },
        { name: 'Bob', age: 25, city: 'New York', salary: 55000 }
      ];

      const assessment = await service.assessReIdentificationRisk(dataset, {
        kAnonymity: 2,
        quasiIdentifiers: ['age', 'city'],
        sensitiveAttributes: ['salary']
      });

      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(1);
      expect(assessment.vulnerabilities).toBeInstanceOf(Array);
      expect(assessment.recommendations).toBeInstanceOf(Array);
      expect(assessment.confidence).toBeGreaterThanOrEqual(0);
      expect(assessment.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect k-anonymity violations', async () => {
      const dataset = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'Boston' },
        { name: 'Bob', age: 35, city: 'Chicago' } // Each person is unique
      ];

      const assessment = await service.assessReIdentificationRisk(dataset, {
        kAnonymity: 2,
        quasiIdentifiers: ['age', 'city']
      });

      expect(assessment.riskScore).toBeGreaterThan(0);
      expect(assessment.vulnerabilities.some(v => v.includes('K-anonymity violated'))).toBe(true);
      expect(assessment.recommendations.some(r => r.includes('k-anonymity'))).toBe(true);
    });

    it('should handle empty dataset', async () => {
      const dataset: Record<string, any>[] = [];

      const assessment = await service.assessReIdentificationRisk(dataset);

      expect(assessment.riskScore).toBe(0);
      expect(assessment.vulnerabilities).toHaveLength(0);
      expect(assessment.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should auto-identify quasi-identifiers and sensitive attributes', async () => {
      const dataset = [
        { email: 'john@example.com', age: 25, salary: 50000, preference: 'coffee' },
        { email: 'jane@example.com', age: 30, salary: 60000, preference: 'tea' }
      ];

      const assessment = await service.assessReIdentificationRisk(dataset);

      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.vulnerabilities).toBeInstanceOf(Array);
      expect(assessment.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('applyKAnonymity', () => {
    it('should apply k-anonymity to dataset', async () => {
      const dataset = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 27, city: 'New York' },
        { name: 'Bob', age: 35, city: 'Boston' },
        { name: 'Alice', age: 37, city: 'Boston' }
      ];

      const result = await service.applyKAnonymity(dataset, ['age', 'city'], 2);

      expect(result.anonymizedDataset).toBeInstanceOf(Array);
      expect(result.anonymizedDataset.length).toBeLessThanOrEqual(dataset.length);
      expect(result.suppressedRecords).toBeGreaterThanOrEqual(0);
      expect(result.generalizedFields).toBeInstanceOf(Array);

      // Verify k-anonymity is satisfied
      const groups = new Map<string, number>();
      result.anonymizedDataset.forEach(record => {
        const key = `${record.age}|${record.city}`;
        groups.set(key, (groups.get(key) || 0) + 1);
      });

      // All groups should have at least k records
      Array.from(groups.values()).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(2);
      });
    });

    it('should handle dataset that already satisfies k-anonymity', async () => {
      const dataset = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 25, city: 'New York' },
        { name: 'Bob', age: 30, city: 'Boston' },
        { name: 'Alice', age: 30, city: 'Boston' }
      ];

      const result = await service.applyKAnonymity(dataset, ['age', 'city'], 2);

      expect(result.anonymizedDataset).toHaveLength(4);
      expect(result.suppressedRecords).toBe(0);
      expect(result.generalizedFields).toHaveLength(0);
    });

    it('should suppress records when generalization is not sufficient', async () => {
      const dataset = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'Boston' },
        { name: 'Bob', age: 35, city: 'Chicago' } // All unique
      ];

      const result = await service.applyKAnonymity(dataset, ['age', 'city'], 2);

      expect(result.suppressedRecords).toBeGreaterThan(0);
      expect(result.anonymizedDataset.length + result.suppressedRecords).toBe(dataset.length);
    });
  });

  describe('applyDifferentialPrivacy', () => {
    it('should apply differential privacy noise to numerical fields', async () => {
      const dataset = [
        { name: 'John', age: 25, salary: 50000 },
        { name: 'Jane', age: 30, salary: 60000 },
        { name: 'Bob', age: 35, salary: 70000 }
      ];

      const result = await service.applyDifferentialPrivacy(
        dataset,
        1.0, // epsilon
        1e-5, // delta
        ['age', 'salary']
      );

      expect(result.noisyDataset).toHaveLength(dataset.length);
      expect(result.privacyBudget.epsilon).toBe(1.0);
      expect(result.privacyBudget.delta).toBe(1e-5);
      expect(result.utilityScore).toBeGreaterThanOrEqual(0);
      expect(result.utilityScore).toBeLessThanOrEqual(1);

      // Verify noise was added (values should be different)
      let noiseAdded = false;
      for (let i = 0; i < dataset.length; i++) {
        if (result.noisyDataset[i].age !== dataset[i].age ||
            result.noisyDataset[i].salary !== dataset[i].salary) {
          noiseAdded = true;
          break;
        }
      }
      expect(noiseAdded).toBe(true);

      // Non-numerical fields should remain unchanged
      for (let i = 0; i < dataset.length; i++) {
        expect(result.noisyDataset[i].name).toBe(dataset[i].name);
      }
    });

    it('should handle dataset with no numerical fields', async () => {
      const dataset = [
        { name: 'John', city: 'New York' },
        { name: 'Jane', city: 'Boston' }
      ];

      const result = await service.applyDifferentialPrivacy(dataset, 1.0, 1e-5, []);

      expect(result.noisyDataset).toEqual(dataset);
      expect(result.utilityScore).toBe(1); // Perfect utility since no noise added
    });

    it('should calculate utility score correctly', async () => {
      const dataset = [
        { value: 100 },
        { value: 200 },
        { value: 300 }
      ];

      // High epsilon should result in less noise and higher utility
      const highEpsilonResult = await service.applyDifferentialPrivacy(dataset, 10.0, 1e-5, ['value']);
      
      // Low epsilon should result in more noise and lower utility
      const lowEpsilonResult = await service.applyDifferentialPrivacy(dataset, 0.1, 1e-5, ['value']);

      expect(highEpsilonResult.utilityScore).toBeGreaterThan(lowEpsilonResult.utilityScore);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty quasi-identifiers list', async () => {
      const dataset = [
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 }
      ];

      const result = await service.applyKAnonymity(dataset, [], 2);

      expect(result.anonymizedDataset).toEqual(dataset);
      expect(result.suppressedRecords).toBe(0);
      expect(result.generalizedFields).toHaveLength(0);
    });

    it('should handle single record dataset', async () => {
      const dataset = [
        { name: 'John', age: 25, city: 'New York' }
      ];

      const assessment = await service.assessReIdentificationRisk(dataset, {
        kAnonymity: 2,
        quasiIdentifiers: ['age', 'city']
      });

      expect(assessment.riskScore).toBeGreaterThan(0);
      expect(assessment.vulnerabilities.some(v => v.includes('K-anonymity violated'))).toBe(true);
    });

    it('should handle dataset with missing values', async () => {
      const dataset = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: null, city: 'Boston' },
        { name: 'Bob', age: 30, city: undefined }
      ];

      const assessment = await service.assessReIdentificationRisk(dataset, {
        quasiIdentifiers: ['age', 'city']
      });

      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should handle very large k value', async () => {
      const dataset = [
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 }
      ];

      const result = await service.applyKAnonymity(dataset, ['age'], 10);

      // Should suppress all records since k > dataset size
      expect(result.anonymizedDataset.length + result.suppressedRecords).toBe(dataset.length);
    });
  });
});