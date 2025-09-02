#!/usr/bin/env node

import { ChaosTestSuite, ChaosTestResults } from './ChaosTestSuite';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Chaos Engineering Test Runner Script
 * 
 * Executes comprehensive chaos engineering and failure testing for Qflow
 */
async function runChaosTests(): Promise<void> {
  console.log('🌪️  Starting Qflow Chaos Engineering Test Suite...\n');

  const chaosTestSuite = new ChaosTestSuite({
    failureRate: parseFloat(process.env.CHAOS_FAILURE_RATE || '0.1'),
    duration: parseInt(process.env.CHAOS_DURATION || '60000'),
    intensity: parseFloat(process.env.CHAOS_INTENSITY || '0.5'),
    blastRadius: parseFloat(process.env.CHAOS_BLAST_RADIUS || '0.3'),
    safetyChecks: process.env.CHAOS_SAFETY_CHECKS !== 'false',
    autoRecovery: process.env.CHAOS_AUTO_RECOVERY !== 'false',
    metricsCollection: process.env.CHAOS_METRICS_COLLECTION !== 'false'
  });

  let results: ChaosTestResults;

  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const testType = args[0] || 'all';

    switch (testType) {
      case 'nodes':
        console.log('🔥 Running Node Failure Tests...');
        results = {
          nodeFailure: await chaosTestSuite.runNodeFailureTests(),
          networkPartition: { category: 'Network Partition', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          resourceExhaustion: { category: 'Resource Exhaustion', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          distributedSystem: { category: 'Distributed System Chaos', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          byzantineNode: { category: 'Byzantine and Malicious Node Chaos', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          summary: { totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], mttr: 0, mtbf: 0, availability: 0 }
        };
        break;

      case 'network':
        console.log('🌐 Running Network Partition Tests...');
        results = {
          nodeFailure: { category: 'Node Failure', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          networkPartition: await chaosTestSuite.runNetworkPartitionTests(),
          resourceExhaustion: { category: 'Resource Exhaustion', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          distributedSystem: { category: 'Distributed System Chaos', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          byzantineNode: { category: 'Byzantine and Malicious Node Chaos', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          summary: { totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], mttr: 0, mtbf: 0, availability: 0 }
        };
        break;

      case 'resources':
        console.log('💾 Running Resource Exhaustion Tests...');
        results = {
          nodeFailure: { category: 'Node Failure', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          networkPartition: { category: 'Network Partition', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          resourceExhaustion: await chaosTestSuite.runResourceExhaustionTests(),
          distributedSystem: { category: 'Distributed System Chaos', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          byzantineNode: { category: 'Byzantine and Malicious Node Chaos', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          summary: { totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], mttr: 0, mtbf: 0, availability: 0 }
        };
        break;

      case 'distributed':
        console.log('🔗 Running Distributed System Chaos Tests...');
        results = {
          nodeFailure: { category: 'Node Failure', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          networkPartition: { category: 'Network Partition', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          resourceExhaustion: { category: 'Resource Exhaustion', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          distributedSystem: await chaosTestSuite.runDistributedSystemTests(),
          byzantineNode: { category: 'Byzantine and Malicious Node Chaos', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          summary: { totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], mttr: 0, mtbf: 0, availability: 0 }
        };
        break;

      case 'byzantine':
        console.log('⚔️  Running Byzantine and Malicious Node Chaos Tests...');
        results = {
          nodeFailure: { category: 'Node Failure', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          networkPartition: { category: 'Network Partition', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          resourceExhaustion: { category: 'Resource Exhaustion', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          distributedSystem: { category: 'Distributed System Chaos', totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], executionTime: 0, totalRecoveryTime: 0, failureCount: 0, details: [] },
          byzantineNode: await chaosTestSuite.runByzantineNodeTests(),
          summary: { totalTests: 0, passed: 0, failed: 0, resilientBehaviors: [], failurePoints: [], mttr: 0, mtbf: 0, availability: 0 }
        };
        break;

      case 'all':
      default:
        console.log('🌪️  Running All Chaos Engineering Tests...');
        results = await chaosTestSuite.runAllTests();
        break;
    }

    // Display results
    displayResults(results);

    // Generate reports
    await generateReports(results);

    // Exit with appropriate code
    const exitCode = results.summary.failed > 0 || results.summary.availability < 95 ? 1 : 0;
    process.exit(exitCode);

  } catch (error) {
    console.error('❌ Chaos test execution failed:', error);
    process.exit(1);
  }
}

/**
 * Display test results in console
 */
function displayResults(results: ChaosTestResults): void {
  console.log('\n' + '='.repeat(80));
  console.log('🌪️  QFLOW CHAOS ENGINEERING TEST RESULTS');
  console.log('='.repeat(80));

  // Summary
  console.log('\n📊 RESILIENCE SUMMARY:');
  console.log(`   Total Tests: ${results.summary.totalTests}`);
  console.log(`   Passed: ${results.summary.passed} ✅`);
  console.log(`   Failed: ${results.summary.failed} ❌`);
  console.log(`   Availability: ${results.summary.availability.toFixed(2)}% ${getAvailabilityEmoji(results.summary.availability)}`);
  console.log(`   MTTR: ${(results.summary.mttr / 1000).toFixed(2)}s ⏱️`);
  console.log(`   MTBF: ${results.summary.mtbf === Infinity ? '∞' : (results.summary.mtbf / 1000).toFixed(2) + 's'} 🔄`);
  console.log(`   Resilient Behaviors: ${results.summary.resilientBehaviors.length} 💪`);
  console.log(`   Failure Points: ${results.summary.failurePoints.length} ⚠️`);

  // Category breakdown
  console.log('\n📋 CHAOS TEST BREAKDOWN:');
  
  const categories = [
    results.nodeFailure,
    results.networkPartition,
    results.resourceExhaustion,
    results.distributedSystem,
    results.byzantineNode
  ].filter(cat => cat.totalTests > 0);

  categories.forEach(category => {
    const passRate = category.totalTests > 0 ? ((category.passed / category.totalTests) * 100).toFixed(1) : '0.0';
    const avgRecoveryTime = category.failureCount > 0 ? (category.totalRecoveryTime / category.failureCount / 1000).toFixed(2) : '0.00';
    console.log(`   ${category.category}: ${category.passed}/${category.totalTests} (${passRate}%) - Avg Recovery: ${avgRecoveryTime}s`);
  });

  // Resilient behaviors
  if (results.summary.resilientBehaviors.length > 0) {
    console.log('\n💪 RESILIENT BEHAVIORS DISCOVERED:');
    
    const behaviorsByCategory = groupBy(results.summary.resilientBehaviors, 'category');
    Object.entries(behaviorsByCategory).forEach(([category, behaviors]) => {
      console.log(`   ${category}: ${behaviors.length} behaviors`);
      behaviors.slice(0, 3).forEach(behavior => {
        console.log(`      - ${behavior.description} (${(behavior.recoveryTime / 1000).toFixed(2)}s recovery)`);
      });
    });
  } else {
    console.log('\n💪 NO SPECIFIC RESILIENT BEHAVIORS IDENTIFIED');
  }

  // Failure points
  if (results.summary.failurePoints.length > 0) {
    console.log('\n⚠️  FAILURE POINTS IDENTIFIED:');
    
    const criticalFailures = results.summary.failurePoints.filter(f => f.severity === 'CRITICAL');
    const highFailures = results.summary.failurePoints.filter(f => f.severity === 'HIGH');
    const mediumFailures = results.summary.failurePoints.filter(f => f.severity === 'MEDIUM');
    const lowFailures = results.summary.failurePoints.filter(f => f.severity === 'LOW');

    if (criticalFailures.length > 0) {
      console.log(`   🔴 Critical: ${criticalFailures.length}`);
      criticalFailures.slice(0, 2).forEach(failure => {
        console.log(`      - ${failure.description}`);
      });
    }

    if (highFailures.length > 0) {
      console.log(`   🟠 High: ${highFailures.length}`);
      highFailures.slice(0, 2).forEach(failure => {
        console.log(`      - ${failure.description}`);
      });
    }

    if (mediumFailures.length > 0) {
      console.log(`   🟡 Medium: ${mediumFailures.length}`);
    }

    if (lowFailures.length > 0) {
      console.log(`   🟢 Low: ${lowFailures.length}`);
    }
  } else {
    console.log('\n✅ NO CRITICAL FAILURE POINTS IDENTIFIED');
  }

  // Recommendations
  console.log('\n💡 RESILIENCE RECOMMENDATIONS:');
  if (results.summary.availability < 95) {
    console.log('   🔴 CRITICAL: System availability below 95% - immediate attention required');
  } else if (results.summary.availability < 99) {
    console.log('   🟠 WARNING: System availability below 99% - consider improvements');
  } else if (results.summary.availability < 99.9) {
    console.log('   🟡 GOOD: System shows good availability - monitor and maintain');
  } else {
    console.log('   ✅ EXCELLENT: System demonstrates high availability and resilience');
  }

  if (results.summary.mttr > 30000) {
    console.log('   ⏱️  Consider improving recovery time (current MTTR > 30s)');
  }

  if (results.summary.failurePoints.length > 0) {
    console.log('   🔧 Address identified failure points to improve resilience');
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Generate chaos engineering reports
 */
async function generateReports(results: ChaosTestResults): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportsDir = join(__dirname, '../../reports/chaos');

  try {
    // JSON Report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: results.summary,
      categories: {
        nodeFailure: results.nodeFailure,
        networkPartition: results.networkPartition,
        resourceExhaustion: results.resourceExhaustion,
        distributedSystem: results.distributedSystem,
        byzantineNode: results.byzantineNode
      },
      resilientBehaviors: results.summary.resilientBehaviors,
      failurePoints: results.summary.failurePoints,
      metadata: {
        qflowVersion: process.env.QFLOW_VERSION || 'unknown',
        nodeVersion: process.version,
        platform: process.platform,
        testEnvironment: process.env.NODE_ENV || 'test',
        chaosConfig: {
          failureRate: process.env.CHAOS_FAILURE_RATE || '0.1',
          duration: process.env.CHAOS_DURATION || '60000',
          intensity: process.env.CHAOS_INTENSITY || '0.5',
          blastRadius: process.env.CHAOS_BLAST_RADIUS || '0.3'
        }
      }
    };

    writeFileSync(
      join(reportsDir, `chaos-report-${timestamp}.json`),
      JSON.stringify(jsonReport, null, 2)
    );

    // HTML Report
    const htmlReport = generateHTMLReport(results, timestamp);
    writeFileSync(
      join(reportsDir, `chaos-report-${timestamp}.html`),
      htmlReport
    );

    // CSV Report for resilient behaviors
    if (results.summary.resilientBehaviors.length > 0) {
      const csvReport = generateResilientBehaviorsCSV(results.summary.resilientBehaviors);
      writeFileSync(
        join(reportsDir, `resilient-behaviors-${timestamp}.csv`),
        csvReport
      );
    }

    // CSV Report for failure points
    if (results.summary.failurePoints.length > 0) {
      const csvReport = generateFailurePointsCSV(results.summary.failurePoints);
      writeFileSync(
        join(reportsDir, `failure-points-${timestamp}.csv`),
        csvReport
      );
    }

    console.log(`\n📄 Reports generated in: ${reportsDir}`);
    console.log(`   - chaos-report-${timestamp}.json`);
    console.log(`   - chaos-report-${timestamp}.html`);
    if (results.summary.resilientBehaviors.length > 0) {
      console.log(`   - resilient-behaviors-${timestamp}.csv`);
    }
    if (results.summary.failurePoints.length > 0) {
      console.log(`   - failure-points-${timestamp}.csv`);
    }

  } catch (error) {
    console.warn('⚠️  Failed to generate reports:', error.message);
  }
}

/**
 * Generate HTML report
 */
function generateHTMLReport(results: ChaosTestResults, timestamp: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Qflow Chaos Engineering Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .availability-excellent { color: #28a745; }
        .availability-good { color: #ffc107; }
        .availability-warning { color: #fd7e14; }
        .availability-critical { color: #dc3545; }
        .category { margin-bottom: 30px; }
        .category h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .resilient-behavior { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .failure-point { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .failure-point.critical { background: #f8d7da; border-color: #f5c6cb; }
        .failure-point.high { background: #fff3cd; border-color: #ffeaa7; }
        .failure-point.medium { background: #d1ecf1; border-color: #bee5eb; }
        .failure-point.low { background: #d4edda; border-color: #c3e6cb; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .status-pass { color: #28a745; font-weight: bold; }
        .status-fail { color: #dc3545; font-weight: bold; }
        .status-partial { color: #ffc107; font-weight: bold; }
        .chart { width: 100%; height: 300px; background: #f8f9fa; border-radius: 5px; display: flex; align-items: center; justify-content: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌪️ Qflow Chaos Engineering Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Report ID: ${timestamp}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${results.summary.totalTests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${results.summary.passed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${results.summary.failed}</div>
            </div>
            <div class="metric">
                <h3>Availability</h3>
                <div class="value availability-${getAvailabilityClass(results.summary.availability)}">${results.summary.availability.toFixed(2)}%</div>
            </div>
            <div class="metric">
                <h3>MTTR</h3>
                <div class="value">${(results.summary.mttr / 1000).toFixed(2)}s</div>
            </div>
            <div class="metric">
                <h3>Resilient Behaviors</h3>
                <div class="value">${results.summary.resilientBehaviors.length}</div>
            </div>
        </div>

        ${generateCategoriesHTML(results)}

        ${results.summary.resilientBehaviors.length > 0 ? generateResilientBehaviorsHTML(results.summary.resilientBehaviors) : ''}

        ${results.summary.failurePoints.length > 0 ? generateFailurePointsHTML(results.summary.failurePoints) : '<div class="category"><h2>✅ No Critical Failure Points</h2></div>'}
    </div>
</body>
</html>
  `;
}

/**
 * Generate categories HTML
 */
function generateCategoriesHTML(results: ChaosTestResults): string {
  const categories = [
    results.nodeFailure,
    results.networkPartition,
    results.resourceExhaustion,
    results.distributedSystem,
    results.byzantineNode
  ].filter(cat => cat.totalTests > 0);

  return categories.map(category => {
    const passRate = category.totalTests > 0 ? ((category.passed / category.totalTests) * 100).toFixed(1) : '0.0';
    const avgRecoveryTime = category.failureCount > 0 ? (category.totalRecoveryTime / category.failureCount / 1000).toFixed(2) : '0.00';
    
    return `
      <div class="category">
        <h2>${category.category}</h2>
        <p>Tests: ${category.totalTests} | Passed: ${category.passed} | Failed: ${category.failed} | Pass Rate: ${passRate}% | Avg Recovery: ${avgRecoveryTime}s</p>
        
        <table>
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Status</th>
              <th>Recovery Time</th>
              <th>System Response</th>
            </tr>
          </thead>
          <tbody>
            ${category.details.map(test => `
              <tr>
                <td>${test.testName}</td>
                <td class="status-${test.status.toLowerCase()}">${test.status}</td>
                <td>${(test.recoveryTime / 1000).toFixed(2)}s</td>
                <td>Availability: ${test.systemResponse.serviceAvailability.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('');
}

/**
 * Generate resilient behaviors HTML
 */
function generateResilientBehaviorsHTML(behaviors: any[]): string {
  return `
    <div class="category">
      <h2>💪 Resilient Behaviors</h2>
      ${behaviors.map(behavior => `
        <div class="resilient-behavior">
          <h3>${behavior.description}</h3>
          <p><strong>Category:</strong> ${behavior.category}</p>
          <p><strong>Recovery Mechanism:</strong> ${behavior.recoveryMechanism}</p>
          <p><strong>Recovery Time:</strong> ${(behavior.recoveryTime / 1000).toFixed(2)}s</p>
          <p><strong>Data Consistency:</strong> ${behavior.dataConsistency ? 'Maintained' : 'Compromised'}</p>
          <p><strong>Performance Impact:</strong> ${behavior.performanceImpact.toFixed(1)}%</p>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Generate failure points HTML
 */
function generateFailurePointsHTML(failurePoints: any[]): string {
  return `
    <div class="category">
      <h2>⚠️ Failure Points</h2>
      ${failurePoints.map(failure => `
        <div class="failure-point ${failure.severity.toLowerCase()}">
          <h3>${failure.description}</h3>
          <p><strong>Severity:</strong> ${failure.severity}</p>
          <p><strong>Category:</strong> ${failure.category}</p>
          <p><strong>Impact:</strong> ${failure.impact}</p>
          <p><strong>Remediation:</strong> ${failure.remediation}</p>
          <p><strong>Affected Components:</strong> ${failure.affectedComponents.join(', ')}</p>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Generate CSV report for resilient behaviors
 */
function generateResilientBehaviorsCSV(behaviors: any[]): string {
  const headers = ['ID', 'Description', 'Category', 'Recovery Mechanism', 'Recovery Time (ms)', 'Data Consistency', 'Performance Impact (%)', 'Discovered At'];
  const rows = behaviors.map(behavior => [
    behavior.id,
    behavior.description,
    behavior.category,
    behavior.recoveryMechanism,
    behavior.recoveryTime,
    behavior.dataConsistency,
    behavior.performanceImpact,
    behavior.discoveredAt
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Generate CSV report for failure points
 */
function generateFailurePointsCSV(failurePoints: any[]): string {
  const headers = ['ID', 'Description', 'Severity', 'Category', 'Impact', 'Remediation', 'Affected Components', 'Discovered At'];
  const rows = failurePoints.map(failure => [
    failure.id,
    failure.description,
    failure.severity,
    failure.category,
    failure.impact,
    failure.remediation,
    failure.affectedComponents.join(';'),
    failure.discoveredAt
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Get availability emoji
 */
function getAvailabilityEmoji(availability: number): string {
  if (availability >= 99.9) return '🟢';
  if (availability >= 99) return '🟡';
  if (availability >= 95) return '🟠';
  return '🔴';
}

/**
 * Get availability CSS class
 */
function getAvailabilityClass(availability: number): string {
  if (availability >= 99.9) return 'excellent';
  if (availability >= 99) return 'good';
  if (availability >= 95) return 'warning';
  return 'critical';
}

/**
 * Group array by property
 */
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

// Run the chaos tests
if (require.main === module) {
  runChaosTests().catch(error => {
    console.error('❌ Failed to run chaos tests:', error);
    process.exit(1);
  });
}