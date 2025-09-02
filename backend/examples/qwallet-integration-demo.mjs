/**
 * Qwallet Integration Demo
 * 
 * Demonstrates the cross-module payment integration functionality
 * including Qmail, Qmarket, and Qdrive payment processing.
 */

import { QwalletIntegrationService } from '../services/QwalletIntegrationService.mjs';
import { QmailPaymentService } from '../services/QmailPaymentService.mjs';
import { QdrivePaymentService } from '../services/QdrivePaymentService.mjs';

async function runDemo() {
  console.log('🚀 Starting Qwallet Integration Demo...\n');

  try {
    // Initialize services in sandbox mode
    console.log('📦 Initializing services...');
    const qwalletIntegration = new QwalletIntegrationService({
      sandboxMode: true
    });
    await qwalletIntegration.initialize();

    const qmailPayment = new QmailPaymentService({
      qwalletIntegration,
      sandboxMode: true
    });
    await qmailPayment.initialize();

    const qdrivePayment = new QdrivePaymentService({
      qwalletIntegration,
      sandboxMode: true
    });
    await qdrivePayment.initialize();

    console.log('✅ Services initialized successfully\n');

    // Demo 1: Check initial sandbox wallet balances
    console.log('💰 Initial Wallet Balances:');
    const testUsers = ['did:squid:alice123', 'did:squid:bob456', 'did:squid:charlie789'];
    
    for (const user of testUsers) {
      const balance = await qwalletIntegration.getSandboxBalance(user);
      if (balance.success) {
        console.log(`  ${user}: ${balance.balances.QToken} QToken, ${balance.balances.PI} PI`);
      }
    }
    console.log();

    // Demo 2: Process Qmail premium message payment
    console.log('📧 Processing Qmail Premium Message Payment...');
    const qmailResult = await qmailPayment.processPremiumMessage({
      squidId: 'did:squid:alice123',
      messageId: 'demo_msg_001',
      serviceType: 'premium',
      recipients: ['did:squid:bob456', 'did:squid:charlie789'],
      attachments: [
        { name: 'document.pdf', size: 5 * 1024 * 1024, type: 'application/pdf' }
      ],
      priority: 'normal'
    });

    if (qmailResult.success) {
      console.log(`  ✅ Premium message payment processed`);
      console.log(`  💳 Total fee: ${qmailResult.totalFee} QToken`);
      console.log(`  📄 Message fee: ${qmailResult.messageFee} QToken`);
      console.log(`  📎 Attachment fee: ${qmailResult.attachmentFee} QToken`);
      console.log(`  🎯 Features: ${qmailResult.features.join(', ')}`);
    } else {
      console.log(`  ❌ Payment failed: ${qmailResult.error}`);
    }
    console.log();

    // Demo 3: Process Qdrive storage quota payment
    console.log('💾 Processing Qdrive Storage Quota Payment...');
    const qdriveResult = await qdrivePayment.processStorageQuota({
      squidId: 'did:squid:bob456',
      currentUsage: 1.5, // 1.5 GB (exceeds 1 GB free tier)
      requestedSize: 0.8  // 0.8 GB additional
    });

    if (qdriveResult.success) {
      console.log(`  ✅ Storage quota processed`);
      console.log(`  📊 Total usage: ${qdriveResult.totalUsage} GB`);
      console.log(`  💰 Payment required: ${qdriveResult.paymentRequired}`);
      if (qdriveResult.paymentRequired) {
        console.log(`  📈 Overage: ${qdriveResult.overage} GB`);
        console.log(`  💳 Overage fee: ${qdriveResult.overageFee} QToken`);
      }
    } else {
      console.log(`  ❌ Storage processing failed: ${qdriveResult.error}`);
    }
    console.log();

    // Demo 4: Process Qdrive premium feature payment
    console.log('🔐 Processing Qdrive Premium Feature Payment...');
    const featureResult = await qdrivePayment.processPremiumFeature({
      squidId: 'did:squid:charlie789',
      featureType: 'encryption',
      fileId: 'demo_file_001',
      fileSize: 100 * 1024 * 1024, // 100MB
      operationCount: 1
    });

    if (featureResult.success) {
      console.log(`  ✅ Premium feature processed`);
      console.log(`  🔧 Feature: ${featureResult.featureType}`);
      console.log(`  💳 Payment required: ${featureResult.paymentRequired}`);
      if (featureResult.paymentRequired) {
        console.log(`  💰 Fee: ${featureResult.fee} QToken`);
      }
      console.log(`  📝 Description: ${featureResult.description}`);
    } else {
      console.log(`  ❌ Feature processing failed: ${featureResult.error}`);
    }
    console.log();

    // Demo 5: Check updated wallet balances
    console.log('💰 Updated Wallet Balances:');
    for (const user of testUsers) {
      const balance = await qwalletIntegration.getSandboxBalance(user);
      if (balance.success) {
        console.log(`  ${user}: ${balance.balances.QToken} QToken, ${balance.balances.PI} PI`);
      }
    }
    console.log();

    // Demo 6: Generate settlement report
    console.log('📊 Generating Settlement Report...');
    const settlementReport = await qwalletIntegration.getSettlementReport();
    
    if (settlementReport.success) {
      console.log(`  ✅ Settlement report generated`);
      console.log(`  📈 Total settlements: ${settlementReport.summary.totalSettlements}`);
      console.log(`  💰 Total amount: ${settlementReport.summary.totalAmount} QToken`);
      console.log(`  📋 By module:`);
      
      for (const [module, stats] of Object.entries(settlementReport.summary.byModule)) {
        console.log(`    ${module}: ${stats.count} settlements, ${stats.amount} QToken`);
      }
      
      console.log(`  👥 By recipient:`);
      for (const [recipient, stats] of Object.entries(settlementReport.summary.byRecipient)) {
        console.log(`    ${recipient}: ${stats.count} payments, ${stats.amount} QToken`);
      }
    } else {
      console.log(`  ❌ Settlement report failed: ${settlementReport.error}`);
    }
    console.log();

    // Demo 7: Get audit trail
    console.log('📋 Retrieving Audit Trail...');
    const auditTrail = await qwalletIntegration.getAuditTrail({
      limit: 10
    });

    if (auditTrail.success) {
      console.log(`  ✅ Audit trail retrieved`);
      console.log(`  📝 Total events: ${auditTrail.auditEvents.length}`);
      console.log(`  🔍 Recent events:`);
      
      auditTrail.auditEvents.slice(0, 5).forEach((event, index) => {
        console.log(`    ${index + 1}. ${event.action} - ${event.squidId || 'system'} (${event.timestamp})`);
      });
    } else {
      console.log(`  ❌ Audit trail failed: ${auditTrail.error}`);
    }
    console.log();

    // Demo 8: Get service pricing information
    console.log('💲 Service Pricing Information:');
    
    const qmailPricing = await qmailPayment.getServicePricing();
    if (qmailPricing.success) {
      console.log(`  📧 Qmail Services:`);
      for (const [type, service] of Object.entries(qmailPricing.pricing.services)) {
        console.log(`    ${service.name}: ${service.baseFee} QToken`);
      }
    }

    const qdrivePricing = await qdrivePayment.getPricingInfo();
    if (qdrivePricing.success) {
      console.log(`  💾 Qdrive Services:`);
      console.log(`    Storage: ${qdrivePricing.pricing.storage.baseFee} QToken/GB/month`);
      console.log(`    Bandwidth: ${qdrivePricing.pricing.bandwidth.baseFee} QToken/GB`);
      console.log(`    Premium Features:`);
      for (const [type, feature] of Object.entries(qdrivePricing.pricing.premiumFeatures)) {
        console.log(`      ${feature.name}: ${feature.fee} QToken`);
      }
    }
    console.log();

    // Cleanup
    console.log('🧹 Shutting down services...');
    await qmailPayment.shutdown();
    await qdrivePayment.shutdown();
    await qwalletIntegration.shutdown();
    
    console.log('✅ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
runDemo().catch(console.error);