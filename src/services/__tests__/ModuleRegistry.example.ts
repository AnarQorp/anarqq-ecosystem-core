/**
 * ModuleRegistry Usage Example
 * Demonstrates how to use the ModuleRegistry service
 */

import ModuleRegistry from '../ModuleRegistry';
import {
  RegisteredModule,
  ModuleStatus,
  QModuleMetadata,
  SignedModuleMetadata,
  ModuleCompliance,
  ModuleSearchCriteria
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

// Example usage of ModuleRegistry
export function demonstrateModuleRegistry() {
  console.log('=== ModuleRegistry Usage Example ===\n');

  // 1. Create a new registry instance
  const registry = new ModuleRegistry();
  console.log('✓ Created ModuleRegistry instance');

  // 2. Create sample module data
  const qwalletModule = createSampleModule(
    'qwallet',
    '1.0.0',
    'Quantum Wallet for secure digital asset management',
    ModuleStatus.PRODUCTION_READY,
    [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE],
    ['qindex', 'qlock', 'qerberos']
  );

  const qsocialModule = createSampleModule(
    'qsocial',
    '2.1.0',
    'Decentralized social networking platform',
    ModuleStatus.TESTING,
    [IdentityType.ENTERPRISE, IdentityType.DAO],
    ['qindex', 'qwallet']
  );

  // 3. Register modules
  console.log('\n--- Module Registration ---');
  
  // Register production module
  const prodResult = registry.registerProductionModule(qwalletModule);
  console.log(`✓ Registered Qwallet in production: ${prodResult}`);

  // Register sandbox module
  const sandboxResult = registry.registerSandboxModule(qsocialModule);
  console.log(`✓ Registered Qsocial in sandbox: ${sandboxResult}`);

  // 4. Retrieve modules
  console.log('\n--- Module Retrieval ---');
  
  const retrievedQwallet = registry.getModule('qwallet');
  console.log(`✓ Retrieved Qwallet: ${retrievedQwallet?.metadata.module} v${retrievedQwallet?.metadata.version}`);

  const retrievedQsocial = registry.getModule('qsocial', true); // Include test mode
  console.log(`✓ Retrieved Qsocial (test mode): ${retrievedQsocial?.metadata.module} v${retrievedQsocial?.metadata.version}`);

  // 5. Search modules
  console.log('\n--- Module Search ---');
  
  // Search by status
  const productionModules = registry.searchModules({ 
    status: ModuleStatus.PRODUCTION_READY 
  });
  console.log(`✓ Found ${productionModules.modules.length} production modules`);

  // Search by identity type
  const rootModules = registry.searchModules({ 
    identityType: IdentityType.ROOT 
  });
  console.log(`✓ Found ${rootModules.modules.length} modules supporting ROOT identity`);

  // Search by integration
  const qlockIntegrations = registry.searchModules({ 
    integration: 'qlock' 
  });
  console.log(`✓ Found ${qlockIntegrations.modules.length} modules integrating with Qlock`);

  // 6. Dependency management
  console.log('\n--- Dependency Management ---');
  
  const qwalletDeps = registry.getModuleDependencies('qwallet');
  console.log(`✓ Qwallet dependencies: ${qwalletDeps.join(', ')}`);

  const compatibility = registry.checkDependencyCompatibility('qsocial', ['qwallet']);
  console.log(`✓ Qsocial -> Qwallet compatibility: ${compatibility.compatible}`);
  if (!compatibility.compatible) {
    console.log(`  Missing dependencies: ${compatibility.missingDependencies.join(', ')}`);
  }

  // 7. Signature verification caching
  console.log('\n--- Signature Verification Caching ---');
  
  const verificationResult = {
    valid: true,
    signatureValid: true,
    identityVerified: true,
    timestampValid: true
  };

  registry.cacheSignatureVerification('qwallet', verificationResult, '1.0.0');
  console.log('✓ Cached signature verification for Qwallet');

  const cachedResult = registry.getCachedSignatureVerification('qwallet', '1.0.0');
  console.log(`✓ Retrieved cached verification: ${cachedResult?.valid ? 'Valid' : 'Invalid'}`);

  // 8. Access statistics
  console.log('\n--- Access Statistics ---');
  
  const qwalletStats = registry.getAccessStats('qwallet');
  console.log(`✓ Qwallet access stats: ${qwalletStats?.totalQueries} queries`);

  // 9. Audit logging
  console.log('\n--- Audit Logging ---');
  
  const auditLog = registry.getAuditLog('qwallet');
  console.log(`✓ Qwallet audit log: ${auditLog.length} events`);
  
  if (auditLog.length > 0) {
    const latestEvent = auditLog[0];
    console.log(`  Latest event: ${latestEvent.action} at ${latestEvent.timestamp}`);
  }

  // 10. Registry statistics
  console.log('\n--- Registry Statistics ---');
  
  const stats = registry.getRegistryStats();
  console.log(`✓ Registry stats:`);
  console.log(`  - Production modules: ${stats.productionModules}`);
  console.log(`  - Sandbox modules: ${stats.sandboxModules}`);
  console.log(`  - Total modules: ${stats.totalModules}`);
  console.log(`  - Total accesses: ${stats.totalAccesses}`);
  console.log(`  - Audit log size: ${stats.auditLogSize}`);

  // 11. Module lifecycle operations
  console.log('\n--- Module Lifecycle ---');
  
  // Update module
  const updatedQsocial = {
    ...qsocialModule,
    metadata: {
      ...qsocialModule.metadata,
      status: ModuleStatus.PRODUCTION_READY,
      version: '2.2.0'
    }
  };

  const updateResult = registry.updateModule('qsocial', updatedQsocial);
  console.log(`✓ Updated Qsocial: ${updateResult}`);

  // Promote sandbox to production
  const promoteResult = registry.promoteSandboxToProduction('qsocial', 'did:test:admin');
  console.log(`✓ Promoted Qsocial to production: ${promoteResult}`);

  // Final registry state
  const finalStats = registry.getRegistryStats();
  console.log(`\n✓ Final state: ${finalStats.productionModules} production, ${finalStats.sandboxModules} sandbox modules`);

  console.log('\n=== ModuleRegistry Example Complete ===');
  
  return registry;
}

// Helper function to create sample modules
function createSampleModule(
  name: string,
  version: string,
  description: string,
  status: ModuleStatus,
  identityTypes: IdentityType[],
  integrations: string[]
): RegisteredModule {
  const compliance: ModuleCompliance = {
    audit: true,
    risk_scoring: true,
    privacy_enforced: true,
    kyc_support: status === ModuleStatus.PRODUCTION_READY,
    gdpr_compliant: true,
    data_retention_policy: 'standard'
  };

  const metadata: QModuleMetadata = {
    module: name,
    version,
    description,
    identities_supported: identityTypes,
    integrations,
    dependencies: integrations.filter(integration => integration !== 'qindex'), // Assume qindex is base
    status,
    audit_hash: generateHash(name + version),
    compliance,
    repository: `https://github.com/anarq/${name}`,
    documentation: `QmDoc${name.charAt(0).toUpperCase() + name.slice(1)}CID`,
    activated_by: 'did:anarq:root:admin',
    timestamp: Date.now(),
    checksum: generateHash(name + version + 'checksum'),
    signature_algorithm: 'RSA-SHA256',
    public_key_id: `key_${name}_${version.replace(/\./g, '_')}`
  };

  const signedMetadata: SignedModuleMetadata = {
    metadata,
    signature: generateSignature(name, version),
    publicKey: `pubkey_${name}`,
    signature_type: 'RSA-SHA256',
    signed_at: Date.now(),
    signer_identity: 'did:anarq:root:admin'
  };

  return {
    moduleId: name,
    metadata,
    signedMetadata,
    registrationInfo: {
      cid: `QmReg${name.charAt(0).toUpperCase() + name.slice(1)}CID`,
      indexId: `idx_${name}_${Date.now()}`,
      registeredAt: new Date().toISOString(),
      registeredBy: 'did:anarq:root:admin',
      status,
      verificationStatus: 'VERIFIED'
    },
    accessStats: {
      queryCount: 0,
      lastAccessed: new Date().toISOString(),
      dependentModules: []
    }
  };
}

// Helper functions for generating mock data
function generateHash(input: string): string {
  // Simple hash generation for example purposes
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

function generateSignature(name: string, version: string): string {
  return `sig_${name}_${version}_${Date.now()}`;
}

// Export for use in other files
export { createSampleModule };

// Run the example if this file is executed directly
if (require.main === module) {
  demonstrateModuleRegistry();
}