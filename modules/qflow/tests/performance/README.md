# Qflow Performance and Load Testing Suite

Comprehensive performance and load testing system for the Qflow serverless automation engine, providing detailed analysis of system performance under various load conditions, stress scenarios, and scalability requirements.

## Overview

This testing suite validates:

- **Performance Testing**: Response times, throughput, resource utilization
- **Load Testing**: Realistic user patterns, traffic spikes, sustained load
- **Stress Testing**: System behavior under extreme conditions
- **Scalability Testing**: Horizontal and vertical scaling capabilities
- **Endurance Testing**: Long-running stability and memory leak detection
- **Benchmark Testing**: Performance baselines and regression detection

## Quick Start

### Installation

```bash
cd modules/qflow/tests/performance
npm install
npm run build
```

### Running Tests

```bash
# Run all performance tests
npm test

# Run only load tests
npm run test:load

# Run only stress tests
npm run test:stress

# Run performance benchmarks
npm run test:benchmark

# Generate HTML reports
npm run test -- --format html

# Run with custom configuration
npm run test -- --config ./my-perf-config.json
```

### Command Line Interface

```bash
# Run all tests with custom parameters
./run-performance-tests.js run --users 200 --duration 600000 --output ./reports

# Run specific test types
./run-performance-tests.js load --scenario baseline_load --users 100
./run-performance-tests.js stress --memory-multiplier 3.0 --duration 300000
./run-performance-tests.js benchmark --baseline --compare ./previous-results.json

# Generate configuration templates
./run-performance-tests.js generate-config --template enterprise --output ./enterprise-config.json
```

## Configuration

### Default Configuration

Generate a default configuration file:

```bash
npm run generate-config
```

This creates `performance-config.json` with settings for:

- Performance test profiles and thresholds
- Load test scenarios and user behaviors
- Stress test parameters and multipliers
- Reporting formats and output options

### Configuration Structure

```json
{
  "performance": {
    "loadProfiles": [...],
    "performanceThresholds": {...},
    "scalabilityTargets": {...},
    "stressTestConfig": {...},
    "resourceLimits": {...},
    "monitoringConfig": {...}
  },
  "loadTesting": {
    "scenarios": [...],
    "trafficPatterns": [...],
    "userBehaviors": [...],
    "dataPatterns": [...]
  },
  "reporting": {
    "outputDir": "./performance-reports",
    "formats": ["json", "html", "csv"],
    "enableRealTimeReporting": false,
    "enableDetailedMetrics": true
  },
  "environment": {
    "testEnvironment": "local",
    "nodeConfiguration": {...},
    "networkSimulation": {...},
    "dataGeneration": {...}
  }
}
```

## Test Types

### 1. Performance Testing

**Load Profiles:**
- **Baseline**: Standard performance validation
- **Peak**: Maximum expected load testing
- **Burst**: Short-term traffic spikes
- **Sustained**: Long-term steady load

**Metrics Collected:**
- Response time (P50, P95, P99, Max)
- Throughput (requests per second)
- Error rates and types
- Resource utilization (CPU, Memory, Network, Disk)
- Concurrent user capacity

**Thresholds:**
```json
{
  "maxResponseTime": 2000,
  "maxP95ResponseTime": 5000,
  "maxP99ResponseTime": 10000,
  "minThroughput": 100,
  "maxErrorRate": 5,
  "maxMemoryUsage": 2048,
  "maxCpuUsage": 80
}
```

### 2. Load Testing

**Scenario Types:**
- **Baseline**: Normal operating conditions
- **Peak**: Maximum expected traffic
- **Spike**: Sudden traffic increases
- **Endurance**: Extended duration testing
- **Volume**: Large data processing

**User Behavior Simulation:**
- Realistic user patterns and think times
- Session duration modeling
- Flow sequence probabilities
- Error handling and retry logic

**Traffic Patterns:**
- **Steady**: Constant load
- **Burst**: Periodic traffic spikes
- **Wave**: Sinusoidal traffic patterns
- **Random**: Unpredictable variations
- **Seasonal**: Time-based patterns

### 3. Stress Testing

**Stress Types:**
- **Memory Stress**: Excessive memory allocation
- **CPU Stress**: High computational load
- **Network Stress**: Bandwidth saturation
- **Disk Stress**: I/O intensive operations
- **Concurrency Stress**: Maximum concurrent operations

**Stress Multipliers:**
```json
{
  "memoryStressMultiplier": 2.0,
  "cpuStressMultiplier": 2.0,
  "networkStressMultiplier": 1.5,
  "diskStressMultiplier": 1.5,
  "chaosEngineeringEnabled": true,
  "failureInjectionRate": 10
}
```

### 4. Scalability Testing

**Scaling Dimensions:**
- **Horizontal**: Adding more nodes
- **Vertical**: Increasing node resources
- **Data Volume**: Processing larger datasets
- **Throughput**: Higher request rates

**Scalability Metrics:**
- Linear scaling efficiency
- Resource utilization balance
- Scaling latency and accuracy
- Cost efficiency per unit

### 5. Benchmark Testing

**Benchmark Types:**
- **Baseline Establishment**: Initial performance reference
- **Regression Detection**: Performance degradation alerts
- **Comparison Analysis**: Before/after comparisons
- **Trend Analysis**: Performance over time

**Comparison Thresholds:**
- Response time regression: ±10%
- Throughput regression: ±15%
- Resource utilization: ±20%
- Error rate increase: 0% tolerance

## Test Execution Phases

### Load Test Phases

1. **Ramp-Up Phase**
   - Gradual user increase
   - System warm-up period
   - Resource allocation stabilization

2. **Steady-State Phase**
   - Sustained load execution
   - Performance measurement
   - Stability validation

3. **Ramp-Down Phase**
   - Gradual load reduction
   - Resource cleanup
   - Final measurements

### User Simulation

**Session Modeling:**
```json
{
  "sessionDuration": {
    "type": "normal",
    "min": 60000,
    "max": 300000,
    "mean": 120000
  },
  "thinkTime": {
    "type": "normal",
    "min": 1000,
    "max": 5000,
    "mean": 2000,
    "stddev": 500
  }
}
```

**Flow Sequences:**
- Probabilistic flow selection
- Dependency management
- Parameter variation
- Error simulation

## Reporting and Analysis

### Report Formats

- **JSON**: Structured data for programmatic analysis
- **HTML**: Interactive web-based reports with charts
- **CSV**: Tabular data for spreadsheet analysis
- **XML**: JUnit-compatible format for CI/CD

### Performance Metrics

**Response Time Analysis:**
- Distribution histograms
- Percentile calculations
- Trend analysis over time
- Outlier detection

**Throughput Analysis:**
- Requests per second trends
- Peak capacity identification
- Sustained throughput measurement
- Scalability correlation

**Resource Utilization:**
- CPU, memory, network, disk usage
- Resource efficiency calculations
- Bottleneck identification
- Scaling recommendations

### Bottleneck Detection

**Automated Analysis:**
- CPU bottlenecks (>90% utilization)
- Memory bottlenecks (>95% utilization)
- Network bottlenecks (bandwidth saturation)
- Disk I/O bottlenecks (high latency)
- External dependency bottlenecks

**Impact Assessment:**
- Performance degradation percentage
- Affected user percentage
- Duration and frequency
- Mitigation recommendations

### Recommendations Engine

**Performance Optimization:**
- Slow operation identification
- Caching opportunities
- Query optimization suggestions
- Async processing recommendations

**Scalability Improvements:**
- Resource scaling suggestions
- Load balancing optimizations
- Auto-scaling configuration
- Capacity planning guidance

**Reliability Enhancements:**
- Error handling improvements
- Timeout optimization
- Retry logic tuning
- Circuit breaker configuration

## Sample Reports

### Performance Summary

```
🧪 QFLOW PERFORMANCE TEST RESULTS
=====================================

📊 SUMMARY:
   Total Tests: 15
   ✅ Passed: 12
   ❌ Failed: 2
   ⚠️  Warnings: 1
   📈 Success Rate: 80.0%
   ⏱️  Total Duration: 25.3 minutes

📈 PERFORMANCE METRICS:
   Average Response Time: 1,245ms
   P95 Response Time: 3,120ms
   P99 Response Time: 6,890ms
   Average Throughput: 156 RPS
   Peak Throughput: 234 RPS
   Error Rate: 2.3%

💻 RESOURCE UTILIZATION:
   Peak CPU: 78%
   Peak Memory: 85%
   Peak Network: 45%
   Peak Disk I/O: 32%

🔍 BOTTLENECKS IDENTIFIED:
   • Memory pressure during peak load (Impact: 15%)
   • Database connection pool exhaustion (Impact: 8%)

💡 RECOMMENDATIONS:
   • Increase memory allocation by 25%
   • Optimize database connection pooling
   • Implement response caching for frequent queries
   • Consider horizontal scaling for peak loads
```

### Load Test Results

```
📈 LOAD TEST SCENARIO: Peak Load
================================

👥 USER SIMULATION:
   Peak Users: 500
   Ramp-up: 2 minutes
   Sustain: 10 minutes
   Ramp-down: 2 minutes

📊 PHASE RESULTS:
   Ramp-up: ✅ Stable (Response: 890ms, Errors: 1.2%)
   Steady-state: ⚠️  Degraded (Response: 2,340ms, Errors: 4.1%)
   Ramp-down: ✅ Stable (Response: 650ms, Errors: 0.8%)

🎯 SUCCESS CRITERIA:
   ✅ Throughput ≥ 200 RPS (Actual: 245 RPS)
   ❌ P95 Response ≤ 2000ms (Actual: 3,120ms)
   ❌ Error Rate ≤ 3% (Actual: 4.1%)

🔧 RECOMMENDATIONS:
   • Optimize slow database queries
   • Implement connection pooling
   • Add horizontal scaling triggers
   • Review error handling logic
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Performance Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:performance -- --format json,html
      - uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: ./performance-reports/
      - name: Check Performance Regression
        run: |
          if [ -f baseline-results.json ]; then
            npm run test:benchmark -- --compare baseline-results.json --threshold 15
          fi
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    triggers {
        cron('H 2 * * *')  // Daily at 2 AM
    }
    stages {
        stage('Performance Tests') {
            steps {
                sh 'npm ci'
                sh 'npm run test:performance -- --format xml,json'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'performance-reports/*.xml'
                    archiveArtifacts artifacts: 'performance-reports/**/*'
                }
            }
        }
        stage('Performance Analysis') {
            steps {
                script {
                    def report = readJSON file: 'performance-reports/performance-results.json'
                    if (report.summary.failed > 0) {
                        currentBuild.result = 'UNSTABLE'
                        slackSend color: 'warning', 
                                 message: "Performance tests failed: ${report.summary.failed} failures"
                    }
                }
            }
        }
    }
}
```

## Configuration Templates

### Basic Template

```json
{
  "performance": {
    "loadProfiles": [
      {
        "name": "baseline",
        "concurrentUsers": 50,
        "duration": 300000,
        "rampUpTime": 60000
      }
    ],
    "performanceThresholds": {
      "maxResponseTime": 2000,
      "minThroughput": 25,
      "maxErrorRate": 5
    }
  }
}
```

### Advanced Template

```json
{
  "performance": {
    "loadProfiles": [
      {
        "name": "baseline",
        "concurrentUsers": 100,
        "duration": 600000
      },
      {
        "name": "peak_load",
        "concurrentUsers": 500,
        "duration": 1200000
      }
    ],
    "stressTestConfig": {
      "enableStressTesting": true,
      "memoryStressMultiplier": 2.0,
      "chaosEngineeringEnabled": true
    }
  }
}
```

### Enterprise Template

```json
{
  "performance": {
    "loadProfiles": [
      {
        "name": "enterprise_baseline",
        "concurrentUsers": 1000,
        "duration": 1800000
      },
      {
        "name": "enterprise_peak",
        "concurrentUsers": 5000,
        "duration": 3600000
      }
    ],
    "scalabilityTargets": {
      "maxConcurrentFlows": 50000,
      "maxNodesSupported": 100,
      "maxThroughputRps": 10000
    }
  },
  "environment": {
    "nodeConfiguration": {
      "nodeCount": 20,
      "distribution": "multi_region"
    }
  }
}
```

## Best Practices

### Test Design

1. **Realistic Load Patterns**: Model actual user behavior
2. **Gradual Ramp-up**: Avoid sudden load spikes
3. **Sufficient Duration**: Allow system stabilization
4. **Multiple Scenarios**: Test various load conditions
5. **Resource Monitoring**: Track all system resources

### Performance Thresholds

1. **Business Requirements**: Align with SLA requirements
2. **User Experience**: Consider acceptable response times
3. **Scalability Targets**: Plan for growth
4. **Resource Limits**: Respect infrastructure constraints
5. **Error Tolerance**: Define acceptable failure rates

### Test Environment

1. **Production-like**: Mirror production configuration
2. **Isolated**: Avoid interference from other systems
3. **Monitored**: Comprehensive metrics collection
4. **Repeatable**: Consistent test conditions
5. **Documented**: Clear test procedures and expectations

### Result Analysis

1. **Trend Analysis**: Compare results over time
2. **Bottleneck Identification**: Focus on limiting factors
3. **Root Cause Analysis**: Investigate performance issues
4. **Actionable Recommendations**: Provide specific improvements
5. **Regression Detection**: Monitor for performance degradation

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout values or reduce load
2. **Memory Issues**: Adjust heap size or reduce concurrency
3. **Network Errors**: Check connectivity and bandwidth
4. **Resource Exhaustion**: Monitor and increase limits
5. **Inconsistent Results**: Ensure stable test environment

### Debug Mode

```bash
# Run with verbose logging
npm run test -- --verbose

# Enable detailed metrics
npm run test -- --config debug-config.json

# Generate debug reports
npm run test -- --format json --output ./debug-reports
```

### Performance Tuning

1. **JVM Tuning**: Optimize garbage collection and heap size
2. **Connection Pooling**: Configure optimal pool sizes
3. **Caching**: Implement appropriate caching strategies
4. **Database Optimization**: Tune queries and indexes
5. **Load Balancing**: Distribute load effectively

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add performance tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Test Guidelines

- Write descriptive test names
- Include comprehensive assertions
- Add proper error handling and cleanup
- Document test purpose and expectations
- Follow existing code patterns

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: [Qflow Performance Docs](https://docs.qflow.dev/performance)
- **Issues**: [GitHub Issues](https://github.com/qflow/qflow-serverless-automation/issues)
- **Discussions**: [GitHub Discussions](https://github.com/qflow/qflow-serverless-automation/discussions)
- **Community**: [Discord Server](https://discord.gg/qflow)