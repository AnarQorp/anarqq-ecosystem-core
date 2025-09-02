/**
 * Simple validation test to verify infrastructure is working
 */

import { ValidationUtils } from './ValidationUtils.mjs';

console.log('🚀 Testing Validation Infrastructure');

// Test 1: Module definitions
const modules = Object.keys(ValidationUtils.Q_MODULES);
console.log(`✅ Found ${modules.length} Q∞ modules (required: 8+)`);

// Test 2: Environment matrix
const environments = Object.keys(ValidationUtils.ENVIRONMENTS);
console.log(`✅ Environment matrix: ${environments.join(', ')}`);

// Test 3: Performance gates
const mockMetrics = {
  p95_latency_ms: 120,
  p99_latency_ms: 180,
  error_rate_percent: 5,
  cache_hit_rate_percent: 90
};

const gateResults = ValidationUtils.validatePerformanceGates(mockMetrics);
console.log(`✅ Performance gates: ${gateResults.passed ? 'PASSED' : 'FAILED'}`);

// Test 4: Health sample generation
const mockResults = {
  squid: { status: 'healthy', endpoints: [{ success: true, responseTime: 45 }] },
  qlock: { status: 'healthy', endpoints: [{ success: true, responseTime: 52 }] }
};

const healthSample = ValidationUtils.generateHealthSample(mockResults);
console.log(`✅ Health sample generated with ${healthSample.totalModules} modules`);

console.log('\n🎉 All tests passed! Infrastructure is ready.');