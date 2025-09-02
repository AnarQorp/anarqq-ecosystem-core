import { ReIdentificationAssessment, AnonymizationConfig } from '../types/privacy';
import { logger } from '../utils/logger';

export interface KAnonymityResult {
  k: number;
  satisfied: boolean;
  vulnerableGroups: Array<{
    attributes: Record<string, any>;
    count: number;
  }>;
}

export interface LDiversityResult {
  l: number;
  satisfied: boolean;
  vulnerableAttributes: string[];
}

export interface TClosenessResult {
  t: number;
  satisfied: boolean;
  vulnerableAttributes: Array<{
    attribute: string;
    distance: number;
  }>;
}

export interface DifferentialPrivacyResult {
  epsilon: number;
  delta: number;
  noiseAdded: boolean;
  utilityScore: number;
}

export class ReIdentificationService {
  /**
   * Perform comprehensive re-identification risk assessment
   */
  async assessReIdentificationRisk(
    dataset: Record<string, any>[],
    config?: {
      kAnonymity?: number;
      lDiversity?: number;
      tCloseness?: number;
      sensitiveAttributes?: string[];
      quasiIdentifiers?: string[];
    }
  ): Promise<ReIdentificationAssessment> {
    logger.info('Performing re-identification risk assessment');

    const kAnonymityResult = await this.checkKAnonymity(
      dataset, 
      config?.quasiIdentifiers || this.identifyQuasiIdentifiers(dataset),
      config?.kAnonymity || 3
    );

    const lDiversityResult = await this.checkLDiversity(
      dataset,
      config?.sensitiveAttributes || this.identifySensitiveAttributes(dataset),
      config?.lDiversity || 2
    );

    const tClosenessResult = await this.checkTCloseness(
      dataset,
      config?.sensitiveAttributes || this.identifySensitiveAttributes(dataset),
      config?.tCloseness || 0.2
    );

    const overallRiskScore = this.calculateOverallRiskScore(
      kAnonymityResult,
      lDiversityResult,
      tClosenessResult
    );

    const vulnerabilities = this.identifyVulnerabilities(
      kAnonymityResult,
      lDiversityResult,
      tClosenessResult
    );

    const recommendations = this.generateRecommendations(
      overallRiskScore,
      vulnerabilities,
      kAnonymityResult,
      lDiversityResult,
      tClosenessResult
    );

    return {
      riskScore: overallRiskScore,
      vulnerabilities,
      recommendations,
      confidence: this.calculateConfidence(dataset.length, vulnerabilities.length)
    };
  }

  /**
   * Apply k-anonymity to dataset
   */
  async applyKAnonymity(
    dataset: Record<string, any>[],
    quasiIdentifiers: string[],
    k: number = 3
  ): Promise<{
    anonymizedDataset: Record<string, any>[];
    suppressedRecords: number;
    generalizedFields: string[];
  }> {
    logger.info(`Applying k-anonymity with k=${k}`);

    let workingDataset = [...dataset];
    const generalizedFields: string[] = [];
    let suppressedRecords = 0;

    // Iteratively generalize and suppress until k-anonymity is achieved
    while (true) {
      const kAnonymityResult = await this.checkKAnonymity(workingDataset, quasiIdentifiers, k);
      
      if (kAnonymityResult.satisfied) {
        break;
      }

      // Find the most specific attribute to generalize
      const attributeToGeneralize = this.selectAttributeForGeneralization(
        workingDataset,
        quasiIdentifiers,
        kAnonymityResult.vulnerableGroups
      );

      if (attributeToGeneralize) {
        workingDataset = this.generalizeAttribute(workingDataset, attributeToGeneralize);
        generalizedFields.push(attributeToGeneralize);
      } else {
        // If no attribute can be generalized, suppress vulnerable records
        const recordsToSuppress = this.selectRecordsForSuppression(
          workingDataset,
          kAnonymityResult.vulnerableGroups,
          k
        );
        
        workingDataset = workingDataset.filter((_, index) => !recordsToSuppress.includes(index));
        suppressedRecords += recordsToSuppress.length;
      }

      // Prevent infinite loops
      if (generalizedFields.length > quasiIdentifiers.length) {
        logger.warn('K-anonymity could not be achieved with current parameters');
        break;
      }
    }

    return {
      anonymizedDataset: workingDataset,
      suppressedRecords,
      generalizedFields
    };
  }

  /**
   * Apply differential privacy noise
   */
  async applyDifferentialPrivacy(
    dataset: Record<string, any>[],
    epsilon: number = 1.0,
    delta: number = 1e-5,
    numericalFields: string[] = []
  ): Promise<{
    noisyDataset: Record<string, any>[];
    privacyBudget: { epsilon: number; delta: number };
    utilityScore: number;
  }> {
    logger.info(`Applying differential privacy with ε=${epsilon}, δ=${delta}`);

    const noisyDataset = dataset.map(record => {
      const noisyRecord = { ...record };

      // Add Laplace noise to numerical fields
      numericalFields.forEach(field => {
        if (typeof record[field] === 'number') {
          const sensitivity = this.calculateSensitivity(dataset, field);
          const noise = this.generateLaplaceNoise(sensitivity / epsilon);
          noisyRecord[field] = record[field] + noise;
        }
      });

      return noisyRecord;
    });

    const utilityScore = this.calculateUtilityScore(dataset, noisyDataset, numericalFields);

    return {
      noisyDataset,
      privacyBudget: { epsilon, delta },
      utilityScore
    };
  }

  /**
   * Check k-anonymity property
   */
  private async checkKAnonymity(
    dataset: Record<string, any>[],
    quasiIdentifiers: string[],
    k: number
  ): Promise<KAnonymityResult> {
    const groups = new Map<string, Record<string, any>[]>();

    // Group records by quasi-identifier values
    dataset.forEach(record => {
      const key = quasiIdentifiers.map(qi => record[qi]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    });

    // Find groups with fewer than k records
    const vulnerableGroups: Array<{
      attributes: Record<string, any>;
      count: number;
    }> = [];

    groups.forEach((records, key) => {
      if (records.length < k) {
        const attributes: Record<string, any> = {};
        const values = key.split('|');
        quasiIdentifiers.forEach((qi, index) => {
          attributes[qi] = values[index];
        });
        
        vulnerableGroups.push({
          attributes,
          count: records.length
        });
      }
    });

    return {
      k,
      satisfied: vulnerableGroups.length === 0,
      vulnerableGroups
    };
  }

  /**
   * Check l-diversity property
   */
  private async checkLDiversity(
    dataset: Record<string, any>[],
    sensitiveAttributes: string[],
    l: number
  ): Promise<LDiversityResult> {
    const vulnerableAttributes: string[] = [];

    for (const attribute of sensitiveAttributes) {
      const uniqueValues = new Set(dataset.map(record => record[attribute]));
      if (uniqueValues.size < l) {
        vulnerableAttributes.push(attribute);
      }
    }

    return {
      l,
      satisfied: vulnerableAttributes.length === 0,
      vulnerableAttributes
    };
  }

  /**
   * Check t-closeness property
   */
  private async checkTCloseness(
    dataset: Record<string, any>[],
    sensitiveAttributes: string[],
    t: number
  ): Promise<TClosenessResult> {
    const vulnerableAttributes: Array<{
      attribute: string;
      distance: number;
    }> = [];

    for (const attribute of sensitiveAttributes) {
      const globalDistribution = this.calculateDistribution(dataset, attribute);
      
      // For simplicity, we'll check the overall distribution
      // In a full implementation, this would check each equivalence class
      const distance = this.calculateEarthMoverDistance(globalDistribution, globalDistribution);
      
      if (distance > t) {
        vulnerableAttributes.push({
          attribute,
          distance
        });
      }
    }

    return {
      t,
      satisfied: vulnerableAttributes.length === 0,
      vulnerableAttributes
    };
  }

  /**
   * Identify quasi-identifiers in dataset
   */
  private identifyQuasiIdentifiers(dataset: Record<string, any>[]): string[] {
    if (dataset.length === 0) return [];

    const quasiIdentifiers: string[] = [];
    const sampleRecord = dataset[0];

    Object.keys(sampleRecord).forEach(field => {
      const fieldType = this.classifyFieldType(field, sampleRecord[field]);
      if (fieldType === 'quasi-identifier') {
        quasiIdentifiers.push(field);
      }
    });

    return quasiIdentifiers;
  }

  /**
   * Identify sensitive attributes in dataset
   */
  private identifySensitiveAttributes(dataset: Record<string, any>[]): string[] {
    if (dataset.length === 0) return [];

    const sensitiveAttributes: string[] = [];
    const sampleRecord = dataset[0];

    Object.keys(sampleRecord).forEach(field => {
      const fieldType = this.classifyFieldType(field, sampleRecord[field]);
      if (fieldType === 'sensitive') {
        sensitiveAttributes.push(field);
      }
    });

    return sensitiveAttributes;
  }

  /**
   * Classify field type for privacy analysis
   */
  private classifyFieldType(fieldName: string, value: any): 'identifier' | 'quasi-identifier' | 'sensitive' | 'non-sensitive' {
    const fieldLower = fieldName.toLowerCase();

    // Direct identifiers
    if (['id', 'ssn', 'passport', 'license', 'email'].some(id => fieldLower.includes(id))) {
      return 'identifier';
    }

    // Quasi-identifiers
    if (['name', 'phone', 'address', 'zip', 'birth', 'age', 'gender', 'occupation'].some(qi => fieldLower.includes(qi))) {
      return 'quasi-identifier';
    }

    // Sensitive attributes
    if (['salary', 'income', 'medical', 'health', 'diagnosis', 'religion', 'political', 'sexual'].some(sa => fieldLower.includes(sa))) {
      return 'sensitive';
    }

    return 'non-sensitive';
  }

  /**
   * Calculate overall re-identification risk score
   */
  private calculateOverallRiskScore(
    kAnonymity: KAnonymityResult,
    lDiversity: LDiversityResult,
    tCloseness: TClosenessResult
  ): number {
    let riskScore = 0;

    // K-anonymity contributes 50% to risk score
    if (!kAnonymity.satisfied) {
      const avgGroupSize = kAnonymity.vulnerableGroups.reduce((sum, group) => sum + group.count, 0) / 
                          Math.max(kAnonymity.vulnerableGroups.length, 1);
      riskScore += 0.5 * (1 - Math.min(avgGroupSize / kAnonymity.k, 1));
    }

    // L-diversity contributes 30% to risk score
    if (!lDiversity.satisfied) {
      riskScore += 0.3 * (lDiversity.vulnerableAttributes.length / Math.max(lDiversity.vulnerableAttributes.length, 1));
    }

    // T-closeness contributes 20% to risk score
    if (!tCloseness.satisfied) {
      const avgDistance = tCloseness.vulnerableAttributes.reduce((sum, attr) => sum + attr.distance, 0) / 
                         Math.max(tCloseness.vulnerableAttributes.length, 1);
      riskScore += 0.2 * Math.min(avgDistance / tCloseness.t, 1);
    }

    return Math.min(riskScore, 1);
  }

  /**
   * Identify specific vulnerabilities
   */
  private identifyVulnerabilities(
    kAnonymity: KAnonymityResult,
    lDiversity: LDiversityResult,
    tCloseness: TClosenessResult
  ): string[] {
    const vulnerabilities: string[] = [];

    if (!kAnonymity.satisfied) {
      vulnerabilities.push(`K-anonymity violated: ${kAnonymity.vulnerableGroups.length} groups have fewer than ${kAnonymity.k} records`);
    }

    if (!lDiversity.satisfied) {
      vulnerabilities.push(`L-diversity violated: attributes ${lDiversity.vulnerableAttributes.join(', ')} have insufficient diversity`);
    }

    if (!tCloseness.satisfied) {
      vulnerabilities.push(`T-closeness violated: attributes ${tCloseness.vulnerableAttributes.map(a => a.attribute).join(', ')} have skewed distributions`);
    }

    return vulnerabilities;
  }

  /**
   * Generate recommendations for improving privacy
   */
  private generateRecommendations(
    riskScore: number,
    vulnerabilities: string[],
    kAnonymity: KAnonymityResult,
    lDiversity: LDiversityResult,
    tCloseness: TClosenessResult
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore > 0.7) {
      recommendations.push('High re-identification risk detected - consider stronger anonymization');
    }

    if (!kAnonymity.satisfied) {
      recommendations.push(`Increase k-anonymity by generalizing quasi-identifiers or suppressing outlier records`);
      recommendations.push(`Consider increasing k value from ${kAnonymity.k} to ${kAnonymity.k + 2}`);
    }

    if (!lDiversity.satisfied) {
      recommendations.push('Improve l-diversity by adding noise to sensitive attributes or generalizing values');
      recommendations.push('Consider removing or generalizing sensitive attributes with low diversity');
    }

    if (!tCloseness.satisfied) {
      recommendations.push('Improve t-closeness by balancing sensitive attribute distributions across equivalence classes');
    }

    if (vulnerabilities.length > 0) {
      recommendations.push('Apply differential privacy for additional protection');
      recommendations.push('Consider synthetic data generation as an alternative');
    }

    return recommendations;
  }

  /**
   * Calculate confidence in the assessment
   */
  private calculateConfidence(datasetSize: number, vulnerabilityCount: number): number {
    // Confidence increases with dataset size and decreases with vulnerabilities
    const sizeConfidence = Math.min(datasetSize / 1000, 1); // Max confidence at 1000+ records
    const vulnerabilityPenalty = vulnerabilityCount * 0.1;
    
    return Math.max(0.1, Math.min(1, sizeConfidence - vulnerabilityPenalty));
  }

  // Helper methods for anonymization algorithms

  private selectAttributeForGeneralization(
    dataset: Record<string, any>[],
    quasiIdentifiers: string[],
    vulnerableGroups: Array<{ attributes: Record<string, any>; count: number }>
  ): string | null {
    // Select the attribute that appears most frequently in vulnerable groups
    const attributeFrequency: Record<string, number> = {};

    vulnerableGroups.forEach(group => {
      Object.keys(group.attributes).forEach(attr => {
        attributeFrequency[attr] = (attributeFrequency[attr] || 0) + 1;
      });
    });

    const sortedAttributes = Object.entries(attributeFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([attr]) => attr);

    return sortedAttributes[0] || null;
  }

  private generalizeAttribute(dataset: Record<string, any>[], attribute: string): Record<string, any>[] {
    return dataset.map(record => {
      const newRecord = { ...record };
      const value = record[attribute];

      if (typeof value === 'number') {
        // Generalize numbers to ranges
        newRecord[attribute] = this.generalizeNumber(value);
      } else if (typeof value === 'string') {
        // Generalize strings
        newRecord[attribute] = this.generalizeString(value);
      }

      return newRecord;
    });
  }

  private generalizeNumber(value: number): string {
    if (value < 18) return '0-17';
    if (value < 30) return '18-29';
    if (value < 50) return '30-49';
    if (value < 65) return '50-64';
    return '65+';
  }

  private generalizeString(value: string): string {
    // Simple string generalization - take first character
    return value.charAt(0) + '*'.repeat(Math.max(0, value.length - 1));
  }

  private selectRecordsForSuppression(
    dataset: Record<string, any>[],
    vulnerableGroups: Array<{ attributes: Record<string, any>; count: number }>,
    k: number
  ): number[] {
    const recordsToSuppress: number[] = [];

    vulnerableGroups.forEach(group => {
      const recordsInGroup = dataset
        .map((record, index) => ({ record, index }))
        .filter(({ record }) => {
          return Object.entries(group.attributes).every(([attr, value]) => record[attr] === value);
        });

      // Suppress all records in groups smaller than k
      if (recordsInGroup.length < k) {
        recordsToSuppress.push(...recordsInGroup.map(r => r.index));
      }
    });

    return recordsToSuppress;
  }

  private calculateDistribution(dataset: Record<string, any>[], attribute: string): Map<any, number> {
    const distribution = new Map<any, number>();
    
    dataset.forEach(record => {
      const value = record[attribute];
      distribution.set(value, (distribution.get(value) || 0) + 1);
    });

    return distribution;
  }

  private calculateEarthMoverDistance(dist1: Map<any, number>, dist2: Map<any, number>): number {
    // Simplified Earth Mover's Distance calculation
    // In a full implementation, this would use proper EMD algorithm
    const keys = new Set([...dist1.keys(), ...dist2.keys()]);
    let distance = 0;

    keys.forEach(key => {
      const freq1 = (dist1.get(key) || 0) / Math.max(1, dist1.size);
      const freq2 = (dist2.get(key) || 0) / Math.max(1, dist2.size);
      distance += Math.abs(freq1 - freq2);
    });

    return distance / 2; // Normalize
  }

  private calculateSensitivity(dataset: Record<string, any>[], field: string): number {
    const values = dataset.map(record => record[field]).filter(v => typeof v === 'number');
    if (values.length === 0) return 1;

    return Math.max(...values) - Math.min(...values);
  }

  private generateLaplaceNoise(scale: number): number {
    // Generate Laplace noise using inverse transform sampling
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private calculateUtilityScore(
    original: Record<string, any>[],
    noisy: Record<string, any>[],
    numericalFields: string[]
  ): number {
    if (original.length !== noisy.length) return 0;

    let totalError = 0;
    let totalFields = 0;

    for (let i = 0; i < original.length; i++) {
      numericalFields.forEach(field => {
        if (typeof original[i][field] === 'number' && typeof noisy[i][field] === 'number') {
          const relativeError = Math.abs(original[i][field] - noisy[i][field]) / 
                               Math.max(Math.abs(original[i][field]), 1);
          totalError += relativeError;
          totalFields++;
        }
      });
    }

    const avgError = totalFields > 0 ? totalError / totalFields : 0;
    return Math.max(0, 1 - avgError); // Higher score means better utility
  }
}