/**
 * Resource Billing and Multi-Tenant Management Service
 * 
 * Manages resource usage tracking, billing boundaries, and tenant isolation
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { daoSubnetService } from '../governance/DAOSubnetService.js';

export interface TenantResourceUsage {
  tenantId: string; // DAO subnet ID
  period: string; // ISO date period (YYYY-MM)
  usage: {
    cpu: ResourceMetric;
    memory: ResourceMetric;
    storage: ResourceMetric;
    network: ResourceMetric;
    executions: ResourceMetric;
    apiCalls: ResourceMetric;
  };
  costs: {
    compute: number;
    storage: number;
    network: number;
    operations: number;
    total: number;
  };
  limits: TenantResourceLimits;
  alerts: ResourceAlert[];
}

export interface ResourceMetric {
  current: number;
  peak: number;
  average: number;
  total: number;
  unit: string;
  samples: number;
  lastUpdated: string;
}

export interface TenantResourceLimits {
  tenantId: string;
  limits: {
    maxCpuHours: number;
    maxMemoryGBHours: number;
    maxStorageGB: number;
    maxNetworkGB: number;
    maxExecutions: number;
    maxApiCalls: number;
    maxMonthlyCost: number;
  };
  softLimits: {
    cpuWarningThreshold: number; // Percentage
    memoryWarningThreshold: number;
    costWarningThreshold: number;
  };
  billingTier: 'free' | 'basic' | 'premium' | 'enterprise';
  effectiveFrom: string;
  effectiveUntil?: string;
}

export interface ResourceAlert {
  id: string;
  tenantId: string;
  type: 'warning' | 'limit_exceeded' | 'cost_threshold';
  resource: 'cpu' | 'memory' | 'storage' | 'network' | 'executions' | 'cost';
  message: string;
  threshold: number;
  currentValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface BillingPeriod {
  tenantId: string;
  period: string; // YYYY-MM format
  startDate: string;
  endDate: string;
  usage: TenantResourceUsage['usage'];
  costs: TenantResourceUsage['costs'];
  status: 'active' | 'closed' | 'disputed';
  invoiceId?: string;
  paidAt?: string;
}

export interface ResourcePricing {
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  pricing: {
    cpuPerHour: number; // Cost per CPU hour
    memoryPerGBHour: number; // Cost per GB-hour
    storagePerGBMonth: number; // Cost per GB per month
    networkPerGB: number; // Cost per GB transferred
    executionBase: number; // Base cost per execution
    apiCallPer1000: number; // Cost per 1000 API calls
  };
  includedQuotas: {
    cpuHours: number;
    memoryGBHours: number;
    storageGB: number;
    networkGB: number;
    executions: number;
    apiCalls: number;
  };
  effectiveFrom: string;
}

export interface TenantIsolationConfig {
  tenantId: string;
  isolation: {
    networkSegmentation: boolean;
    storageEncryption: boolean;
    computeIsolation: boolean;
    logIsolation: boolean;
    metricIsolation: boolean;
  };
  dataResidency: {
    region: string;
    allowCrossRegion: boolean;
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
  };
  compliance: {
    gdprCompliant: boolean;
    hipaaCompliant: boolean;
    soc2Compliant: boolean;
    customCompliance: string[];
  };
}

export class ResourceBillingService extends EventEmitter {
  private usageCache = new Map<string, TenantResourceUsage>();
  private limitsCache = new Map<string, TenantResourceLimits>();
  private alertsCache = new Map<string, ResourceAlert[]>();
  private billingPeriodsCache = new Map<string, BillingPeriod[]>();
  private isolationConfigCache = new Map<string, TenantIsolationConfig>();
  private pricingTiers = new Map<string, ResourcePricing>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
    this.setupEventHandlers();
    this.initializePricingTiers();
    this.startUsageTracking();
  }

  /**
   * Initialize tenant resource tracking
   */
  async initializeTenant(
    tenantId: string,
    billingTier: TenantResourceLimits['billingTier'] = 'free'
  ): Promise<TenantResourceLimits> {
    try {
      const limits = this.getDefaultLimitsForTier(billingTier);
      limits.tenantId = tenantId;
      limits.effectiveFrom = new Date().toISOString();

      this.limitsCache.set(tenantId, limits);

      // Initialize usage tracking
      const currentPeriod = this.getCurrentPeriod();
      const usage = this.createEmptyUsage(tenantId, currentPeriod);
      this.usageCache.set(`${tenantId}:${currentPeriod}`, usage);

      // Initialize isolation config
      const isolationConfig = this.getDefaultIsolationConfig(tenantId, billingTier);
      this.isolationConfigCache.set(tenantId, isolationConfig);

      // Emit tenant initialization event
      qflowEventEmitter.emit('q.qflow.billing.tenant.initialized.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-billing',
        actor: 'system',
        data: {
          tenantId,
          billingTier,
          limits: limits.limits,
          isolationConfig: isolationConfig.isolation
        }
      });

      return limits;

    } catch (error) {
      console.error(`[ResourceBilling] Failed to initialize tenant: ${error}`);
      throw error;
    }
  }

  /**
   * Track resource usage for execution
   */
  async trackExecutionUsage(
    tenantId: string,
    executionId: string,
    resourceUsage: {
      cpuTime: number; // CPU seconds
      memoryUsage: number; // MB-seconds
      storageUsed: number; // MB
      networkTransfer: number; // MB
      duration: number; // seconds
    }
  ): Promise<void> {
    try {
      const currentPeriod = this.getCurrentPeriod();
      const usageKey = `${tenantId}:${currentPeriod}`;
      
      let usage = this.usageCache.get(usageKey);
      if (!usage) {
        usage = this.createEmptyUsage(tenantId, currentPeriod);
      }

      // Update usage metrics
      const cpuHours = resourceUsage.cpuTime / 3600;
      const memoryGBHours = (resourceUsage.memoryUsage / 1024) / 3600;
      const storageGB = resourceUsage.storageUsed / 1024;
      const networkGB = resourceUsage.networkTransfer / 1024;

      this.updateMetric(usage.usage.cpu, cpuHours, 'hours');
      this.updateMetric(usage.usage.memory, memoryGBHours, 'GB-hours');
      this.updateMetric(usage.usage.storage, storageGB, 'GB');
      this.updateMetric(usage.usage.network, networkGB, 'GB');
      this.updateMetric(usage.usage.executions, 1, 'count');

      // Calculate costs
      await this.updateCosts(usage);

      // Check limits and generate alerts
      await this.checkLimitsAndAlert(tenantId, usage);

      this.usageCache.set(usageKey, usage);

      // Emit usage tracking event
      qflowEventEmitter.emit('q.qflow.billing.usage.tracked.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-billing',
        actor: 'system',
        data: {
          tenantId,
          executionId,
          period: currentPeriod,
          resourceUsage,
          totalCost: usage.costs.total
        }
      });

    } catch (error) {
      console.error(`[ResourceBilling] Failed to track usage: ${error}`);
    }
  }

  /**
   * Track API call usage
   */
  async trackAPIUsage(
    tenantId: string,
    endpoint: string,
    responseTime: number,
    statusCode: number
  ): Promise<void> {
    try {
      const currentPeriod = this.getCurrentPeriod();
      const usageKey = `${tenantId}:${currentPeriod}`;
      
      let usage = this.usageCache.get(usageKey);
      if (!usage) {
        usage = this.createEmptyUsage(tenantId, currentPeriod);
      }

      this.updateMetric(usage.usage.apiCalls, 1, 'count');
      
      // Update costs
      await this.updateCosts(usage);

      this.usageCache.set(usageKey, usage);

      // Emit API usage event
      qflowEventEmitter.emit('q.qflow.billing.api.tracked.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-billing',
        actor: 'system',
        data: {
          tenantId,
          endpoint,
          responseTime,
          statusCode,
          period: currentPeriod
        }
      });

    } catch (error) {
      console.error(`[ResourceBilling] Failed to track API usage: ${error}`);
    }
  }

  /**
   * Check if tenant can allocate resources
   */
  async canAllocateResources(
    tenantId: string,
    requestedResources: {
      cpu?: number;
      memory?: number;
      storage?: number;
      executions?: number;
    }
  ): Promise<{ allowed: boolean; reason?: string; limits?: any }> {
    try {
      const limits = this.limitsCache.get(tenantId);
      if (!limits) {
        return { allowed: false, reason: 'Tenant limits not found' };
      }

      const currentPeriod = this.getCurrentPeriod();
      const usage = this.usageCache.get(`${tenantId}:${currentPeriod}`);
      if (!usage) {
        return { allowed: true }; // No usage yet, allow allocation
      }

      // Check each resource limit
      if (requestedResources.cpu) {
        const projectedCpuHours = usage.usage.cpu.total + (requestedResources.cpu / 3600);
        if (projectedCpuHours > limits.limits.maxCpuHours) {
          return {
            allowed: false,
            reason: 'CPU hours limit exceeded',
            limits: {
              current: usage.usage.cpu.total,
              limit: limits.limits.maxCpuHours,
              requested: requestedResources.cpu / 3600
            }
          };
        }
      }

      if (requestedResources.memory) {
        const projectedMemoryGBHours = usage.usage.memory.total + (requestedResources.memory / 1024 / 3600);
        if (projectedMemoryGBHours > limits.limits.maxMemoryGBHours) {
          return {
            allowed: false,
            reason: 'Memory limit exceeded',
            limits: {
              current: usage.usage.memory.total,
              limit: limits.limits.maxMemoryGBHours,
              requested: requestedResources.memory / 1024 / 3600
            }
          };
        }
      }

      if (requestedResources.storage) {
        const projectedStorageGB = usage.usage.storage.total + (requestedResources.storage / 1024);
        if (projectedStorageGB > limits.limits.maxStorageGB) {
          return {
            allowed: false,
            reason: 'Storage limit exceeded',
            limits: {
              current: usage.usage.storage.total,
              limit: limits.limits.maxStorageGB,
              requested: requestedResources.storage / 1024
            }
          };
        }
      }

      if (requestedResources.executions) {
        const projectedExecutions = usage.usage.executions.total + requestedResources.executions;
        if (projectedExecutions > limits.limits.maxExecutions) {
          return {
            allowed: false,
            reason: 'Execution limit exceeded',
            limits: {
              current: usage.usage.executions.total,
              limit: limits.limits.maxExecutions,
              requested: requestedResources.executions
            }
          };
        }
      }

      // Check cost limits
      const projectedCost = await this.calculateProjectedCost(tenantId, requestedResources);
      if (usage.costs.total + projectedCost > limits.limits.maxMonthlyCost) {
        return {
          allowed: false,
          reason: 'Monthly cost limit exceeded',
          limits: {
            current: usage.costs.total,
            limit: limits.limits.maxMonthlyCost,
            projected: projectedCost
          }
        };
      }

      return { allowed: true };

    } catch (error) {
      console.error(`[ResourceBilling] Resource allocation check failed: ${error}`);
      return { allowed: false, reason: 'Resource check failed' };
    }
  }

  /**
   * Get tenant resource usage
   */
  async getTenantUsage(tenantId: string, period?: string): Promise<TenantResourceUsage | null> {
    try {
      const targetPeriod = period || this.getCurrentPeriod();
      const usageKey = `${tenantId}:${targetPeriod}`;
      
      return this.usageCache.get(usageKey) || null;

    } catch (error) {
      console.error(`[ResourceBilling] Failed to get tenant usage: ${error}`);
      return null;
    }
  }

  /**
   * Get tenant alerts
   */
  async getTenantAlerts(tenantId: string, unacknowledgedOnly: boolean = false): Promise<ResourceAlert[]> {
    try {
      const alerts = this.alertsCache.get(tenantId) || [];
      
      if (unacknowledgedOnly) {
        return alerts.filter(alert => !alert.acknowledged);
      }
      
      return alerts;

    } catch (error) {
      console.error(`[ResourceBilling] Failed to get tenant alerts: ${error}`);
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<boolean> {
    try {
      for (const [tenantId, alerts] of this.alertsCache.entries()) {
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
          alert.acknowledged = true;
          alert.acknowledgedBy = acknowledgedBy;
          alert.acknowledgedAt = new Date().toISOString();

          // Emit alert acknowledgment event
          qflowEventEmitter.emit('q.qflow.billing.alert.acknowledged.v1', {
            eventId: this.generateEventId(),
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            source: 'qflow-billing',
            actor: acknowledgedBy,
            data: {
              alertId,
              tenantId,
              alertType: alert.type,
              resource: alert.resource
            }
          });

          return true;
        }
      }

      return false;

    } catch (error) {
      console.error(`[ResourceBilling] Failed to acknowledge alert: ${error}`);
      return false;
    }
  }

  /**
   * Update tenant billing tier
   */
  async updateBillingTier(
    tenantId: string,
    newTier: TenantResourceLimits['billingTier'],
    updatedBy: string
  ): Promise<boolean> {
    try {
      const currentLimits = this.limitsCache.get(tenantId);
      if (!currentLimits) {
        throw new Error('Tenant limits not found');
      }

      // Create new limits for the tier
      const newLimits = this.getDefaultLimitsForTier(newTier);
      newLimits.tenantId = tenantId;
      newLimits.effectiveFrom = new Date().toISOString();

      // Archive current limits
      currentLimits.effectiveUntil = new Date().toISOString();

      this.limitsCache.set(tenantId, newLimits);

      // Update isolation config
      const isolationConfig = this.getDefaultIsolationConfig(tenantId, newTier);
      this.isolationConfigCache.set(tenantId, isolationConfig);

      // Emit tier update event
      qflowEventEmitter.emit('q.qflow.billing.tier.updated.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-billing',
        actor: updatedBy,
        data: {
          tenantId,
          previousTier: currentLimits.billingTier,
          newTier,
          newLimits: newLimits.limits
        }
      });

      return true;

    } catch (error) {
      console.error(`[ResourceBilling] Failed to update billing tier: ${error}`);
      return false;
    }
  }

  /**
   * Generate billing report
   */
  async generateBillingReport(
    tenantId: string,
    period: string
  ): Promise<BillingPeriod | null> {
    try {
      const usage = await this.getTenantUsage(tenantId, period);
      if (!usage) {
        return null;
      }

      const [year, month] = period.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);

      const billingPeriod: BillingPeriod = {
        tenantId,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        usage: usage.usage,
        costs: usage.costs,
        status: 'closed'
      };

      // Store billing period
      const existingPeriods = this.billingPeriodsCache.get(tenantId) || [];
      const updatedPeriods = existingPeriods.filter(p => p.period !== period);
      updatedPeriods.push(billingPeriod);
      this.billingPeriodsCache.set(tenantId, updatedPeriods);

      // Emit billing report event
      qflowEventEmitter.emit('q.qflow.billing.report.generated.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-billing',
        actor: 'system',
        data: {
          tenantId,
          period,
          totalCost: billingPeriod.costs.total,
          usage: {
            executions: billingPeriod.usage.executions.total,
            cpuHours: billingPeriod.usage.cpu.total,
            memoryGBHours: billingPeriod.usage.memory.total
          }
        }
      });

      return billingPeriod;

    } catch (error) {
      console.error(`[ResourceBilling] Failed to generate billing report: ${error}`);
      return null;
    }
  }

  /**
   * Get tenant isolation config
   */
  async getTenantIsolationConfig(tenantId: string): Promise<TenantIsolationConfig | null> {
    try {
      return this.isolationConfigCache.get(tenantId) || null;
    } catch (error) {
      console.error(`[ResourceBilling] Failed to get isolation config: ${error}`);
      return null;
    }
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Start periodic usage aggregation
    setInterval(() => {
      this.aggregateUsageMetrics();
    }, 60 * 1000); // Every minute

    // Check for limit violations
    setInterval(() => {
      this.checkAllTenantsLimits();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Clean up old data
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private initializePricingTiers(): void {
    const basePricing = {
      effectiveFrom: new Date().toISOString()
    };

    this.pricingTiers.set('free', {
      tier: 'free',
      pricing: {
        cpuPerHour: 0,
        memoryPerGBHour: 0,
        storagePerGBMonth: 0,
        networkPerGB: 0,
        executionBase: 0,
        apiCallPer1000: 0
      },
      includedQuotas: {
        cpuHours: 10,
        memoryGBHours: 10,
        storageGB: 1,
        networkGB: 1,
        executions: 100,
        apiCalls: 1000
      },
      ...basePricing
    });

    this.pricingTiers.set('basic', {
      tier: 'basic',
      pricing: {
        cpuPerHour: 0.05,
        memoryPerGBHour: 0.01,
        storagePerGBMonth: 0.10,
        networkPerGB: 0.05,
        executionBase: 0.001,
        apiCallPer1000: 0.10
      },
      includedQuotas: {
        cpuHours: 100,
        memoryGBHours: 100,
        storageGB: 10,
        networkGB: 10,
        executions: 1000,
        apiCalls: 10000
      },
      ...basePricing
    });

    this.pricingTiers.set('premium', {
      tier: 'premium',
      pricing: {
        cpuPerHour: 0.04,
        memoryPerGBHour: 0.008,
        storagePerGBMonth: 0.08,
        networkPerGB: 0.04,
        executionBase: 0.0008,
        apiCallPer1000: 0.08
      },
      includedQuotas: {
        cpuHours: 1000,
        memoryGBHours: 1000,
        storageGB: 100,
        networkGB: 100,
        executions: 10000,
        apiCalls: 100000
      },
      ...basePricing
    });

    this.pricingTiers.set('enterprise', {
      tier: 'enterprise',
      pricing: {
        cpuPerHour: 0.03,
        memoryPerGBHour: 0.006,
        storagePerGBMonth: 0.06,
        networkPerGB: 0.03,
        executionBase: 0.0006,
        apiCallPer1000: 0.06
      },
      includedQuotas: {
        cpuHours: 10000,
        memoryGBHours: 10000,
        storageGB: 1000,
        networkGB: 1000,
        executions: 100000,
        apiCalls: 1000000
      },
      ...basePricing
    });
  }

  private startUsageTracking(): void {
    // Initialize usage tracking for existing tenants
    console.log('[ResourceBilling] Usage tracking started');
  }

  private getDefaultLimitsForTier(tier: TenantResourceLimits['billingTier']): TenantResourceLimits {
    const baseLimits = {
      tenantId: '',
      billingTier: tier,
      effectiveFrom: new Date().toISOString(),
      softLimits: {
        cpuWarningThreshold: 80,
        memoryWarningThreshold: 80,
        costWarningThreshold: 80
      }
    };

    switch (tier) {
      case 'free':
        return {
          ...baseLimits,
          limits: {
            maxCpuHours: 10,
            maxMemoryGBHours: 10,
            maxStorageGB: 1,
            maxNetworkGB: 1,
            maxExecutions: 100,
            maxApiCalls: 1000,
            maxMonthlyCost: 0
          }
        };

      case 'basic':
        return {
          ...baseLimits,
          limits: {
            maxCpuHours: 100,
            maxMemoryGBHours: 100,
            maxStorageGB: 10,
            maxNetworkGB: 10,
            maxExecutions: 1000,
            maxApiCalls: 10000,
            maxMonthlyCost: 50
          }
        };

      case 'premium':
        return {
          ...baseLimits,
          limits: {
            maxCpuHours: 1000,
            maxMemoryGBHours: 1000,
            maxStorageGB: 100,
            maxNetworkGB: 100,
            maxExecutions: 10000,
            maxApiCalls: 100000,
            maxMonthlyCost: 500
          }
        };

      case 'enterprise':
        return {
          ...baseLimits,
          limits: {
            maxCpuHours: 10000,
            maxMemoryGBHours: 10000,
            maxStorageGB: 1000,
            maxNetworkGB: 1000,
            maxExecutions: 100000,
            maxApiCalls: 1000000,
            maxMonthlyCost: 5000
          }
        };

      default:
        return baseLimits as TenantResourceLimits;
    }
  }

  private getDefaultIsolationConfig(
    tenantId: string,
    tier: TenantResourceLimits['billingTier']
  ): TenantIsolationConfig {
    const baseConfig = {
      tenantId,
      dataResidency: {
        region: 'us-east-1',
        allowCrossRegion: false,
        encryptionAtRest: true,
        encryptionInTransit: true
      },
      compliance: {
        gdprCompliant: true,
        hipaaCompliant: false,
        soc2Compliant: false,
        customCompliance: []
      }
    };

    switch (tier) {
      case 'free':
        return {
          ...baseConfig,
          isolation: {
            networkSegmentation: false,
            storageEncryption: false,
            computeIsolation: false,
            logIsolation: false,
            metricIsolation: false
          }
        };

      case 'basic':
        return {
          ...baseConfig,
          isolation: {
            networkSegmentation: true,
            storageEncryption: true,
            computeIsolation: false,
            logIsolation: true,
            metricIsolation: true
          }
        };

      case 'premium':
        return {
          ...baseConfig,
          isolation: {
            networkSegmentation: true,
            storageEncryption: true,
            computeIsolation: true,
            logIsolation: true,
            metricIsolation: true
          },
          compliance: {
            ...baseConfig.compliance,
            soc2Compliant: true
          }
        };

      case 'enterprise':
        return {
          ...baseConfig,
          isolation: {
            networkSegmentation: true,
            storageEncryption: true,
            computeIsolation: true,
            logIsolation: true,
            metricIsolation: true
          },
          compliance: {
            ...baseConfig.compliance,
            hipaaCompliant: true,
            soc2Compliant: true
          }
        };

      default:
        return baseConfig as TenantIsolationConfig;
    }
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private createEmptyUsage(tenantId: string, period: string): TenantResourceUsage {
    const now = new Date().toISOString();
    const emptyMetric = (unit: string): ResourceMetric => ({
      current: 0,
      peak: 0,
      average: 0,
      total: 0,
      unit,
      samples: 0,
      lastUpdated: now
    });

    return {
      tenantId,
      period,
      usage: {
        cpu: emptyMetric('hours'),
        memory: emptyMetric('GB-hours'),
        storage: emptyMetric('GB'),
        network: emptyMetric('GB'),
        executions: emptyMetric('count'),
        apiCalls: emptyMetric('count')
      },
      costs: {
        compute: 0,
        storage: 0,
        network: 0,
        operations: 0,
        total: 0
      },
      limits: this.limitsCache.get(tenantId) || this.getDefaultLimitsForTier('free'),
      alerts: []
    };
  }

  private updateMetric(metric: ResourceMetric, value: number, unit: string): void {
    metric.current = value;
    metric.peak = Math.max(metric.peak, value);
    metric.total += value;
    metric.samples++;
    metric.average = metric.total / metric.samples;
    metric.unit = unit;
    metric.lastUpdated = new Date().toISOString();
  }

  private async updateCosts(usage: TenantResourceUsage): Promise<void> {
    try {
      const pricing = this.pricingTiers.get(usage.limits.billingTier);
      if (!pricing) {
        return;
      }

      // Calculate costs based on usage above included quotas
      const computeCost = Math.max(0, usage.usage.cpu.total - pricing.includedQuotas.cpuHours) * pricing.pricing.cpuPerHour +
                         Math.max(0, usage.usage.memory.total - pricing.includedQuotas.memoryGBHours) * pricing.pricing.memoryPerGBHour;

      const storageCost = Math.max(0, usage.usage.storage.peak - pricing.includedQuotas.storageGB) * pricing.pricing.storagePerGBMonth;

      const networkCost = Math.max(0, usage.usage.network.total - pricing.includedQuotas.networkGB) * pricing.pricing.networkPerGB;

      const operationsCost = Math.max(0, usage.usage.executions.total - pricing.includedQuotas.executions) * pricing.pricing.executionBase +
                            Math.max(0, usage.usage.apiCalls.total - pricing.includedQuotas.apiCalls) * pricing.pricing.apiCallPer1000 / 1000;

      usage.costs = {
        compute: computeCost,
        storage: storageCost,
        network: networkCost,
        operations: operationsCost,
        total: computeCost + storageCost + networkCost + operationsCost
      };

    } catch (error) {
      console.error(`[ResourceBilling] Cost calculation failed: ${error}`);
    }
  }

  private async checkLimitsAndAlert(tenantId: string, usage: TenantResourceUsage): Promise<void> {
    try {
      const alerts: ResourceAlert[] = [];
      const limits = usage.limits;

      // Check CPU usage
      const cpuPercentage = (usage.usage.cpu.total / limits.limits.maxCpuHours) * 100;
      if (cpuPercentage >= limits.softLimits.cpuWarningThreshold) {
        alerts.push(this.createAlert(tenantId, 'cpu', cpuPercentage, limits.softLimits.cpuWarningThreshold));
      }

      // Check memory usage
      const memoryPercentage = (usage.usage.memory.total / limits.limits.maxMemoryGBHours) * 100;
      if (memoryPercentage >= limits.softLimits.memoryWarningThreshold) {
        alerts.push(this.createAlert(tenantId, 'memory', memoryPercentage, limits.softLimits.memoryWarningThreshold));
      }

      // Check cost usage
      const costPercentage = (usage.costs.total / limits.limits.maxMonthlyCost) * 100;
      if (costPercentage >= limits.softLimits.costWarningThreshold) {
        alerts.push(this.createAlert(tenantId, 'cost', costPercentage, limits.softLimits.costWarningThreshold));
      }

      // Store new alerts
      if (alerts.length > 0) {
        const existingAlerts = this.alertsCache.get(tenantId) || [];
        this.alertsCache.set(tenantId, [...existingAlerts, ...alerts]);

        // Emit alert events
        for (const alert of alerts) {
          qflowEventEmitter.emit('q.qflow.billing.alert.created.v1', {
            eventId: this.generateEventId(),
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            source: 'qflow-billing',
            actor: 'system',
            data: {
              alertId: alert.id,
              tenantId,
              alertType: alert.type,
              resource: alert.resource,
              severity: alert.severity,
              threshold: alert.threshold,
              currentValue: alert.currentValue
            }
          });
        }
      }

    } catch (error) {
      console.error(`[ResourceBilling] Limit checking failed: ${error}`);
    }
  }

  private createAlert(
    tenantId: string,
    resource: ResourceAlert['resource'],
    currentValue: number,
    threshold: number
  ): ResourceAlert {
    const severity: ResourceAlert['severity'] = 
      currentValue >= 95 ? 'critical' :
      currentValue >= 90 ? 'high' :
      currentValue >= 85 ? 'medium' : 'low';

    const type: ResourceAlert['type'] = 
      currentValue >= 100 ? 'limit_exceeded' : 'warning';

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      tenantId,
      type,
      resource,
      message: `${resource.toUpperCase()} usage at ${currentValue.toFixed(1)}% of limit`,
      threshold,
      currentValue,
      severity,
      createdAt: new Date().toISOString(),
      acknowledged: false
    };
  }

  private async calculateProjectedCost(
    tenantId: string,
    requestedResources: any
  ): Promise<number> {
    try {
      const limits = this.limitsCache.get(tenantId);
      if (!limits) {
        return 0;
      }

      const pricing = this.pricingTiers.get(limits.billingTier);
      if (!pricing) {
        return 0;
      }

      let projectedCost = 0;

      if (requestedResources.cpu) {
        projectedCost += (requestedResources.cpu / 3600) * pricing.pricing.cpuPerHour;
      }

      if (requestedResources.memory) {
        projectedCost += (requestedResources.memory / 1024 / 3600) * pricing.pricing.memoryPerGBHour;
      }

      if (requestedResources.storage) {
        projectedCost += (requestedResources.storage / 1024) * pricing.pricing.storagePerGBMonth;
      }

      if (requestedResources.executions) {
        projectedCost += requestedResources.executions * pricing.pricing.executionBase;
      }

      return projectedCost;

    } catch (error) {
      console.error(`[ResourceBilling] Projected cost calculation failed: ${error}`);
      return 0;
    }
  }

  private async aggregateUsageMetrics(): Promise<void> {
    // Aggregate usage metrics for all tenants
    // Implementation would update averages, peaks, etc.
  }

  private async checkAllTenantsLimits(): Promise<void> {
    // Check limits for all tenants
    // Implementation would iterate through all tenants
  }

  private async cleanupOldData(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 12); // Keep 12 months of data

      // Clean up old usage data, alerts, etc.
      console.log('[ResourceBilling] Cleaned up old data');

    } catch (error) {
      console.error(`[ResourceBilling] Data cleanup failed: ${error}`);
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Export singleton instance
export const resourceBillingService = new ResourceBillingService();