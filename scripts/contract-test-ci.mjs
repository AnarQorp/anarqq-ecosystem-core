#!/usr/bin/env node

/**
 * CI/CD Contract Testing Integration
 * Integrates contract testing into CI/CD pipeline with quality gates
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const CONFIG = {
  modulesPath: './modules',
  outputPath: './test-results/contract-tests',
  coverageThreshold: 80,
  maxWarnings: 10,
  failOnWarnings: process.env.CI_FAIL_ON_WARNINGS === 'true',
  parallel: process.env.CI_PARALLEL !== 'false',
  timeout: parseInt(process.env.CI_TIMEOUT || '60000'),
  includeModules: process.env.CI_INCLUDE_MODULES?.split(','),
  excludeModules: process.env.CI_EXCLUDE_MODULES?.split(','),
  testEndpoints: process.env.CI_TEST_ENDPOINTS === 'true',
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  githubToken: process.env.GITHUB_TOKEN,
  prNumber: process.env.GITHUB_PR_NUMBER
};

/**
 * Run contract tests with CI/CD integration
 */
async function runContractTestsCI() {
  console.log('🚀 Starting CI/CD Contract Testing Pipeline\n');
  
  // Log configuration
  console.log('⚙️  Configuration:');
  Object.entries(CONFIG).forEach(([key, value]) => {
    if (key.includes('token') || key.includes('webhook')) {
      console.log(`   ${key}: ${value ? '[CONFIGURED]' : '[NOT SET]'}`);
    } else {
      console.log(`   ${key}: ${value}`);
    }
  });
  console.log('');

  const startTime = Date.now();
  let results = null;

  try {
    // Build contract testing CLI arguments
    const args = [
      'run',
      '--modules', CONFIG.modulesPath,
      '--output', CONFIG.outputPath,
      '--timeout', CONFIG.timeout.toString(),
      '--verbose'
    ];

    if (CONFIG.includeModules) {
      args.push('--include', CONFIG.includeModules.join(','));
    }

    if (CONFIG.excludeModules) {
      args.push('--exclude', CONFIG.excludeModules.join(','));
    }

    if (CONFIG.testEndpoints) {
      args.push('--endpoints');
    }

    if (CONFIG.failOnWarnings) {
      args.push('--fail-on-warnings');
    }

    if (!CONFIG.parallel) {
      args.push('--no-parallel');
    }

    // Run contract tests
    console.log('🧪 Running contract tests...');
    const testResult = await runCommand('npx', ['contract-test', ...args]);
    
    // Load test results
    const resultsPath = join(CONFIG.outputPath, 'contract-test-report.json');
    if (existsSync(resultsPath)) {
      results = JSON.parse(readFileSync(resultsPath, 'utf8'));
    }

    const duration = Date.now() - startTime;
    
    // Analyze results
    const analysis = analyzeResults(results, duration);
    
    // Print analysis
    printAnalysis(analysis);
    
    // Apply quality gates
    const gateResults = applyQualityGates(analysis);
    
    // Generate CI artifacts
    await generateCIArtifacts(analysis, gateResults);
    
    // Send notifications
    await sendNotifications(analysis, gateResults);
    
    // Update PR if applicable
    if (CONFIG.githubToken && CONFIG.prNumber) {
      await updatePullRequest(analysis, gateResults);
    }

    // Exit with appropriate code
    if (gateResults.passed) {
      console.log('\n✅ All quality gates passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Quality gates failed!');
      console.log('Failing gates:');
      gateResults.failures.forEach(failure => {
        console.log(`  - ${failure}`);
      });
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ Contract testing pipeline failed: ${error.message}`);
    
    // Send failure notification
    await sendFailureNotification(error);
    
    process.exit(1);
  }
}

/**
 * Run a command and return the result
 */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { 
      stdio: 'inherit',
      shell: true 
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ code, success: true });
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Analyze test results
 */
function analyzeResults(results, duration) {
  if (!results) {
    return {
      status: 'FAILED',
      message: 'No test results found',
      duration,
      coverage: 0,
      tests: { total: 0, passed: 0, failed: 0, warnings: 0 },
      modules: [],
      crossModule: [],
      criticalIssues: [],
      recommendations: []
    };
  }

  const criticalIssues = results.failureAnalysis?.criticalIssues || [];
  const recommendations = results.recommendations || [];
  
  let status = 'PASSED';
  if (results.summary.failed > 0) {
    status = 'FAILED';
  } else if (results.summary.warnings > CONFIG.maxWarnings) {
    status = 'WARNING';
  }

  return {
    status,
    message: `${results.summary.passed}/${results.summary.total} tests passed`,
    duration,
    coverage: results.summary.coverage,
    tests: results.summary,
    modules: results.modules || [],
    crossModule: results.crossModule || [],
    criticalIssues,
    recommendations
  };
}

/**
 * Print analysis results
 */
function printAnalysis(analysis) {
  console.log('\n📊 Test Analysis:');
  console.log(`   Status: ${getStatusIcon(analysis.status)} ${analysis.status}`);
  console.log(`   Message: ${analysis.message}`);
  console.log(`   Duration: ${(analysis.duration / 1000).toFixed(2)}s`);
  console.log(`   Coverage: ${analysis.coverage.toFixed(1)}%`);
  console.log(`   Tests: ${analysis.tests.total} total, ${analysis.tests.passed} passed, ${analysis.tests.failed} failed`);
  console.log(`   Warnings: ${analysis.tests.warnings}`);
  console.log(`   Modules: ${analysis.modules.length}`);
  console.log(`   Cross-module tests: ${analysis.crossModule.length}`);
  
  if (analysis.criticalIssues.length > 0) {
    console.log(`   Critical issues: ${analysis.criticalIssues.length}`);
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
  switch (status) {
    case 'PASSED': return '✅';
    case 'WARNING': return '⚠️';
    case 'FAILED': return '❌';
    default: return '❓';
  }
}

/**
 * Apply quality gates
 */
function applyQualityGates(analysis) {
  const failures = [];
  const warnings = [];
  
  // Coverage gate
  if (analysis.coverage < CONFIG.coverageThreshold) {
    failures.push(`Coverage ${analysis.coverage.toFixed(1)}% below threshold ${CONFIG.coverageThreshold}%`);
  } else if (analysis.coverage < CONFIG.coverageThreshold + 10) {
    warnings.push(`Coverage ${analysis.coverage.toFixed(1)}% is close to threshold ${CONFIG.coverageThreshold}%`);
  }
  
  // Test failure gate
  if (analysis.tests.failed > 0) {
    failures.push(`${analysis.tests.failed} test(s) failed`);
  }
  
  // Warning gate
  if (CONFIG.failOnWarnings && analysis.tests.warnings > 0) {
    failures.push(`${analysis.tests.warnings} warning(s) found (fail-on-warnings enabled)`);
  }
  
  // Max warnings gate
  if (analysis.tests.warnings > CONFIG.maxWarnings) {
    failures.push(`${analysis.tests.warnings} warnings exceed maximum ${CONFIG.maxWarnings}`);
  } else if (analysis.tests.warnings > CONFIG.maxWarnings * 0.8) {
    warnings.push(`${analysis.tests.warnings} warnings approaching maximum ${CONFIG.maxWarnings}`);
  }
  
  // Critical issues gate
  if (analysis.criticalIssues.length > 0) {
    failures.push(`${analysis.criticalIssues.length} critical issue(s) found`);
  }

  // Cross-module compatibility gate
  const crossModuleErrors = analysis.crossModule.reduce((sum, test) => 
    sum + test.issues.filter(issue => issue.severity === 'ERROR').length, 0
  );
  
  if (crossModuleErrors > 0) {
    failures.push(`${crossModuleErrors} cross-module compatibility error(s) found`);
  }

  // Module health gate - check if any modules are completely broken
  const brokenModules = analysis.modules.filter(module => 
    module.status === 'FAILED' && module.coverage < 10
  );
  
  if (brokenModules.length > 0) {
    failures.push(`${brokenModules.length} module(s) are severely broken: ${brokenModules.map(m => m.name).join(', ')}`);
  }

  // Performance gate - check test duration
  if (analysis.duration > 300000) { // 5 minutes
    warnings.push(`Test execution took ${(analysis.duration / 1000).toFixed(2)}s (consider optimization)`);
  }

  // Schema consistency gate
  const schemaInconsistencies = analysis.modules.reduce((sum, module) => 
    sum + module.errors.filter(error => 
      error.type === 'SCHEMA_VALIDATION' && error.message.includes('inconsistent')
    ).length, 0
  );

  if (schemaInconsistencies > 5) {
    failures.push(`${schemaInconsistencies} schema inconsistencies found across modules`);
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings
  };
}

/**
 * Generate CI artifacts
 */
async function generateCIArtifacts(analysis, gateResults) {
  console.log('\n📁 Generating CI artifacts...');
  
  // Generate summary for CI systems
  const summary = {
    status: gateResults.passed ? 'SUCCESS' : 'FAILURE',
    timestamp: new Date().toISOString(),
    duration: analysis.duration,
    coverage: analysis.coverage,
    tests: analysis.tests,
    qualityGates: {
      passed: gateResults.passed,
      failures: gateResults.failures
    },
    artifacts: [
      'contract-test-report.json',
      'contract-test-report.html',
      'contract-test-results.xml'
    ]
  };

  // Write CI summary
  const summaryPath = join(CONFIG.outputPath, 'ci-summary.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`   ✅ CI summary: ${summaryPath}`);

  // Generate GitHub Actions summary if in GitHub Actions
  if (process.env.GITHUB_ACTIONS) {
    await generateGitHubActionsSummary(analysis, gateResults);
  }

  // Generate badge data
  const badgeColor = gateResults.passed ? 'brightgreen' : 'red';
  const badgeMessage = `${analysis.tests.passed}/${analysis.tests.total} passed`;
  const badgeData = {
    schemaVersion: 1,
    label: 'contract tests',
    message: badgeMessage,
    color: badgeColor
  };
  
  const badgePath = join(CONFIG.outputPath, 'badge.json');
  writeFileSync(badgePath, JSON.stringify(badgeData, null, 2));
  console.log(`   ✅ Badge data: ${badgePath}`);
}

/**
 * Generate GitHub Actions summary
 */
async function generateGitHubActionsSummary(analysis, gateResults) {
  const summary = `# Contract Test Results ${getStatusIcon(analysis.status)}

## Summary
- **Status**: ${analysis.status}
- **Tests**: ${analysis.tests.passed}/${analysis.tests.total} passed
- **Coverage**: ${analysis.coverage.toFixed(1)}%
- **Duration**: ${(analysis.duration / 1000).toFixed(2)}s
- **Warnings**: ${analysis.tests.warnings}

## Quality Gates
${gateResults.passed ? '✅ All quality gates passed' : '❌ Quality gates failed'}

${gateResults.failures.length > 0 ? `
### Failures
${gateResults.failures.map(f => `- ❌ ${f}`).join('\n')}
` : ''}

## Module Results
${analysis.modules.map(module => 
  `- ${module.status === 'PASSED' ? '✅' : module.status === 'FAILED' ? '❌' : '⚠️'} **${module.name}**: ${module.coverage.toFixed(1)}% coverage`
).join('\n')}

${analysis.recommendations.length > 0 ? `
## Recommendations
${analysis.recommendations.map(rec => `- 💡 ${rec}`).join('\n')}
` : ''}

## Artifacts
- [📊 HTML Report](./contract-test-report.html)
- [📋 JUnit Results](./contract-test-results.xml)
- [📄 JSON Report](./contract-test-report.json)
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    console.log('   ✅ GitHub Actions summary generated');
  }
}

/**
 * Send notifications
 */
async function sendNotifications(analysis, gateResults) {
  if (CONFIG.slackWebhook) {
    await sendSlackNotification(analysis, gateResults);
  }
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(analysis, gateResults) {
  try {
    const color = gateResults.passed ? 'good' : 'danger';
    const status = gateResults.passed ? 'SUCCESS' : 'FAILURE';
    
    const payload = {
      attachments: [{
        color,
        title: `Contract Tests ${status}`,
        fields: [
          {
            title: 'Tests',
            value: `${analysis.tests.passed}/${analysis.tests.total} passed`,
            short: true
          },
          {
            title: 'Coverage',
            value: `${analysis.coverage.toFixed(1)}%`,
            short: true
          },
          {
            title: 'Duration',
            value: `${(analysis.duration / 1000).toFixed(2)}s`,
            short: true
          },
          {
            title: 'Warnings',
            value: analysis.tests.warnings.toString(),
            short: true
          }
        ],
        footer: 'Q Ecosystem Contract Tests',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    if (!gateResults.passed) {
      payload.attachments[0].fields.push({
        title: 'Failures',
        value: gateResults.failures.join('\n'),
        short: false
      });
    }

    const response = await fetch(CONFIG.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('   ✅ Slack notification sent');
    } else {
      console.log('   ⚠️  Failed to send Slack notification');
    }
  } catch (error) {
    console.log(`   ⚠️  Slack notification error: ${error.message}`);
  }
}

/**
 * Update pull request with results
 */
async function updatePullRequest(analysis, gateResults) {
  try {
    const comment = `## Contract Test Results ${getStatusIcon(analysis.status)}

**Status**: ${analysis.status}  
**Tests**: ${analysis.tests.passed}/${analysis.tests.total} passed  
**Coverage**: ${analysis.coverage.toFixed(1)}%  
**Duration**: ${(analysis.duration / 1000).toFixed(2)}s  

### Quality Gates
${gateResults.passed ? '✅ All quality gates passed' : '❌ Quality gates failed'}

${gateResults.failures.length > 0 ? `
**Failures:**
${gateResults.failures.map(f => `- ❌ ${f}`).join('\n')}
` : ''}

### Module Results
${analysis.modules.slice(0, 10).map(module => 
  `- ${module.status === 'PASSED' ? '✅' : module.status === 'FAILED' ? '❌' : '⚠️'} **${module.name}**: ${module.coverage.toFixed(1)}% coverage`
).join('\n')}

${analysis.modules.length > 10 ? `\n*... and ${analysis.modules.length - 10} more modules*` : ''}

<details>
<summary>📊 View detailed reports</summary>

- [HTML Report](./test-results/contract-tests/contract-test-report.html)
- [JUnit Results](./test-results/contract-tests/contract-test-results.xml)
- [JSON Report](./test-results/contract-tests/contract-test-report.json)

</details>
`;

    // This would require GitHub API integration
    // For now, just log that we would update the PR
    console.log('   ✅ PR comment prepared (GitHub API integration needed)');
    
  } catch (error) {
    console.log(`   ⚠️  PR update error: ${error.message}`);
  }
}

/**
 * Send failure notification
 */
async function sendFailureNotification(error) {
  if (CONFIG.slackWebhook) {
    try {
      const payload = {
        attachments: [{
          color: 'danger',
          title: 'Contract Testing Pipeline Failed',
          text: error.message,
          footer: 'Q Ecosystem Contract Tests',
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      await fetch(CONFIG.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // Ignore notification errors during failure
    }
  }
}

// Run the CI pipeline
if (import.meta.url === `file://${process.argv[1]}`) {
  runContractTestsCI().catch(error => {
    console.error('Pipeline failed:', error);
    process.exit(1);
  });
}