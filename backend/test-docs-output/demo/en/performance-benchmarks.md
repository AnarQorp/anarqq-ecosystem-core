# Demo Performance Benchmarks

## Overview

Performance metrics and benchmarks for evaluating demonstration performance.

## Performance Targets

### General Metrics

| Metric | Target | Critical Limit |
|---------|--------|---------------|
| Max duration per scenario | 30s | 45s |
| Success rate | 95% | 90% |
| Setup time | 120s | 144s |
| Max memory usage | 4GB | 6GB |
| Max CPU usage | 70% | 90% |

### Metrics by Scenario

#### Identity Scenario

| Step | Target Duration | Description |
|------|----------------|-------------|
| Create sQuid | <3s | Identity generation and IPFS registration |
| Setup Qwallet | <5s | Wallet creation and integration |
| Execute transaction | <8s | Qflow processing and confirmation |
| Qerberos audit | <4s | Audit logging and CID generation |

#### Content Scenario

| Step | Target Duration | Description |
|------|----------------|-------------|
| Prepare content | <2s | File generation and validation |
| Qlock encrypt | <6s | Encryption and key management |
| Qindex index | <8s | Metadata extraction and indexing |
| IPFS store | <10s | IPFS upload and replication |

## Benchmarking Tools

### Run Benchmarks

```bash
# Complete benchmark of all scenarios
npm run demo:benchmark

# Specific scenario benchmark
npm run demo:benchmark --scenario=identity-flow --iterations=10

# Load benchmark (multiple instances)
npm run demo:benchmark --load-test --instances=5 --duration=300
```

### Performance Analysis

```javascript
// Demo performance analyzer
class DemoPerformanceAnalyzer {
  constructor() {
    this.benchmarkResults = new Map();
    this.performanceTargets = {
      maxDuration: 30000,
      successRate: 95,
      maxSetupTime: 120000
    };
  }

  async runBenchmark(scenario, iterations = 10) {
    const results = {
      scenario,
      iterations,
      executions: [],
      statistics: {},
      timestamp: new Date().toISOString()
    };

    console.log(`Running benchmark for ${scenario} (${iterations} iterations)...`);

    for (let i = 0; i < iterations; i++) {
      const execution = await this.runSingleExecution(scenario, i + 1);
      results.executions.push(execution);
      
      // Show progress
      const progress = Math.round(((i + 1) / iterations) * 100);
      console.log(`Progress: ${progress}% (${i + 1}/${iterations})`);
    }

    // Calculate statistics
    results.statistics = this.calculateStatistics(results.executions);
    
    // Evaluate against targets
    results.evaluation = this.evaluatePerformance(results.statistics);

    this.benchmarkResults.set(`${scenario}_${Date.now()}`, results);
    return results;
  }

  async runSingleExecution(scenario, iteration) {
    const startTime = Date.now();
    
    try {
      // Execute specific scenario
      let result;
      switch (scenario) {
        case 'identity-flow':
          result = await this.executeIdentityScenario();
          break;
        case 'content-flow':
          result = await this.executeContentScenario();
          break;
        case 'dao-flow':
          result = await this.executeDaoScenario();
          break;
        case 'pi-integration':
          result = await this.executePiIntegrationScenario();
          break;
        default:
          throw new Error(`Unsupported scenario: ${scenario}`);
      }

      const duration = Date.now() - startTime;
      
      return {
        iteration,
        success: result.success,
        duration,
        steps: result.steps,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        iteration,
        success: false,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  calculateStatistics(executions) {
    const successful = executions.filter(e => e.success);
    const durations = successful.map(e => e.duration);
    
    if (durations.length === 0) {
      return {
        successRate: 0,
        totalExecutions: executions.length,
        successfulExecutions: 0,
        failedExecutions: executions.length
      };
    }

    durations.sort((a, b) => a - b);
    
    return {
      successRate: (successful.length / executions.length) * 100,
      totalExecutions: executions.length,
      successfulExecutions: successful.length,
      failedExecutions: executions.length - successful.length,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        mean: durations.reduce((a, b) => a + b, 0) / durations.length,
        median: durations[Math.floor(durations.length / 2)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)]
      },
      memoryUsage: {
        avgHeapUsed: successful.reduce((sum, e) => sum + e.memoryUsage.heapUsed, 0) / successful.length,
        maxHeapUsed: Math.max(...successful.map(e => e.memoryUsage.heapUsed)),
        avgRSS: successful.reduce((sum, e) => sum + e.memoryUsage.rss, 0) / successful.length,
        maxRSS: Math.max(...successful.map(e => e.memoryUsage.rss))
      }
    };
  }

  evaluatePerformance(statistics) {
    const evaluation = {
      overall: 'pass',
      details: {},
      recommendations: []
    };

    // Evaluate success rate
    if (statistics.successRate < this.performanceTargets.successRate) {
      evaluation.overall = 'fail';
      evaluation.details.successRate = {
        status: 'fail',
        actual: statistics.successRate,
        target: this.performanceTargets.successRate,
        message: `Success rate below target: ${statistics.successRate}% < ${this.performanceTargets.successRate}%`
      };
      evaluation.recommendations.push('Investigate failure causes and improve stability');
    } else {
      evaluation.details.successRate = {
        status: 'pass',
        actual: statistics.successRate,
        target: this.performanceTargets.successRate
      };
    }

    // Evaluate duration
    if (statistics.duration && statistics.duration.p95 > this.performanceTargets.maxDuration) {
      evaluation.overall = evaluation.overall === 'fail' ? 'fail' : 'warning';
      evaluation.details.duration = {
        status: 'warning',
        actual: statistics.duration.p95,
        target: this.performanceTargets.maxDuration,
        message: `P95 duration exceeds target: ${statistics.duration.p95}ms > ${this.performanceTargets.maxDuration}ms`
      };
      evaluation.recommendations.push('Optimize performance of slow steps');
    } else if (statistics.duration) {
      evaluation.details.duration = {
        status: 'pass',
        actual: statistics.duration.p95,
        target: this.performanceTargets.maxDuration
      };
    }

    // Evaluate memory usage
    const memoryLimitMB = 4 * 1024 * 1024 * 1024; // 4GB in bytes
    if (statistics.memoryUsage && statistics.memoryUsage.maxRSS > memoryLimitMB) {
      evaluation.overall = evaluation.overall === 'fail' ? 'fail' : 'warning';
      evaluation.details.memory = {
        status: 'warning',
        actual: statistics.memoryUsage.maxRSS,
        target: memoryLimitMB,
        message: `Memory usage exceeds limit: ${Math.round(statistics.memoryUsage.maxRSS / 1024 / 1024)}MB > 4GB`
      };
      evaluation.recommendations.push('Optimize memory usage or increase resources');
    } else if (statistics.memoryUsage) {
      evaluation.details.memory = {
        status: 'pass',
        actual: statistics.memoryUsage.maxRSS,
        target: memoryLimitMB
      };
    }

    return evaluation;
  }

  generateBenchmarkReport(results) {
    const report = {
      summary: {
        scenario: results.scenario,
        iterations: results.iterations,
        timestamp: results.timestamp,
        overall: results.evaluation.overall
      },
      performance: results.statistics,
      evaluation: results.evaluation,
      recommendations: results.evaluation.recommendations,
      rawData: results.executions
    };

    // Save report
    const reportPath = `artifacts/demo/reports/benchmark-${results.scenario}-${Date.now()}.json`;
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n=== BENCHMARK REPORT ===`);
    console.log(`Scenario: ${results.scenario}`);
    console.log(`Iterations: ${results.iterations}`);
    console.log(`Success rate: ${results.statistics.successRate.toFixed(2)}%`);
    
    if (results.statistics.duration) {
      console.log(`Mean duration: ${results.statistics.duration.mean.toFixed(0)}ms`);
      console.log(`P95 duration: ${results.statistics.duration.p95.toFixed(0)}ms`);
    }
    
    console.log(`Overall evaluation: ${results.evaluation.overall.toUpperCase()}`);
    
    if (results.evaluation.recommendations.length > 0) {
      console.log(`\nRecommendations:`);
      results.evaluation.recommendations.forEach(rec => {
        console.log(`- ${rec}`);
      });
    }
    
    console.log(`\nReport saved to: ${reportPath}`);

    return report;
  }

  // Scenario execution methods (simulated)
  async executeIdentityScenario() {
    // Identity scenario simulation
    await this.sleep(Math.random() * 5000 + 10000); // 10-15s
    return {
      success: Math.random() > 0.05, // 95% success rate
      steps: {
        create_squid: { duration: Math.random() * 1000 + 2000 },
        setup_qwallet: { duration: Math.random() * 2000 + 3000 },
        execute_transaction: { duration: Math.random() * 3000 + 5000 },
        qerberos_audit: { duration: Math.random() * 1000 + 3000 }
      }
    };
  }

  async executeContentScenario() {
    await this.sleep(Math.random() * 8000 + 15000); // 15-23s
    return {
      success: Math.random() > 0.03,
      steps: {
        prepare_content: { duration: Math.random() * 500 + 1000 },
        qlock_encryption: { duration: Math.random() * 2000 + 4000 },
        qindex_indexing: { duration: Math.random() * 3000 + 6000 },
        ipfs_storage: { duration: Math.random() * 4000 + 5000 }
      }
    };
  }

  async executeDaoScenario() {
    await this.sleep(Math.random() * 10000 + 20000); // 20-30s
    return {
      success: Math.random() > 0.02,
      steps: {
        create_proposal: { duration: Math.random() * 1000 + 2000 },
        voting_process: { duration: Math.random() * 5000 + 8000 },
        qflow_execution: { duration: Math.random() * 4000 + 7000 },
        qnet_distribution: { duration: Math.random() * 2000 + 3000 }
      }
    };
  }

  async executePiIntegrationScenario() {
    await this.sleep(Math.random() * 12000 + 22000); // 22-34s
    return {
      success: Math.random() > 0.08, // Lower success rate due to external dependency
      steps: {
        pi_setup: { duration: Math.random() * 2000 + 3000 },
        wallet_integration: { duration: Math.random() * 3000 + 5000 },
        contract_deployment: { duration: Math.random() * 5000 + 8000 },
        cross_chain_transaction: { duration: Math.random() * 4000 + 7000 }
      }
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Analyzer usage
const analyzer = new DemoPerformanceAnalyzer();

// Run specific scenario benchmark
const results = await analyzer.runBenchmark('identity-flow', 10);
const report = analyzer.generateBenchmarkReport(results);
```

## Historical Metrics

### Trend Tracking

```bash
# Generate trend report
npm run demo:trend-analysis --period=30d

# Compare with baseline
npm run demo:compare-baseline --scenario=identity-flow
```

### Metrics Dashboard

```bash
# Start web dashboard
npm run demo:dashboard --port=3001

# Access at: http://localhost:3001
```

## Performance Optimization

### General Recommendations

1. **Warm-up**
   - Run warm-up before benchmarks
   - Keep services active between runs

2. **Parallelization**
   - Run independent steps in parallel
   - Use multiple QNET nodes when possible

3. **Caching**
   - Implement caching for expensive operations
   - Reuse test data when appropriate

4. **Resources**
   - Ensure sufficient resources (CPU, memory, network)
   - Monitor and adjust limits as needed

---

*Last Updated: 2025-08-31T09:42:47.582Z*  
*Generated by: DocumentationGenerator v1.0.0*
