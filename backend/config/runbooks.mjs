/**
 * Runbook definitions for automated incident response
 * These runbooks provide step-by-step procedures for common issues
 */

export const runbooks = {
  'latency-investigation': {
    name: 'Latency Investigation',
    description: 'Investigate and resolve high latency issues',
    category: 'performance',
    steps: [
      {
        name: 'Check current metrics',
        type: 'metric-check',
        metrics: ['p99Latency', 'avgResponseTime', 'requestCount'],
        description: 'Verify current latency metrics and request volume'
      },
      {
        name: 'Analyze slow endpoints',
        type: 'log',
        message: 'Analyzing request traces for slow endpoints...',
        description: 'Identify which endpoints are contributing to high latency'
      },
      {
        name: 'Check database performance',
        type: 'metric-check',
        metrics: ['dbConnectionPool', 'dbQueryTime'],
        description: 'Verify database connection pool and query performance'
      },
      {
        name: 'Check external dependencies',
        type: 'metric-check',
        metrics: ['ipfsLatency', 'redisLatency'],
        description: 'Verify external service response times'
      },
      {
        name: 'Scale if needed',
        type: 'scale-up',
        service: 'backend',
        instances: 2,
        condition: 'if requestCount > 1000',
        description: 'Scale up backend instances if high load detected'
      },
      {
        name: 'Notify team',
        type: 'notify',
        channel: 'slack',
        message: 'Latency investigation completed. Check metrics dashboard.',
        description: 'Inform team of investigation results'
      }
    ],
    escalation: {
      after: 900000, // 15 minutes
      to: 'senior-engineer'
    }
  },

  'error-rate-investigation': {
    name: 'Error Rate Investigation',
    description: 'Investigate and resolve high error rates',
    category: 'reliability',
    steps: [
      {
        name: 'Check error distribution',
        type: 'metric-check',
        metrics: ['errorRate', 'errorCount', 'statusCodeDistribution'],
        description: 'Analyze error rate and status code distribution'
      },
      {
        name: 'Identify error patterns',
        type: 'log',
        message: 'Analyzing error logs for patterns...',
        description: 'Look for common error patterns and root causes'
      },
      {
        name: 'Check dependency health',
        type: 'metric-check',
        metrics: ['dependencyStatus'],
        description: 'Verify all critical dependencies are healthy'
      },
      {
        name: 'Review recent deployments',
        type: 'log',
        message: 'Checking recent deployments for correlation...',
        description: 'Check if errors correlate with recent deployments'
      },
      {
        name: 'Enable circuit breakers',
        type: 'log',
        message: 'Enabling circuit breakers for failing dependencies...',
        description: 'Protect system by enabling circuit breakers'
      },
      {
        name: 'Alert on-call engineer',
        type: 'notify',
        channel: 'pagerduty',
        message: 'High error rate detected. Immediate attention required.',
        description: 'Escalate to on-call engineer for immediate response'
      }
    ],
    escalation: {
      after: 300000, // 5 minutes
      to: 'incident-commander'
    }
  },

  'dependency-recovery': {
    name: 'Dependency Recovery',
    description: 'Recover from critical dependency failures',
    category: 'infrastructure',
    steps: [
      {
        name: 'Identify failed dependency',
        type: 'log',
        message: 'Identifying which dependency has failed...',
        description: 'Determine which critical dependency is down'
      },
      {
        name: 'Check dependency health',
        type: 'metric-check',
        metrics: ['dependencyLatency', 'dependencyStatus'],
        description: 'Verify dependency health and response times'
      },
      {
        name: 'Enable fallback mechanisms',
        type: 'log',
        message: 'Enabling fallback mechanisms...',
        description: 'Switch to backup systems or cached responses'
      },
      {
        name: 'Restart dependency service',
        type: 'restart-service',
        service: 'dependency',
        description: 'Attempt to restart the failed dependency'
      },
      {
        name: 'Verify recovery',
        type: 'metric-check',
        metrics: ['dependencyStatus'],
        description: 'Confirm dependency has recovered'
      },
      {
        name: 'Disable fallback if recovered',
        type: 'log',
        message: 'Dependency recovered. Disabling fallback mechanisms...',
        description: 'Return to normal operation once dependency is healthy'
      },
      {
        name: 'Document incident',
        type: 'notify',
        channel: 'slack',
        message: 'Dependency recovery completed. Incident documented.',
        description: 'Document the incident for post-mortem analysis'
      }
    ],
    escalation: {
      after: 600000, // 10 minutes
      to: 'infrastructure-team'
    }
  },

  'memory-optimization': {
    name: 'Memory Optimization',
    description: 'Handle high memory usage situations',
    category: 'performance',
    steps: [
      {
        name: 'Check memory metrics',
        type: 'metric-check',
        metrics: ['memoryUsage', 'heapUsage', 'gcMetrics'],
        description: 'Analyze current memory usage patterns'
      },
      {
        name: 'Identify memory leaks',
        type: 'log',
        message: 'Analyzing heap dumps for memory leaks...',
        description: 'Look for potential memory leaks or excessive allocations'
      },
      {
        name: 'Force garbage collection',
        type: 'log',
        message: 'Triggering garbage collection...',
        description: 'Force GC to free up memory if possible'
      },
      {
        name: 'Clear caches',
        type: 'log',
        message: 'Clearing application caches...',
        description: 'Clear non-essential caches to free memory'
      },
      {
        name: 'Scale horizontally',
        type: 'scale-up',
        service: 'backend',
        instances: 2,
        description: 'Add more instances to distribute memory load'
      },
      {
        name: 'Monitor recovery',
        type: 'metric-check',
        metrics: ['memoryUsage'],
        description: 'Monitor memory usage after optimization'
      }
    ],
    escalation: {
      after: 1200000, // 20 minutes
      to: 'performance-team'
    }
  },

  'scaling-procedures': {
    name: 'Scaling Procedures',
    description: 'Handle high traffic and scaling needs',
    category: 'capacity',
    steps: [
      {
        name: 'Assess current load',
        type: 'metric-check',
        metrics: ['requestCount', 'concurrentRequests', 'cpuUsage'],
        description: 'Evaluate current system load and capacity'
      },
      {
        name: 'Check auto-scaling status',
        type: 'log',
        message: 'Checking auto-scaling configuration...',
        description: 'Verify auto-scaling is properly configured'
      },
      {
        name: 'Scale backend services',
        type: 'scale-up',
        service: 'backend',
        instances: 3,
        description: 'Increase backend service instances'
      },
      {
        name: 'Enable rate limiting',
        type: 'log',
        message: 'Enabling enhanced rate limiting...',
        description: 'Protect system with stricter rate limits'
      },
      {
        name: 'Monitor performance',
        type: 'metric-check',
        metrics: ['responseTime', 'errorRate'],
        description: 'Monitor system performance after scaling'
      },
      {
        name: 'Notify capacity team',
        type: 'notify',
        channel: 'slack',
        message: 'System scaled up due to high traffic. Monitor capacity.',
        description: 'Inform capacity planning team of scaling event'
      }
    ],
    escalation: {
      after: 600000, // 10 minutes
      to: 'capacity-team'
    }
  },

  'security-incident': {
    name: 'Security Incident Response',
    description: 'Respond to security incidents and threats',
    category: 'security',
    steps: [
      {
        name: 'Assess threat level',
        type: 'log',
        message: 'Assessing security threat level...',
        description: 'Evaluate the severity and scope of security incident'
      },
      {
        name: 'Enable enhanced monitoring',
        type: 'log',
        message: 'Enabling enhanced security monitoring...',
        description: 'Increase security monitoring and logging'
      },
      {
        name: 'Block suspicious IPs',
        type: 'log',
        message: 'Blocking suspicious IP addresses...',
        description: 'Implement IP blocking for identified threats'
      },
      {
        name: 'Rotate security keys',
        type: 'log',
        message: 'Initiating emergency key rotation...',
        description: 'Rotate compromised or potentially compromised keys'
      },
      {
        name: 'Alert security team',
        type: 'notify',
        channel: 'pagerduty',
        message: 'SECURITY INCIDENT: Immediate response required',
        description: 'Immediately alert security incident response team'
      },
      {
        name: 'Document incident',
        type: 'log',
        message: 'Documenting security incident details...',
        description: 'Create detailed incident documentation'
      }
    ],
    escalation: {
      after: 180000, // 3 minutes
      to: 'security-team'
    }
  },

  'data-integrity-check': {
    name: 'Data Integrity Check',
    description: 'Verify and restore data integrity',
    category: 'data',
    steps: [
      {
        name: 'Check data consistency',
        type: 'log',
        message: 'Checking data consistency across systems...',
        description: 'Verify data consistency between different storage systems'
      },
      {
        name: 'Validate IPFS content',
        type: 'log',
        message: 'Validating IPFS content integrity...',
        description: 'Check IPFS content hashes and availability'
      },
      {
        name: 'Check backup status',
        type: 'metric-check',
        metrics: ['backupStatus', 'lastBackupTime'],
        description: 'Verify backup systems are functioning properly'
      },
      {
        name: 'Run integrity tests',
        type: 'log',
        message: 'Running automated integrity tests...',
        description: 'Execute automated data integrity verification'
      },
      {
        name: 'Restore from backup if needed',
        type: 'log',
        message: 'Initiating data restoration if corruption detected...',
        description: 'Restore corrupted data from verified backups'
      },
      {
        name: 'Notify data team',
        type: 'notify',
        channel: 'slack',
        message: 'Data integrity check completed. Review results.',
        description: 'Inform data team of integrity check results'
      }
    ],
    escalation: {
      after: 1800000, // 30 minutes
      to: 'data-team'
    }
  }
};

/**
 * Initialize runbooks in the alerting service
 */
export function initializeRunbooks(alertingService) {
  for (const [name, runbook] of Object.entries(runbooks)) {
    alertingService.addRunbook(name, runbook);
  }
  
  console.log(`Initialized ${Object.keys(runbooks).length} runbooks`);
}