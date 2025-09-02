/**
 * Performance Monitoring Example Component
 * Demonstrates how to use the performance monitoring system
 * in wallet components and operations
 */

import React, { useState } from 'react';
import { useWalletPerformance } from '../../hooks/useWalletPerformance';
import { usePerformanceMonitor } from '../../utils/performance/PerformanceMonitor';
import { useWalletCache } from '../../utils/performance/WalletCache';

export const PerformanceExample: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  
  const performance = useWalletPerformance({
    autoStart: true,
    alertThreshold: 3,
    reportInterval: 10000
  });
  
  const monitor = usePerformanceMonitor();
  const cache = useWalletCache();

  const addResult = (message: string) => {
    setResults(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 9)]);
  };

  const simulateIdentitySwitch = async () => {
    setIsRunning(true);
    addResult('Starting identity switch simulation...');

    try {
      const result = await monitor.trackOperation('identity_switch', async () => {
        // Simulate identity switch with random delay
        const delay = Math.random() * 1000 + 200; // 200-1200ms
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Simulate cache operations
        const identityId = `identity_${Math.floor(Math.random() * 5)}`;
        cache.setBalances(identityId, {
          identityId,
          walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
          balances: [
            {
              token: 'ETH',
              symbol: 'ETH',
              balance: Math.random() * 10,
              decimals: 18,
              valueUSD: Math.random() * 20000
            }
          ],
          totalValueUSD: Math.random() * 20000,
          lastUpdated: new Date().toISOString()
        });
        
        return { identityId, delay };
      });

      addResult(`Identity switch completed: ${result.identityId} (${result.delay.toFixed(0)}ms)`);
    } catch (error) {
      addResult(`Identity switch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const simulateTokenTransfer = async () => {
    setIsRunning(true);
    addResult('Starting token transfer simulation...');

    try {
      const result = await monitor.trackOperation('token_transfer', async () => {
        // Simulate transfer with longer delay
        const delay = Math.random() * 2000 + 500; // 500-2500ms
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const amount = Math.random() * 1000;
        const success = Math.random() > 0.1; // 90% success rate
        
        if (!success) {
          throw new Error('Transfer validation failed');
        }
        
        return { amount, delay, success };
      });

      addResult(`Token transfer completed: ${result.amount.toFixed(2)} tokens (${result.delay.toFixed(0)}ms)`);
    } catch (error) {
      addResult(`Token transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const simulateSlowOperation = async () => {
    setIsRunning(true);
    addResult('Starting slow operation (will trigger alert)...');

    try {
      const result = await monitor.trackOperation('wallet_balance_load', async () => {
        // Intentionally slow operation to trigger alert
        const delay = 4000; // 4 seconds - should trigger critical alert
        await new Promise(resolve => setTimeout(resolve, delay));
        return { delay };
      });

      addResult(`Slow operation completed (${result.delay}ms) - Check for alerts!`);
    } catch (error) {
      addResult(`Slow operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearMetrics = () => {
    performance.actions.clearMetrics();
    setResults([]);
    addResult('All metrics and cache cleared');
  };

  const optimizeCache = async () => {
    setIsRunning(true);
    addResult('Optimizing cache...');

    try {
      await performance.actions.optimizeCache();
      addResult('Cache optimization completed');
    } catch (error) {
      addResult(`Cache optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Monitoring Demo</h3>
      
      {/* Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-3 rounded-lg ${
          performance.isHealthy ? 'bg-green-100' : 
          performance.hasWarnings ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          <div className="text-sm font-medium">Health Status</div>
          <div className={`text-lg font-bold ${
            performance.isHealthy ? 'text-green-800' : 
            performance.hasWarnings ? 'text-yellow-800' : 'text-red-800'
          }`}>
            {performance.healthStatus}
          </div>
        </div>
        
        <div className="p-3 bg-blue-100 rounded-lg">
          <div className="text-sm font-medium text-blue-600">Active Metrics</div>
          <div className="text-lg font-bold text-blue-800">
            {performance.currentMetrics.length}
          </div>
        </div>
        
        <div className="p-3 bg-purple-100 rounded-lg">
          <div className="text-sm font-medium text-purple-600">Recent Alerts</div>
          <div className="text-lg font-bold text-purple-800">
            {performance.recentAlerts.length}
          </div>
        </div>
        
        <div className="p-3 bg-gray-100 rounded-lg">
          <div className="text-sm font-medium text-gray-600">Cache Health</div>
          <div className={`text-lg font-bold ${
            cache.isHealthy() ? 'text-green-800' : 'text-red-800'
          }`}>
            {cache.isHealthy() ? 'GOOD' : 'POOR'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={simulateIdentitySwitch}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Simulate Identity Switch
        </button>
        
        <button
          onClick={simulateTokenTransfer}
          disabled={isRunning}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          Simulate Token Transfer
        </button>
        
        <button
          onClick={simulateSlowOperation}
          disabled={isRunning}
          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
        >
          Trigger Slow Operation
        </button>
        
        <button
          onClick={optimizeCache}
          disabled={isRunning}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          Optimize Cache
        </button>
        
        <button
          onClick={clearMetrics}
          disabled={isRunning}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          Clear Metrics
        </button>
      </div>

      {/* Recent Alerts */}
      {performance.recentAlerts.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-2">Recent Alerts</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {performance.recentAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={`p-2 rounded border-l-4 text-sm ${
                  alert.severity === 'CRITICAL' 
                    ? 'border-red-500 bg-red-50 text-red-800' 
                    : 'border-yellow-500 bg-yellow-50 text-yellow-800'
                }`}
              >
                <div className="font-medium">{alert.severity}: {alert.metric.name}</div>
                <div className="text-xs">{alert.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {performance.recommendations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-2">Recommendations</h4>
          <div className="space-y-1">
            {performance.recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="p-2 bg-blue-50 rounded text-sm text-blue-800">
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-2">Activity Log</h4>
        <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-gray-500 text-sm">No activity yet. Try running some operations above.</div>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => (
                <div key={index} className="text-sm font-mono text-gray-700">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      {performance.report && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-md font-semibold text-gray-900 mb-2">Performance Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Total Operations</div>
              <div className="font-bold">{performance.report.summary.totalMetrics}</div>
            </div>
            <div>
              <div className="text-gray-600">Avg Duration</div>
              <div className="font-bold">{performance.report.summary.averageDuration.toFixed(0)}ms</div>
            </div>
            <div>
              <div className="text-gray-600">Error Rate</div>
              <div className="font-bold">{(performance.report.summary.errorRate * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-600">Cache Hit Rate</div>
              <div className="font-bold">
                {performance.cacheStats ? (performance.cacheStats.hitRate * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceExample;