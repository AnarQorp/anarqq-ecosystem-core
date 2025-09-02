/**
 * Qwallet Context Integration Demonstration
 * Shows how wallet context switching works with identity management
 */

import { identityQwalletService } from '../IdentityQwalletService';
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  GovernanceType,
  IdentityStatus
} from '../../../types/identity';

// Mock identities for demonstration
const createMockIdentity = (did: string, name: string, type: IdentityType): ExtendedSquidIdentity => ({
  did,
  name,
  type,
  rootId: 'root-123',
  children: [],
  depth: type === IdentityType.ROOT ? 0 : 1,
  path: type === IdentityType.ROOT ? [] : ['did:squid:root-123'],
  governanceLevel: type === IdentityType.DAO ? GovernanceType.DAO : GovernanceType.SELF,
  creationRules: {
    type,
    requiresKYC: type === IdentityType.DAO || type === IdentityType.AID,
    requiresDAOGovernance: type === IdentityType.ENTERPRISE,
    requiresParentalConsent: type === IdentityType.CONSENTIDA,
    maxDepth: 3,
    allowedChildTypes: []
  },
  permissions: {
    canCreateSubidentities: type !== IdentityType.CONSENTIDA && type !== IdentityType.AID,
    canDeleteSubidentities: true,
    canModifyProfile: true,
    canAccessModule: () => true,
    canPerformAction: () => true,
    governanceLevel: type === IdentityType.DAO ? GovernanceType.DAO : GovernanceType.SELF
  },
  status: IdentityStatus.ACTIVE,
  qonsentProfileId: `qonsent-${did}`,
  qlockKeyPair: {
    publicKey: `pub-${did}`,
    privateKey: `priv-${did}`,
    algorithm: 'ECDSA',
    keySize: 256,
    createdAt: new Date().toISOString()
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastUsed: new Date().toISOString(),
  kyc: {
    required: type === IdentityType.DAO || type === IdentityType.AID,
    submitted: false,
    approved: type === IdentityType.ROOT
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: false,
  usageStats: {
    switchCount: 0,
    lastSwitch: new Date().toISOString(),
    modulesAccessed: [],
    totalSessions: 0
  }
});

/**
 * Demonstrates the complete Qwallet context integration workflow
 */
export async function demonstrateQwalletIntegration() {
  console.log('\n🚀 Qwallet Context Integration Demonstration\n');

  // Create mock identities
  const rootIdentity = createMockIdentity('did:squid:root-123', 'Root Identity', IdentityType.ROOT);
  const daoIdentity = createMockIdentity('did:squid:dao-456', 'DAO Identity', IdentityType.DAO);
  const enterpriseIdentity = createMockIdentity('did:squid:enterprise-789', 'Enterprise Identity', IdentityType.ENTERPRISE);
  const aidIdentity = createMockIdentity('did:squid:aid-101', 'Anonymous Identity', IdentityType.AID);

  try {
    // Step 1: Create wallets for each identity
    console.log('📝 Step 1: Creating wallets for different identity types...\n');

    const rootWallet = await identityQwalletService.createWalletForIdentity(rootIdentity);
    console.log(`✅ ROOT Identity Wallet: ${rootWallet.walletAddress}`);
    console.log(`   - Max Transaction: $${rootWallet.permissions.maxTransactionAmount.toLocaleString()}`);
    console.log(`   - Can Create DAO: ${rootWallet.permissions.canCreateDAO}`);
    console.log(`   - Governance Level: ${rootWallet.permissions.governanceLevel}\n`);

    const daoWallet = await identityQwalletService.createWalletForIdentity(daoIdentity);
    console.log(`✅ DAO Identity Wallet: ${daoWallet.walletAddress}`);
    console.log(`   - Max Transaction: $${daoWallet.permissions.maxTransactionAmount.toLocaleString()}`);
    console.log(`   - Can Create DAO: ${daoWallet.permissions.canCreateDAO}`);
    console.log(`   - Governance Level: ${daoWallet.permissions.governanceLevel}\n`);

    const enterpriseWallet = await identityQwalletService.createWalletForIdentity(enterpriseIdentity);
    console.log(`✅ ENTERPRISE Identity Wallet: ${enterpriseWallet.walletAddress}`);
    console.log(`   - Max Transaction: $${enterpriseWallet.permissions.maxTransactionAmount.toLocaleString()}`);
    console.log(`   - Can Access DeFi: ${enterpriseWallet.permissions.canAccessDeFi}`);
    console.log(`   - Restricted Operations: ${enterpriseWallet.permissions.restrictedOperations.join(', ')}\n`);

    const aidWallet = await identityQwalletService.createWalletForIdentity(aidIdentity);
    console.log(`✅ AID Identity Wallet: ${aidWallet.walletAddress}`);
    console.log(`   - Max Transaction: $${aidWallet.permissions.maxTransactionAmount.toLocaleString()}`);
    console.log(`   - Allowed Tokens: ${aidWallet.permissions.allowedTokens.join(', ')}`);
    console.log(`   - Governance Level: ${aidWallet.permissions.governanceLevel}\n`);

    // Step 2: Demonstrate wallet context switching
    console.log('🔄 Step 2: Demonstrating wallet context switching...\n');

    // Switch to ROOT identity
    await identityQwalletService.setActiveWalletContext(rootIdentity.did);
    let activeContext = await identityQwalletService.getActiveWalletContext();
    console.log(`🎯 Active Context: ${activeContext} (ROOT Identity)`);

    // Switch to DAO identity
    const switchSuccess = await identityQwalletService.switchWalletContext(rootIdentity.did, daoIdentity.did);
    console.log(`🔄 Switch to DAO Identity: ${switchSuccess ? '✅ Success' : '❌ Failed'}`);
    
    activeContext = await identityQwalletService.getActiveWalletContext();
    console.log(`🎯 Active Context: ${activeContext} (DAO Identity)\n`);

    // Step 3: Demonstrate permission validation
    console.log('🔒 Step 3: Demonstrating permission validation...\n');

    // Test ROOT identity permissions (should allow large transfer)
    const largeTransfer = {
      type: 'TRANSFER' as const,
      amount: 500000,
      token: 'ETH'
    };

    const rootCanTransfer = await identityQwalletService.validateWalletOperation(rootIdentity.did, largeTransfer);
    console.log(`💰 ROOT Identity - Large Transfer ($500K): ${rootCanTransfer ? '✅ Allowed' : '❌ Denied'}`);

    // Test Enterprise identity permissions (should deny DeFi)
    const defiOperation = {
      type: 'DEFI' as const,
      metadata: { protocol: 'uniswap' }
    };

    const enterpriseCanDefi = await identityQwalletService.validateWalletOperation(enterpriseIdentity.did, defiOperation);
    console.log(`🏢 ENTERPRISE Identity - DeFi Access: ${enterpriseCanDefi ? '✅ Allowed' : '❌ Denied'}`);

    // Test AID identity permissions (should deny large transfer)
    const aidCanTransfer = await identityQwalletService.validateWalletOperation(aidIdentity.did, largeTransfer);
    console.log(`🕶️  AID Identity - Large Transfer ($500K): ${aidCanTransfer ? '✅ Allowed' : '❌ Denied'}\n`);

    // Step 4: Demonstrate transaction signing
    console.log('✍️  Step 4: Demonstrating transaction signing...\n');

    const transaction = {
      to: '0x1234567890123456789012345678901234567890',
      value: '1000000000000000000', // 1 ETH
      data: '0x'
    };

    // Sign with ROOT identity
    const rootSignResult = await identityQwalletService.signTransactionForIdentity(rootIdentity.did, transaction);
    console.log(`📝 ROOT Identity Transaction Signing: ${rootSignResult.success ? '✅ Success' : '❌ Failed'}`);
    if (rootSignResult.success) {
      console.log(`   - Signature: ${rootSignResult.signature.substring(0, 20)}...`);
      console.log(`   - TX Hash: ${rootSignResult.transactionHash?.substring(0, 20)}...`);
    }

    // Try to sign with AID identity (should fail due to amount)
    const aidSignResult = await identityQwalletService.signTransactionForIdentity(aidIdentity.did, transaction);
    console.log(`📝 AID Identity Transaction Signing: ${aidSignResult.success ? '✅ Success' : '❌ Failed'}`);
    if (!aidSignResult.success) {
      console.log(`   - Error: ${aidSignResult.error}`);
    }

    console.log('\n');

    // Step 5: Demonstrate balance management
    console.log('💰 Step 5: Demonstrating balance management...\n');

    const rootBalances = await identityQwalletService.getBalancesForIdentity(rootIdentity.did);
    console.log(`💳 ROOT Identity Balances (Total: $${rootBalances.totalValueUSD.toFixed(2)}):`);
    rootBalances.balances.forEach(balance => {
      console.log(`   - ${balance.symbol}: ${balance.balance.toFixed(4)} ($${balance.valueUSD.toFixed(2)})`);
    });

    console.log('\n');

    // Step 6: Demonstrate inter-identity transfers
    console.log('🔄 Step 6: Demonstrating inter-identity transfers...\n');

    const transferSuccess = await identityQwalletService.transferBetweenIdentities(
      rootIdentity.did,
      daoIdentity.did,
      1000,
      'QToken'
    );
    console.log(`💸 Transfer 1000 QToken (ROOT → DAO): ${transferSuccess ? '✅ Success' : '❌ Failed'}`);

    // Try invalid transfer (AID exceeding limit)
    const invalidTransfer = await identityQwalletService.transferBetweenIdentities(
      aidIdentity.did,
      daoIdentity.did,
      5000, // Exceeds AID limit
      'ETH'
    );
    console.log(`💸 Transfer 5000 ETH (AID → DAO): ${invalidTransfer ? '✅ Success' : '❌ Failed (Expected)'}\n`);

    // Step 7: Demonstrate integration services
    console.log('🔗 Step 7: Demonstrating integration with other services...\n');

    const qlockSync = await identityQwalletService.syncWithQlock(rootIdentity.did);
    console.log(`🔐 Qlock Integration: ${qlockSync ? '✅ Synced' : '❌ Failed'}`);

    const qonsentSync = await identityQwalletService.syncWithQonsent(rootIdentity.did);
    console.log(`🛡️  Qonsent Integration: ${qonsentSync ? '✅ Synced' : '❌ Failed'}`);

    const walletStateSync = await identityQwalletService.syncWalletState(rootIdentity.did);
    console.log(`⚡ Wallet State Sync: ${walletStateSync ? '✅ Synced' : '❌ Failed'}\n`);

    console.log('🎉 Qwallet Context Integration Demonstration Complete!\n');
    console.log('Key Features Demonstrated:');
    console.log('✅ Identity-specific wallet creation with type-based permissions');
    console.log('✅ Seamless wallet context switching between identities');
    console.log('✅ Permission validation based on identity type');
    console.log('✅ Identity-aware transaction signing');
    console.log('✅ Balance management per identity');
    console.log('✅ Inter-identity transfers with validation');
    console.log('✅ Integration with Qlock and Qonsent services');
    console.log('✅ Automatic wallet context updates on identity switch\n');

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  }
}

// Export for use in other files
export { identityQwalletService };

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateQwalletIntegration();
}