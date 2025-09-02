# Qflow Integration Test Suite

Comprehensive integration test suite for the Qflow serverless automation engine, providing end-to-end validation of system functionality, ecosystem integration, and multi-tenant isolation.

## Overview

This test suite validates:

- **Core Functionality**: Basic flow execution, multi-step workflows, parallel processing
- **Multi-Node Execution**: Distributed execution across multiple nodes with failover
- **Ecosystem Integration**: Integration with sQuid, Qlock, Qonsent, Qindex, Qerberos, and QNET
- **Multi-Tenant Isolation**: Tenant separation, resource boundaries, and data protection
- **Security**: Sandbox isolation, permission validation, encryption integrity
- **Performance**: High-volume execution, resource limits, memory management
- **Reliability**: Network partitions, Byzantine fault tolerance, state consistency

## Quick Start

### Installation

```bash
cd modules/qflow/tests/integration
npm install
npm run build
```

### Running Tests

```bash
# Run all integration tests
npm test

# Run with verbose output
npm run test:verbose

# Run only ecosystem integration tests
npm run test:ecosystem

# Run only multi-tenant isolation tests
npm run test:isolation

# Generate HTML report
npm run test:html

# Generate XML report (JUnit format)
npm run test:xml

# Run with code coverage
npm run test:coverage

# Run tests in parallel
npm run test:parallel
```

### Command Line Interface

```bash
# Run all tests with custom configuration
./run-integration-tests.js run --config ./my-config.json --output ./reports

# Run specific test categories
./run-integration-tests.js ecosystem --verbose
./run-integration-tests.js isolation --output ./isolation-reports

# Generate default configuration
./run-integration-tests.js generate-config --output ./test-config.json
```

## Configuration

### Default Configuration

Generate a default configuration file:

```bash
npm run generate-config
```

This creates `test-config.json` with default settings for:

- Test runner configuration
- Ecosystem service endpoints
- Multi-tenant test scenarios
- Resource limits and security policies

### Configuration Structure

```json
{
  "runner": {
    "outputDir": "./test-reports",
    "reportFormat": "console",
    "enableMetrics": true,
    "enableCoverage": false,
    "parallel": false,
    "timeout": 300000
  },
  "ecosystem": {
    "enableRealServices": false,
    "serviceEndpoints": {
      "squid": "http://localhost:8001",
      "qlock": "http://localhost:8002",
      "qonsent": "http://localhost:8003",
      "qindex": "http://localhost:8004",
      "qerberos": "http://localhost:8005",
      "qnet": "http://localhost:8006"
    },
    "testDataSets": {
      "identities": [...],
      "permissions": [...],
      "encryptionKeys": [...],
      "flows": [...]
    },
    "securityLevel": "high"
  },
  "multiTenant": {
    "tenants": [...],
    "isolationLevel": "strict",
    "resourceLimits": {...},
    "securityPolicies": [...]
  }
}
```

## Test Categories

### 1. Core Functionality Tests

- **Basic Flow Execution**: Simple sequential flows
- **Multi-Step Flows**: Complex workflows with dependencies
- **Parallel Execution**: Concurrent step processing
- **Conditional Logic**: Flow branching and decision making
- **Loop Processing**: Iterative flow execution

### 2. Multi-Node Execution Tests

- **Distributed Execution**: Flows spanning multiple nodes
- **Node Failover**: Automatic recovery from node failures
- **Load Balancing**: Request distribution across nodes
- **Auto Scaling**: Dynamic node scaling based on load

### 3. Ecosystem Integration Tests

#### sQuid Identity Integration
- Identity authentication and validation
- Sub-identity management
- Signature verification
- Permission-based access control

#### Qlock Encryption Integration
- Data encryption and decryption
- Key management and rotation
- Flow data protection
- Integrity verification

#### Qonsent Permission Integration
- Dynamic permission validation
- Consent expiration handling
- Access control enforcement
- Real-time permission updates

#### Qindex Metadata Integration
- Flow indexing and searchability
- Metadata registration
- Discovery and categorization
- Search capabilities

#### Qerberos Security Integration
- Integrity checks and validation
- Anomaly detection
- Security violation detection
- Threat containment

#### QNET Network Integration
- Node discovery and management
- Network topology awareness
- Peer-to-peer coordination
- Distributed consensus

### 4. Multi-Tenant Isolation Tests

#### Data Isolation
- Tenant data separation
- Cross-tenant access prevention
- Data leakage detection
- Encryption boundaries

#### Resource Isolation
- Memory limits and monitoring
- CPU usage boundaries
- Storage quotas
- Network bandwidth limits

#### Execution Isolation
- Flow execution separation
- State isolation
- Error containment
- Resource contention prevention

#### Permission Isolation
- Tenant-specific permissions
- Cross-tenant denial
- Privilege escalation prevention
- Identity boundaries

#### DAO Subnet Isolation
- Subnet separation validation
- Governance isolation
- Resource allocation boundaries
- Policy enforcement

### 5. Security Tests

- **Sandbox Isolation**: WASM runtime security
- **Permission Validation**: Access control testing
- **Encryption Integrity**: Data protection verification
- **Audit Trail Generation**: Security event logging

### 6. Performance Tests

- **High Volume Execution**: Concurrent flow processing
- **Resource Limits**: Memory and CPU constraints
- **Scalability**: Dynamic scaling validation
- **Memory Leak Detection**: Resource cleanup verification

### 7. Reliability Tests

- **Network Partitions**: Partition tolerance testing
- **Byzantine Fault Tolerance**: Malicious node handling
- **State Consistency**: Distributed state validation
- **Recovery Mechanisms**: Failure recovery testing

## Test Reports

### Report Formats

- **Console**: Real-time test output with colored status indicators
- **JSON**: Structured test results for programmatic processing
- **XML**: JUnit-compatible format for CI/CD integration
- **HTML**: Interactive web-based report with charts and metrics

### Report Contents

- **Test Summary**: Pass/fail counts, success rates, duration
- **Detailed Results**: Individual test outcomes with assertions
- **Performance Metrics**: Memory usage, CPU utilization, network traffic
- **Security Events**: Violations, threats, and containment actions
- **Isolation Analysis**: Tenant separation validation results
- **Recommendations**: Actionable insights for improvements

### Sample Report Structure

```json
{
  "summary": {
    "total": 45,
    "passed": 42,
    "failed": 2,
    "skipped": 1,
    "successRate": 0.933,
    "totalDuration": 125000
  },
  "results": [...],
  "metrics": {
    "memoryUsage": {...},
    "cpuUsage": {...},
    "networkTraffic": {...}
  },
  "ecosystem": {
    "squid": {...},
    "qlock": {...},
    "qonsent": {...}
  },
  "isolation": {
    "violations": [...],
    "tenantResults": [...]
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Integration Tests
on: [push, pull_request]
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test -- --format xml --output ./test-results
      - uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Integration Test Results
          path: './test-results/*.xml'
          reporter: jest-junit
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Integration Tests') {
            steps {
                sh 'npm ci'
                sh 'npm run test -- --format xml --output ./test-results'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results/*.xml'
                }
            }
        }
    }
}
```

## Development

### Adding New Tests

1. **Core Tests**: Add to `IntegrationTestSuite.ts`
2. **Ecosystem Tests**: Add to `EcosystemIntegrationTests.ts`
3. **Isolation Tests**: Add to `MultiTenantIsolationTests.ts`

### Test Structure

```typescript
private async testNewFeature(): Promise<void> {
  await this.runTest('New Feature Test', async () => {
    // Test setup
    const flow: FlowDefinition = { ... };
    
    // Test execution
    const execution = await this.executionEngine.startExecution(flow, {});
    await this.waitForCompletion(execution.id);
    
    // Assertions
    const status = await this.executionEngine.getExecutionStatus(execution.id);
    this.assert('Feature works correctly', status.status, 'completed');
  });
}
```

### Mock Services

The test suite includes mock implementations of ecosystem services for isolated testing:

- `MockSquidService`: Identity authentication simulation
- `MockQlockService`: Encryption/decryption simulation
- `MockQonsentService`: Permission validation simulation
- `MockQindexService`: Indexing and search simulation
- `MockQerberosService`: Security validation simulation
- `MockQnetService`: Network discovery simulation

### Real Service Integration

To test against real services, update the configuration:

```json
{
  "ecosystem": {
    "enableRealServices": true,
    "serviceEndpoints": {
      "squid": "https://squid.example.com",
      "qlock": "https://qlock.example.com"
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout in configuration
2. **Memory Issues**: Reduce concurrent test count
3. **Network Errors**: Check service endpoints
4. **Permission Errors**: Verify test data configuration

### Debug Mode

```bash
# Run with verbose logging
npm run test:verbose

# Run single test category
npm run test:ecosystem -- --verbose

# Generate detailed reports
npm run test:html
```

### Log Analysis

Test logs are available in:
- Console output during execution
- JSON reports in `test-reports/` directory
- HTML reports with interactive filtering

## Performance Benchmarks

### Expected Performance

- **Basic Flow Execution**: < 100ms
- **Multi-Step Flows**: < 500ms
- **Parallel Execution**: < 2s for 10 concurrent steps
- **High Volume**: > 10 flows/second
- **Memory Usage**: < 512MB for standard test suite
- **CPU Usage**: < 50% on 2-core system

### Performance Monitoring

The test suite automatically monitors:
- Execution times for all tests
- Memory usage patterns
- CPU utilization
- Network traffic
- Resource cleanup efficiency

## Security Considerations

### Test Data

- All test data uses mock/synthetic values
- No real credentials or sensitive information
- Encryption keys are test-only and rotated
- Identity signatures are simulated

### Isolation Validation

- Cross-tenant access attempts are logged
- Resource boundary violations are detected
- Permission bypass attempts are blocked
- Security events are audited

### Compliance

The test suite validates:
- GDPR data protection requirements
- SOC2 audit trail generation
- Security control effectiveness
- Privacy boundary enforcement

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Test Guidelines

- Write descriptive test names
- Include comprehensive assertions
- Add error handling and cleanup
- Document test purpose and expectations
- Follow existing code patterns

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: [Qflow Docs](https://docs.qflow.dev)
- **Issues**: [GitHub Issues](https://github.com/qflow/qflow-serverless-automation/issues)
- **Discussions**: [GitHub Discussions](https://github.com/qflow/qflow-serverless-automation/discussions)
- **Community**: [Discord Server](https://discord.gg/qflow)