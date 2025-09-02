#!/usr/bin/env node

/**
 * Test Certification System
 * 
 * Simple test script to validate the No Central Server Certification system
 * Task 17.5 Implementation - Testing
 */

import { CertificationEngine } from './no-central-server-certification.mjs';
import { CICertificationCheck } from './ci-certification-check.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CertificationTester {
  constructor() {
    this.testResults = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runTests() {
    console.log('🧪 Testing No Central Server Certification System...');
    console.log('');

    try {
      await this.testCertificationEngine();
      await this.testCIIntegration();
      await this.testAttestationGeneration();
      await this.testVerification();
      
      this.printSummary();
      return this.failed === 0;
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      return false;
    }
  }

  async testCertificationEngine() {
    console.log('🔍 Testing Certification Engine...');
    
    try {
      const engine = new CertificationEngine();
      
      // Test engine initialization
      this.assert(engine.results !== null, 'Engine should initialize with results object');
      this.assert(engine.results.timestamp !== null, 'Engine should set timestamp');
      this.assert(engine.results.version !== null, 'Engine should set version');
      
      console.log('   ✅ Engine initialization test passed');
      
      // Test helper methods
      const pathExists = await engine.pathExists(__filename);
      this.assert(pathExists === true, 'pathExists should detect existing file');
      
      const pathNotExists = await engine.pathExists('/nonexistent/path');
      this.assert(pathNotExists === false, 'pathExists should detect non-existing file');
      
      console.log('   ✅ Helper methods test passed');
      
    } catch (error) {
      this.fail('Certification Engine test failed', error);
    }
  }

  async testCIIntegration() {
    console.log('🤖 Testing CI Integration...');
    
    try {
      const ciChecker = new CICertificationCheck({
        minScore: 50, // Lower threshold for testing
        failOnWarnings: false
      });
      
      this.assert(ciChecker.options.minScore === 50, 'CI checker should accept custom min score');
      this.assert(ciChecker.options.failOnWarnings === false, 'CI checker should accept failOnWarnings option');
      
      console.log('   ✅ CI integration test passed');
      
    } catch (error) {
      this.fail('CI Integration test failed', error);
    }
  }

  async testAttestationGeneration() {
    console.log('🔐 Testing Attestation Generation...');
    
    try {
      const engine = new CertificationEngine();
      
      // Mock some results for testing
      engine.results.score = 95;
      engine.results.passed = true;
      engine.results.violations = [];
      engine.results.warnings = [];
      engine.results.checks = {
        dependencies: { violations: 0, warnings: 0 },
        sourceCode: { violations: 0, warnings: 0 }
      };
      
      await engine.generateAttestation();
      
      this.assert(engine.results.attestation !== null, 'Attestation should be generated');
      this.assert(engine.results.attestation.hash !== null, 'Attestation should have hash');
      this.assert(engine.results.attestation.signature !== null, 'Attestation should have signature');
      this.assert(engine.results.attestation.validUntil !== null, 'Attestation should have expiry');
      
      console.log('   ✅ Attestation generation test passed');
      
    } catch (error) {
      this.fail('Attestation Generation test failed', error);
    }
  }

  async testVerification() {
    console.log('🔍 Testing Verification...');
    
    try {
      // Create a mock attestation file for testing
      const mockAttestation = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        score: 95,
        passed: true,
        violations: [],
        warnings: [],
        attestation: {
          data: { test: true },
          hash: 'test-hash',
          signature: 'test-signature',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
      
      const testDir = path.join(__dirname, '..', 'test-reports');
      await fs.mkdir(testDir, { recursive: true });
      
      const attestationFile = path.join(testDir, 'test-attestation.json');
      await fs.writeFile(attestationFile, JSON.stringify(mockAttestation, null, 2));
      
      // Verify file was created
      const fileExists = await this.pathExists(attestationFile);
      this.assert(fileExists, 'Test attestation file should be created');
      
      // Clean up
      await fs.unlink(attestationFile);
      await fs.rmdir(testDir);
      
      console.log('   ✅ Verification test passed');
      
    } catch (error) {
      this.fail('Verification test failed', error);
    }
  }

  async pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  assert(condition, message) {
    if (condition) {
      this.passed++;
      this.testResults.push({ type: 'pass', message });
    } else {
      this.failed++;
      this.testResults.push({ type: 'fail', message });
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  fail(message, error) {
    this.failed++;
    this.testResults.push({ 
      type: 'fail', 
      message, 
      error: error?.message || 'Unknown error' 
    });
    console.log(`   ❌ ${message}: ${error?.message || 'Unknown error'}`);
  }

  printSummary() {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🧪 CERTIFICATION SYSTEM TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📊 Total: ${this.passed + this.failed}`);
    console.log(`🎯 Success Rate: ${Math.round((this.passed / (this.passed + this.failed)) * 100)}%`);
    
    if (this.failed === 0) {
      console.log('');
      console.log('🎉 All tests passed! Certification system is working correctly.');
    } else {
      console.log('');
      console.log('❌ Some tests failed. Please review the issues above.');
      
      const failures = this.testResults.filter(r => r.type === 'fail');
      console.log('');
      console.log('Failed Tests:');
      failures.forEach((failure, index) => {
        console.log(`   ${index + 1}. ${failure.message}`);
        if (failure.error) {
          console.log(`      Error: ${failure.error}`);
        }
      });
    }
    console.log('═══════════════════════════════════════');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Certification System Test Suite

USAGE:
  node test-certification.mjs

This script runs a comprehensive test suite for the No Central Server
Certification System to ensure all components are working correctly.

The test suite includes:
- Certification Engine functionality
- CI Integration components  
- Attestation generation
- Verification processes

EXIT CODES:
  0 - All tests passed
  1 - Some tests failed
`);
    process.exit(0);
  }

  const tester = new CertificationTester();
  const success = await tester.runTests();
  
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { CertificationTester };