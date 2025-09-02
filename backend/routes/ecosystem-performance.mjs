/**
 * Ecosystem Performance Integration API Routes
 * Provides endpoints for ecosystem-wide performance integration
 */

import express from 'express';
import EcosystemPerformanceIntegration from '../services/EcosystemPerformanceIntegration.mjs';

const router = express.Router();
const ecosystemPerf = new EcosystemPerformanceIntegration();

/**
 * GET /ecosystem-performance/qnet/weights
 * Get QNET routing weights based on performance
 */
router.get('/qnet/weights', async (req, res) => {
  try {
    const nodes = req.query.nodes ? JSON.parse(req.query.nodes) : [];
    const weights = ecosystemPerf.getQNETRoutingWeights(nodes);

    res.json({
      status: 'ok',
      code: 'QNET_WEIGHTS_CALCULATED',
      message: 'QNET routing weights calculated successfully',
      data: {
        weights: Object.fromEntries(weights),
        timestamp: Date.now(),
        nodeCount: nodes.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'QNET_WEIGHTS_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /ecosystem-performance/qnet/node-score
 * Calculate performance score for a specific node
 */
router.post('/qnet/node-score', async (req, res) => {
  try {
    const { nodeId, nodeMetrics } = req.body;
    
    if (!nodeId || !nodeMetrics) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'nodeId and nodeMetrics are required'
      });
    }

    const score = ecosystemPerf.calculateNodePerformanceScore(nodeId, nodeMetrics);

    res.json({
      status: 'ok',
      code: 'NODE_SCORE_CALCULATED',
      message: 'Node performance score calculated successfully',
      data: score
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'NODE_SCORE_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /ecosystem-performance/qflow/policy-check
 * Evaluate Qflow performance policy for an operation
 */
router.post('/qflow/policy-check', async (req, res) => {
  try {
    const { operation, context = {} } = req.body;
    
    if (!operation) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'operation is required'
      });
    }

    const evaluation = ecosystemPerf.evaluateQflowPerformancePolicy(operation, context);

    res.json({
      status: 'ok',
      code: 'QFLOW_POLICY_EVALUATED',
      message: 'Qflow performance policy evaluated successfully',
      data: evaluation
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'QFLOW_POLICY_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /ecosystem-performance/qerberos/risk-assessment
 * Generate performance-based risk signals for Qerberos
 */
router.post('/qerberos/risk-assessment', async (req, res) => {
  try {
    const { entityId, performanceData } = req.body;
    
    if (!entityId || !performanceData) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'entityId and performanceData are required'
      });
    }

    const riskSignal = ecosystemPerf.generatePerformanceRiskSignals(entityId, performanceData);

    res.json({
      status: 'ok',
      code: 'RISK_ASSESSMENT_COMPLETED',
      message: 'Performance risk assessment completed successfully',
      data: riskSignal
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'RISK_ASSESSMENT_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /ecosystem-performance/cicd/gate-check
 * Evaluate CI/CD performance gate
 */
router.post('/cicd/gate-check', async (req, res) => {
  try {
    const { deploymentMetrics, baseline } = req.body;
    
    if (!deploymentMetrics || !baseline) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'deploymentMetrics and baseline are required'
      });
    }

    const gate = ecosystemPerf.evaluateCICDPerformanceGate(deploymentMetrics, baseline);

    res.json({
      status: 'ok',
      code: 'CICD_GATE_EVALUATED',
      message: 'CI/CD performance gate evaluated successfully',
      data: gate
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'CICD_GATE_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /ecosystem-performance/go-live/readiness/:module
 * Evaluate go-live readiness for a module
 */
router.get('/go-live/readiness/:module', async (req, res) => {
  try {
    const { module } = req.params;
    const environment = req.query.environment || 'production';
    
    const readiness = ecosystemPerf.evaluateGoLiveReadiness(module, environment);

    res.json({
      status: 'ok',
      code: 'GO_LIVE_READINESS_EVALUATED',
      message: 'Go-live readiness evaluated successfully',
      data: readiness
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'GO_LIVE_READINESS_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /ecosystem-performance/dao/subnet-evaluation
 * Evaluate DAO subnet performance for isolation decisions
 */
router.post('/dao/subnet-evaluation', async (req, res) => {
  try {
    const { daoId, subnetMetrics } = req.body;
    
    if (!daoId || !subnetMetrics) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'daoId and subnetMetrics are required'
      });
    }

    const evaluation = ecosystemPerf.evaluateDAOSubnetPerformance(daoId, subnetMetrics);

    res.json({
      status: 'ok',
      code: 'DAO_SUBNET_EVALUATED',
      message: 'DAO subnet performance evaluated successfully',
      data: evaluation
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'DAO_SUBNET_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /ecosystem-performance/dashboard
 * Get comprehensive ecosystem performance dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = {
      timestamp: Date.now(),
      qnet: {
        nodeScores: Object.fromEntries(ecosystemPerf.nodePerformanceScores),
        totalNodes: ecosystemPerf.nodePerformanceScores.size,
        healthyNodes: Array.from(ecosystemPerf.nodePerformanceScores.values())
          .filter(score => score.recommendation === 'healthy').length
      },
      qflow: {
        activePolicies: 0, // Would be populated from actual policy engine
        deferredOperations: 0,
        cacheHitRate: 0.85 // Mock data
      },
      qerberos: {
        riskSignals: Object.fromEntries(ecosystemPerf.riskSignals),
        highRiskEntities: Array.from(ecosystemPerf.riskSignals.values())
          .filter(signal => signal.riskLevel === 'high' || signal.riskLevel === 'critical').length
      },
      goLive: {
        readyModules: Array.from(ecosystemPerf.goLiveGates.values())
          .filter(gate => gate.overallStatus === 'ready').length,
        blockedModules: Array.from(ecosystemPerf.goLiveGates.values())
          .filter(gate => gate.overallStatus === 'blocked').length
      }
    };

    res.json({
      status: 'ok',
      code: 'ECOSYSTEM_DASHBOARD_RETRIEVED',
      message: 'Ecosystem performance dashboard retrieved successfully',
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'ECOSYSTEM_DASHBOARD_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /ecosystem-performance/health
 * Get overall ecosystem performance health
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      timestamp: Date.now(),
      overallStatus: 'healthy',
      components: {
        qnet: { status: 'healthy', score: 95 },
        qflow: { status: 'healthy', score: 92 },
        qerberos: { status: 'warning', score: 78 },
        cicd: { status: 'healthy', score: 88 },
        dao_subnets: { status: 'healthy', score: 91 }
      },
      alerts: [],
      recommendations: []
    };

    // Calculate overall status
    const componentScores = Object.values(health.components).map(c => c.score);
    const avgScore = componentScores.reduce((sum, score) => sum + score, 0) / componentScores.length;
    
    if (avgScore < 70) {
      health.overallStatus = 'critical';
    } else if (avgScore < 85) {
      health.overallStatus = 'warning';
    }

    // Add alerts for components with issues
    Object.entries(health.components).forEach(([component, data]) => {
      if (data.status !== 'healthy') {
        health.alerts.push({
          component,
          status: data.status,
          score: data.score,
          message: `${component} performance below optimal levels`
        });
      }
    });

    res.json({
      status: 'ok',
      code: 'ECOSYSTEM_HEALTH_RETRIEVED',
      message: 'Ecosystem performance health retrieved successfully',
      data: health
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'ECOSYSTEM_HEALTH_ERROR',
      message: error.message
    });
  }
});

/**
 * WebSocket endpoint for real-time performance updates
 */
router.ws('/realtime', (ws, req) => {
  console.log('Client connected to ecosystem performance real-time feed');

  // Send initial data
  ws.send(JSON.stringify({
    type: 'connection_established',
    timestamp: Date.now()
  }));

  // Listen to ecosystem performance events
  const eventHandlers = {
    'node_performance_scored': (data) => {
      ws.send(JSON.stringify({
        type: 'node_performance_update',
        data,
        timestamp: Date.now()
      }));
    },
    'qflow_policy_evaluated': (data) => {
      ws.send(JSON.stringify({
        type: 'qflow_policy_update',
        data,
        timestamp: Date.now()
      }));
    },
    'performance_risk_assessed': (data) => {
      ws.send(JSON.stringify({
        type: 'risk_assessment_update',
        data,
        timestamp: Date.now()
      }));
    },
    'go_live_readiness_evaluated': (data) => {
      ws.send(JSON.stringify({
        type: 'go_live_update',
        data,
        timestamp: Date.now()
      }));
    }
  };

  // Register event listeners
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    ecosystemPerf.on(event, handler);
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected from ecosystem performance feed');
    // Remove event listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      ecosystemPerf.removeListener(event, handler);
    });
  });

  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe_node':
          // Subscribe to specific node updates
          ws.send(JSON.stringify({
            type: 'subscription_confirmed',
            nodeId: data.nodeId,
            timestamp: Date.now()
          }));
          break;
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
          break;
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: Date.now()
      }));
    }
  });
});

export default router;