/**
 * Simple test to verify QNET basic functionality
 */

import { QNetService } from './src/services/QNetService.js';

async function testBasicFunctionality() {
  console.log('Testing QNET basic functionality...');
  
  try {
    // Create service
    const qnetService = new QNetService({
      nodeId: 'test-node-simple',
      region: 'test-region',
      tier: 'standard',
      mockMode: true
    });
    
    console.log('✓ Service created and initialized');
    
    // Test health check
    const health = await qnetService.getHealth();
    console.log('✓ Health check:', health.status);
    
    // Test ping
    const pingResult = await qnetService.pingNodes({ count: 1 });
    console.log('✓ Ping completed:', pingResult.summary.totalNodes, 'nodes');
    
    // Test capabilities
    const capabilities = await qnetService.getCapabilities();
    console.log('✓ Capabilities retrieved:', capabilities.services.length, 'services');
    
    // Test network status
    const status = await qnetService.getNetworkStatus();
    console.log('✓ Network status:', status.network.totalNodes, 'total nodes,', status.network.activeNodes, 'active');
    
    // Stop service
    await qnetService.stop();
    console.log('✓ Service stopped');
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBasicFunctionality();