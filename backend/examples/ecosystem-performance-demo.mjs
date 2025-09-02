#!/usr/bin/env node

/**
 * Ecosystem Performance Integration Demo
 * Demonstrates the complete ecosystem performance integration workflow
 */

import EcosystemPerformanceIntegration from '../services/EcosystemPerformanceIntegration.mjs';
import chalk from 'chalk';

console.log(chalk.blue.bold('🌐 Ecosystem Performance Integration Demo\n'));

const ecosystemPerf = new EcosystemPerformanceIntegration();

// Demo data
const mockNodes = [
  { id: 'node-1', region: 'us-east-1' },
  { id: 'node-2', region: 'us-west-2' },
  { id: 'node-3', region: 'eu-west-1' },
  { id: 'node-4', region: 'ap-southeast-1' }
];

const mockNodeMetrics = {
  'node-1': { latency: { p99: 150, p95: 120 }, errorRate: 0.001, capacity: { utilization: 0.65 } },
  'node-2': { latency: { p99: 180, p95: 140 }, errorRate: 0.003, capacity: { utilization: 0.75 } },
  'node-3': { latency: { p99: 350, p95: 280 }, errorRate: 0.015, capacity: { utilization: 0.90 } }, // Poor performance
  'node-4': { latency: { p99: 120, p95: 100 }, errorRate: 0.0005, capacity: { utilization: 0.55 } }  // Excellent performance
};

async function runDemo() {
  console.log(chalk.yellow('📊 Step 1: QNET Node Performance Scoring\n'));
  
  // Calculate performance scores for all nodes
  const nodeScores = {};
  for (const node of mockNodes) {
    const metrics = mockNodeMetrics[node.id];
    const score = ecosystemPerf.calculateNodePerformanceScore(node.id, metrics);
    nodeScores[node.id] = score;
    
    console.log(`${node.id} (${node.region}):`);
    console.log(`  Overall Score: ${getScoreColor(score.overallScore)}`);
    console.log(`  Recommendation: ${getRecommendationColor(score.recommendation)}`);
    console.log(`  Latency Score: ${score.latencyScore.toFixed(3)}`);
    console.log(`  Error Rate Score: ${score.errorRateScore.toFixed(3)}`);
    console.log(`  Capacity Score: ${score.capacityScore.toFixed(3)}\n`);
  }

  console.log(chalk.yellow('🔀 Step 2: QNET Routing Weight Calculation\n'));
  
  // Calculate routing weights
  const weights = ecosystemPerf.getQNETRoutingWeights(mockNodes);
  
  console.log('Routing Weights:');
  for (const [nodeId, weight] of weights) {
    const weightColor = weight > 1 ? chalk.green : weight < 0.5 ? chalk.red : chalk.yellow;
    console.log(`  ${nodeId}: ${weightColor(weight.toFixed(3))}`);
  }
  console.log();

  console.log(chalk.yellow('⚡ Step 3: Qflow Performance Policy Evaluation\n'));
  
  // Test different operations
  const operations = [
    { id: 'user-profile-read', type: 'read', params: { complexity: 'low' } },
    { id: 'complex-analytics', type: 'complex_query', params: { complexity: 'high' } },
    { id: 'batch-update', type: 'batch_operation', params: { size: 1000 } }
  ];

  for (const operation of operations) {
    const evaluation = ecosystemPerf.evaluateQflowPerformancePolicy(operation);
    
    console.log(`Operation: ${operation.id}`);
    console.log(`  Decision: ${getDecisionColor(evaluation.decision)}`);
    console.log(`  Risk Level: ${getRiskColor(evaluation.riskLevel)}`);
    console.log(`  Reason: ${evaluation.reason}`);
    if (evaluation.alternatives.length > 0) {
      console.log(`  Alternatives: ${evaluation.alternatives.join(', ')}`);
    }
    console.log();
  }

  console.log(chalk.yellow('🛡️  Step 4: Qerberos Risk Assessment\n'));
  
  // Generate risk signals for different entities
  const entities = [
    {
      id: 'user-123',
      performanceData: {
        latency: { p99: 200, trend: 'stable' },
        errorRate: 0.002,
        costMetrics: { current: 100, historical: [95, 98, 100, 102, 100] }
      }
    },
    {
      id: 'user-456',
      performanceData: {
        latency: { p99: 400, trend: 'increasing' },
        errorRate: 0.012,
        costMetrics: { current: 250, historical: [100, 120, 150, 180, 220, 250] }
      }
    }
  ];

  for (const entity of entities) {
    const riskSignal = ecosystemPerf.generatePerformanceRiskSignals(entity.id, entity.performanceData);
    
    console.log(`Entity: ${entity.id}`);
    console.log(`  Risk Level: ${getRiskColor(riskSignal.riskLevel)}`);
    console.log(`  Risk Score: ${riskSignal.riskScore}`);
    console.log(`  Signals: ${riskSignal.signals.length}`);
    console.log(`  Correlations: ${riskSignal.correlations.length}`);
    
    if (riskSignal.signals.length > 0) {
      console.log('  Risk Signals:');
      riskSignal.signals.forEach(signal => {
        console.log(`    - ${signal.type} (${signal.severity})`);
      });
    }
    console.log();
  }

  console.log(chalk.yellow('🚀 Step 5: CI/CD Performance Gate\n'));
  
  // Test deployment scenarios
  const deploymentScenarios = [
    {
      name: 'Good Deployment',
      metrics: { deploymentId: 'v2.1.0', p95Latency: 155, p99Latency: 205, errorRate: 0.002, cacheHitRate: 0.87 },
      baseline: { p95Latency: 150, p99Latency: 200, errorRate: 0.002, cacheHitRate: 0.85 }
    },
    {
      name: 'Problematic Deployment',
      metrics: { deploymentId: 'v2.2.0', p95Latency: 200, p99Latency: 280, errorRate: 0.008, cacheHitRate: 0.75 },
      baseline: { p95Latency: 150, p99Latency: 200, errorRate: 0.002, cacheHitRate: 0.85 }
    }
  ];

  for (const scenario of deploymentScenarios) {
    const gate = ecosystemPerf.evaluateCICDPerformanceGate(scenario.metrics, scenario.baseline);
    
    console.log(`${scenario.name} (${scenario.metrics.deploymentId}):`);
    console.log(`  Gate Status: ${gate.passed ? chalk.green('PASSED') : chalk.red('FAILED')}`);
    console.log(`  Violations: ${gate.violations.length}`);
    console.log(`  Recommendation: ${getRecommendationColor(gate.recommendation)}`);
    
    if (gate.violations.length > 0) {
      console.log('  Violations:');
      gate.violations.forEach(violation => {
        console.log(`    - ${violation.type}: ${violation.current} vs ${violation.threshold} (${violation.severity})`);
      });
    }
    console.log();
  }

  console.log(chalk.yellow('🏁 Step 6: Go-Live Readiness Assessment\n'));
  
  // Test go-live readiness for different modules
  const modules = ['qwallet', 'qmarket', 'qsocial'];
  
  for (const module of modules) {
    const readiness = ecosystemPerf.evaluateGoLiveReadiness(module, 'production');
    
    console.log(`Module: ${module}`);
    console.log(`  Overall Status: ${getStatusColor(readiness.overallStatus)}`);
    console.log(`  Blockers: ${readiness.blockers.length}`);
    console.log(`  Gates:`);
    
    Object.entries(readiness.gates).forEach(([gateName, gate]) => {
      console.log(`    ${gateName}: ${gate.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
    });
    console.log();
  }

  console.log(chalk.yellow('🏛️  Step 7: DAO Subnet Performance Evaluation\n'));
  
  // Test DAO subnet performance
  const daos = [
    {
      id: 'dao-alpha',
      metrics: { latency: { p99: 180 }, availability: { uptime: 99.95 }, throughput: { rps: 25 }, errorRate: 0.002 }
    },
    {
      id: 'dao-beta',
      metrics: { latency: { p99: 350 }, availability: { uptime: 99.2 }, throughput: { rps: 8 }, errorRate: 0.015 }
    }
  ];

  for (const dao of daos) {
    const evaluation = ecosystemPerf.evaluateDAOSubnetPerformance(dao.id, dao.metrics);
    
    console.log(`DAO: ${dao.id}`);
    console.log(`  Performance Score: ${evaluation.performanceScore}`);
    console.log(`  Error Budget Burn: ${(evaluation.errorBudgetBurn * 100).toFixed(1)}%`);
    console.log(`  Isolation Recommendation: ${getRecommendationColor(evaluation.isolationRecommendation)}`);
    console.log(`  Impact Assessment: ${getRiskColor(evaluation.impactAssessment)}`);
    
    console.log('  SLO Compliance:');
    Object.entries(evaluation.sloCompliance).forEach(([slo, data]) => {
      console.log(`    ${slo}: ${data.status === 'compliant' ? chalk.green('COMPLIANT') : chalk.red('VIOLATION')} (${data.actual})`);
    });
    console.log();
  }

  console.log(chalk.green.bold('✅ Demo completed successfully!\n'));
  
  console.log(chalk.blue('📈 Summary:'));
  console.log(`- Evaluated ${mockNodes.length} QNET nodes`);
  console.log(`- Tested ${operations.length} Qflow operations`);
  console.log(`- Assessed ${entities.length} entities for risk`);
  console.log(`- Validated ${deploymentScenarios.length} deployment scenarios`);
  console.log(`- Checked ${modules.length} modules for go-live readiness`);
  console.log(`- Evaluated ${daos.length} DAO subnets`);
  
  console.log(chalk.blue('\n🔗 Integration Points Demonstrated:'));
  console.log('- QNET routing weight optimization based on performance');
  console.log('- Qflow operation policy decisions based on system load');
  console.log('- Qerberos risk correlation with performance patterns');
  console.log('- CI/CD performance gates for deployment validation');
  console.log('- Go-live readiness assessment across multiple criteria');
  console.log('- DAO subnet isolation recommendations');
}

// Helper functions for colored output
function getScoreColor(score) {
  if (score >= 0.8) return chalk.green(score.toFixed(3));
  if (score >= 0.6) return chalk.yellow(score.toFixed(3));
  return chalk.red(score.toFixed(3));
}

function getRecommendationColor(recommendation) {
  switch (recommendation) {
    case 'healthy':
    case 'proceed':
    case 'ready':
    case 'none':
      return chalk.green(recommendation.toUpperCase());
    case 'down_weight_moderate':
    case 'queue_deferral':
    case 'cache_fallback':
    case 'proceed_with_monitoring':
    case 'performance_monitoring':
    case 'traffic_throttling':
      return chalk.yellow(recommendation.toUpperCase());
    case 'down_weight_critical':
    case 'block_deployment':
    case 'blocked':
    case 'immediate_isolation':
      return chalk.red(recommendation.toUpperCase());
    default:
      return chalk.blue(recommendation.toUpperCase());
  }
}

function getDecisionColor(decision) {
  switch (decision) {
    case 'proceed':
      return chalk.green(decision.toUpperCase());
    case 'queue_deferral':
    case 'cache_fallback':
      return chalk.yellow(decision.toUpperCase());
    default:
      return chalk.blue(decision.toUpperCase());
  }
}

function getRiskColor(risk) {
  switch (risk) {
    case 'low':
      return chalk.green(risk.toUpperCase());
    case 'moderate':
    case 'medium':
      return chalk.yellow(risk.toUpperCase());
    case 'high':
    case 'critical':
      return chalk.red(risk.toUpperCase());
    default:
      return chalk.blue(risk.toUpperCase());
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'ready':
    case 'healthy':
      return chalk.green(status.toUpperCase());
    case 'warning':
      return chalk.yellow(status.toUpperCase());
    case 'blocked':
    case 'critical':
      return chalk.red(status.toUpperCase());
    default:
      return chalk.blue(status.toUpperCase());
  }
}

// Run the demo
runDemo().catch(console.error);