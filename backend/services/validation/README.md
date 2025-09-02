# Ecosystem Integrity Validation Infrastructure

This directory contains the core validation infrastructure for the AnarQ&Q ecosystem integrity validation system.

## Overview

The validation infrastructure provides:
- Base ValidationService class with common functionality
- Event bus integration for validation events
- ObservabilityService integration for metrics collection
- Health endpoints that export basic metrics for 8+ Q∞ modules
- Artifacts generation in `artifacts/bootstrap/`

## Components

### ValidationService.mjs
Base class providing:
- Health monitoring and checks
- Event bus integration
- Metrics collection
- Validation execution framework
- Error handling and recovery

### ValidationUtils.mjs
Utility functions for:
- Q∞ module definitions (8+ modules)
- Environment configurations (local/staging/QNET Phase 2)
- Performance gate validation
- Health sample generation
- Validation report creation

### HealthExporter.mjs
Specialized service for:
- Exporting health metrics for all Q∞ modules
- Generating required artifacts
- Environment matrix support
- Comprehensive health reporting

## Gate Requirements ✅

### Module Count Gate
- **Required**: 8+ Q∞ modules
- **Actual**: 8 modules (squid, qlock, qonsent, qindex, qerberos, qflow, qwallet, qnet)
- **Status**: ✅ PASSED

### Health Export Gate
- **Requirement**: Health endpoints export basic metrics for 8+ modules
- **Implementation**: HealthExporter generates health-sample.json with metrics for all modules
- **Status**: ✅ PASSED

### Environment Matrix Gate
- **Requirement**: Support for local / staging / QNET Phase 2
- **Implementation**: Environment configurations in ValidationUtils
- **Status**: ✅ PASSED

## Artifacts Generated

All artifacts are saved to `artifacts/bootstrap/`:

- `health-sample.json` - Latest health sample with module metrics
- `health-sample-{env}-{timestamp}.json` - Timestamped health samples
- `comprehensive-health-report.json` - Complete health report
- `observability-metrics-{timestamp}.json` - Observability integration metrics

## Q∞ Modules Supported

1. **sQuid** - Identity management (port 3001)
2. **Qlock** - Encryption services (port 3002)
3. **Qonsent** - Permission management (port 3003)
4. **Qindex** - Metadata indexing (port 3004)
5. **Qerberos** - Security auditing (port 3005)
6. **Qflow** - Serverless workflows (port 3006)
7. **Qwallet** - Payment processing (port 3007)
8. **QNET** - Network layer (port 3008)

## Performance Gates

- P95 latency < 150ms
- P99 latency < 200ms
- Error rate < 10%
- Cache hit rate ≥ 85%

## Usage

### Basic Health Check
```javascript
import { HealthExporter } from './HealthExporter.mjs';

const exporter = new HealthExporter({ environment: 'local' });
await exporter.initialize();
const result = await exporter.exportHealthMetrics();
```

### Validation Execution
```javascript
import { ValidationService } from './ValidationService.mjs';

const validator = new ValidationService({ moduleId: 'my-validator' });
await validator.initialize();

const result = await validator.executeValidation('test-validation', async () => {
  // Your validation logic here
  return { success: true };
});
```

### Performance Gate Validation
```javascript
import { ValidationUtils } from './ValidationUtils.mjs';

const metrics = {
  p95_latency_ms: 120,
  p99_latency_ms: 180,
  error_rate_percent: 5,
  cache_hit_rate_percent: 90
};

const gateResults = ValidationUtils.validatePerformanceGates(metrics);
console.log('Gates passed:', gateResults.passed);
```

## Testing

Run the simple test to verify infrastructure:
```bash
node backend/services/validation/simple-test.mjs
```

## Integration

This infrastructure integrates with:
- **EventBusService** - For validation event publishing/subscribing
- **ObservabilityService** - For metrics collection and health monitoring
- **Task 35/36** - Performance monitoring integration (p99, burn-rate, cache hit)

## Next Steps

This infrastructure is ready for the next tasks:
- Task 2: Implement Integrity Validator with decentralization attestation
- Task 3: Implement Data Flow Tester with execution ledger
- Task 4: Implement Demo Orchestrator with reproducible scenarios
- Task 5: Implement Pi Integration Layer with multi-environment support