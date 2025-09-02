#!/usr/bin/env node

import { SecurityTestSuite, SecurityTestResults } from './SecurityTestSuite';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Security Test Runner Script
 * 
 * Executes comprehensive security and penetration tests for Qflow
 */
async function runSecurityTests(): Promise<void> {
  console.log('🔒 Starting Qflow Security Test Suite...\n');

  const securitySuite = new SecurityTestSuite();
  let results: SecurityTestResults;

  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const testType = args[0] || 'all';

    switch (testType) {
      case 'sandbox':
        console.log('🏃 Running Sandbox Escape Tests...');
        results = {
          sandboxEscape: await securitySuite.runSandboxTests(),
          permissionBypass: { category: 'Permission Bypass', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          dataLeakage: { category: 'Data Leakage', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          cryptographic: { category: 'Cryptographic Security', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          network: { category: 'Network Security', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          penetration: { category: 'Penetration Testing', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          summary: { totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], riskLevel: 'LOW' }
        };
        break;

      case 'permissions':
        console.log('🔐 Running Permission Bypass Tests...');
        results = {
          sandboxEscape: { category: 'Sandbox Escape', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          permissionBypass: await securitySuite.runPermissionTests(),
          dataLeakage: { category: 'Data Leakage', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          cryptographic: { category: 'Cryptographic Security', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          network: { category: 'Network Security', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          penetration: { category: 'Penetration Testing', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          summary: { totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], riskLevel: 'LOW' }
        };
        break;

      case 'isolation':
        console.log('🔒 Running Data Leakage Tests...');
        results = {
          sandboxEscape: { category: 'Sandbox Escape', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          permissionBypass: { category: 'Permission Bypass', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          dataLeakage: await securitySuite.runDataLeakageTests(),
          cryptographic: { category: 'Cryptographic Security', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          network: { category: 'Network Security', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          penetration: { category: 'Penetration Testing', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          summary: { totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], riskLevel: 'LOW' }
        };
        break;

      case 'crypto':
        console.log('🔑 Running Cryptographic Security Tests...');
        results = {
          sandboxEscape: { category: 'Sandbox Escape', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          permissionBypass: { category: 'Permission Bypass', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          dataLeakage: { category: 'Data Leakage', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          cryptographic: await securitySuite.runCryptographicTests(),
          network: { category: 'Network Security', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          penetration: { category: 'Penetration Testing', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          summary: { totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], riskLevel: 'LOW' }
        };
        break;

      case 'network':
        console.log('🌐 Running Network Security Tests...');
        results = {
          sandboxEscape: { category: 'Sandbox Escape', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          permissionBypass: { category: 'Permission Bypass', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          dataLeakage: { category: 'Data Leakage', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          cryptographic: { category: 'Cryptographic Security', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          network: await securitySuite.runNetworkTests(),
          penetration: { category: 'Penetration Testing', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          summary: { totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], riskLevel: 'LOW' }
        };
        break;

      case 'pentest':
        console.log('🎯 Running Penetration Tests...');
        results = {
          sandboxEscape: { category: 'Sandbox Escape', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          permissionBypass: { category: 'Permission Bypass', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          dataLeakage: { category: 'Data Leakage', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          cryptographic: { category: 'Cryptographic Security', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          network: { category: 'Network Security', totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], executionTime: 0, details: [] },
          penetration: await securitySuite.runPenetrationTests(),
          summary: { totalTests: 0, passed: 0, failed: 0, vulnerabilities: [], riskLevel: 'LOW' }
        };
        break;

      case 'all':
      default:
        console.log('🔒 Running All Security Tests...');
        results = await securitySuite.runAllTests();
        break;
    }

    // Display results
    displayResults(results);

    // Generate reports
    await generateReports(results);

    // Exit with appropriate code
    const exitCode = results.summary.failed > 0 || results.summary.riskLevel === 'CRITICAL' ? 1 : 0;
    process.exit(exitCode);

  } catch (error) {
    console.error('❌ Security test execution failed:', error);
    process.exit(1);
  }
}

/**
 * Display test results in console
 */
function displayResults(results: SecurityTestResults): void {
  console.log('\n' + '='.repeat(80));
  console.log('🔒 QFLOW SECURITY TEST RESULTS');
  console.log('='.repeat(80));

  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`   Total Tests: ${results.summary.totalTests}`);
  console.log(`   Passed: ${results.summary.passed} ✅`);
  console.log(`   Failed: ${results.summary.failed} ❌`);
  console.log(`   Risk Level: ${getRiskLevelEmoji(results.summary.riskLevel)} ${results.summary.riskLevel}`);
  console.log(`   Vulnerabilities: ${results.summary.vulnerabilities.length}`);

  // Category breakdown
  console.log('\n📋 CATEGORY BREAKDOWN:');
  
  const categories = [
    results.sandboxEscape,
    results.permissionBypass,
    results.dataLeakage,
    results.cryptographic,
    results.network,
    results.penetration
  ].filter(cat => cat.totalTests > 0);

  categories.forEach(category => {
    const passRate = category.totalTests > 0 ? ((category.passed / category.totalTests) * 100).toFixed(1) : '0.0';
    console.log(`   ${category.category}: ${category.passed}/${category.totalTests} (${passRate}%) - ${category.executionTime}ms`);
  });

  // Vulnerabilities
  if (results.summary.vulnerabilities.length > 0) {
    console.log('\n🚨 VULNERABILITIES FOUND:');
    
    const criticalVulns = results.summary.vulnerabilities.filter(v => v.severity === 'CRITICAL');
    const highVulns = results.summary.vulnerabilities.filter(v => v.severity === 'HIGH');
    const mediumVulns = results.summary.vulnerabilities.filter(v => v.severity === 'MEDIUM');
    const lowVulns = results.summary.vulnerabilities.filter(v => v.severity === 'LOW');

    if (criticalVulns.length > 0) {
      console.log(`   🔴 Critical: ${criticalVulns.length}`);
      criticalVulns.slice(0, 3).forEach(vuln => {
        console.log(`      - ${vuln.title} (${vuln.category})`);
      });
    }

    if (highVulns.length > 0) {
      console.log(`   🟠 High: ${highVulns.length}`);
      highVulns.slice(0, 3).forEach(vuln => {
        console.log(`      - ${vuln.title} (${vuln.category})`);
      });
    }

    if (mediumVulns.length > 0) {
      console.log(`   🟡 Medium: ${mediumVulns.length}`);
    }

    if (lowVulns.length > 0) {
      console.log(`   🟢 Low: ${lowVulns.length}`);
    }
  } else {
    console.log('\n✅ NO VULNERABILITIES FOUND');
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (results.summary.riskLevel === 'CRITICAL') {
    console.log('   🔴 IMMEDIATE ACTION REQUIRED: Critical vulnerabilities must be fixed before deployment');
  } else if (results.summary.riskLevel === 'HIGH') {
    console.log('   🟠 HIGH PRIORITY: Address high-severity vulnerabilities promptly');
  } else if (results.summary.riskLevel === 'MEDIUM') {
    console.log('   🟡 MEDIUM PRIORITY: Review and address medium-severity vulnerabilities');
  } else {
    console.log('   ✅ GOOD SECURITY POSTURE: Continue monitoring and maintaining security controls');
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Generate security reports
 */
async function generateReports(results: SecurityTestResults): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportsDir = join(__dirname, '../../reports/security');

  try {
    // JSON Report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: results.summary,
      categories: {
        sandboxEscape: results.sandboxEscape,
        permissionBypass: results.permissionBypass,
        dataLeakage: results.dataLeakage,
        cryptographic: results.cryptographic,
        network: results.network,
        penetration: results.penetration
      },
      vulnerabilities: results.summary.vulnerabilities,
      metadata: {
        qflowVersion: process.env.QFLOW_VERSION || 'unknown',
        nodeVersion: process.version,
        platform: process.platform,
        testEnvironment: process.env.NODE_ENV || 'test'
      }
    };

    writeFileSync(
      join(reportsDir, `security-report-${timestamp}.json`),
      JSON.stringify(jsonReport, null, 2)
    );

    // HTML Report
    const htmlReport = generateHTMLReport(results, timestamp);
    writeFileSync(
      join(reportsDir, `security-report-${timestamp}.html`),
      htmlReport
    );

    // CSV Report for vulnerabilities
    if (results.summary.vulnerabilities.length > 0) {
      const csvReport = generateCSVReport(results.summary.vulnerabilities);
      writeFileSync(
        join(reportsDir, `vulnerabilities-${timestamp}.csv`),
        csvReport
      );
    }

    console.log(`\n📄 Reports generated in: ${reportsDir}`);
    console.log(`   - security-report-${timestamp}.json`);
    console.log(`   - security-report-${timestamp}.html`);
    if (results.summary.vulnerabilities.length > 0) {
      console.log(`   - vulnerabilities-${timestamp}.csv`);
    }

  } catch (error) {
    console.warn('⚠️  Failed to generate reports:', error.message);
  }
}

/**
 * Generate HTML report
 */
function generateHTMLReport(results: SecurityTestResults, timestamp: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Qflow Security Test Report</title>
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
        .risk-low { color: #28a745; }
        .risk-medium { color: #ffc107; }
        .risk-high { color: #fd7e14; }
        .risk-critical { color: #dc3545; }
        .category { margin-bottom: 30px; }
        .category h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .vulnerability { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .vulnerability.critical { background: #f8d7da; border-color: #f5c6cb; }
        .vulnerability.high { background: #fff3cd; border-color: #ffeaa7; }
        .vulnerability.medium { background: #d1ecf1; border-color: #bee5eb; }
        .vulnerability.low { background: #d4edda; border-color: #c3e6cb; }
        .test-details { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .status-pass { color: #28a745; font-weight: bold; }
        .status-fail { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Qflow Security Test Report</h1>
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
                <h3>Risk Level</h3>
                <div class="value risk-${results.summary.riskLevel.toLowerCase()}">${results.summary.riskLevel}</div>
            </div>
            <div class="metric">
                <h3>Vulnerabilities</h3>
                <div class="value">${results.summary.vulnerabilities.length}</div>
            </div>
        </div>

        ${generateCategoryHTML(results)}

        ${results.summary.vulnerabilities.length > 0 ? generateVulnerabilitiesHTML(results.summary.vulnerabilities) : '<div class="category"><h2>✅ No Vulnerabilities Found</h2></div>'}
    </div>
</body>
</html>
  `;
}

/**
 * Generate category HTML
 */
function generateCategoryHTML(results: SecurityTestResults): string {
  const categories = [
    results.sandboxEscape,
    results.permissionBypass,
    results.dataLeakage,
    results.cryptographic,
    results.network,
    results.penetration
  ].filter(cat => cat.totalTests > 0);

  return categories.map(category => {
    const passRate = category.totalTests > 0 ? ((category.passed / category.totalTests) * 100).toFixed(1) : '0.0';
    
    return `
      <div class="category">
        <h2>${category.category}</h2>
        <p>Tests: ${category.totalTests} | Passed: ${category.passed} | Failed: ${category.failed} | Pass Rate: ${passRate}% | Execution Time: ${category.executionTime}ms</p>
        
        <table>
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Status</th>
              <th>Execution Time</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${category.details.map(test => `
              <tr>
                <td>${test.testName}</td>
                <td class="status-${test.status.toLowerCase()}">${test.status}</td>
                <td>${test.executionTime}ms</td>
                <td>${test.error || test.details ? (test.error || JSON.stringify(test.details)) : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('');
}

/**
 * Generate vulnerabilities HTML
 */
function generateVulnerabilitiesHTML(vulnerabilities: any[]): string {
  return `
    <div class="category">
      <h2>🚨 Vulnerabilities</h2>
      ${vulnerabilities.map(vuln => `
        <div class="vulnerability ${vuln.severity.toLowerCase()}">
          <h3>${vuln.title}</h3>
          <p><strong>Severity:</strong> ${vuln.severity}</p>
          <p><strong>Category:</strong> ${vuln.category}</p>
          <p><strong>Description:</strong> ${vuln.description}</p>
          <p><strong>Affected Components:</strong> ${vuln.affectedComponents.join(', ')}</p>
          <p><strong>Remediation:</strong> ${vuln.remediation}</p>
          <p><strong>Discovered By:</strong> ${vuln.discoveredBy}</p>
          <p><strong>Discovered At:</strong> ${new Date(vuln.discoveredAt).toLocaleString()}</p>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Generate CSV report for vulnerabilities
 */
function generateCSVReport(vulnerabilities: any[]): string {
  const headers = ['ID', 'Title', 'Severity', 'Category', 'Description', 'Remediation', 'Affected Components', 'Discovered By', 'Discovered At'];
  const rows = vulnerabilities.map(vuln => [
    vuln.id,
    vuln.title,
    vuln.severity,
    vuln.category,
    vuln.description,
    vuln.remediation,
    vuln.affectedComponents.join(';'),
    vuln.discoveredBy,
    vuln.discoveredAt
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Get risk level emoji
 */
function getRiskLevelEmoji(riskLevel: string): string {
  switch (riskLevel) {
    case 'CRITICAL': return '🔴';
    case 'HIGH': return '🟠';
    case 'MEDIUM': return '🟡';
    case 'LOW': return '🟢';
    default: return '⚪';
  }
}

// Run the security tests
if (require.main === module) {
  runSecurityTests().catch(error => {
    console.error('❌ Failed to run security tests:', error);
    process.exit(1);
  });
}