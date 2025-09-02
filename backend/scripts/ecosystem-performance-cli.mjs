#!/usr/bin/env node

/**
 * Ecosystem Performance Integration CLI
 * Command-line interface for ecosystem-wide performance management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import EcosystemPerformanceIntegration from '../services/EcosystemPerformanceIntegration.mjs';

const program = new Command();
const ecosystemPerf = new EcosystemPerformanceIntegration();

program
  .name('ecosystem-perf')
  .description('Ecosystem Performance Integration CLI')
  .version('1.0.0');

/**
 * QNET Commands
 */
program
  .command('qnet')
  .description('QNET performance integration commands')
  .option('-w, --weights', 'Calculate routing weights')
  .option('-s, --score <nodeId>', 'Calculate node performance score')
  .option('-n, --nodes <nodes>', 'Node list (JSON format)')
  .action(async (options) => {
    try {
      if (options.weights) {
        const nodes = options.nodes ? JSON.parse(options.nodes) : [
          { id: 'node-1' }, { id: 'node-2' }, { id: 'node-3' }
        ];
        
        const weights = ecosystemPerf.getQNETRoutingWeights(nodes);
        
        console.log(chalk.blue.bold('\n🌐 QNET Routing Weights\n'));
        
        const weightTable = new Table({
          head: ['Node ID', 'Weight', 'Recommendation'],
          colWidths: [15, 10, 20]
        });

        for (const [nodeId, weight] of weights) {
          const score = ecosystemPerf.nodePerformanceScores.get(nodeId);
          const recommendation = score ? score.recommendation : 'unknown';
          const weightColor = weight > 1 ? chalk.green : weight < 0.5 ? chalk.red : chalk.yellow;
          
          weightTable.push([
            nodeId,
            weightColor(weight.toFixed(3)),
            getRecommendationColor(recommendation)
          ]);
        }

        console.log(weightTable.toString());
      }

      if (options.score) {
        const mockMetrics = {
          latency: { p99: 180, p95: 120 },
          errorRate: 0.002,
          capacity: { utilization: 0.65 }
        };
        
        const score = ecosystemPerf.calculateNodePerformanceScore(options.score, mockMetrics);
        
        console.log(chalk.blue.bold(`\n📊 Node Performance Score: ${options.score}\n`));
        
        const scoreTable = new Table({
          head: ['Metric', 'Score', 'Weight', 'Contribution'],
          colWidths: [15, 10, 10, 15]
        });

        scoreTable.push(
          ['Latency', score.latencyScore.toFixed(3), '40%', (score.latencyScore * 0.4).toFixed(3)],
          ['Error Rate', score.errorRateScore.toFixed(3), '30%', (score.errorRateScore * 0.3).toFixed(3)],
          ['Capacity', score.capacityScore.toFixed(3), '20%', (score.capacityScore * 0.2).toFixed(3)],
          ['Regression', score.regressionScore.toFixed(3), '10%', (score.regressionScore * 0.1).toFixed(3)]
        );

        console.log(scoreTable.toString());
        
        console.log(`\nOverall Score: ${getScoreColor(score.overallScore)}`);
        console.log(`Recommendation: ${getRecommendationColor(score.recommendation)}`);
      }

    } catch (error) {
      console.error(chalk.red('Error with QNET operations:'), error.message);
      process.exit(1);
    }
  });

/**
 * Qflow Commands
 */
program
  .command('qflow')
  .description('Qflow performance policy commands')
  .option('-c, --check <operation>', 'Check performance policy for operation')
  .option('-t, --type <type>', 'Operation type (read|write|complex_query|batch_operation)', 'read')
  .action(async (options) => {
    try {
      if (options.check) {
        const operation = {
          id: options.check,
          type: options.type,
          params: { complexity: 'medium' }
        };
        
        const evaluation = ecosystemPerf.evaluateQflowPerformancePolicy(operation);
        
        console.log(chalk.blue.bold('\n⚡ Qflow Performance Policy Evaluation\n'));
        
        const evalTable = new Table({
          head: ['Property', 'Value'],
          colWidths: [20, 30]
        });

        evalTable.push(
          ['Operation ID', evaluation.operation.id],
          ['Decision', getDecisionColor(evaluation.decision)],
          ['Reason', evaluation.reason],
          ['Risk Level', getRiskColor(evaluation.riskLevel)],
          ['Alternatives', evaluation.alternatives.join(', ') || 'None']
        );

        console.log(evalTable.toString());
        
        if (evaluation.decision !== 'proceed') {
          console.log(chalk.yellow.bold('\n⚠️  Performance Policy Triggered'));
          console.log(`Recommended action: ${evaluation.decision}`);
          if (evaluation.alternatives.length > 0) {
            console.log('Available alternatives:');
            evaluation.alternatives.forEach(alt => console.log(`  • ${alt}`));
          }
        } else {
          console.log(chalk.green.bold('\n✅ Operation approved to proceed'));
        }
      }

    } catch (error) {
      console.error(chalk.red('Error with Qflow operations:'), error.message);
      process.exit(1);
    }
  });

/**
 * Qerberos Commands
 */
program
  .command('qerberos')
  .description('Qerberos risk assessment commands')
  .option('-r, --risk <entityId>', 'Generate risk assessment for entity')
  .action(async (options) => {
    try {
      if (options.risk) {
        const mockPerformanceData = {
          latency: { p99: 250, trend: 'increasing' },
          errorRate: 0.008,
          costMetrics: {
            current: 150,
            historical: [100, 105, 110, 120, 135, 145, 150]
          }
        };
        
        const riskSignal = ecosystemPerf.generatePerformanceRiskSignals(options.risk, mockPerformanceData);
        
        console.log(chalk.blue.bold(`\n🛡️  Qerberos Risk Assessment: ${options.risk}\n`));
        
        const riskTable = new Table({
          head: ['Property', 'Value'],
          colWidths: [20, 40]
        });

        riskTable.push(
          ['Risk Level', getRiskColor(riskSignal.riskLevel)],
          ['Risk Score', riskSignal.riskScore.toString()],
          ['Signals Count', riskSignal.signals.length.toString()],
          ['Correlations', riskSignal.correlations.length.toString()]
        );

        console.log(riskTable.toString());
        
        if (riskSignal.signals.length > 0) {
          console.log(chalk.yellow.bold('\n⚠️  Risk Signals Detected:\n'));
          
          riskSignal.signals.forEach((signal, i) => {
            console.log(`${i + 1}. ${chalk.red(signal.type.toUpperCase())}`);
            console.log(`   Severity: ${signal.severity}`);
            console.log(`   Impact: ${signal.impact}`);
            if (signal.count) console.log(`   Count: ${signal.count}`);
            console.log();
          });
        }
        
        if (riskSignal.recommendations.length > 0) {
          console.log(chalk.blue.bold('💡 Recommendations:\n'));
          
          riskSignal.recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. ${getPriorityColor(rec.priority)} ${rec.action}`);
            console.log(`   ${rec.description}`);
            console.log();
          });
        }
      }

    } catch (error) {
      console.error(chalk.red('Error with Qerberos operations:'), error.message);
      process.exit(1);
    }
  });

/**
 * CI/CD Commands
 */
program
  .command('cicd')
  .description('CI/CD performance gate commands')
  .option('-g, --gate <deploymentId>', 'Evaluate performance gate')
  .action(async (options) => {
    try {
      if (options.gate) {
        const mockDeploymentMetrics = {
          deploymentId: options.gate,
          p95Latency: 165,
          p99Latency: 220,
          errorRate: 0.003,
          cacheHitRate: 0.82
        };
        
        const mockBaseline = {
          p95Latency: 150,
          p99Latency: 200,
          errorRate: 0.002,
          cacheHitRate: 0.85
        };
        
        const gate = ecosystemPerf.evaluateCICDPerformanceGate(mockDeploymentMetrics, mockBaseline);
        
        console.log(chalk.blue.bold(`\n🚀 CI/CD Performance Gate: ${options.gate}\n`));
        
        const gateTable = new Table({
          head: ['Property', 'Value'],
          colWidths: [20, 30]
        });

        gateTable.push(
          ['Deployment ID', gate.deployment],
          ['Gate Status', gate.passed ? chalk.green('PASSED') : chalk.red('FAILED')],
          ['Violations', gate.violations.length.toString()],
          ['Warnings', gate.warnings.length.toString()],
          ['Recommendation', getRecommendationColor(gate.recommendation)]
        );

        console.log(gateTable.toString());
        
        if (gate.violations.length > 0) {
          console.log(chalk.red.bold('\n❌ Gate Violations:\n'));
          
          gate.violations.forEach((violation, i) => {
            console.log(`${i + 1}. ${violation.type.toUpperCase()}`);
            console.log(`   Current: ${violation.current}`);
            console.log(`   Baseline: ${violation.baseline}`);
            console.log(`   Threshold: ${violation.threshold}`);
            console.log(`   Severity: ${violation.severity}`);
            console.log();
          });
        }
        
        if (gate.warnings.length > 0) {
          console.log(chalk.yellow.bold('\n⚠️  Warnings:\n'));
          
          gate.warnings.forEach((warning, i) => {
            console.log(`${i + 1}. ${warning.type}`);
            console.log(`   ${warning.message}`);
            console.log(`   Impact: ${warning.impact}`);
            console.log();
          });
        }
        
        if (gate.passed) {
          console.log(chalk.green.bold('\n✅ Deployment approved to proceed'));
        } else {
          console.log(chalk.red.bold('\n🚫 Deployment blocked due to performance violations'));
        }
      }

    } catch (error) {
      console.error(chalk.red('Error with CI/CD operations:'), error.message);
      process.exit(1);
    }
  });

/**
 * Go-Live Commands
 */
program
  .command('go-live')
  .description('Go-live readiness commands')
  .option('-r, --readiness <module>', 'Check go-live readiness for module')
  .option('-e, --environment <env>', 'Target environment', 'production')
  .action(async (options) => {
    try {
      if (options.readiness) {
        const readiness = ecosystemPerf.evaluateGoLiveReadiness(options.readiness, options.environment);
        
        console.log(chalk.blue.bold(`\n🚀 Go-Live Readiness: ${options.readiness} (${options.environment})\n`));
        
        const readinessTable = new Table({
          head: ['Property', 'Value'],
          colWidths: [20, 30]
        });

        readinessTable.push(
          ['Overall Status', getStatusColor(readiness.overallStatus)],
          ['Environment', readiness.environment],
          ['Blockers', readiness.blockers.length.toString()],
          ['Warnings', readiness.warnings.length.toString()],
          ['Gates Evaluated', Object.keys(readiness.gates).length.toString()]
        );

        console.log(readinessTable.toString());
        
        // Show gate details
        console.log(chalk.blue.bold('\n📋 Gate Status:\n'));
        
        const gateTable = new Table({
          head: ['Gate', 'Status', 'Message'],
          colWidths: [20, 10, 40]
        });

        Object.entries(readiness.gates).forEach(([gateName, gate]) => {
          gateTable.push([
            gateName,
            gate.passed ? chalk.green('PASS') : chalk.red('FAIL'),
            gate.message
          ]);
        });

        console.log(gateTable.toString());
        
        if (readiness.blockers.length > 0) {
          console.log(chalk.red.bold('\n🚫 Blockers:\n'));
          
          readiness.blockers.forEach((blocker, i) => {
            console.log(`${i + 1}. ${blocker.name}`);
            console.log(`   ${blocker.message}`);
            console.log();
          });
        }
        
        if (readiness.recommendations.length > 0) {
          console.log(chalk.blue.bold('\n💡 Recommendations:\n'));
          
          readiness.recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. ${rec.action}`);
            console.log(`   Priority: ${getPriorityColor(rec.priority)}`);
            console.log(`   Estimated Time: ${rec.estimatedTime}`);
            console.log();
          });
        }
        
        if (readiness.overallStatus === 'ready') {
          console.log(chalk.green.bold('\n✅ Module is ready for go-live!'));
        } else {
          console.log(chalk.red.bold('\n🚫 Module is not ready for go-live'));
        }
      }

    } catch (error) {
      console.error(chalk.red('Error with go-live operations:'), error.message);
      process.exit(1);
    }
  });

/**
 * DAO Commands
 */
program
  .command('dao')
  .description('DAO subnet performance commands')
  .option('-s, --subnet <daoId>', 'Evaluate DAO subnet performance')
  .action(async (options) => {
    try {
      if (options.subnet) {
        const mockSubnetMetrics = {
          latency: { p99: 190 },
          availability: { uptime: 99.8 },
          throughput: { rps: 15 },
          errorRate: 0.005
        };
        
        const evaluation = ecosystemPerf.evaluateDAOSubnetPerformance(options.subnet, mockSubnetMetrics);
        
        console.log(chalk.blue.bold(`\n🏛️  DAO Subnet Performance: ${options.subnet}\n`));
        
        const daoTable = new Table({
          head: ['Property', 'Value'],
          colWidths: [25, 25]
        });

        daoTable.push(
          ['Performance Score', evaluation.performanceScore.toString()],
          ['Error Budget Burn', `${(evaluation.errorBudgetBurn * 100).toFixed(1)}%`],
          ['Isolation Recommendation', getRecommendationColor(evaluation.isolationRecommendation)],
          ['Impact Assessment', getRiskColor(evaluation.impactAssessment)]
        );

        console.log(daoTable.toString());
        
        // Show SLO compliance
        console.log(chalk.blue.bold('\n📊 SLO Compliance:\n'));
        
        const sloTable = new Table({
          head: ['SLO', 'Status', 'Actual', 'Target'],
          colWidths: [15, 12, 12, 12]
        });

        Object.entries(evaluation.sloCompliance).forEach(([slo, data]) => {
          sloTable.push([
            slo,
            data.status === 'compliant' ? chalk.green('COMPLIANT') : chalk.red('VIOLATION'),
            data.actual.toString(),
            data.target.toString()
          ]);
        });

        console.log(sloTable.toString());
        
        if (evaluation.isolationRecommendation !== 'none') {
          console.log(chalk.yellow.bold('\n⚠️  Isolation Recommended'));
          console.log(`Action: ${evaluation.isolationRecommendation}`);
          console.log(`Impact: ${evaluation.impactAssessment}`);
        } else {
          console.log(chalk.green.bold('\n✅ DAO subnet performing within acceptable limits'));
        }
      }

    } catch (error) {
      console.error(chalk.red('Error with DAO operations:'), error.message);
      process.exit(1);
    }
  });

/**
 * Dashboard Command
 */
program
  .command('dashboard')
  .description('Show ecosystem performance dashboard')
  .action(async () => {
    try {
      console.log(chalk.blue.bold('\n🌐 Ecosystem Performance Dashboard\n'));
      
      // Mock dashboard data
      const dashboard = {
        qnet: { totalNodes: 12, healthyNodes: 10, avgScore: 0.85 },
        qflow: { activePolicies: 3, deferredOps: 15, cacheHitRate: 0.87 },
        qerberos: { totalEntities: 45, highRiskEntities: 2, avgRiskScore: 25 },
        cicd: { totalGates: 8, passedGates: 7, blockedDeployments: 1 },
        dao: { totalDAOs: 6, isolatedSubnets: 0, avgPerformanceScore: 92 }
      };
      
      const dashTable = new Table({
        head: ['Component', 'Status', 'Key Metrics'],
        colWidths: [15, 12, 40]
      });

      dashTable.push(
        ['QNET', chalk.green('HEALTHY'), `${dashboard.qnet.healthyNodes}/${dashboard.qnet.totalNodes} nodes healthy`],
        ['Qflow', chalk.green('HEALTHY'), `${dashboard.qflow.deferredOps} ops deferred, ${(dashboard.qflow.cacheHitRate * 100).toFixed(1)}% cache hit`],
        ['Qerberos', dashboard.qerberos.highRiskEntities > 0 ? chalk.yellow('WARNING') : chalk.green('HEALTHY'), `${dashboard.qerberos.highRiskEntities} high-risk entities`],
        ['CI/CD', dashboard.cicd.blockedDeployments > 0 ? chalk.yellow('WARNING') : chalk.green('HEALTHY'), `${dashboard.cicd.passedGates}/${dashboard.cicd.totalGates} gates passed`],
        ['DAO Subnets', chalk.green('HEALTHY'), `${dashboard.dao.totalDAOs} DAOs, avg score ${dashboard.dao.avgPerformanceScore}`]
      );

      console.log(dashTable.toString());
      
      console.log(chalk.green.bold('\n✅ Overall ecosystem performance is healthy'));

    } catch (error) {
      console.error(chalk.red('Error displaying dashboard:'), error.message);
      process.exit(1);
    }
  });

/**
 * Helper functions for colored output
 */
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
      return chalk.green(recommendation.toUpperCase());
    case 'down_weight_moderate':
    case 'queue_deferral':
    case 'cache_fallback':
    case 'proceed_with_monitoring':
      return chalk.yellow(recommendation.toUpperCase());
    case 'down_weight_critical':
    case 'block_deployment':
    case 'blocked':
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

function getPriorityColor(priority) {
  switch (priority) {
    case 'critical':
      return chalk.red.bold('[CRITICAL]');
    case 'high':
      return chalk.red('[HIGH]');
    case 'medium':
      return chalk.yellow('[MEDIUM]');
    case 'low':
      return chalk.blue('[LOW]');
    default:
      return chalk.gray('[INFO]');
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

// Parse command line arguments
program.parse();