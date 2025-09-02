# Qflow User Guide

Welcome to Qflow, the serverless, distributed automation engine for the AnarQ & Q ecosystem. This guide will help you get started with creating, managing, and executing automation workflows.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Flow](#creating-your-first-flow)
3. [Flow Components](#flow-components)
4. [Working with Data](#working-with-data)
5. [Authentication and Permissions](#authentication-and-permissions)
6. [Monitoring and Debugging](#monitoring-and-debugging)
7. [Best Practices](#best-practices)
8. [Common Use Cases](#common-use-cases)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before you begin, ensure you have:
- A valid sQuid identity
- Access to a QNET node
- Basic understanding of JSON/YAML
- Familiarity with REST APIs (optional)

### Installation

#### Using Docker (Recommended)
```bash
docker run -d --name qflow \
  -p 8080:8080 \
  -p 4001:4001 \
  -e SQUID_IDENTITY=your-squid-identity \
  qflow:latest
```

#### Using npm
```bash
npm install -g @anarq/qflow
qflow init
```

#### Using the CLI
```bash
# Install CLI
npm install -g @anarq/qflow-cli

# Initialize configuration
qflow init --identity your-squid-identity
```

### First Steps

1. **Verify Installation**:
   ```bash
   qflow health
   ```

2. **Check Identity**:
   ```bash
   qflow identity whoami
   ```

3. **List Available Nodes**:
   ```bash
   qflow nodes list
   ```

## Creating Your First Flow

### Flow Definition Structure

A Qflow definition is a JSON or YAML file that describes your automation workflow:

```yaml
id: "my-first-flow"
name: "Hello World Flow"
version: "1.0.0"
owner: "your-squid-identity"
description: "A simple hello world automation"

steps:
  - id: "start"
    type: "task"
    action: "qflow.action.log"
    params:
      message: "Hello, World!"
    onSuccess: "end"
  
  - id: "end"
    type: "task"
    action: "qflow.action.complete"
    params:
      status: "success"

metadata:
  tags: ["tutorial", "hello-world"]
  category: "examples"
  visibility: "public"
```

### Creating a Flow

#### Using the CLI
```bash
# Create from template
qflow create hello-world --template basic

# Create from file
qflow create --file my-flow.yaml

# Create interactively
qflow create --interactive
```

#### Using the API
```bash
curl -X POST http://localhost:8080/api/v1/flows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d @flow-definition.json
```

#### Using the Web Interface
1. Open the Qflow web interface
2. Click "Create New Flow"
3. Use the visual designer or YAML editor
4. Save and validate your flow

### Running Your First Flow

```bash
# Start execution
qflow start my-first-flow

# Check status
qflow status <execution-id>

# View logs
qflow logs <execution-id>
```

## Flow Components

### Step Types

#### 1. Task Steps
Execute specific actions:

```yaml
- id: "http-request"
  type: "task"
  action: "qflow.action.http"
  params:
    method: "GET"
    url: "https://api.example.com/data"
    headers:
      Authorization: "Bearer ${secrets.api_token}"
  onSuccess: "process-data"
  onFailure: "handle-error"
```

#### 2. Condition Steps
Make decisions based on data:

```yaml
- id: "check-status"
  type: "condition"
  action: "qflow.condition.if"
  params:
    condition: "${data.status} === 'active'"
  onTrue: "process-active"
  onFalse: "process-inactive"
```

#### 3. Parallel Steps
Execute multiple steps simultaneously:

```yaml
- id: "parallel-processing"
  type: "parallel"
  steps:
    - id: "task-1"
      action: "qflow.action.http"
      params:
        url: "https://api1.example.com"
    - id: "task-2"
      action: "qflow.action.http"
      params:
        url: "https://api2.example.com"
  onComplete: "merge-results"
```

#### 4. Event Trigger Steps
Respond to external events:

```yaml
- id: "webhook-trigger"
  type: "event-trigger"
  action: "qflow.trigger.webhook"
  params:
    path: "my-webhook"
    method: "POST"
  onEvent: "process-webhook"
```

### Actions

#### Built-in Actions

| Action | Description | Example |
|--------|-------------|---------|
| `qflow.action.http` | HTTP requests | API calls, webhooks |
| `qflow.action.function` | Custom JavaScript | Data processing |
| `qflow.action.transform` | Data transformation | Format conversion |
| `qflow.action.log` | Logging | Debug output |
| `qflow.action.delay` | Wait/pause | Rate limiting |
| `qflow.action.complete` | End execution | Success/failure |

#### Module Actions

| Action | Description | Module |
|--------|-------------|--------|
| `qflow.module.qmail` | Send emails | Qmail |
| `qflow.module.qchat` | Send messages | Qchat |
| `qflow.module.qdrive` | File operations | Qdrive |
| `qflow.module.qwallet` | Payments | Qwallet |

### Triggers

#### Manual Triggers
Start flows manually:

```yaml
- id: "manual-start"
  type: "event-trigger"
  action: "qflow.trigger.manual"
  params:
    requireConfirmation: true
```

#### Webhook Triggers
Start flows from external systems:

```yaml
- id: "webhook-start"
  type: "event-trigger"
  action: "qflow.trigger.webhook"
  params:
    path: "my-webhook"
    method: "POST"
    authentication: "bearer"
```

#### Schedule Triggers
Start flows on a schedule:

```yaml
- id: "scheduled-start"
  type: "event-trigger"
  action: "qflow.trigger.schedule"
  params:
    cron: "0 9 * * MON-FRI"
    timezone: "UTC"
```

## Working with Data

### Data Flow

Data flows between steps through the execution context:

```yaml
- id: "fetch-data"
  type: "task"
  action: "qflow.action.http"
  params:
    url: "https://api.example.com/users"
  outputMapping:
    users: "${response.data}"

- id: "process-users"
  type: "task"
  action: "qflow.action.function"
  params:
    code: |
      return context.users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email
      }));
  inputMapping:
    users: "${context.users}"
```

### Variables and Expressions

#### Context Variables
Access execution context data:

```yaml
params:
  message: "Hello ${context.user.name}!"
  timestamp: "${context.execution.startTime}"
  flowId: "${context.flow.id}"
```

#### Environment Variables
Access configuration values:

```yaml
params:
  apiUrl: "${env.API_BASE_URL}"
  timeout: "${env.REQUEST_TIMEOUT || 30000}"
```

#### Secrets
Access secure credentials:

```yaml
params:
  apiKey: "${secrets.api_key}"
  dbPassword: "${secrets.database.password}"
```

### Data Transformation

#### Transform Action
Transform data structure:

```yaml
- id: "transform-data"
  type: "task"
  action: "qflow.action.transform"
  params:
    mapping:
      userId: "${data.user.id}"
      fullName: "${data.user.firstName} ${data.user.lastName}"
      isActive: "${data.user.status === 'active'}"
```

#### Function Action
Custom data processing:

```yaml
- id: "custom-processing"
  type: "task"
  action: "qflow.action.function"
  params:
    code: |
      const processedData = input.data.map(item => {
        return {
          ...item,
          processed: true,
          timestamp: new Date().toISOString()
        };
      });
      return { processedData };
```

## Authentication and Permissions

### sQuid Identity

All Qflow operations require authentication with a valid sQuid identity:

```bash
# Login with sQuid
qflow auth login --identity your-squid-identity

# Check authentication status
qflow auth status

# Refresh token
qflow auth refresh
```

### Flow Permissions

#### Ownership
- Flow creators are automatically owners
- Owners can modify, delete, and transfer flows
- Ownership can be transferred to other identities

#### Sharing
```yaml
metadata:
  visibility: "public"  # public, dao-only, private
  permissions:
    execute: ["squid:user1", "squid:user2"]
    modify: ["squid:admin"]
    view: ["dao:my-dao"]
```

#### DAO Governance
```yaml
metadata:
  daoSubnet: "my-dao"
  requiredPermissions: ["dao:member", "flow:execute"]
```

### Credential Management

#### Storing Credentials
```bash
# Store API key
qflow credentials set api-key --value your-api-key

# Store complex credentials
qflow credentials set database --json '{
  "host": "db.example.com",
  "username": "user",
  "password": "secret"
}'
```

#### Using Credentials in Flows
```yaml
params:
  apiKey: "${secrets.api-key}"
  dbConfig: "${secrets.database}"
```

## Monitoring and Debugging

### Execution Monitoring

#### Real-time Status
```bash
# Check execution status
qflow status <execution-id>

# Follow execution progress
qflow status <execution-id> --follow

# List all executions
qflow executions list
```

#### Execution Logs
```bash
# View execution logs
qflow logs <execution-id>

# Filter by level
qflow logs <execution-id> --level error

# Follow logs in real-time
qflow logs <execution-id> --follow
```

### Performance Metrics

#### System Metrics
```bash
# View system performance
qflow metrics system

# Flow execution metrics
qflow metrics flows

# Validation pipeline metrics
qflow metrics validation
```

#### Web Dashboard
Access the monitoring dashboard at `http://localhost:8080/dashboard`:
- Real-time execution status
- Performance metrics
- Error rates and trends
- Resource utilization

### Debugging

#### Debug Mode
```bash
# Enable debug logging
qflow config set logging.level debug

# Run flow with debugging
qflow start my-flow --debug

# Trace execution
qflow trace <execution-id>
```

#### Step-by-Step Execution
```bash
# Pause execution at specific step
qflow start my-flow --pause-at process-data

# Resume execution
qflow resume <execution-id>

# Step through execution
qflow step <execution-id>
```

## Best Practices

### Flow Design

#### 1. Keep Flows Simple
- Break complex workflows into smaller, focused flows
- Use clear, descriptive step names
- Limit the number of steps per flow (recommended: < 20)

#### 2. Error Handling
```yaml
- id: "api-call"
  type: "task"
  action: "qflow.action.http"
  params:
    url: "https://api.example.com/data"
  onSuccess: "process-data"
  onFailure: "handle-error"
  retryPolicy:
    maxAttempts: 3
    backoffMs: 1000

- id: "handle-error"
  type: "task"
  action: "qflow.action.log"
  params:
    level: "error"
    message: "API call failed: ${error.message}"
```

#### 3. Resource Management
```yaml
resourceLimits:
  memoryMB: 128
  cpuTimeMs: 30000
  networkTimeoutMs: 10000
```

### Security

#### 1. Credential Security
- Never hardcode credentials in flow definitions
- Use the credential management system
- Rotate credentials regularly
- Use least-privilege access

#### 2. Input Validation
```yaml
- id: "validate-input"
  type: "condition"
  action: "qflow.condition.validate"
  params:
    schema:
      type: "object"
      required: ["email", "name"]
      properties:
        email:
          type: "string"
          format: "email"
        name:
          type: "string"
          minLength: 1
```

#### 3. Sandbox Security
- All custom code runs in secure WASM sandboxes
- Network access is restricted by default
- File system access is isolated

### Performance

#### 1. Parallel Execution
```yaml
- id: "parallel-tasks"
  type: "parallel"
  steps:
    - id: "fetch-users"
      action: "qflow.action.http"
      params:
        url: "https://api.example.com/users"
    - id: "fetch-orders"
      action: "qflow.action.http"
      params:
        url: "https://api.example.com/orders"
```

#### 2. Caching
```yaml
- id: "cached-request"
  type: "task"
  action: "qflow.action.http"
  params:
    url: "https://api.example.com/data"
    cache:
      enabled: true
      ttlSeconds: 300
      key: "api-data-${date}"
```

#### 3. Resource Optimization
- Use appropriate resource limits
- Minimize data transfer between steps
- Use streaming for large datasets

## Common Use Cases

### 1. API Integration

#### Webhook Processing
```yaml
id: "webhook-processor"
name: "Process Incoming Webhooks"
steps:
  - id: "webhook-trigger"
    type: "event-trigger"
    action: "qflow.trigger.webhook"
    params:
      path: "github-webhook"
      method: "POST"
    onEvent: "validate-payload"
  
  - id: "validate-payload"
    type: "condition"
    action: "qflow.condition.validate"
    params:
      schema:
        type: "object"
        required: ["repository", "action"]
    onTrue: "process-event"
    onFalse: "reject-payload"
  
  - id: "process-event"
    type: "task"
    action: "qflow.action.function"
    params:
      code: |
        if (input.action === 'push') {
          return { action: 'deploy', repository: input.repository.name };
        }
        return { action: 'ignore' };
```

#### Data Synchronization
```yaml
id: "data-sync"
name: "Sync Data Between Systems"
steps:
  - id: "fetch-source-data"
    type: "task"
    action: "qflow.action.http"
    params:
      url: "https://source-api.com/data"
      headers:
        Authorization: "Bearer ${secrets.source_token}"
  
  - id: "transform-data"
    type: "task"
    action: "qflow.action.transform"
    params:
      mapping:
        id: "${data.source_id}"
        name: "${data.display_name}"
        email: "${data.email_address}"
  
  - id: "update-destination"
    type: "task"
    action: "qflow.action.http"
    params:
      method: "PUT"
      url: "https://dest-api.com/users/${data.id}"
      headers:
        Authorization: "Bearer ${secrets.dest_token}"
      body: "${JSON.stringify(data)}"
```

### 2. Notification Systems

#### Multi-Channel Notifications
```yaml
id: "notification-system"
name: "Send Multi-Channel Notifications"
steps:
  - id: "prepare-message"
    type: "task"
    action: "qflow.action.transform"
    params:
      mapping:
        subject: "Alert: ${input.alert.title}"
        message: "${input.alert.description}"
        priority: "${input.alert.severity}"
  
  - id: "send-notifications"
    type: "parallel"
    steps:
      - id: "send-email"
        action: "qflow.module.qmail"
        params:
          to: "${input.recipients.email}"
          subject: "${data.subject}"
          body: "${data.message}"
      
      - id: "send-chat"
        action: "qflow.module.qchat"
        params:
          channel: "${input.recipients.chat_channel}"
          message: "${data.message}"
```

### 3. Data Processing Pipelines

#### ETL Pipeline
```yaml
id: "etl-pipeline"
name: "Extract, Transform, Load Pipeline"
steps:
  - id: "extract-data"
    type: "task"
    action: "qflow.action.http"
    params:
      url: "https://data-source.com/export"
      method: "GET"
  
  - id: "validate-data"
    type: "condition"
    action: "qflow.condition.validate"
    params:
      schema:
        type: "array"
        items:
          type: "object"
          required: ["id", "timestamp", "value"]
    onTrue: "transform-data"
    onFalse: "handle-invalid-data"
  
  - id: "transform-data"
    type: "task"
    action: "qflow.action.function"
    params:
      code: |
        return input.data.map(record => ({
          id: record.id,
          timestamp: new Date(record.timestamp).toISOString(),
          value: parseFloat(record.value),
          processed_at: new Date().toISOString()
        }));
  
  - id: "load-data"
    type: "task"
    action: "qflow.action.http"
    params:
      method: "POST"
      url: "https://data-warehouse.com/import"
      body: "${JSON.stringify(data)}"
```

## Troubleshooting

### Common Issues

#### 1. Flow Won't Start
**Symptoms**: Flow remains in "pending" status

**Solutions**:
- Check authentication: `qflow auth status`
- Verify flow definition: `qflow validate my-flow.yaml`
- Check node availability: `qflow nodes list`
- Review permissions: `qflow permissions check my-flow`

#### 2. Step Execution Fails
**Symptoms**: Step shows "failed" status

**Solutions**:
- Check step logs: `qflow logs <execution-id> --step <step-id>`
- Verify parameters: Review step configuration
- Check credentials: Ensure secrets are properly configured
- Test connectivity: Verify external service availability

#### 3. Slow Execution
**Symptoms**: Flow takes longer than expected

**Solutions**:
- Enable parallel execution for independent steps
- Optimize resource limits
- Use caching for repeated operations
- Check network connectivity

#### 4. Permission Denied
**Symptoms**: "Permission denied" or "Unauthorized" errors

**Solutions**:
- Verify sQuid identity: `qflow identity whoami`
- Check flow permissions: `qflow flow permissions <flow-id>`
- Refresh authentication: `qflow auth refresh`
- Verify DAO membership if using DAO subnets

### Getting Help

#### Documentation
- [API Documentation](./api/README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Migration Guide](./MIGRATION.md)

#### Community Support
- **Discord**: [https://discord.gg/qflow](https://discord.gg/qflow)
- **GitHub Issues**: [https://github.com/anarq/qflow/issues](https://github.com/anarq/qflow/issues)
- **Stack Overflow**: Tag questions with `qflow`

#### Professional Support
- **Email**: support@anarq.org
- **Enterprise Support**: enterprise@anarq.org

## Next Steps

Now that you've learned the basics of Qflow, consider exploring:

1. **Advanced Features**:
   - Custom WASM modules
   - Complex conditional logic
   - Advanced data transformations

2. **Integration**:
   - Connect with other AnarQ & Q modules
   - Build custom integrations
   - Create reusable templates

3. **Optimization**:
   - Performance tuning
   - Resource optimization
   - Monitoring and alerting

4. **Governance**:
   - DAO subnet management
   - Advanced permissions
   - Compliance and auditing

Welcome to the world of distributed automation with Qflow!