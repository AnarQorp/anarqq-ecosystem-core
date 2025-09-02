# Qflow Monitoring and Alerting Setup Guide

This guide provides comprehensive instructions for setting up monitoring, alerting, and observability for Qflow deployments.

## Overview

Qflow provides extensive monitoring capabilities including:
- **System Metrics**: Performance, resource usage, and health indicators
- **Application Metrics**: Flow execution, validation pipeline, and business metrics
- **Real-time Dashboards**: WebSocket-based live monitoring
- **Alerting**: Configurable alerts with multiple notification channels
- **Distributed Tracing**: End-to-end request tracing across components
- **Log Aggregation**: Centralized logging with structured data

## Metrics Collection

### Built-in Metrics

Qflow exposes Prometheus-compatible metrics on `/metrics` endpoint:

#### System Metrics
```
# Process metrics
qflow_process_cpu_usage_percent
qflow_process_memory_usage_bytes
qflow_process_uptime_seconds

# Network metrics
qflow_network_connections_active
qflow_network_bytes_sent_total
qflow_network_bytes_received_total

# Storage metrics
qflow_storage_ipfs_blocks_total
qflow_storage_ipfs_size_bytes
qflow_storage_cache_hit_ratio
```

#### Application Metrics
```
# Flow execution metrics
qflow_flows_active_count
qflow_flows_completed_total
qflow_flows_failed_total
qflow_flow_execution_duration_seconds

# Validation pipeline metrics
qflow_validation_requests_total
qflow_validation_duration_seconds
qflow_validation_cache_hits_total
qflow_validation_failures_total

# Node selection metrics
qflow_node_selection_duration_seconds
qflow_node_health_score
qflow_node_load_factor

# Sandbox metrics
qflow_sandbox_executions_total
qflow_sandbox_memory_usage_bytes
qflow_sandbox_cpu_usage_percent
qflow_sandbox_timeouts_total
```

### Custom Metrics

#### Adding Custom Metrics

```typescript
import { metrics } from '@anarq/qflow';

// Counter metric
const customCounter = metrics.createCounter({
  name: 'qflow_custom_operations_total',
  help: 'Total number of custom operations',
  labelNames: ['operation_type', 'status']
});

// Histogram metric
const customHistogram = metrics.createHistogram({
  name: 'qflow_custom_duration_seconds',
  help: 'Duration of custom operations',
  labelNames: ['operation_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Gauge metric
const customGauge = metrics.createGauge({
  name: 'qflow_custom_queue_size',
  help: 'Current queue size',
  labelNames: ['queue_type']
});

// Usage
customCounter.inc({ operation_type: 'flow_creation', status: 'success' });
customHistogram.observe({ operation_type: 'validation' }, 0.5);
customGauge.set({ queue_type: 'execution' }, 42);
```

#### Business Metrics

```typescript
// DAO-specific metrics
const daoMetrics = {
  flowsPerDAO: metrics.createGauge({
    name: 'qflow_dao_flows_active',
    help: 'Active flows per DAO subnet',
    labelNames: ['dao_subnet']
  }),
  
  executionCostPerDAO: metrics.createCounter({
    name: 'qflow_dao_execution_cost_total',
    help: 'Total execution cost per DAO',
    labelNames: ['dao_subnet', 'cost_type']
  })
};
```

## Monitoring Stack Setup

### Prometheus Configuration

#### prometheus.yml
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "qflow-rules.yml"

scrape_configs:
  - job_name: 'qflow'
    static_configs:
      - targets: ['qflow:9090']
    scrape_interval: 10s
    metrics_path: /metrics
    
  - job_name: 'qflow-nodes'
    consul_sd_configs:
      - server: 'consul:8500'
        services: ['qflow-node']
    relabel_configs:
      - source_labels: [__meta_consul_service_address]
        target_label: __address__
        replacement: '${1}:9090'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Alert Rules (qflow-rules.yml)
```yaml
groups:
  - name: qflow.rules
    rules:
      # Service availability
      - alert: QflowServiceDown
        expr: up{job="qflow"} == 0
        for: 1m
        labels:
          severity: critical
          service: qflow
        annotations:
          summary: "Qflow service is down"
          description: "Qflow service has been down for more than 1 minute"
          
      # High error rate
      - alert: QflowHighErrorRate
        expr: rate(qflow_flows_failed_total[5m]) / rate(qflow_flows_completed_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
          service: qflow
        annotations:
          summary: "High flow failure rate"
          description: "Flow failure rate is {{ $value | humanizePercentage }} over the last 5 minutes"
          
      # Memory usage
      - alert: QflowHighMemoryUsage
        expr: qflow_process_memory_usage_bytes / (1024*1024*1024) > 2
        for: 5m
        labels:
          severity: warning
          service: qflow
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanize }}GB"
          
      # Validation pipeline issues
      - alert: QflowValidationFailures
        expr: rate(qflow_validation_failures_total[5m]) > 0.05
        for: 1m
        labels:
          severity: critical
          service: qflow
        annotations:
          summary: "Validation pipeline failures"
          description: "Validation failure rate is {{ $value | humanize }} per second"
          
      # Node connectivity
      - alert: QflowLowNodeConnectivity
        expr: qflow_network_connections_active < 3
        for: 2m
        labels:
          severity: warning
          service: qflow
        annotations:
          summary: "Low node connectivity"
          description: "Only {{ $value }} nodes connected"
          
      # IPFS storage issues
      - alert: QflowIPFSStorageHigh
        expr: qflow_storage_ipfs_size_bytes / (1024*1024*1024) > 10
        for: 5m
        labels:
          severity: warning
          service: qflow
        annotations:
          summary: "High IPFS storage usage"
          description: "IPFS storage usage is {{ $value | humanize }}GB"
          
      # Sandbox resource exhaustion
      - alert: QflowSandboxTimeouts
        expr: rate(qflow_sandbox_timeouts_total[5m]) > 0.01
        for: 1m
        labels:
          severity: warning
          service: qflow
        annotations:
          summary: "Sandbox execution timeouts"
          description: "Sandbox timeout rate is {{ $value | humanize }} per second"
```

### Grafana Dashboard

#### Dashboard Configuration
```json
{
  "dashboard": {
    "id": null,
    "title": "Qflow Monitoring Dashboard",
    "tags": ["qflow", "automation"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Flow Execution Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(qflow_flows_completed_total[5m])",
            "legendFormat": "Completed"
          },
          {
            "expr": "rate(qflow_flows_failed_total[5m])",
            "legendFormat": "Failed"
          }
        ],
        "yAxes": [
          {
            "label": "Flows per second"
          }
        ]
      },
      {
        "id": 2,
        "title": "Active Flows",
        "type": "singlestat",
        "targets": [
          {
            "expr": "qflow_flows_active_count",
            "legendFormat": "Active Flows"
          }
        ]
      },
      {
        "id": 3,
        "title": "Validation Pipeline Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(qflow_validation_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(qflow_validation_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "id": 4,
        "title": "System Resources",
        "type": "graph",
        "targets": [
          {
            "expr": "qflow_process_cpu_usage_percent",
            "legendFormat": "CPU Usage %"
          },
          {
            "expr": "qflow_process_memory_usage_bytes / (1024*1024)",
            "legendFormat": "Memory Usage MB"
          }
        ]
      },
      {
        "id": 5,
        "title": "Network Connectivity",
        "type": "graph",
        "targets": [
          {
            "expr": "qflow_network_connections_active",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "id": 6,
        "title": "DAO Subnet Activity",
        "type": "table",
        "targets": [
          {
            "expr": "qflow_dao_flows_active",
            "format": "table",
            "instant": true
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "10s"
  }
}
```

### Real-time Dashboard

#### WebSocket Dashboard Setup

```typescript
import { QflowRealtimeDashboard } from '@anarq/qflow';

const dashboard = new QflowRealtimeDashboard({
  websocketUrl: 'ws://localhost:8080/ws/metrics',
  updateInterval: 1000,
  maxDataPoints: 100
});

// Subscribe to real-time metrics
dashboard.subscribe('flow_execution_rate', (data) => {
  updateChart('execution-rate-chart', data);
});

dashboard.subscribe('system_resources', (data) => {
  updateGauges('resource-gauges', data);
});

dashboard.subscribe('validation_pipeline', (data) => {
  updateHeatmap('validation-heatmap', data);
});

// Start dashboard
dashboard.start();
```

#### Dashboard Components

```html
<!DOCTYPE html>
<html>
<head>
    <title>Qflow Real-time Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            padding: 20px;
        }
        .metric-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 16px;
            background: white;
        }
    </style>
</head>
<body>
    <div class="dashboard-grid">
        <div class="metric-card">
            <h3>Flow Execution Rate</h3>
            <canvas id="execution-rate-chart"></canvas>
        </div>
        
        <div class="metric-card">
            <h3>System Resources</h3>
            <div id="resource-gauges"></div>
        </div>
        
        <div class="metric-card">
            <h3>Validation Pipeline</h3>
            <canvas id="validation-heatmap"></canvas>
        </div>
        
        <div class="metric-card">
            <h3>Active Flows</h3>
            <div id="active-flows-counter"></div>
        </div>
        
        <div class="metric-card">
            <h3>Network Status</h3>
            <div id="network-status"></div>
        </div>
        
        <div class="metric-card">
            <h3>Recent Alerts</h3>
            <div id="recent-alerts"></div>
        </div>
    </div>
    
    <script src="dashboard.js"></script>
</body>
</html>
```

## Alerting Configuration

### Alertmanager Setup

#### alertmanager.yml
```yaml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@qflow.example.com'

route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        service: qflow
      receiver: 'qflow-team'

receivers:
  - name: 'default'
    email_configs:
      - to: 'admin@example.com'
        subject: 'Qflow Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

  - name: 'critical-alerts'
    email_configs:
      - to: 'oncall@example.com'
        subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts-critical'
        title: 'Critical Qflow Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
    pagerduty_configs:
      - routing_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'

  - name: 'qflow-team'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#qflow-alerts'
        title: 'Qflow Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

### Custom Alert Handlers

#### Webhook Alerts
```typescript
import express from 'express';
import { QflowAlertHandler } from '@anarq/qflow';

const app = express();
const alertHandler = new QflowAlertHandler();

// Custom alert processing
app.post('/alerts/webhook', express.json(), async (req, res) => {
  const alerts = req.body.alerts;
  
  for (const alert of alerts) {
    await alertHandler.processAlert({
      name: alert.labels.alertname,
      severity: alert.labels.severity,
      service: alert.labels.service,
      description: alert.annotations.description,
      timestamp: alert.startsAt
    });
  }
  
  res.status(200).send('OK');
});

// DAO-specific alert routing
alertHandler.addDAOAlertRoute('dao-subnet-1', {
  channels: ['#dao1-alerts'],
  escalation: {
    level1: ['dao1-admin@example.com'],
    level2: ['dao1-oncall@example.com']
  }
});
```

#### Auto-remediation
```typescript
class QflowAutoRemediation {
  constructor() {
    this.remediationActions = new Map();
    this.setupDefaultActions();
  }
  
  setupDefaultActions() {
    // High memory usage remediation
    this.remediationActions.set('QflowHighMemoryUsage', async (alert) => {
      console.log('Triggering garbage collection...');
      await this.triggerGarbageCollection();
      
      console.log('Clearing caches...');
      await this.clearCaches();
      
      // If still high, scale up
      if (await this.checkMemoryUsage() > 0.8) {
        await this.scaleUp();
      }
    });
    
    // Validation failures remediation
    this.remediationActions.set('QflowValidationFailures', async (alert) => {
      console.log('Clearing validation cache...');
      await this.clearValidationCache();
      
      console.log('Restarting validation services...');
      await this.restartValidationServices();
    });
    
    // Low connectivity remediation
    this.remediationActions.set('QflowLowNodeConnectivity', async (alert) => {
      console.log('Attempting to reconnect to bootstrap peers...');
      await this.reconnectBootstrapPeers();
      
      console.log('Discovering new peers...');
      await this.discoverPeers();
    });
  }
  
  async processAlert(alert) {
    const action = this.remediationActions.get(alert.name);
    if (action) {
      try {
        await action(alert);
        console.log(`Auto-remediation completed for ${alert.name}`);
      } catch (error) {
        console.error(`Auto-remediation failed for ${alert.name}:`, error);
      }
    }
  }
}
```

## Distributed Tracing

### Jaeger Setup

#### Docker Compose
```yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - monitoring

  qflow:
    image: qflow:latest
    environment:
      - JAEGER_ENDPOINT=http://jaeger:14268/api/traces
      - TRACING_ENABLED=true
    depends_on:
      - jaeger
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
```

#### Tracing Configuration
```typescript
import { trace, context } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT,
  }),
  serviceName: 'qflow',
});

sdk.start();

// Custom tracing
const tracer = trace.getTracer('qflow');

export function traceFlowExecution(flowId: string, executionId: string) {
  return tracer.startSpan('flow.execution', {
    attributes: {
      'flow.id': flowId,
      'execution.id': executionId,
    }
  });
}

export function traceValidationPipeline(operationId: string) {
  return tracer.startSpan('validation.pipeline', {
    attributes: {
      'operation.id': operationId,
    }
  });
}
```

## Log Management

### Structured Logging

#### Log Configuration
```yaml
qflow:
  logging:
    level: info
    format: json
    outputs:
      - type: console
      - type: file
        path: /var/log/qflow/qflow.log
        maxSize: 100MB
        maxFiles: 10
        compress: true
      - type: elasticsearch
        url: http://elasticsearch:9200
        index: qflow-logs
    fields:
      service: qflow
      version: 1.0.0
      environment: production
```

#### Log Aggregation with ELK Stack

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

**logstash.conf**:
```
input {
  beats {
    port => 5044
  }
}

filter {
  if [fields][service] == "qflow" {
    json {
      source => "message"
    }
    
    date {
      match => [ "timestamp", "ISO8601" ]
    }
    
    if [level] == "error" {
      mutate {
        add_tag => [ "error" ]
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "qflow-logs-%{+YYYY.MM.dd}"
  }
}
```

### Log Analysis Queries

#### Kibana Queries
```
# Error analysis
level:error AND service:qflow

# Flow execution analysis
message:"flow.execution" AND status:failed

# Validation pipeline issues
component:validation AND level:error

# Performance analysis
duration:>1000 AND component:execution

# Security events
component:security OR component:authentication

# DAO-specific logs
dao_subnet:"dao-subnet-1" AND level:warn
```

## Performance Monitoring

### APM Integration

#### New Relic Setup
```typescript
import newrelic from 'newrelic';

// Custom metrics
newrelic.recordMetric('Custom/Qflow/FlowsExecuted', flowCount);
newrelic.recordMetric('Custom/Qflow/ValidationLatency', latencyMs);

// Custom events
newrelic.recordCustomEvent('QflowFlowExecution', {
  flowId: 'flow-123',
  executionTime: 1500,
  status: 'completed',
  daoSubnet: 'dao-1'
});

// Error tracking
newrelic.noticeError(new Error('Flow execution failed'), {
  flowId: 'flow-123',
  step: 'validation'
});
```

#### DataDog Integration
```typescript
import { StatsD } from 'node-statsd';

const statsd = new StatsD({
  host: 'datadog-agent',
  port: 8125,
  prefix: 'qflow.'
});

// Metrics
statsd.increment('flows.executed');
statsd.histogram('validation.duration', latencyMs);
statsd.gauge('flows.active', activeFlowCount);

// Events
statsd.event('Flow Execution Failed', 'Flow execution failed for flow-123', {
  alert_type: 'error',
  tags: ['flow:flow-123', 'dao:dao-1']
});
```

### Custom Performance Monitoring

#### Performance Profiler
```typescript
class QflowPerformanceProfiler {
  private profiles: Map<string, PerformanceProfile> = new Map();
  
  startProfile(name: string): string {
    const profileId = `${name}-${Date.now()}`;
    const profile: PerformanceProfile = {
      id: profileId,
      name,
      startTime: process.hrtime.bigint(),
      metrics: {
        cpu: process.cpuUsage(),
        memory: process.memoryUsage()
      }
    };
    
    this.profiles.set(profileId, profile);
    return profileId;
  }
  
  endProfile(profileId: string): PerformanceReport {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    const endTime = process.hrtime.bigint();
    const endCpu = process.cpuUsage(profile.metrics.cpu);
    const endMemory = process.memoryUsage();
    
    const report: PerformanceReport = {
      name: profile.name,
      duration: Number(endTime - profile.startTime) / 1000000, // Convert to ms
      cpu: {
        user: endCpu.user,
        system: endCpu.system
      },
      memory: {
        heapUsed: endMemory.heapUsed - profile.metrics.memory.heapUsed,
        heapTotal: endMemory.heapTotal - profile.metrics.memory.heapTotal,
        external: endMemory.external - profile.metrics.memory.external
      }
    };
    
    this.profiles.delete(profileId);
    return report;
  }
}
```

## Health Checks

### Comprehensive Health Monitoring

```typescript
class QflowHealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();
  
  constructor() {
    this.setupDefaultChecks();
  }
  
  setupDefaultChecks() {
    // Service health
    this.addCheck('service', async () => {
      return {
        status: 'healthy',
        details: {
          uptime: process.uptime(),
          version: process.env.QFLOW_VERSION
        }
      };
    });
    
    // IPFS connectivity
    this.addCheck('ipfs', async () => {
      try {
        const response = await fetch('http://localhost:5001/api/v0/version');
        const data = await response.json();
        return {
          status: 'healthy',
          details: {
            version: data.Version,
            connected: true
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          details: {
            error: error.message,
            connected: false
          }
        };
      }
    });
    
    // Ecosystem services
    this.addCheck('ecosystem', async () => {
      const services = ['squid', 'qlock', 'qonsent', 'qindex', 'qerberos'];
      const results = await Promise.allSettled(
        services.map(service => this.checkEcosystemService(service))
      );
      
      const healthy = results.filter(r => r.status === 'fulfilled').length;
      const total = results.length;
      
      return {
        status: healthy === total ? 'healthy' : healthy > total / 2 ? 'degraded' : 'unhealthy',
        details: {
          healthy,
          total,
          services: Object.fromEntries(
            services.map((service, i) => [
              service,
              results[i].status === 'fulfilled' ? 'healthy' : 'unhealthy'
            ])
          )
        }
      };
    });
    
    // Database health
    this.addCheck('database', async () => {
      try {
        // Test IPFS read/write
        const testData = 'health-check-' + Date.now();
        const hash = await this.ipfs.add(testData);
        const retrieved = await this.ipfs.cat(hash);
        
        return {
          status: retrieved === testData ? 'healthy' : 'unhealthy',
          details: {
            read: true,
            write: true,
            latency: Date.now() - parseInt(testData.split('-')[2])
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          details: {
            error: error.message,
            read: false,
            write: false
          }
        };
      }
    });
  }
  
  async runHealthChecks(): Promise<HealthReport> {
    const results = new Map<string, HealthCheckResult>();
    
    for (const [name, check] of this.checks) {
      try {
        const result = await Promise.race([
          check(),
          new Promise<HealthCheckResult>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        results.set(name, result);
      } catch (error) {
        results.set(name, {
          status: 'unhealthy',
          details: { error: error.message }
        });
      }
    }
    
    const allHealthy = Array.from(results.values()).every(r => r.status === 'healthy');
    const anyHealthy = Array.from(results.values()).some(r => r.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: Object.fromEntries(results)
    };
  }
}
```

## Deployment Monitoring

### Kubernetes Monitoring

#### ServiceMonitor for Prometheus Operator
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: qflow-metrics
  labels:
    app: qflow
spec:
  selector:
    matchLabels:
      app: qflow
  endpoints:
  - port: metrics
    interval: 10s
    path: /metrics
```

#### PodMonitor for Pod-level Metrics
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: qflow-pods
spec:
  selector:
    matchLabels:
      app: qflow
  podMetricsEndpoints:
  - port: metrics
    interval: 10s
```

### Docker Monitoring

#### Docker Compose with Monitoring
```yaml
version: '3.8'

services:
  qflow:
    image: qflow:latest
    ports:
      - "8080:8080"
      - "9090:9090"
    labels:
      - "prometheus.io/scrape=true"
      - "prometheus.io/port=9090"
      - "prometheus.io/path=/metrics"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  prometheus-data:
  grafana-data:
```

## Monitoring Best Practices

### Metric Design
1. **Use appropriate metric types**:
   - Counters for cumulative values
   - Gauges for current values
   - Histograms for distributions
   - Summaries for quantiles

2. **Label design**:
   - Keep cardinality low
   - Use meaningful label names
   - Avoid high-cardinality labels

3. **Naming conventions**:
   - Use consistent prefixes
   - Include units in names
   - Use descriptive names

### Alert Design
1. **Alert on symptoms, not causes**
2. **Use appropriate thresholds**
3. **Include context in alert messages**
4. **Implement alert fatigue prevention**
5. **Test alert delivery regularly**

### Dashboard Design
1. **Focus on key metrics**
2. **Use appropriate visualizations**
3. **Include context and annotations**
4. **Design for different audiences**
5. **Keep dashboards maintainable**

---

*Last updated: 2024-01-15*