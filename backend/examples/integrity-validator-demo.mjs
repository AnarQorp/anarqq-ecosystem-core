/**
 * IntegrityValidator Demo
 * Demonstrates how to use the IntegrityValidator for ecosystem validation
 */

import IntegrityValidator from '../services/IntegrityValidator.mjs';

async function runIntegrityValidationDemo() {
  console.log('🚀 Starting IntegrityValidator Demo\n');

  // Initialize the IntegrityValidator
  const integrityValidator = new IntegrityValidator({
    healthCheckTimeout: 3000,
    consensusQuorum: 3,
    performanceThresholds: {
      p95Latency: 150,
      p99Latency: 200,
      errorBudget: 0.1,
      cacheHitRate: 0.85
    }
  });

  try {
    // 1. Validate Ecosystem Health
    console.log('📊 1. Validating Ecosystem Health...');
    const healthResult = await integrityValidator.validateEcosystemHealth();
    console.log(`   Overall Status: ${healthResult.overallStatus}`);
    console.log(`   Healthy Modules: ${healthResult.summary.healthyModules}/${healthResult.summary.totalModules}`);
    console.log(`   Execution Time: ${healthResult.executionTime.toFixed(2)}ms\n`);

    // 2. Verify Decentralization Attestation
    console.log('🔒 2. Verifying Decentralization Attestation...');
    const attestationResult = await integrityValidator.verifyDecentralizationAttestation();
    console.log(`   Attestation Status: ${attestationResult.overallStatus}`);
    console.log(`   Attestation CID: ${attestationResult.attestationCID || 'N/A'}`);
    console.log(`   Kill-First-Launcher Test: ${attestationResult.killFirstLauncherTest.status}`);
    console.log(`   Execution Time: ${attestationResult.executionTime.toFixed(2)}ms\n`);

    // 3. Validate Critical Consensus
    console.log('🗳️  3. Validating Critical Consensus...');
    const consensusResult = await integrityValidator.validateCriticalConsensus(
      'demo-exec-001',
      'payment-step-001',
      { type: 'payment' }
    );
    console.log(`   Consensus Reached: ${consensusResult.consensus.reached}`);
    console.log(`   Decision: ${consensusResult.consensus.decision}`);
    console.log(`   Votes Collected: ${consensusResult.quorum.achieved}/${consensusResult.quorum.threshold}`);
    console.log(`   Confidence: ${(consensusResult.consensus.confidence * 100).toFixed(1)}%`);
    console.log(`   Execution Time: ${consensusResult.executionTime.toFixed(2)}ms\n`);

    // 4. Validate Performance Gates
    console.log('⚡ 4. Validating Performance Gates...');
    const performanceResult = await integrityValidator.validatePerformanceGates();
    console.log(`   Overall Status: ${performanceResult.overallStatus}`);
    
    Object.entries(performanceResult.gates).forEach(([gateName, gate]) => {
      const status = gate.passed ? '✅' : '❌';
      console.log(`   ${status} ${gate.name}: ${gate.current}${gate.unit} (threshold: ${gate.threshold}${gate.unit})`);
    });
    
    console.log(`   Alerts Generated: ${performanceResult.alerts.length}`);
    console.log(`   Execution Time: ${performanceResult.executionTime.toFixed(2)}ms\n`);

    // 5. Display Validation Metrics
    console.log('📈 5. Validation Metrics Summary:');
    const metrics = integrityValidator.getValidationMetrics();
    console.log(`   Module Endpoints: ${metrics.moduleEndpoints}`);
    console.log(`   Consensus Votes Cached: ${metrics.consensusVotes}`);
    console.log(`   Attestations Cached: ${metrics.attestationCache}`);
    console.log(`   Last Health Check: ${metrics.lastHealthCheck || 'N/A'}\n`);

    console.log('✅ IntegrityValidator Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrityValidationDemo().catch(console.error);
}

export { runIntegrityValidationDemo };