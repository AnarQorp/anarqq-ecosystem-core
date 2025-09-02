#!/usr/bin/env node

/**
 * Key Management Validation Script
 * 
 * CI/CD pipeline script to validate key management policies,
 * cryptographic standards, and security compliance.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

class KeyManagementValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validationResults = {
      keyPolicies: false,
      algorithmCompliance: false,
      rotationSchedules: false,
      auditLogging: false,
      pqcReadiness: false,
      environmentScoping: false
    };
  }

  /**
   * Run all validation checks
   */
  async validate() {
    console.log('🔐 Key Management Validation Starting...\n');

    try {
      await this.validateKeyPolicies();
      await this.validateAlgorithmCompliance();
      await this.validateRotationSchedules();
      await this.validateAuditLogging();
      await this.validatePQCReadiness();
      await this.validateEnvironmentScoping();
      
      this.generateReport();
      
      const hasErrors = this.errors.length > 0;
      process.exit(hasErrors ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate key management policies
   */
  async validateKeyPolicies() {
    console.log('📋 Validating key management policies...');
    
    try {
      // Check for key management schema
      const schemaPath = 'libs/anarq/common-schemas/schemas/key-management.schema.json';
      if (!existsSync(schemaPath)) {
        this.errors.push('Key management schema not found');
        return;
      }

      const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
      
      // Validate schema structure
      const requiredDefinitions = [
        'KeyMetadata',
        'KeyAuditEvent', 
        'KeyRotationRequest',
        'CryptographicAlgorithm',
        'KMSProvider'
      ];
      
      for (const def of requiredDefinitions) {
        if (!schema.definitions[def]) {
          this.errors.push(`Missing schema definition: ${def}`);
        }
      }

      // Check for required algorithms
      const algorithms = schema.definitions.CryptographicAlgorithm?.enum || [];
      const requiredAlgorithms = [
        'Ed25519', 'AES-256-GCM', 'Dilithium2', 'Kyber512'
      ];
      
      for (const alg of requiredAlgorithms) {
        if (!algorithms.includes(alg)) {
          this.errors.push(`Missing required algorithm: ${alg}`);
        }
      }

      if (this.errors.length === 0) {
        this.validationResults.keyPolicies = true;
        console.log('✅ Key policies validation passed');
      }
      
    } catch (error) {
      this.errors.push(`Key policy validation failed: ${error.message}`);
    }
  }

  /**
   * Validate algorithm compliance
   */
  async validateAlgorithmCompliance() {
    console.log('🔒 Validating cryptographic algorithm compliance...');
    
    try {
      // Check KeyManagementService implementation
      const servicePath = 'backend/services/KeyManagementService.mjs';
      if (!existsSync(servicePath)) {
        this.errors.push('KeyManagementService not found');
        return;
      }

      const serviceCode = readFileSync(servicePath, 'utf8');
      
      // Check for required algorithm implementations
      const requiredMethods = [
        'generateEd25519KeyPair',
        'generateECDSAKeyPair', 
        'generateRSAKeyPair',
        'generateSymmetricKey',
        'generateDilithiumKeyPair',
        'generateKyberKeyPair'
      ];
      
      for (const method of requiredMethods) {
        if (!serviceCode.includes(method)) {
          this.errors.push(`Missing algorithm implementation: ${method}`);
        }
      }

      // Check for PQC support
      if (!serviceCode.includes('pqc: true')) {
        this.warnings.push('Post-quantum cryptography support may be incomplete');
      }

      // Validate key strength requirements
      if (!serviceCode.includes('2048') || !serviceCode.includes('4096')) {
        this.warnings.push('RSA key strength validation may be missing');
      }

      if (this.errors.length === 0) {
        this.validationResults.algorithmCompliance = true;
        console.log('✅ Algorithm compliance validation passed');
      }
      
    } catch (error) {
      this.errors.push(`Algorithm compliance validation failed: ${error.message}`);
    }
  }

  /**
   * Validate rotation schedules
   */
  async validateRotationSchedules() {
    console.log('🔄 Validating key rotation schedules...');
    
    try {
      const servicePath = 'backend/services/KeyManagementService.mjs';
      const serviceCode = readFileSync(servicePath, 'utf8');
      
      // Check for rotation scheduler
      if (!serviceCode.includes('initializeRotationScheduler')) {
        this.errors.push('Key rotation scheduler not implemented');
      }

      if (!serviceCode.includes('checkRotationSchedules')) {
        this.errors.push('Rotation schedule checking not implemented');
      }

      // Check for default rotation schedules
      const requiredSchedules = ['SIGNING', 'ENCRYPTION', 'AUTHENTICATION'];
      for (const usage of requiredSchedules) {
        if (!serviceCode.includes(`'${usage}':`)) {
          this.warnings.push(`Default rotation schedule for ${usage} may be missing`);
        }
      }

      // Check for ISO 8601 duration parsing
      if (!serviceCode.includes('parseDuration')) {
        this.errors.push('ISO 8601 duration parsing not implemented');
      }

      if (this.errors.length === 0) {
        this.validationResults.rotationSchedules = true;
        console.log('✅ Rotation schedules validation passed');
      }
      
    } catch (error) {
      this.errors.push(`Rotation schedules validation failed: ${error.message}`);
    }
  }

  /**
   * Validate audit logging
   */
  async validateAuditLogging() {
    console.log('📝 Validating audit logging...');
    
    try {
      const servicePath = 'backend/services/KeyManagementService.mjs';
      const serviceCode = readFileSync(servicePath, 'utf8');
      
      // Check for audit methods
      if (!serviceCode.includes('auditKeyOperation')) {
        this.errors.push('Key operation auditing not implemented');
      }

      // Check for required audit events
      const requiredEvents = ['CREATE', 'USE', 'ROTATE', 'REVOKE'];
      for (const event of requiredEvents) {
        if (!serviceCode.includes(`operation: '${event}'`)) {
          this.warnings.push(`Audit logging for ${event} operation may be missing`);
        }
      }

      // Check for immutable storage reference
      if (!serviceCode.includes('auditCid')) {
        this.warnings.push('Immutable audit storage (IPFS CID) may not be implemented');
      }

      // Check audit event structure
      const schemaPath = 'libs/anarq/common-schemas/schemas/key-management.schema.json';
      if (existsSync(schemaPath)) {
        const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
        const auditSchema = schema.definitions.KeyAuditEvent;
        
        if (!auditSchema) {
          this.errors.push('KeyAuditEvent schema definition missing');
        } else {
          const requiredFields = ['eventId', 'timestamp', 'keyId', 'operation', 'actor', 'result'];
          for (const field of requiredFields) {
            if (!auditSchema.properties[field]) {
              this.errors.push(`Audit event missing required field: ${field}`);
            }
          }
        }
      }

      if (this.errors.length === 0) {
        this.validationResults.auditLogging = true;
        console.log('✅ Audit logging validation passed');
      }
      
    } catch (error) {
      this.errors.push(`Audit logging validation failed: ${error.message}`);
    }
  }

  /**
   * Validate post-quantum cryptography readiness
   */
  async validatePQCReadiness() {
    console.log('🔮 Validating post-quantum cryptography readiness...');
    
    try {
      const schemaPath = 'libs/anarq/common-schemas/schemas/key-management.schema.json';
      const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
      
      const algorithms = schema.definitions.CryptographicAlgorithm?.enum || [];
      
      // Check for PQC algorithms
      const pqcAlgorithms = [
        'Dilithium2', 'Dilithium3', 'Dilithium5',
        'Falcon-512', 'Falcon-1024',
        'Kyber512', 'Kyber768', 'Kyber1024'
      ];
      
      let pqcCount = 0;
      for (const alg of pqcAlgorithms) {
        if (algorithms.includes(alg)) {
          pqcCount++;
        }
      }
      
      if (pqcCount === 0) {
        this.errors.push('No post-quantum cryptographic algorithms defined');
      } else if (pqcCount < 3) {
        this.warnings.push('Limited post-quantum algorithm support');
      }

      // Check for PQC migration status schema
      if (!schema.definitions.PQCMigrationStatus) {
        this.warnings.push('PQC migration status tracking not defined');
      }

      // Check service implementation
      const servicePath = 'backend/services/KeyManagementService.mjs';
      const serviceCode = readFileSync(servicePath, 'utf8');
      
      if (!serviceCode.includes('pqcEnabled')) {
        this.warnings.push('PQC feature flag not implemented');
      }

      if (this.errors.length === 0) {
        this.validationResults.pqcReadiness = true;
        console.log('✅ PQC readiness validation passed');
      }
      
    } catch (error) {
      this.errors.push(`PQC readiness validation failed: ${error.message}`);
    }
  }

  /**
   * Validate environment scoping
   */
  async validateEnvironmentScoping() {
    console.log('🌍 Validating environment scoping...');
    
    try {
      const servicePath = 'backend/services/KeyManagementService.mjs';
      const serviceCode = readFileSync(servicePath, 'utf8');
      
      // Check for environment configuration
      if (!serviceCode.includes('environment:')) {
        this.errors.push('Environment scoping not implemented');
      }

      // Check for environment-specific key IDs
      if (!serviceCode.includes('this.config.environment')) {
        this.warnings.push('Environment-specific key identification may be missing');
      }

      // Check schema for environment enum
      const schemaPath = 'libs/anarq/common-schemas/schemas/key-management.schema.json';
      const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
      
      const envEnum = schema.definitions.Environment?.enum || [];
      const requiredEnvs = ['dev', 'staging', 'prod'];
      
      for (const env of requiredEnvs) {
        if (!envEnum.includes(env)) {
          this.errors.push(`Missing environment definition: ${env}`);
        }
      }

      // Check for KMS provider configuration
      if (!schema.definitions.KMSProvider) {
        this.errors.push('KMS provider definitions missing');
      }

      if (this.errors.length === 0) {
        this.validationResults.environmentScoping = true;
        console.log('✅ Environment scoping validation passed');
      }
      
    } catch (error) {
      this.errors.push(`Environment scoping validation failed: ${error.message}`);
    }
  }

  /**
   * Generate validation report
   */
  generateReport() {
    console.log('\n📊 Key Management Validation Report');
    console.log('=====================================\n');

    // Summary
    const totalChecks = Object.keys(this.validationResults).length;
    const passedChecks = Object.values(this.validationResults).filter(Boolean).length;
    const successRate = Math.round((passedChecks / totalChecks) * 100);

    console.log(`Overall Success Rate: ${successRate}% (${passedChecks}/${totalChecks})`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}\n`);

    // Detailed results
    console.log('Validation Results:');
    for (const [check, passed] of Object.entries(this.validationResults)) {
      const status = passed ? '✅' : '❌';
      const name = check.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`  ${status} ${name}`);
    }

    // Errors
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (this.errors.length > 0) {
      console.log('  - Fix all errors before deploying to production');
    }
    if (this.warnings.length > 0) {
      console.log('  - Review and address warnings for optimal security');
    }
    if (successRate === 100) {
      console.log('  - Key management implementation is compliant');
    }

    console.log('\n🔐 Key Management Validation Complete\n');
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new KeyManagementValidator();
  validator.validate();
}

export default KeyManagementValidator;