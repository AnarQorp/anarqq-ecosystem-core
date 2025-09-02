/**
 * Simple QindexService Module Registration Test
 * Basic verification of module registration functionality
 */

import { QindexService } from '../ecosystem/QindexService.mjs';

async function testModuleRegistration() {
  console.log('Testing QindexService Module Registration...\n');

  const qindexService = new QindexService();

  // Sample module metadata
  const sampleModuleMetadata = {
    module: 'Qwallet',
    version: '1.0.0',
    description: 'Decentralized wallet module for the AnarQ ecosystem',
    identities_supported: ['ROOT', 'DAO', 'ENTERPRISE'],
    integrations: ['Qlock', 'Qerberos', 'Qonsent'],
    dependencies: [],
    status: 'PRODUCTION_READY',
    audit_hash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
    compliance: {
      audit: true,
      risk_scoring: true,
      privacy_enforced: true,
      kyc_support: false,
      gdpr_compliant: true,
      data_retention_policy: 'standard'
    },
    repository: 'https://github.com/anarq/qwallet',
    documentation: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    activated_by: 'did:root:12345',
    timestamp: Date.now(),
    checksum: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
    signature_algorithm: 'RSA-SHA256',
    public_key_id: 'root-key-001'
  };

  const sampleSignedMetadata = {
    metadata: sampleModuleMetadata,
    signature: 'sample-signature-12345',
    publicKey: 'sample-public-key-67890',
    signature_type: 'RSA-SHA256',
    signed_at: Date.now(),
    signer_identity: 'did:root:12345'
  };

  try {
    // Test 1: Register a module
    console.log('1. Testing module registration...');
    const registrationResult = await qindexService.registerModule('qwallet', sampleSignedMetadata);
    console.log('✓ Module registered successfully:', registrationResult);

    // Test 2: Get the registered module
    console.log('\n2. Testing module retrieval...');
    const retrievedModule = await qindexService.getModule('qwallet');
    console.log('✓ Module retrieved successfully:', {
      moduleId: retrievedModule.moduleId,
      version: retrievedModule.metadata.version,
      status: retrievedModule.metadata.status
    });

    // Test 3: Search for modules
    console.log('\n3. Testing module search...');
    const searchResults = await qindexService.searchModules({ name: 'Qwallet' });
    console.log('✓ Module search successful:', {
      totalCount: searchResults.totalCount,
      foundModules: searchResults.modules.length
    });

    // Test 4: Verify module
    console.log('\n4. Testing module verification...');
    const verificationResult = await qindexService.verifyModule('qwallet');
    console.log('✓ Module verification completed:', {
      status: verificationResult.status,
      metadataValid: verificationResult.verificationChecks.metadataValid,
      signatureValid: verificationResult.verificationChecks.signatureValid
    });

    // Test 5: Update module metadata
    console.log('\n5. Testing module update...');
    const updateResult = await qindexService.updateModuleMetadata('qwallet', {
      version: '1.1.0',
      description: 'Updated wallet module'
    });
    console.log('✓ Module updated successfully:', updateResult);

    // Test 6: Register sandbox module
    console.log('\n6. Testing sandbox module registration...');
    const sandboxResult = await qindexService.registerSandboxModule('qwallet-test', sampleSignedMetadata);
    console.log('✓ Sandbox module registered:', sandboxResult);

    // Test 7: List sandbox modules
    console.log('\n7. Testing sandbox module listing...');
    const sandboxModules = await qindexService.listSandboxModules();
    console.log('✓ Sandbox modules listed:', sandboxModules.length);

    // Test 8: Check dependency compatibility
    console.log('\n8. Testing dependency compatibility...');
    const dependencyResult = await qindexService.checkDependencyCompatibility('test-module', []);
    console.log('✓ Dependency check completed:', dependencyResult.compatible);

    // Test 9: Get module statistics
    console.log('\n9. Testing module statistics...');
    const moduleStats = await qindexService.getModuleStats();
    console.log('✓ Module statistics retrieved:', {
      totalModules: moduleStats.totalModules,
      productionModules: moduleStats.productionModules,
      sandboxModules: moduleStats.sandboxModules
    });

    // Test 10: Health check with modules
    console.log('\n10. Testing health check...');
    const healthCheck = await qindexService.healthCheck();
    console.log('✓ Health check completed:', {
      status: healthCheck.status,
      totalModules: healthCheck.modules.totalModules
    });

    console.log('\n🎉 All tests passed successfully!');
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testModuleRegistration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});