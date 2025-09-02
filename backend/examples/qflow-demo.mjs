/**
 * Qflow Evaluation System Demo
 * Demonstrates the complete Qflow evaluation workflow
 */

import { QflowService } from '../services/QflowService.mjs';

console.log('🚀 Qflow Evaluation System Demo\n');

// Initialize Qflow service
const qflowService = new QflowService();

// Demo scenarios
const scenarios = [
  {
    name: 'Safe Content with Verified Identity',
    cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    context: {
      identity: {
        squidId: 'user-123',
        subId: 'sub-456',
        verified: true
      },
      permissions: ['content.evaluate', 'content.read'],
      metadata: {
        contentType: 'image/jpeg',
        source: 'user-upload',
        tags: ['safe-content']
      }
    }
  },
  {
    name: 'Unverified Identity',
    cid: 'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB',
    context: {
      identity: {
        squidId: 'user-789',
        verified: false
      },
      permissions: ['content.evaluate'],
      metadata: {
        contentType: 'text/plain',
        source: 'anonymous'
      }
    }
  },
  {
    name: 'Missing Permissions',
    cid: 'QmSrPmbaUKA3ZodhzPWZnpFgcPMFWF4QsxXbkWfEptTBJd',
    context: {
      identity: {
        squidId: 'user-999',
        verified: true
      },
      permissions: [], // No permissions
      metadata: {
        contentType: 'video/mp4',
        source: 'external'
      }
    }
  }
];

async function runDemo() {
  console.log('📊 Service Configuration:');
  console.log(`- Cache Timeout: ${qflowService.config.cacheTimeout}ms`);
  console.log(`- Confidence Threshold: ${qflowService.config.confidenceThreshold}`);
  console.log(`- Escalation Threshold: ${qflowService.config.escalationThreshold}`);
  console.log(`- Registered Layers: ${qflowService.getRegisteredLayers().length}`);
  console.log(`- Escalation Rules: ${qflowService.getEscalationRules().length}\n`);

  for (const scenario of scenarios) {
    console.log(`🔍 Evaluating: ${scenario.name}`);
    console.log(`   CID: ${scenario.cid}`);
    console.log(`   Identity: ${scenario.context.identity?.squidId} (verified: ${scenario.context.identity?.verified})`);
    console.log(`   Permissions: [${scenario.context.permissions?.join(', ') || 'none'}]`);

    try {
      const startTime = Date.now();
      const evaluation = await qflowService.evaluate(scenario.cid, scenario.context);
      const duration = Date.now() - startTime;

      console.log(`   ✅ Evaluation completed in ${duration}ms`);
      console.log(`   📋 Result:`);
      console.log(`      - Verdict: ${evaluation.verdict}`);
      console.log(`      - Confidence: ${(evaluation.confidence * 100).toFixed(1)}%`);
      console.log(`      - Risk Score: ${(evaluation.riskScore * 100).toFixed(1)}%`);
      console.log(`      - Layers Executed: ${evaluation.layers.length}`);
      console.log(`      - Evidence Collected: ${evaluation.evidence.length} items`);

      if (evaluation.escalation) {
        console.log(`   ⚠️  Escalation Triggered:`);
        console.log(`      - Rule: ${evaluation.escalation.rule}`);
        console.log(`      - Action: ${evaluation.escalation.action}`);
        console.log(`      - Priority: ${evaluation.escalation.priority}`);
      }

      // Show layer details
      console.log(`   🔧 Layer Results:`);
      evaluation.layers.forEach(layer => {
        console.log(`      - ${layer.name}: ${layer.verdict} (${(layer.confidence * 100).toFixed(1)}% confidence, ${layer.executionTime}ms)`);
      });

      // Show evidence summary
      if (evaluation.evidence.length > 0) {
        console.log(`   📝 Evidence Types: ${[...new Set(evaluation.evidence.map(e => e.type))].join(', ')}`);
      }

    } catch (error) {
      console.log(`   ❌ Evaluation failed: ${error.message}`);
    }

    console.log(''); // Empty line for readability
  }

  // Demonstrate caching
  console.log('🔄 Cache Performance Demo:');
  const testCid = scenarios[0].cid;
  const testContext = scenarios[0].context;

  // First evaluation (cache miss)
  const start1 = Date.now();
  await qflowService.evaluate(testCid, testContext);
  const time1 = Date.now() - start1;

  // Second evaluation (cache hit)
  const start2 = Date.now();
  await qflowService.evaluate(testCid, testContext);
  const time2 = Date.now() - start2;

  console.log(`   First evaluation (cache miss): ${time1}ms`);
  console.log(`   Second evaluation (cache hit): ${time2}ms`);
  console.log(`   Performance improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%\n`);

  // Demonstrate batch evaluation
  console.log('📦 Batch Evaluation Demo:');
  const batchCids = scenarios.map(s => s.cid);
  const batchContext = scenarios[0].context;

  const batchStart = Date.now();
  const batchResults = await qflowService.warmupCache(batchCids, batchContext);
  const batchTime = Date.now() - batchStart;

  console.log(`   Evaluated ${batchCids.length} CIDs in ${batchTime}ms`);
  console.log(`   Average time per CID: ${(batchTime / batchCids.length).toFixed(1)}ms`);
  console.log(`   Success rate: ${batchResults.filter(r => r.success).length}/${batchResults.length}\n`);

  // Show service metrics
  console.log('📈 Service Metrics:');
  const metrics = qflowService.getMetrics();
  console.log(`   Cache size: ${metrics.cacheSize} entries`);
  console.log(`   Registered layers: ${metrics.registeredLayers}`);
  console.log(`   Escalation rules: ${metrics.escalationRules}\n`);

  // Demonstrate custom layer registration
  console.log('🔧 Custom Layer Demo:');
  qflowService.registerCoherenceLayer('demo-layer', {
    name: 'Demo Custom Layer',
    priority: 10,
    handler: async (context) => {
      return {
        verdict: 'ALLOW',
        confidence: 0.95,
        evidence: [{
          type: 'demo-check',
          result: 'passed',
          timestamp: new Date().toISOString()
        }]
      };
    }
  });

  const customEvaluation = await qflowService.evaluate(
    'QmCustomDemo123456789012345678901234567890123',
    { identity: { verified: true }, permissions: ['content.evaluate'] }
  );

  console.log(`   Custom layer executed: ${customEvaluation.layers.find(l => l.name === 'Demo Custom Layer') ? '✅' : '❌'}`);
  console.log(`   Total layers: ${customEvaluation.layers.length}`);

  console.log('\n🎉 Qflow Demo Complete!');
  console.log('\nKey Features Demonstrated:');
  console.log('✅ Content evaluation with multiple coherence layers');
  console.log('✅ Verdict aggregation with confidence scoring');
  console.log('✅ Evidence collection and analysis');
  console.log('✅ Escalation rules for human review');
  console.log('✅ Performance optimization with caching');
  console.log('✅ Batch evaluation capabilities');
  console.log('✅ Custom layer registration');
  console.log('✅ Comprehensive error handling');
}

// Run the demo
runDemo().catch(console.error);