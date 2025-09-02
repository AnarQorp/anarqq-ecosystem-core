/**
 * Example: Basic Module Registration
 * 
 * This example demonstrates the simplest way to register a module
 * in the Q ecosystem using the Module Registry API.
 * 
 * Prerequisites:
 * - Node.js 18+
 * - Valid ROOT identity credentials
 * - @qwallet/module-registry package installed
 * 
 * Usage:
 * node basic-registration.js
 */

const { ModuleRegistrationService } = require('@qwallet/module-registry');
const { createMockIdentity } = require('@qwallet/identity');

// Configuration - replace with your actual values
const config = {
  identity: {
    did: process.env.QWALLET_IDENTITY_DID || 'did:root:example123',
    type: 'ROOT'
  },
  apiEndpoint: process.env.QWALLET_API_ENDPOINT || 'https://api.qwallet.example.com'
};

// Module information to register
const moduleInfo = {
  name: 'my-first-module',
  version: '1.0.0',
  description: 'My first module registered in the Q ecosystem',
  identitiesSupported: ['ROOT', 'DAO'],
  integrations: ['Qindex', 'Qlock'],
  repositoryUrl: 'https://github.com/username/my-first-module',
  
  // Optional but recommended fields
  documentationCid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  auditHash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
  compliance: {
    audit: true,
    privacy_enforced: true,
    gdpr_compliant: true,
    data_retention_policy: '30_days'
  }
};

async function registerModule() {
  console.log('🚀 Starting module registration...\n');
  
  try {
    // Step 1: Initialize the registration service
    console.log('📋 Initializing registration service...');
    const registrationService = new ModuleRegistrationService();
    
    // Step 2: Create or load identity
    console.log('🔐 Setting up identity...');
    const signerIdentity = createMockIdentity({
      type: config.identity.type,
      did: config.identity.did
    });
    
    console.log(`   Identity: ${signerIdentity.did}`);
    console.log(`   Type: ${signerIdentity.type}\n`);
    
    // Step 3: Prepare registration request
    console.log('📝 Preparing registration request...');
    const registrationRequest = {
      moduleInfo,
      testMode: false, // Set to true for sandbox testing
      skipValidation: false
    };
    
    console.log(`   Module: ${moduleInfo.name}@${moduleInfo.version}`);
    console.log(`   Description: ${moduleInfo.description}`);
    console.log(`   Repository: ${moduleInfo.repositoryUrl}`);
    console.log(`   Identities: ${moduleInfo.identitiesSupported.join(', ')}`);
    console.log(`   Integrations: ${moduleInfo.integrations.join(', ')}\n`);
    
    // Step 4: Register the module
    console.log('⏳ Registering module...');
    const result = await registrationService.registerModule(
      registrationRequest,
      signerIdentity
    );
    
    // Step 5: Check registration result
    if (result.success) {
      console.log('✅ Module registered successfully!\n');
      console.log('📊 Registration Details:');
      console.log(`   Module ID: ${result.moduleId}`);
      console.log(`   IPFS CID: ${result.cid}`);
      console.log(`   Index ID: ${result.indexId}`);
      console.log(`   Timestamp: ${result.timestamp}`);
      
      if (result.warnings && result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => {
          console.log(`   - ${warning}`);
        });
      }
      
      // Step 6: Verify the registration
      console.log('\n🔍 Verifying registration...');
      const verification = await registrationService.verifyModule(result.moduleId);
      
      console.log(`   Status: ${verification.status}`);
      console.log(`   Metadata Valid: ${verification.verificationChecks.metadataValid ? '✅' : '❌'}`);
      console.log(`   Signature Valid: ${verification.verificationChecks.signatureValid ? '✅' : '❌'}`);
      console.log(`   Dependencies Resolved: ${verification.verificationChecks.dependenciesResolved ? '✅' : '❌'}`);
      console.log(`   Compliance Verified: ${verification.verificationChecks.complianceVerified ? '✅' : '❌'}`);
      console.log(`   Audit Passed: ${verification.verificationChecks.auditPassed ? '✅' : '❌'}`);
      
      if (verification.issues && verification.issues.length > 0) {
        console.log('\n⚠️  Verification Issues:');
        verification.issues.forEach(issue => {
          const icon = issue.severity === 'ERROR' ? '❌' : issue.severity === 'WARNING' ? '⚠️' : 'ℹ️';
          console.log(`   ${icon} ${issue.message}`);
          if (issue.suggestion) {
            console.log(`      Suggestion: ${issue.suggestion}`);
          }
        });
      }
      
      if (verification.status === 'production_ready') {
        console.log('\n🎉 Module is production ready and available in the ecosystem!');
      } else {
        console.log('\n📝 Module registered but may need additional work before production use.');
      }
      
    } else {
      console.error('❌ Registration failed:');
      console.error(`   Error: ${result.error}`);
      
      // Provide helpful suggestions based on common errors
      if (result.error.includes('already exists')) {
        console.log('\n💡 Suggestion: Try incrementing the version number or using a different module name.');
      } else if (result.error.includes('validation')) {
        console.log('\n💡 Suggestion: Check that all required fields are properly formatted.');
      } else if (result.error.includes('signature')) {
        console.log('\n💡 Suggestion: Verify your identity credentials are correct.');
      }
    }
    
  } catch (error) {
    console.error('💥 Registration error:', error.message);
    
    // Handle specific error types
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    
    if (error.retryable) {
      console.log('\n🔄 This error is retryable. You can try again.');
    }
    
    if (error.userMessage) {
      console.log(`\n💡 ${error.userMessage}`);
    }
    
    if (error.suggestedActions) {
      console.log('\n🛠️  Suggested Actions:');
      error.suggestedActions.forEach(action => {
        console.log(`   - ${action.description}`);
      });
    }
    
    process.exit(1);
  }
}

// Additional helper functions

/**
 * Validate module information before registration
 */
function validateModuleInfo(moduleInfo) {
  const errors = [];
  
  if (!moduleInfo.name || moduleInfo.name.length < 3) {
    errors.push('Module name must be at least 3 characters');
  }
  
  if (!moduleInfo.version || !/^\d+\.\d+\.\d+/.test(moduleInfo.version)) {
    errors.push('Version must follow semantic versioning (e.g., 1.0.0)');
  }
  
  if (!moduleInfo.description || moduleInfo.description.length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  
  if (!moduleInfo.repositoryUrl || !moduleInfo.repositoryUrl.startsWith('http')) {
    errors.push('Repository URL must be a valid HTTP/HTTPS URL');
  }
  
  if (!moduleInfo.identitiesSupported || moduleInfo.identitiesSupported.length === 0) {
    errors.push('At least one supported identity type is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Display module information in a formatted way
 */
function displayModuleInfo(moduleInfo) {
  console.log('📋 Module Information:');
  console.log(`   Name: ${moduleInfo.name}`);
  console.log(`   Version: ${moduleInfo.version}`);
  console.log(`   Description: ${moduleInfo.description}`);
  console.log(`   Repository: ${moduleInfo.repositoryUrl}`);
  console.log(`   Supported Identities: ${moduleInfo.identitiesSupported.join(', ')}`);
  console.log(`   Integrations: ${moduleInfo.integrations.join(', ')}`);
  
  if (moduleInfo.documentationCid) {
    console.log(`   Documentation: https://ipfs.io/ipfs/${moduleInfo.documentationCid}`);
  }
  
  if (moduleInfo.auditHash) {
    console.log(`   Audit Hash: ${moduleInfo.auditHash.substring(0, 16)}...`);
  }
  
  if (moduleInfo.compliance) {
    console.log('   Compliance:');
    Object.entries(moduleInfo.compliance).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
  }
}

// Run the example if called directly
if (require.main === module) {
  // Validate module info before attempting registration
  const validation = validateModuleInfo(moduleInfo);
  
  if (!validation.valid) {
    console.error('❌ Module validation failed:');
    validation.errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    process.exit(1);
  }
  
  // Display module info
  displayModuleInfo(moduleInfo);
  console.log('');
  
  // Start registration
  registerModule().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export for use in other modules
module.exports = {
  registerModule,
  validateModuleInfo,
  displayModuleInfo,
  moduleInfo,
  config
};