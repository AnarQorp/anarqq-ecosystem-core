import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { SecurityTestRunner } from './SecurityTestRunner';
import { SandboxEscapeTests } from './SandboxEscapeTests';
import { PermissionBypassTests } from './PermissionBypassTests';
import { DataLeakageTests } from './DataLeakageTests';
import { CryptographicSecurityTests } from './CryptographicSecurityTests';
import { NetworkSecurityTests } from './NetworkSecurityTests';
import { PenetrationTestRunner } from './PenetrationTestRunner';

/**
 * Comprehensive Security and Penetration Testing Suite for Qflow
 * 
 * This suite validates the security posture of the Qflow serverless automation engine
 * by testing various attack vectors and security controls.
 */
export class SecurityTestSuite {
  private testRunner: SecurityTestRunner;
  private sandboxTests: SandboxEscapeTests;
  private permissionTests: PermissionBypassTests;
  private dataLeakageTests: DataLeakageTests;
  private cryptoTests: CryptographicSecurityTests;
  private networkTests: NetworkSecurityTests;
  private pentestRunner: PenetrationTestRunner;

  constructor() {
    this.testRunner = new SecurityTestRunner();
    this.sandboxTests = new SandboxEscapeTests(this.testRunner);
    this.permissionTests = new PermissionBypassTests(this.testRunner);
    this.dataLeakageTests = new DataLeakageTests(this.testRunner);
    this.cryptoTests = new CryptographicSecurityTests(this.testRunner);
    this.networkTests = new NetworkSecurityTests(this.testRunner);
    this.pentestRunner = new PenetrationTestRunner(this.testRunner);
  }

  /**
   * Run all security tests
   */
  async runAllTests(): Promise<SecurityTestResults> {
    const results: SecurityTestResults = {
      sandboxEscape: await this.sandboxTests.runTests(),
      permissionBypass: await this.permissionTests.runTests(),
      dataLeakage: await this.dataLeakageTests.runTests(),
      cryptographic: await this.cryptoTests.runTests(),
      network: await this.networkTests.runTests(),
      penetration: await this.pentestRunner.runTests(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        vulnerabilities: [],
        riskLevel: 'LOW'
      }
    };

    // Calculate summary
    this.calculateSummary(results);
    
    return results;
  }

  /**
   * Run sandbox escape tests only
   */
  async runSandboxTests(): Promise<TestCategoryResults> {
    return await this.sandboxTests.runTests();
  }

  /**
   * Run permission bypass tests only
   */
  async runPermissionTests(): Promise<TestCategoryResults> {
    return await this.permissionTests.runTests();
  }

  /**
   * Run data leakage tests only
   */
  async runDataLeakageTests(): Promise<TestCategoryResults> {
    return await this.dataLeakageTests.runTests();
  }

  /**
   * Run cryptographic security tests only
   */
  async runCryptographicTests(): Promise<TestCategoryResults> {
    return await this.cryptoTests.runTests();
  }

  /**
   * Run network security tests only
   */
  async runNetworkTests(): Promise<TestCategoryResults> {
    return await this.networkTests.runTests();
  }

  /**
   * Run penetration tests only
   */
  async runPenetrationTests(): Promise<TestCategoryResults> {
    return await this.pentestRunner.runTests();
  }

  private calculateSummary(results: SecurityTestResults): void {
    const categories = [
      results.sandboxEscape,
      results.permissionBypass,
      results.dataLeakage,
      results.cryptographic,
      results.network,
      results.penetration
    ];

    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    const vulnerabilities: SecurityVulnerability[] = [];

    categories.forEach(category => {
      totalTests += category.totalTests;
      passed += category.passed;
      failed += category.failed;
      vulnerabilities.push(...category.vulnerabilities);
    });

    results.summary = {
      totalTests,
      passed,
      failed,
      vulnerabilities,
      riskLevel: this.calculateRiskLevel(vulnerabilities)
    };
  }

  private calculateRiskLevel(vulnerabilities: SecurityVulnerability[]): RiskLevel {
    if (vulnerabilities.some(v => v.severity === 'CRITICAL')) {
      return 'CRITICAL';
    }
    if (vulnerabilities.some(v => v.severity === 'HIGH')) {
      return 'HIGH';
    }
    if (vulnerabilities.some(v => v.severity === 'MEDIUM')) {
      return 'MEDIUM';
    }
    if (vulnerabilities.length > 0) {
      return 'LOW';
    }
    return 'LOW';
  }
}

export interface SecurityTestResults {
  sandboxEscape: TestCategoryResults;
  permissionBypass: TestCategoryResults;
  dataLeakage: TestCategoryResults;
  cryptographic: TestCategoryResults;
  network: TestCategoryResults;
  penetration: TestCategoryResults;
  summary: TestSummary;
}

export interface TestCategoryResults {
  category: string;
  totalTests: number;
  passed: number;
  failed: number;
  vulnerabilities: SecurityVulnerability[];
  executionTime: number;
  details: TestResult[];
}

export interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  executionTime: number;
  error?: string;
  vulnerability?: SecurityVulnerability;
  details?: any;
}

export interface SecurityVulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  cve?: string;
  remediation: string;
  affectedComponents: string[];
  discoveredBy: string;
  discoveredAt: string;
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  vulnerabilities: SecurityVulnerability[];
  riskLevel: RiskLevel;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Vitest test suite
describe('Qflow Security Test Suite', () => {
  let securitySuite: SecurityTestSuite;

  beforeAll(async () => {
    securitySuite = new SecurityTestSuite();
  });

  describe('Sandbox Escape Tests', () => {
    it('should prevent WASM sandbox escape attempts', async () => {
      const results = await securitySuite.runSandboxTests();
      expect(results.failed).toBe(0);
      expect(results.vulnerabilities.filter(v => v.severity === 'CRITICAL')).toHaveLength(0);
    });
  });

  describe('Permission Bypass Tests', () => {
    it('should prevent authentication and authorization bypass', async () => {
      const results = await securitySuite.runPermissionTests();
      expect(results.failed).toBe(0);
      expect(results.vulnerabilities.filter(v => v.severity === 'HIGH')).toHaveLength(0);
    });
  });

  describe('Data Leakage Tests', () => {
    it('should prevent cross-tenant data access', async () => {
      const results = await securitySuite.runDataLeakageTests();
      expect(results.failed).toBe(0);
      expect(results.vulnerabilities.filter(v => v.category === 'DATA_LEAKAGE')).toHaveLength(0);
    });
  });

  describe('Cryptographic Security Tests', () => {
    it('should validate encryption and signature integrity', async () => {
      const results = await securitySuite.runCryptographicTests();
      expect(results.failed).toBe(0);
      expect(results.vulnerabilities.filter(v => v.category === 'CRYPTOGRAPHIC')).toHaveLength(0);
    });
  });

  describe('Network Security Tests', () => {
    it('should prevent network-based attacks', async () => {
      const results = await securitySuite.runNetworkTests();
      expect(results.failed).toBe(0);
      expect(results.vulnerabilities.filter(v => v.category === 'NETWORK')).toHaveLength(0);
    });
  });

  describe('Comprehensive Security Validation', () => {
    it('should pass all security tests with no critical vulnerabilities', async () => {
      const results = await securitySuite.runAllTests();
      
      expect(results.summary.failed).toBe(0);
      expect(results.summary.vulnerabilities.filter(v => v.severity === 'CRITICAL')).toHaveLength(0);
      expect(results.summary.riskLevel).not.toBe('CRITICAL');
      
      // Log summary for visibility
      console.log('Security Test Summary:', {
        totalTests: results.summary.totalTests,
        passed: results.summary.passed,
        failed: results.summary.failed,
        vulnerabilities: results.summary.vulnerabilities.length,
        riskLevel: results.summary.riskLevel
      });
    });
  });
});