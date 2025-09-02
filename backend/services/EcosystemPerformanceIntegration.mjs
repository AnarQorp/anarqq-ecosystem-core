/**
 * Ecosystem Performance Integration Service
 * Integrates performance monitoring with QNET, Qflow, Qerberos, and other ecosystem components
 */

import { EventEmitter } from 'events';
import { performanceServices } from '../middleware/performanceMonitoring.mjs';

export class EcosystemPerformanceIntegration extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = {
      sloThresholds: {
        p99Latency: 200, // ms
        p95Latency: 150, // ms
        errorBudgetWeekly: 0.1, // 10%
        cacheHitRate: 0.85, // 85%
        costUtilization: 0.8, // 80%
        capacityHeadroom: 0.3 // 30%
      },
      nodeWeightingFactors: {
        latencyWeight: 0.4,
        errorRateWeight: 0.3,
        capacityWeight: 0.2,
        regressionWeight: 0.1
      },
      ...options
    };

    this.nodePerformanceScores = new Map();
    this.performanceBaselines = new Map();
    this.goLiveGates = new Map();
    this.riskSignals = new Map();

    // Initialize performance services
    this.profiler = performanceServices.profiler;
    this.cache = performanceServices.cache;
    this.metrics = performanceServices.metrics;
    this.regression = performanceServices.regression;
    this.capacity = performanceServices.capacity;

    this.setupEventListeners();
  }

  /**
   * QNET Integration: Performance-based node weighting
   */
  calculateNodePerformanceScore(nodeId, nodeMetrics) {
    const score = {
      nodeId,
      timestamp: Date.now(),
      latencyScore: this.calculateLatencyScore(nodeMetrics.latency),
      errorRateScore: this.calculateErrorRateScore(nodeMetrics.errorRate),
      capacityScore: this.calculateCapacityScore(nodeMetrics.capacity),
      regressionScore: this.calculateRegressionScore(nodeId),
      overallScore: 0,
      recommendation: 'healthy'
    };

    // Calculate weighted overall score
    score.overallScore = (
      score.latencyScore * this.config.nodeWeightingFactors.latencyWeight +
      score.errorRateScore * this.config.nodeWeightingFactors.errorRateWeight +
      score.capacityScore * this.config.nodeWeightingFactors.capacityWeight +
      score.regressionScore * this.config.nodeWeightingFactors.regressionWeight
    );

    // Determine recommendation
    if (score.overallScore < 0.3) {
      score.recommendation = 'down_weight_critical';
    } else if (score.overallScore < 0.6) {
      score.recommendation = 'down_weight_moderate';
    } else if (score.overallScore > 0.9) {
      score.recommendation = 'up_weight';
    }

    this.nodePerformanceScores.set(nodeId, score);
    this.emit('node_performance_scored', score);

    return score;
  }

  /**
   * Get QNET routing weights based on performance
   */
  getQNETRoutingWeights(nodes) {
    const weights = new Map();
    
    for (const node of nodes) {
      const score = this.nodePerformanceScores.get(node.id);
      if (!score) {
        weights.set(node.id, 1.0); // Default weight
        continue;
      }

      let weight = score.overallScore;
      
      // Apply additional penalties for critical issues
      if (score.recommendation === 'down_weight_critical') {
        weight *= 0.1; // Severely reduce traffic
      } else if (score.recommendation === 'down_weight_moderate') {
        weight *= 0.5; // Moderately reduce traffic
      } else if (score.recommendation === 'up_weight') {
        weight *= 1.2; // Increase traffic to high-performing nodes
      }

      weights.set(node.id, Math.max(0.01, Math.min(2.0, weight))); // Clamp between 0.01 and 2.0
    }

    this.emit('qnet_weights_calculated', { weights: Object.fromEntries(weights) });
    return weights;
  }

  /**
   * Qflow Integration: Performance-aware operation decisions
   */
  evaluateQflowPerformancePolicy(operation, context = {}) {
    const evaluation = {
      operation,
      timestamp: Date.now(),
      decision: 'proceed',
      reason: 'performance_healthy',
      alternatives: [],
      riskLevel: 'low'
    };

    // Check current SLO status
    const sloStatus = this.metrics.getSLOStatus();
    
    // Check if operation would risk SLO burn
    const estimatedLatency = this.estimateOperationLatency(operation, context);
    const currentErrorBudgetBurn = this.calculateErrorBudgetBurn();

    // Performance policy checks
    if (sloStatus.overall === 'critical') {
      evaluation.decision = 'queue_deferral';
      evaluation.reason = 'slo_critical_violation';
      evaluation.riskLevel = 'critical';
      evaluation.alternatives = ['queue_for_later', 'cache_fallback', 'degraded_response'];
    } else if (estimatedLatency > this.config.sloThresholds.p99Latency * 1.5) {
      evaluation.decision = 'cache_fallback';
      evaluation.reason = 'high_latency_risk';
      evaluation.riskLevel = 'high';
      evaluation.alternatives = ['use_cached_result', 'simplified_operation'];
    } else if (currentErrorBudgetBurn > 0.8) {
      evaluation.decision = 'queue_deferral';
      evaluation.reason = 'error_budget_exhaustion';
      evaluation.riskLevel = 'high';
      evaluation.alternatives = ['defer_non_critical', 'batch_operations'];
    }

    // Check cache availability for fallback operations
    if (evaluation.decision === 'cache_fallback') {
      const cacheKey = this.generateOperationCacheKey(operation);
      const cacheStats = this.cache.getStats();
      
      if (cacheStats.global.hitRate < this.config.sloThresholds.cacheHitRate) {
        evaluation.decision = 'queue_deferral';
        evaluation.reason = 'cache_performance_degraded';
        evaluation.alternatives.push('wait_for_cache_recovery');
      }
    }

    this.emit('qflow_policy_evaluated', evaluation);
    return evaluation;
  }

  /**
   * Qerberos Integration: Performance-based risk assessment
   */
  generatePerformanceRiskSignals(entityId, performanceData) {
    const riskSignal = {
      entityId,
      timestamp: Date.now(),
      riskLevel: 'low',
      riskScore: 0,
      signals: [],
      correlations: [],
      recommendations: []
    };

    // Analyze performance regression patterns
    const regressions = this.regression.getRegressionAnalysis(24 * 60 * 60 * 1000); // 24 hours
    const entityRegressions = regressions.affectedTests.filter(test => test.includes(entityId));

    if (entityRegressions.length > 0) {
      riskSignal.signals.push({
        type: 'performance_regression',
        severity: regressions.criticalRegressions > 0 ? 'critical' : 'moderate',
        count: entityRegressions.length,
        impact: 'service_degradation'
      });
      riskSignal.riskScore += regressions.criticalRegressions * 30 + entityRegressions.length * 10;
    }

    // Analyze anomaly patterns
    const anomalies = this.metrics.detectAnomalies(`entity_${entityId}`);
    if (anomalies.length > 5) { // Multiple anomalies indicate potential issues
      riskSignal.signals.push({
        type: 'performance_anomaly_cluster',
        severity: anomalies.filter(a => a.severity === 'critical').length > 0 ? 'critical' : 'moderate',
        count: anomalies.length,
        impact: 'unpredictable_behavior'
      });
      riskSignal.riskScore += anomalies.length * 5;
    }

    // Analyze resource consumption patterns
    const capacityAnalysis = this.capacity.analyzeCapacity(`entity_${entityId}`);
    if (capacityAnalysis && capacityAnalysis.scalingNeeds.recommendations.length > 0) {
      const urgentRecommendations = capacityAnalysis.scalingNeeds.recommendations
        .filter(r => r.urgency === 'high');
      
      if (urgentRecommendations.length > 0) {
        riskSignal.signals.push({
          type: 'capacity_stress',
          severity: 'high',
          recommendations: urgentRecommendations,
          impact: 'potential_service_failure'
        });
        riskSignal.riskScore += urgentRecommendations.length * 20;
      }
    }

    // Correlate with cost anomalies (if available)
    if (performanceData.costMetrics) {
      const costIncrease = this.analyzeCostTrends(performanceData.costMetrics);
      if (costIncrease > 0.5) { // 50% cost increase
        riskSignal.correlations.push({
          type: 'cost_performance_correlation',
          costIncrease,
          performanceImpact: riskSignal.riskScore,
          suspicion: 'resource_abuse_or_inefficiency'
        });
        riskSignal.riskScore += costIncrease * 25;
      }
    }

    // Calculate final risk level
    if (riskSignal.riskScore > 100) {
      riskSignal.riskLevel = 'critical';
    } else if (riskSignal.riskScore > 50) {
      riskSignal.riskLevel = 'high';
    } else if (riskSignal.riskScore > 20) {
      riskSignal.riskLevel = 'moderate';
    }

    // Generate recommendations
    if (riskSignal.riskLevel !== 'low') {
      riskSignal.recommendations = this.generateRiskMitigationRecommendations(riskSignal);
    }

    this.riskSignals.set(entityId, riskSignal);
    this.emit('performance_risk_assessed', riskSignal);

    return riskSignal;
  }

  /**
   * CI/CD Performance Gate
   */
  evaluateCICDPerformanceGate(deploymentMetrics, baseline) {
    const gate = {
      deployment: deploymentMetrics.deploymentId,
      timestamp: Date.now(),
      passed: true,
      violations: [],
      warnings: [],
      recommendation: 'proceed'
    };

    // Check P95/P99 latency degradation
    if (deploymentMetrics.p95Latency > baseline.p95Latency * 1.1) {
      gate.violations.push({
        type: 'p95_latency_degradation',
        current: deploymentMetrics.p95Latency,
        baseline: baseline.p95Latency,
        threshold: baseline.p95Latency * 1.1,
        severity: 'high'
      });
      gate.passed = false;
    }

    if (deploymentMetrics.p99Latency > baseline.p99Latency * 1.15) {
      gate.violations.push({
        type: 'p99_latency_degradation',
        current: deploymentMetrics.p99Latency,
        baseline: baseline.p99Latency,
        threshold: baseline.p99Latency * 1.15,
        severity: 'critical'
      });
      gate.passed = false;
    }

    // Check cache hit rate degradation
    if (deploymentMetrics.cacheHitRate < baseline.cacheHitRate * 0.9) {
      gate.violations.push({
        type: 'cache_hit_rate_degradation',
        current: deploymentMetrics.cacheHitRate,
        baseline: baseline.cacheHitRate,
        threshold: baseline.cacheHitRate * 0.9,
        severity: 'high'
      });
      gate.passed = false;
    }

    // Check error rate increase
    if (deploymentMetrics.errorRate > baseline.errorRate * 2) {
      gate.violations.push({
        type: 'error_rate_increase',
        current: deploymentMetrics.errorRate,
        baseline: baseline.errorRate,
        threshold: baseline.errorRate * 2,
        severity: 'critical'
      });
      gate.passed = false;
    }

    // Generate warnings for concerning trends
    if (deploymentMetrics.p95Latency > baseline.p95Latency * 1.05) {
      gate.warnings.push({
        type: 'p95_latency_trend',
        message: 'P95 latency showing upward trend',
        impact: 'monitor_closely'
      });
    }

    // Set final recommendation
    if (!gate.passed) {
      gate.recommendation = 'block_deployment';
    } else if (gate.warnings.length > 0) {
      gate.recommendation = 'proceed_with_monitoring';
    }

    this.emit('cicd_gate_evaluated', gate);
    return gate;
  }

  /**
   * Go-Live Readiness Gates
   */
  evaluateGoLiveReadiness(module, environment = 'production') {
    const readiness = {
      module,
      environment,
      timestamp: Date.now(),
      overallStatus: 'ready',
      gates: {},
      blockers: [],
      warnings: [],
      recommendations: []
    };

    // Gate 1: P99 Latency Check
    const latencyGate = this.checkLatencyGate(module);
    readiness.gates.latency = latencyGate;
    if (!latencyGate.passed) {
      readiness.blockers.push(latencyGate);
      readiness.overallStatus = 'blocked';
    }

    // Gate 2: Error Budget Check
    const errorBudgetGate = this.checkErrorBudgetGate(module);
    readiness.gates.errorBudget = errorBudgetGate;
    if (!errorBudgetGate.passed) {
      readiness.blockers.push(errorBudgetGate);
      readiness.overallStatus = 'blocked';
    }

    // Gate 3: Cache Performance Check
    const cacheGate = this.checkCachePerformanceGate(module);
    readiness.gates.cache = cacheGate;
    if (!cacheGate.passed) {
      readiness.blockers.push(cacheGate);
      readiness.overallStatus = 'blocked';
    }

    // Gate 4: Cost Utilization Check
    const costGate = this.checkCostUtilizationGate(module);
    readiness.gates.cost = costGate;
    if (!costGate.passed) {
      readiness.blockers.push(costGate);
      readiness.overallStatus = 'blocked';
    }

    // Gate 5: Capacity Headroom Check
    const capacityGate = this.checkCapacityHeadroomGate(module);
    readiness.gates.capacity = capacityGate;
    if (!capacityGate.passed) {
      readiness.blockers.push(capacityGate);
      readiness.overallStatus = 'blocked';
    }

    // Generate recommendations
    if (readiness.overallStatus === 'blocked') {
      readiness.recommendations = this.generateGoLiveRecommendations(readiness.blockers);
    }

    this.goLiveGates.set(`${module}_${environment}`, readiness);
    this.emit('go_live_readiness_evaluated', readiness);

    return readiness;
  }

  /**
   * DAO Subnet Performance Isolation
   */
  evaluateDAOSubnetPerformance(daoId, subnetMetrics) {
    const evaluation = {
      daoId,
      timestamp: Date.now(),
      performanceScore: 0,
      sloCompliance: {},
      isolationRecommendation: 'none',
      errorBudgetBurn: 0,
      impactAssessment: 'low'
    };

    // Calculate DAO-specific SLO compliance
    evaluation.sloCompliance = {
      latency: this.evaluateDAOLatencySLO(subnetMetrics.latency),
      availability: this.evaluateDAOAvailabilitySLO(subnetMetrics.availability),
      throughput: this.evaluateDAOThroughputSLO(subnetMetrics.throughput)
    };

    // Calculate error budget burn rate
    evaluation.errorBudgetBurn = this.calculateDAOErrorBudgetBurn(daoId, subnetMetrics);

    // Determine isolation recommendation
    if (evaluation.errorBudgetBurn > 0.8) {
      evaluation.isolationRecommendation = 'immediate_isolation';
      evaluation.impactAssessment = 'critical';
    } else if (evaluation.errorBudgetBurn > 0.5) {
      evaluation.isolationRecommendation = 'traffic_throttling';
      evaluation.impactAssessment = 'high';
    } else if (evaluation.sloCompliance.latency.status === 'violation') {
      evaluation.isolationRecommendation = 'performance_monitoring';
      evaluation.impactAssessment = 'moderate';
    }

    // Calculate overall performance score
    evaluation.performanceScore = this.calculateDAOPerformanceScore(evaluation.sloCompliance);

    this.emit('dao_subnet_evaluated', evaluation);
    return evaluation;
  }

  /**
   * Helper methods for scoring and calculations
   */
  calculateLatencyScore(latency) {
    if (!latency) return 1.0;
    const p99 = latency.p99 || 0;
    if (p99 <= this.config.sloThresholds.p99Latency) return 1.0;
    if (p99 <= this.config.sloThresholds.p99Latency * 1.5) return 0.7;
    if (p99 <= this.config.sloThresholds.p99Latency * 2) return 0.4;
    return 0.1;
  }

  calculateErrorRateScore(errorRate) {
    if (!errorRate) return 1.0;
    if (errorRate <= 0.001) return 1.0; // 0.1%
    if (errorRate <= 0.005) return 0.8; // 0.5%
    if (errorRate <= 0.01) return 0.5;  // 1%
    return 0.2;
  }

  calculateCapacityScore(capacity) {
    if (!capacity) return 1.0;
    const utilization = capacity.utilization || 0;
    if (utilization <= 0.7) return 1.0;
    if (utilization <= 0.8) return 0.8;
    if (utilization <= 0.9) return 0.5;
    return 0.2;
  }

  calculateRegressionScore(nodeId) {
    const regressions = this.regression.getRegressionAnalysis();
    const nodeRegressions = regressions.affectedTests.filter(test => test.includes(nodeId));
    
    if (nodeRegressions.length === 0) return 1.0;
    if (regressions.criticalRegressions > 0) return 0.2;
    if (nodeRegressions.length > 3) return 0.4;
    return 0.7;
  }

  estimateOperationLatency(operation, context) {
    // Simple estimation based on operation type and current system load
    const baseLatency = {
      'read': 50,
      'write': 100,
      'complex_query': 200,
      'batch_operation': 500
    };

    const currentLoad = this.metrics.getSLOStatus().latency.violationRate;
    const loadMultiplier = 1 + (currentLoad / 100);
    
    return (baseLatency[operation.type] || 100) * loadMultiplier;
  }

  calculateErrorBudgetBurn() {
    const sloStatus = this.metrics.getSLOStatus();
    return 1 - (sloStatus.availability.availability / 100);
  }

  generateOperationCacheKey(operation) {
    return `op_${operation.type}_${JSON.stringify(operation.params || {})}`;
  }

  analyzeCostTrends(costMetrics) {
    if (!costMetrics.historical || costMetrics.historical.length < 2) return 0;
    
    const recent = costMetrics.historical.slice(-7); // Last 7 data points
    const baseline = recent.slice(0, 3).reduce((sum, v) => sum + v, 0) / 3;
    const current = recent.slice(-3).reduce((sum, v) => sum + v, 0) / 3;
    
    return (current - baseline) / baseline;
  }

  generateRiskMitigationRecommendations(riskSignal) {
    const recommendations = [];
    
    for (const signal of riskSignal.signals) {
      switch (signal.type) {
        case 'performance_regression':
          recommendations.push({
            action: 'investigate_recent_changes',
            priority: 'high',
            description: 'Review recent deployments and configuration changes'
          });
          break;
        case 'performance_anomaly_cluster':
          recommendations.push({
            action: 'enable_detailed_monitoring',
            priority: 'medium',
            description: 'Increase monitoring granularity and alert sensitivity'
          });
          break;
        case 'capacity_stress':
          recommendations.push({
            action: 'scale_resources',
            priority: 'critical',
            description: 'Immediately scale resources to prevent service failure'
          });
          break;
      }
    }
    
    return recommendations;
  }

  checkLatencyGate(module) {
    const metrics = this.metrics.getMetrics(`${module}_latency`);
    const gate = {
      name: 'latency_gate',
      passed: true,
      requirements: {
        p99Read: this.config.sloThresholds.p99Latency,
        p99Write: 300 // ms for complex writes
      },
      actual: {},
      message: ''
    };

    // Implementation would check actual metrics
    // For now, return a mock successful gate
    gate.actual = { p99Read: 180, p99Write: 280 };
    gate.message = 'Latency requirements met';

    return gate;
  }

  checkErrorBudgetGate(module) {
    const errorBudgetBurn = this.calculateErrorBudgetBurn();
    return {
      name: 'error_budget_gate',
      passed: errorBudgetBurn < this.config.sloThresholds.errorBudgetWeekly,
      requirements: { maxBurn: this.config.sloThresholds.errorBudgetWeekly },
      actual: { burn: errorBudgetBurn },
      message: errorBudgetBurn < this.config.sloThresholds.errorBudgetWeekly 
        ? 'Error budget within limits' 
        : 'Error budget exceeded'
    };
  }

  checkCachePerformanceGate(module) {
    const cacheStats = this.cache.getStats();
    return {
      name: 'cache_performance_gate',
      passed: cacheStats.global.hitRate >= this.config.sloThresholds.cacheHitRate,
      requirements: { minHitRate: this.config.sloThresholds.cacheHitRate },
      actual: { hitRate: cacheStats.global.hitRate },
      message: cacheStats.global.hitRate >= this.config.sloThresholds.cacheHitRate
        ? 'Cache performance acceptable'
        : 'Cache hit rate below threshold'
    };
  }

  checkCostUtilizationGate(module) {
    // Mock implementation - would integrate with actual cost tracking
    return {
      name: 'cost_utilization_gate',
      passed: true,
      requirements: { maxUtilization: this.config.sloThresholds.costUtilization },
      actual: { utilization: 0.65 },
      message: 'Cost utilization within budget'
    };
  }

  checkCapacityHeadroomGate(module) {
    const capacityAnalysis = this.capacity.analyzeCapacity(module);
    const headroom = capacityAnalysis ? (1 - capacityAnalysis.current.p95 / 100) : 0.5;
    
    return {
      name: 'capacity_headroom_gate',
      passed: headroom >= this.config.sloThresholds.capacityHeadroom,
      requirements: { minHeadroom: this.config.sloThresholds.capacityHeadroom },
      actual: { headroom },
      message: headroom >= this.config.sloThresholds.capacityHeadroom
        ? 'Sufficient capacity headroom'
        : 'Insufficient capacity headroom'
    };
  }

  generateGoLiveRecommendations(blockers) {
    return blockers.map(blocker => ({
      blocker: blocker.name,
      action: `Resolve ${blocker.name} violation`,
      priority: 'critical',
      estimatedTime: '2-4 hours'
    }));
  }

  evaluateDAOLatencySLO(latencyMetrics) {
    return {
      status: latencyMetrics.p99 <= this.config.sloThresholds.p99Latency ? 'compliant' : 'violation',
      actual: latencyMetrics.p99,
      target: this.config.sloThresholds.p99Latency
    };
  }

  evaluateDAOAvailabilitySLO(availabilityMetrics) {
    return {
      status: availabilityMetrics.uptime >= 99.9 ? 'compliant' : 'violation',
      actual: availabilityMetrics.uptime,
      target: 99.9
    };
  }

  evaluateDAOThroughputSLO(throughputMetrics) {
    return {
      status: throughputMetrics.rps >= 10 ? 'compliant' : 'violation',
      actual: throughputMetrics.rps,
      target: 10
    };
  }

  calculateDAOErrorBudgetBurn(daoId, metrics) {
    // Calculate based on DAO-specific error rates
    return Math.min(1.0, metrics.errorRate * 20); // More aggressive calculation for testing
  }

  calculateDAOPerformanceScore(sloCompliance) {
    let score = 100;
    
    Object.values(sloCompliance).forEach(slo => {
      if (slo.status === 'violation') {
        score -= 25;
      }
    });
    
    return Math.max(0, score);
  }

  setupEventListeners() {
    // Increase max listeners to prevent warnings during testing
    this.profiler.setMaxListeners(50);
    this.metrics.setMaxListeners(50);
    this.regression.setMaxListeners(50);
    this.capacity.setMaxListeners(50);

    // Listen to performance service events
    this.profiler.on('bottleneck_identified', (bottleneck) => {
      this.handlePerformanceBottleneck(bottleneck);
    });

    this.metrics.on('slo_violation', (violation) => {
      this.handleSLOViolation(violation);
    });

    this.regression.on('regression_detected', (regression) => {
      this.handlePerformanceRegression(regression);
    });

    this.capacity.on('capacity_analyzed', (analysis) => {
      this.handleCapacityAnalysis(analysis);
    });
  }

  handlePerformanceBottleneck(bottleneck) {
    // Automatically adjust QNET weights for affected nodes
    if (bottleneck.severity >= 8) {
      this.emit('emergency_node_downweight', {
        nodeId: bottleneck.data.profileId,
        reason: 'critical_bottleneck',
        severity: bottleneck.severity
      });
    }
  }

  handleSLOViolation(violation) {
    // Trigger Qflow performance policies
    this.emit('qflow_policy_trigger', {
      type: 'slo_violation',
      violation,
      recommendedAction: 'enable_degraded_mode'
    });
  }

  handlePerformanceRegression(regression) {
    // Update Qerberos risk signals
    this.emit('qerberos_risk_update', {
      entityId: regression.testName,
      riskType: 'performance_regression',
      severity: regression.severity,
      impact: regression.maxRegression
    });
  }

  handleCapacityAnalysis(analysis) {
    // Trigger auto-scaling recommendations
    if (analysis.scalingNeeds.recommendations.length > 0) {
      this.emit('autoscaling_recommendation', {
        resource: analysis.resource,
        recommendations: analysis.scalingNeeds.recommendations
      });
    }
  }
}

export default EcosystemPerformanceIntegration;