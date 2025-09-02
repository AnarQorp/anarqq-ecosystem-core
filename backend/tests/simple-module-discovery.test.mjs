/**
 * Simple Module Discovery Tests
 * Basic tests to verify the module discovery functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleDiscoveryService, getModuleDiscoveryService } from '../services/ModuleDiscoveryService.mjs';
import { getQindexService } from '../ecosystem/QindexService.mjs';

describe('Module Discovery Service', () => {
  let discoveryService;
  let qindexService;

  beforeEach(async () => {
    discoveryService = getModuleDiscoveryService();
    qindexService = getQindexService();
    
    // Clear caches before each test
    discoveryService.clearCaches();
  });

  it('should create discovery service instance', () => {
    expect(discoveryService).toBeDefined();
    expect(discoveryService).toBeInstanceOf(ModuleDiscoveryService);
  });

  it('should have cache management methods', () => {
    expect(typeof discoveryService.clearCaches).toBe('function');
    expect(typeof discoveryService.getCacheStats).toBe('function');
  });

  it('should provide cache statistics', () => {
    const cacheStats = discoveryService.getCacheStats();
    
    expect(cacheStats).toBeDefined();
    expect(cacheStats.search).toBeDefined();
    expect(cacheStats.dependency).toBeDefined();
    expect(cacheStats.metadata).toBeDefined();
    
    expect(cacheStats.search.size).toBe(0); // Should be empty initially
    expect(cacheStats.search.maxSize).toBe(1000);
    expect(cacheStats.search.ttl).toBe(300000);
  });

  it('should have search methods', () => {
    expect(typeof discoveryService.searchModules).toBe('function');
    expect(typeof discoveryService.getModulesByType).toBe('function');
    expect(typeof discoveryService.getModulesForIdentity).toBe('function');
  });

  it('should have dependency resolution methods', () => {
    expect(typeof discoveryService.resolveDependencies).toBe('function');
  });

  it('should have metadata caching methods', () => {
    expect(typeof discoveryService.getCachedModuleMetadata).toBe('function');
  });

  it('should have access statistics methods', () => {
    expect(typeof discoveryService.getModuleAccessStatistics).toBe('function');
  });

  it('should provide performance metrics', () => {
    const metrics = discoveryService.getPerformanceMetrics();
    
    expect(metrics).toBeDefined();
    expect(metrics.totalSearches).toBe(0); // Should be 0 initially
    expect(metrics.averageSearchTime).toBe(0);
    expect(metrics.cacheHitRate).toBe(0);
    expect(metrics.popularFilters).toBeInstanceOf(Array);
  });

  it('should provide cache efficiency metrics', () => {
    const efficiency = discoveryService.getCacheEfficiency();
    
    expect(efficiency).toBeInstanceOf(Array);
    expect(efficiency).toHaveLength(3); // search, dependency, metadata caches
    
    efficiency.forEach(cache => {
      expect(cache).toHaveProperty('cacheName');
      expect(cache).toHaveProperty('size');
      expect(cache).toHaveProperty('totalHits');
      expect(cache).toHaveProperty('averageHits');
      expect(cache).toHaveProperty('hitRate');
    });
  });

  it('should clear all caches', () => {
    // This should not throw an error
    discoveryService.clearCaches();
    
    const cacheStats = discoveryService.getCacheStats();
    expect(cacheStats.search.size).toBe(0);
    expect(cacheStats.dependency.size).toBe(0);
    expect(cacheStats.metadata.size).toBe(0);
  });
});