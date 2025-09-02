/**
 * Performance Regression Service
 * Provides performance regression testing and alerting
 */

import { EventEmitter } from 'events';

export class PerformanceRegressionService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = {
      baselineWindow: options.baselineWindow || 7 * 24 * 60 * 60 * 1000, // 7 days
      comparisonWindow: options.comparisonWindow || 24 * 60 * 60 * 1000, // 24 hours
      regressionThreshold: options.regressionThreshold || 0.2, // 20% degradation
      improvementThreshold: options.improvementThreshold || 0.15, // 15% improvement
      minSampleSize: options.minSampleSize || 100,
      ...options
    };

    this.baselines = new Map();
    this.testResults = new Map();
    this.regressions = new Map();
    this.benchmarks = new Map();
  }

  /**
   * Establish performance baseline
   */
  establishBaseline(testName, metrics, metadata = {}) {
    const baseline = {
      testName,
      metrics: this.calculateStatistics(metrics),
      rawMetrics: metrics,
      establishedAt: Date.now(),
      metadata,
      sampleSize: metrics.length
    };

    this.baselines.set(testName, baseline);
    this.emit('baseline_established', baseline);
    
    return baseline;
  }

  /**
   * Run performance regression test
   */
  async runRegressionTest(testName, currentMetrics, metadata = {}) {
    const baseline = this.baselines.get(testName);
    if (!baseline) {
      throw new Error(`No baseline found for test: ${testName}`);
    }

    if (currentMetrics.length < this.config.minSampleSize) {
      throw new Error(`Insufficient sample size: ${currentMetrics.length} < ${this.config.minSampleSize}`);
    }

    const currentStats = this.calculateStatistics(currentMetrics);
    const comparison = this.comparePerformance(baseline.metrics, currentStats);
    
    const testResult = {
      testName,
      timestamp: Date.now(),
      baseline: baseline.metrics,
      current: currentStats,
      comparison,
      metadata,
      verdict: this.determineVerdict(comparison),
      recommendations: this.generateRecommendations(comparison, testName)
    };

    this.testResults.set(`${testName}_${Date.now()}`, testResult);

    // Check for regressions
    if (testResult.verdict.status === 'regression') {
      this.recordRegression(testResult);
    }

    this.emit('regression_test_completed', testResult);
    return testResult;
  }

  /**
   * Run continuous performance monitoring
   */
  startContinuousMonitoring(testName, metricsProvider, interval = 300000) { // 5 minutes
    const monitoringId = `${testName}_monitor`;
    
    const monitor = setInterval(async () => {
      try {
        const metrics = await metricsProvider();
        if (metrics && metrics.length >= this.config.minSampleSize) {
          await this.runRegressionTest(testName, metrics, {
            type: 'continuous_monitoring',
            interval
          });
        }
      } catch (error) {
        this.emit('monitoring_error', { testName, error: error.message });
      }
    }, interval);

    this.emit('monitoring_started', { testName, interval });
    return monitoringId;
  }

  /**
   * Add performance benchmark
   */
  addBenchmark(name, testFunction, options = {}) {
    const benchmark = {
      name,
      testFunction,
      options: {
        iterations: options.iterations || 100,
        warmupIterations: options.warmupIterations || 10,
        timeout: options.timeout || 30000,
        ...options
      },
      results: []
    };

    this.benchmarks.set(name, benchmark);
    return benchmark;
  }

  /**
   * Run benchmark suite
   */
  async runBenchmark(name) {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      throw new Error(`Benchmark not found: ${name}`);
    }

    const results = [];
    const { testFunction, options } = benchmark;

    // Warmup iterations
    for (let i = 0; i < options.warmupIterations; i++) {
      try {
        await Promise.race([
          testFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), options.timeout)
          )
        ]);
      } catch (error) {
        // Ignore warmup errors
      }
    }

    // Actual benchmark iterations
    for (let i = 0; i < options.iterations; i++) {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage();

      try {
        await Promise.race([
          testFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), options.timeout)
          )
        ]);

        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        results.push({
          iteration: i + 1,
          duration,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          timestamp: Date.now()
        });
      } catch (error) {
        results.push({
          iteration: i + 1,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    const benchmarkResult = {
      name,
      timestamp: Date.now(),
      results,
      statistics: this.calculateStatistics(
        results.filter(r => !r.error).map(r => r.duration)
      ),
      errorRate: results.filter(r => r.error).length / results.length,
      options
    };

    benchmark.results.push(benchmarkResult);
    this.emit('benchmark_completed', benchmarkResult);

    return benchmarkResult;
  }

  /**
   * Compare two benchmark results
   */
  compareBenchmarks(baselineName, currentName) {
    const baseline = this.benchmarks.get(baselineName);
    const current = this.benchmarks.get(currentName);

    if (!baseline || !current) {
      throw new Error('Both benchmarks must exist for comparison');
    }

    const baselineResult = baseline.results[baseline.results.length - 1];
    const currentResult = current.results[current.results.length - 1];

    if (!baselineResult || !currentResult) {
      throw new Error('Both benchmarks must have results for comparison');
    }

    return this.comparePerformance(baselineResult.statistics, currentResult.statistics);
  }

  /**
   * Get regression analysis
   */
  getRegressionAnalysis(timeRange = 7 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - timeRange;
    const recentRegressions = Array.from(this.regressions.values())
      .filter(r => r.timestamp > cutoff);

    const analysis = {
      totalRegressions: recentRegressions.length,
      criticalRegressions: recentRegressions.filter(r => r.severity === 'critical').length,
      affectedTests: [...new Set(recentRegressions.map(r => r.testName))],
      trends: this.analyzeTrends(recentRegressions),
      topIssues: this.getTopRegressionIssues(recentRegressions)
    };

    return analysis;
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(testName, timeRange = 30 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - timeRange;
    const testResults = Array.from(this.testResults.values())
      .filter(r => r.testName === testName && r.timestamp > cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (testResults.length < 2) {
      return { trend: 'insufficient_data', results: testResults };
    }

    const trends = {
      latency: this.calculateTrend(testResults.map(r => r.current.mean)),
      p95: this.calculateTrend(testResults.map(r => r.current.p95)),
      p99: this.calculateTrend(testResults.map(r => r.current.p99)),
      throughput: this.calculateTrend(testResults.map(r => 1000 / r.current.mean)) // RPS approximation
    };

    return {
      testName,
      timeRange,
      trends,
      results: testResults,
      summary: this.summarizeTrends(trends)
    };
  }

  /**
   * Helper methods
   */
  calculateStatistics(values) {
    if (!values || values.length === 0) {
      return { count: 0, mean: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0, stdDev: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
      count,
      mean,
      median: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stdDev
    };
  }

  percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  comparePerformance(baseline, current) {
    const comparison = {};
    
    for (const metric of ['mean', 'median', 'p95', 'p99', 'min', 'max']) {
      const baselineValue = baseline[metric] || 0;
      const currentValue = current[metric] || 0;
      
      if (baselineValue === 0) {
        comparison[metric] = { change: 0, percentage: 0, status: 'no_baseline' };
        continue;
      }

      const change = currentValue - baselineValue;
      const percentage = (change / baselineValue) * 100;
      
      let status = 'stable';
      if (percentage > this.config.regressionThreshold * 100) {
        status = 'regression';
      } else if (percentage < -this.config.improvementThreshold * 100) {
        status = 'improvement';
      }

      comparison[metric] = {
        baseline: baselineValue,
        current: currentValue,
        change,
        percentage,
        status
      };
    }

    return comparison;
  }

  determineVerdict(comparison) {
    const regressions = Object.values(comparison).filter(c => c.status === 'regression');
    const improvements = Object.values(comparison).filter(c => c.status === 'improvement');
    
    if (regressions.length > 0) {
      const maxRegression = Math.max(...regressions.map(r => r.percentage));
      return {
        status: 'regression',
        severity: maxRegression > 50 ? 'critical' : maxRegression > 30 ? 'high' : 'medium',
        regressionCount: regressions.length,
        maxRegression
      };
    }

    if (improvements.length > 0) {
      const maxImprovement = Math.max(...improvements.map(i => Math.abs(i.percentage)));
      return {
        status: 'improvement',
        improvementCount: improvements.length,
        maxImprovement
      };
    }

    return { status: 'stable' };
  }

  generateRecommendations(comparison, testName) {
    const recommendations = [];
    
    const regressions = Object.entries(comparison)
      .filter(([_, c]) => c.status === 'regression')
      .sort(([_, a], [__, b]) => b.percentage - a.percentage);

    for (const [metric, data] of regressions) {
      if (data.percentage > 50) {
        recommendations.push({
          priority: 'critical',
          metric,
          issue: `Severe performance regression in ${metric}`,
          impact: `${data.percentage.toFixed(1)}% slower than baseline`,
          actions: [
            'Immediately investigate recent code changes',
            'Check for resource constraints or infrastructure issues',
            'Consider rolling back recent deployments',
            'Review database query performance and indexing'
          ]
        });
      } else if (data.percentage > 20) {
        recommendations.push({
          priority: 'high',
          metric,
          issue: `Significant performance regression in ${metric}`,
          impact: `${data.percentage.toFixed(1)}% slower than baseline`,
          actions: [
            'Profile the application to identify bottlenecks',
            'Review recent changes for performance impact',
            'Optimize critical path operations',
            'Consider implementing caching strategies'
          ]
        });
      }
    }

    return recommendations;
  }

  recordRegression(testResult) {
    const regressionId = `${testResult.testName}_${testResult.timestamp}`;
    const regression = {
      id: regressionId,
      testName: testResult.testName,
      timestamp: testResult.timestamp,
      severity: testResult.verdict.severity,
      maxRegression: testResult.verdict.maxRegression,
      comparison: testResult.comparison,
      metadata: testResult.metadata
    };

    this.regressions.set(regressionId, regression);
    this.emit('regression_detected', regression);
  }

  analyzeTrends(regressions) {
    const trends = {};
    
    // Group by test name
    const byTest = regressions.reduce((acc, r) => {
      if (!acc[r.testName]) acc[r.testName] = [];
      acc[r.testName].push(r);
      return acc;
    }, {});

    for (const [testName, testRegressions] of Object.entries(byTest)) {
      const sortedRegressions = testRegressions.sort((a, b) => a.timestamp - b.timestamp);
      const regressionValues = sortedRegressions.map(r => r.maxRegression);
      
      trends[testName] = {
        count: testRegressions.length,
        trend: this.calculateTrend(regressionValues),
        severity: this.calculateAverageSeverity(testRegressions)
      };
    }

    return trends;
  }

  getTopRegressionIssues(regressions) {
    return regressions
      .sort((a, b) => b.maxRegression - a.maxRegression)
      .slice(0, 10)
      .map(r => ({
        testName: r.testName,
        maxRegression: r.maxRegression,
        severity: r.severity,
        timestamp: r.timestamp
      }));
  }

  calculateTrend(values) {
    if (values.length < 2) return 'insufficient_data';
    
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (Math.abs(slope) < 0.1) return 'stable';
    return slope > 0 ? 'degrading' : 'improving';
  }

  summarizeTrends(trends) {
    const trendValues = Object.values(trends);
    const degrading = trendValues.filter(t => t === 'degrading').length;
    const improving = trendValues.filter(t => t === 'improving').length;
    const stable = trendValues.filter(t => t === 'stable').length;

    return {
      overall: degrading > improving ? 'degrading' : improving > degrading ? 'improving' : 'stable',
      degrading,
      improving,
      stable
    };
  }

  calculateAverageSeverity(regressions) {
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const totalScore = regressions.reduce((sum, r) => sum + (severityScores[r.severity] || 1), 0);
    const avgScore = totalScore / regressions.length;
    
    if (avgScore >= 3.5) return 'critical';
    if (avgScore >= 2.5) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }
}

export default PerformanceRegressionService;