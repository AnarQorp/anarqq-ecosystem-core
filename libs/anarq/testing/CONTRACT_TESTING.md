# Q Ecosystem Contract Testing Suite

A comprehensive contract testing framework for the Q ecosystem modules, ensuring API compatibility, schema validation, cross-module interoperability, and ecosystem-wide quality standards.

## 🚀 Enhanced Features (v2.0)

### ✅ Advanced Contract Validation
- **Schema Evolution Tracking**: Monitor schema changes and compatibility over time
- **Cross-Module Integration Testing**: Validate known integration patterns between modules
- **Standard Header Consistency**: Ensure consistent implementation of ecosystem headers
- **Event Naming Convention Validation**: Enforce `q.<module>.<action>.<version>` pattern
- **Response Format Standardization**: Validate consistent API response structures

### ✅ Quality Gates & CI/CD Integration
- **Configurable Quality Gates**: Coverage, warnings, performance, security thresholds
- **Enhanced Failure Analysis**: Pattern detection and impact assessment
- **Performance Monitoring**: Test execution time, memory usage, bottleneck identification
- **Security Scanning Integration**: Vulnerability detection and secret scanning
- **Dependency Analysis**: Outdated packages, vulnerabilities, circular dependencies

### ✅ Comprehensive Reporting
- **Interactive HTML Dashboard**: Rich visualizations and drill-down capabilities
- **Quality Gate Status**: Clear pass/fail indicators with actionable recommendations
- **Performance Metrics**: Execution time analysis and optimization suggestions
- **Security Findings**: Vulnerability reports with remediation guidance
- **Trend Analysis**: Historical data and regression detection

## Overview

The Contract Testing Suite provides:

- **Schema Validation**: Validates JSON schemas for requests, responses, and events
- **API Compliance**: Tests OpenAPI specifications for correctness and completeness
- **MCP Tool Validation**: Validates Model Context Protocol tool definitions
- **Cross-Module Compatibility**: Tests integration contracts between modules
- **Automated Test Generation**: Generates test data and validation tests from schemas
- **CI/CD Integration**: Provides quality gates and automated reporting
- **Comprehensive Reporting**: HTML, JSON, JUnit, and Markdown reports

## Features

### ✅ Contract Validation
- JSON Schema validation with AJV
- OpenAPI 3.0 specification validation
- MCP tool schema validation
- Event schema validation
- Cross-module compatibility checking

### ✅ Test Generation
- Automatic test data generation from schemas
- Contract test suite generation
- Cross-module integration tests
- API endpoint testing (when services are running)

### ✅ Quality Gates
- Coverage thresholds
- Error count limits
- Warning thresholds
- Critical issue detection
- Compatibility requirements

### ✅ Reporting & Analytics
- HTML reports with interactive dashboards
- JUnit XML for CI/CD integration
- JSON reports for programmatic access
- Markdown reports for documentation
- Failure pattern analysis
- Impact assessment
- Actionable recommendations

### ✅ CI/CD Integration
- GitHub Actions workflow
- Quality gate enforcement
- Automated PR comments
- Slack notifications
- Badge generation
- Artifact management

## Installation

```bash
# Install the testing library
cd libs/anarq/testing
npm install
npm run build

# Install globally for CLI access
npm install -g @anarq/testing
```

## Quick Start

### Command Line Usage

```bash
# Run all contract tests
contract-test run

# Run tests for specific modules
contract-test run --include qchat,qdrive,qwallet

# Run with custom configuration
contract-test run \
  --modules ./modules \
  --output ./test-results \
  --timeout 60000 \
  --fail-on-warnings

# Validate a single module
contract-test validate modules/qchat

# Watch mode for development
contract-test watch --verbose
```

### Programmatic Usage

```javascript
import { ContractTestRunner } from '@anarq/testing';

const runner = new ContractTestRunner({
  modulesPath: './modules',
  outputPath: './test-results/contract-tests',
  testCrossModule: true,
  generateReports: true,
  parallel: true
});

const results = await runner.runAllTests();
console.log(`Tests: ${results.summary.passed}/${results.summary.total} passed`);
```

### Individual Module Validation

```javascript
import { ContractValidator } from '@anarq/testing';

const validator = new ContractValidator();
const result = await validator.validateModuleContract('./modules/qchat');

if (result.valid) {
  console.log('✅ Module contract is valid');
} else {
  console.log('❌ Contract validation failed');
  result.errors.forEach(error => {
    console.log(`  ${error.type}: ${error.message}`);
  });
}
```

## Module Structure Requirements

For contract testing to work effectively, modules should follow this structure:

```
module-name/
├── package.json                 # Module metadata
├── openapi.yaml                # HTTP API specification (optional)
├── mcp.json                    # MCP tools specification (optional)
├── contracts/                  # Request/response schemas
│   ├── *.schema.json          # JSON Schema definitions
│   └── *.test.js              # Contract tests (optional)
├── events/                     # Event definitions
│   ├── *.event.json           # Event schemas
│   └── *.test.js              # Event tests (optional)
└── tests/                      # Test suites
    └── contract/               # Contract-specific tests
```

### Example Schema (contracts/message.schema.json)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://schemas.anarq.org/qchat/message.schema.json",
  "title": "Chat Message Schema",
  "type": "object",
  "properties": {
    "messageId": {
      "type": "string",
      "pattern": "^qchat_msg_[a-zA-Z0-9_-]+$"
    },
    "content": {
      "type": "string",
      "minLength": 1,
      "maxLength": 10000
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": ["messageId", "content", "timestamp"]
}
```

### Example Event Schema (events/message-sent.event.json)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Message Sent Event",
  "type": "object",
  "properties": {
    "eventType": {
      "type": "string",
      "const": "q.qchat.message.sent.v1"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "data": {
      "$ref": "./message.schema.json"
    }
  },
  "required": ["eventType", "timestamp", "data"]
}
```

## Configuration

### CLI Configuration

```bash
# Environment variables
export CI_COVERAGE_THRESHOLD=80
export CI_MAX_WARNINGS=10
export CI_FAIL_ON_WARNINGS=true
export CI_PARALLEL=true
export CI_TIMEOUT=60000

# Run with environment configuration
contract-test run
```

### Programmatic Configuration

```javascript
const config = {
  modulesPath: './modules',
  outputPath: './test-results/contract-tests',
  includeModules: ['qchat', 'qdrive', 'qwallet'],
  excludeModules: ['legacy-module'],
  testEndpoints: false,        // Requires running services
  testCrossModule: true,
  generateReports: true,
  failOnWarnings: false,
  parallel: true,
  timeout: 30000
};
```

## CI/CD Integration

### GitHub Actions

The provided GitHub Actions workflow (`.github/workflows/contract-tests.yml`) includes:

- Automatic triggering on contract-related changes
- Parallel module validation
- Quality gate enforcement
- PR comment generation
- Artifact upload
- Security scanning

### Quality Gates

Default quality gates include:

- **Coverage Threshold**: 80% minimum
- **Test Failures**: 0 allowed
- **Warning Limit**: 10 maximum
- **Critical Issues**: 0 allowed

### Custom Quality Gates

```javascript
// In CI script
const gateResults = applyQualityGates(analysis);
if (!gateResults.passed) {
  console.log('Quality gates failed:');
  gateResults.failures.forEach(failure => {
    console.log(`  - ${failure}`);
  });
  process.exit(1);
}
```

## Reports

### HTML Report

Interactive dashboard with:
- Test summary and metrics
- Module-by-module results
- Cross-module compatibility matrix
- Failure analysis and patterns
- Actionable recommendations

### JUnit XML

Standard JUnit format for CI/CD integration:
```xml
<testsuites name="Contract Tests" tests="45" failures="2" errors="0">
  <testsuite name="qchat" tests="15" failures="1" errors="0">
    <testcase name="qchat.schema.message" classname="qchat">
      <failure message="Schema validation failed">...</failure>
    </testcase>
  </testsuite>
</testsuites>
```

### JSON Report

Programmatic access to results:
```json
{
  "summary": {
    "total": 45,
    "passed": 43,
    "failed": 2,
    "warnings": 5,
    "coverage": 87.3
  },
  "modules": [...],
  "failureAnalysis": {...},
  "recommendations": [...]
}
```

## Advanced Features

### Custom Validators

```javascript
import { ContractValidator } from '@anarq/testing';

class CustomValidator extends ContractValidator {
  validateCustomContract(contract) {
    // Custom validation logic
    const errors = [];
    
    // Add custom validation rules
    if (!contract.customField) {
      errors.push({
        type: 'CUSTOM_VALIDATION',
        path: 'customField',
        message: 'Custom field is required',
        severity: 'ERROR'
      });
    }
    
    return errors;
  }
}
```

### Test Data Generation

```javascript
import { ContractValidator } from '@anarq/testing';

const validator = new ContractValidator();

// Generate test data from schema
const schema = {
  type: 'object',
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9-]+$' },
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 18, maximum: 100 }
  }
};

const testData = validator.generateTestData(schema);
// Result: { id: 'abc-123', email: 'test@example.com', age: 25 }
```

### Cross-Module Testing

```javascript
// Test compatibility between modules
const errors = validator.validateCrossModuleCompatibility('qchat', 'qwallet');

if (errors.length > 0) {
  console.log('Compatibility issues found:');
  errors.forEach(error => {
    console.log(`  ${error.type}: ${error.message}`);
  });
}
```

## Best Practices

### Schema Design

1. **Use descriptive titles and descriptions**
2. **Define clear validation rules** (patterns, formats, ranges)
3. **Include examples in schemas**
4. **Version your schemas** with semantic versioning
5. **Use $ref for reusable components**

### Contract Testing

1. **Test early and often** in development
2. **Include contract tests in CI/CD**
3. **Set appropriate quality gates**
4. **Review and address warnings**
5. **Monitor cross-module compatibility**

### Module Development

1. **Follow standard module structure**
2. **Keep schemas up to date** with implementation
3. **Document breaking changes**
4. **Use semantic versioning**
5. **Test with realistic data**

## Troubleshooting

### Common Issues

**Schema Compilation Errors**
```bash
# Check schema syntax
contract-test validate modules/mymodule --verbose
```

**OpenAPI Validation Failures**
```bash
# Validate OpenAPI spec separately
npx swagger-codegen validate -i modules/mymodule/openapi.yaml
```

**Cross-Module Compatibility Issues**
```bash
# Test specific module pair
contract-test run --include moduleA,moduleB --cross-module
```

**Performance Issues**
```bash
# Run tests sequentially
contract-test run --no-parallel --timeout 120000
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=contract-test:* contract-test run --verbose
```

### Test Isolation

```bash
# Test single module in isolation
contract-test validate modules/qchat
```

## Contributing

### Adding New Validators

1. Extend `ContractValidator` class
2. Add validation methods
3. Include error handling
4. Write comprehensive tests
5. Update documentation

### Improving Reports

1. Modify `TestReporter` class
2. Add new report formats
3. Enhance failure analysis
4. Update templates
5. Test with various scenarios

### CI/CD Enhancements

1. Update GitHub Actions workflow
2. Add new quality gates
3. Improve notification systems
4. Enhance artifact management
5. Test with different environments

## API Reference

### ContractValidator

```typescript
class ContractValidator {
  loadModuleContract(modulePath: string): Promise<ModuleContract>
  validateOpenApiSpec(spec: any): ContractValidationError[]
  validateSchema(schema: any, data: any, schemaName: string): ContractValidationError[]
  validateMcpSpec(spec: any): ContractValidationError[]
  validateCrossModuleCompatibility(sourceModule: string, targetModule: string): ContractValidationError[]
  generateTestData(schema: any): any
  testApiEndpoint(baseUrl: string, path: string, method: string, schema: any): Promise<ContractValidationError[]>
}
```

### ContractTestRunner

```typescript
class ContractTestRunner {
  constructor(config: ContractTestConfig)
  discoverModules(): Promise<string[]>
  generateModuleTests(moduleName: string): Promise<ContractTestSuite>
  generateCrossModuleTests(modules: string[]): Promise<ContractTestSuite>
  runTestSuite(suite: ContractTestSuite): Promise<Map<string, ContractValidationResult>>
  runAllTests(): Promise<ContractTestResults>
}
```

### TestReporter

```typescript
class TestReporter {
  constructor(outputPath: string, config?: Partial<ReportConfig>)
  generateReports(results: ContractTestResults): Promise<void>
}
```

## License

MIT License - see LICENSE file for details.

## Support

- 📖 Documentation: [Contract Testing Guide](./CONTRACT_TESTING.md)
- 🐛 Issues: [GitHub Issues](https://github.com/anarq/q-ecosystem/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/anarq/q-ecosystem/discussions)
- 📧 Email: support@anarq.org