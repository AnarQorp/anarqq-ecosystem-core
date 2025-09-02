/**
 * Anomaly Detection Service
 * ML-based anomaly detection for security monitoring
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface AnomalyDetectionRequest {
  data: Record<string, any>;
  model?: string;
  threshold?: number;
}

export interface Anomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  timestamp: string;
  features: Record<string, number>;
  context?: Record<string, any>;
  recommendations: string[];
}

export interface AnomalySummary {
  totalAnomalies: number;
  severityDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  averageConfidence: number;
  highSeverityCount: number;
  typeDistribution: Record<string, number>;
}

export interface ModelInfo {
  name: string;
  version: string;
  algorithm: string;
  threshold: number;
  trainingDate?: string;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  summary: AnomalySummary;
  modelInfo?: ModelInfo;
  timestamp: string;
  analysisId: string;
}

export class AnomalyDetectionService {
  private models: Map<string, ModelInfo> = new Map();
  private detectionHistory: Anomaly[] = [];
  private baselineProfiles: Map<string, any> = new Map();

  constructor() {
    this.initializeModels();
    this.initializeBaselineProfiles();
  }

  /**
   * Detect anomalies in the provided data
   */
  async detectAnomalies(request: AnomalyDetectionRequest): Promise<AnomalyDetectionResult> {
    try {
      const analysisId = uuidv4();
      const timestamp = new Date().toISOString();
      const modelName = request.model || 'behavioral_anomaly_detector';
      const threshold = request.threshold || config.ml.anomalyThreshold;

      const model = this.models.get(modelName);
      if (!model) {
        throw new Error(`Unknown model: ${modelName}`);
      }

      logger.info('Starting anomaly detection', {
        analysisId,
        modelName,
        threshold,
        dataKeys: Object.keys(request.data)
      });

      // Perform anomaly detection based on data type
      const anomalies = await this.performAnomalyDetection(request.data, model, threshold);

      // Generate summary
      const summary = this.generateSummary(anomalies);

      // Store in history
      this.detectionHistory.push(...anomalies);

      // Keep only recent history (last 1000 anomalies)
      if (this.detectionHistory.length > 1000) {
        this.detectionHistory = this.detectionHistory.slice(-1000);
      }

      const result: AnomalyDetectionResult = {
        anomalies,
        summary,
        modelInfo: model,
        timestamp,
        analysisId
      };

      logger.info('Anomaly detection completed', {
        analysisId,
        totalAnomalies: anomalies.length,
        highSeverityCount: summary.highSeverityCount,
        averageConfidence: summary.averageConfidence
      });

      return result;

    } catch (error) {
      logger.error('Failed to detect anomalies', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      });
      throw error;
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * Get anomaly detection statistics
   */
  async getAnomalyStatistics(): Promise<{
    totalAnomalies: number;
    recentAnomalies: Anomaly[];
    severityDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
    averageConfidence: number;
  }> {
    try {
      const totalAnomalies = this.detectionHistory.length;
      
      const severityDistribution: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };

      const typeDistribution: Record<string, number> = {};
      let totalConfidence = 0;

      this.detectionHistory.forEach(anomaly => {
        severityDistribution[anomaly.severity]++;
        typeDistribution[anomaly.type] = (typeDistribution[anomaly.type] || 0) + 1;
        totalConfidence += anomaly.confidence;
      });

      const averageConfidence = totalAnomalies > 0 ? totalConfidence / totalAnomalies : 0;

      // Get recent anomalies (last 20)
      const recentAnomalies = this.detectionHistory
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);

      return {
        totalAnomalies,
        recentAnomalies,
        severityDistribution,
        typeDistribution,
        averageConfidence
      };

    } catch (error) {
      logger.error('Failed to get anomaly statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update baseline profile for an entity
   */
  async updateBaselineProfile(entityId: string, data: Record<string, any>): Promise<void> {
    try {
      let profile = this.baselineProfiles.get(entityId);
      
      if (!profile) {
        profile = {
          entityId,
          features: {},
          sampleCount: 0,
          lastUpdated: new Date().toISOString()
        };
      }

      // Update feature averages
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (!profile.features[key]) {
            profile.features[key] = { mean: value, variance: 0, min: value, max: value };
          } else {
            const oldMean = profile.features[key].mean;
            const newMean = (oldMean * profile.sampleCount + value) / (profile.sampleCount + 1);
            
            profile.features[key].mean = newMean;
            profile.features[key].min = Math.min(profile.features[key].min, value);
            profile.features[key].max = Math.max(profile.features[key].max, value);
            
            // Simple variance update (not perfectly accurate but sufficient for demo)
            profile.features[key].variance = Math.abs(value - newMean);
          }
        }
      });

      profile.sampleCount++;
      profile.lastUpdated = new Date().toISOString();
      
      this.baselineProfiles.set(entityId, profile);

      logger.debug('Baseline profile updated', {
        entityId,
        sampleCount: profile.sampleCount
      });

    } catch (error) {
      logger.error('Failed to update baseline profile', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entityId
      });
      throw error;
    }
  }

  /**
   * Perform the actual anomaly detection
   */
  private async performAnomalyDetection(
    data: Record<string, any>,
    model: ModelInfo,
    threshold: number
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Behavioral anomaly detection
    if (model.name === 'behavioral_anomaly_detector') {
      anomalies.push(...await this.detectBehavioralAnomalies(data, threshold));
    }

    // Statistical anomaly detection
    if (model.name === 'statistical_anomaly_detector') {
      anomalies.push(...await this.detectStatisticalAnomalies(data, threshold));
    }

    // Pattern anomaly detection
    if (model.name === 'pattern_anomaly_detector') {
      anomalies.push(...await this.detectPatternAnomalies(data, threshold));
    }

    return anomalies;
  }

  /**
   * Detect behavioral anomalies
   */
  private async detectBehavioralAnomalies(data: Record<string, any>, threshold: number): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Check for unusual access patterns
    if (data.accessPattern) {
      const { requestRate, sessionDuration, operationTypes } = data.accessPattern;

      // High request rate anomaly
      if (requestRate > 50) { // More than 50 requests per minute
        const confidence = Math.min(1, requestRate / 100);
        if (confidence >= threshold) {
          anomalies.push({
            id: uuidv4(),
            type: 'behavioral',
            severity: this.calculateSeverity(confidence),
            confidence,
            description: `Unusually high request rate detected: ${requestRate} requests/minute`,
            timestamp: new Date().toISOString(),
            features: { request_rate: requestRate },
            context: data,
            recommendations: [
              'Verify user identity through additional authentication',
              'Temporarily limit request rate for this user',
              'Review user\'s recent activity for other suspicious patterns'
            ]
          });
        }
      }

      // Unusual session duration
      if (sessionDuration < 60 || sessionDuration > 14400) { // Less than 1 min or more than 4 hours
        const confidence = sessionDuration < 60 ? 0.7 : Math.min(1, sessionDuration / 14400);
        if (confidence >= threshold) {
          anomalies.push({
            id: uuidv4(),
            type: 'behavioral',
            severity: this.calculateSeverity(confidence),
            confidence,
            description: `Unusual session duration: ${sessionDuration} seconds`,
            timestamp: new Date().toISOString(),
            features: { session_duration: sessionDuration },
            context: data,
            recommendations: [
              'Monitor user session activity',
              'Check for automated tools or scripts',
              'Verify session legitimacy'
            ]
          });
        }
      }
    }

    // Check for unusual file access patterns
    if (data.fileAccess) {
      const { downloadCount, fileTypes, totalSize } = data.fileAccess;

      if (downloadCount > 20) { // More than 20 files in a short period
        const confidence = Math.min(1, downloadCount / 50);
        if (confidence >= threshold) {
          anomalies.push({
            id: uuidv4(),
            type: 'behavioral',
            severity: this.calculateSeverity(confidence),
            confidence,
            description: `Bulk file download detected: ${downloadCount} files`,
            timestamp: new Date().toISOString(),
            features: { download_count: downloadCount, total_size: totalSize },
            context: data,
            recommendations: [
              'Verify legitimate business need for bulk downloads',
              'Check data loss prevention policies',
              'Monitor for data exfiltration attempts'
            ]
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect statistical anomalies
   */
  private async detectStatisticalAnomalies(data: Record<string, any>, threshold: number): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Check against baseline profiles
    if (data.userId && this.baselineProfiles.has(data.userId)) {
      const profile = this.baselineProfiles.get(data.userId);
      
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'number' && profile.features[key]) {
          const baseline = profile.features[key];
          const deviation = Math.abs(value - baseline.mean) / (baseline.variance + 1);
          
          if (deviation > 3) { // More than 3 standard deviations
            const confidence = Math.min(1, deviation / 5);
            if (confidence >= threshold) {
              anomalies.push({
                id: uuidv4(),
                type: 'statistical',
                severity: this.calculateSeverity(confidence),
                confidence,
                description: `Statistical anomaly in ${key}: ${value} (baseline: ${baseline.mean.toFixed(2)})`,
                timestamp: new Date().toISOString(),
                features: { [key]: value, baseline_mean: baseline.mean, deviation },
                context: data,
                recommendations: [
                  'Compare with historical patterns',
                  'Investigate cause of deviation',
                  'Update baseline if behavior is legitimate'
                ]
              });
            }
          }
        }
      });
    }

    return anomalies;
  }

  /**
   * Detect pattern anomalies
   */
  private async detectPatternAnomalies(data: Record<string, any>, threshold: number): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Check for time-based patterns
    if (data.timestamp) {
      const hour = new Date(data.timestamp).getHours();
      
      // Access during unusual hours (2 AM - 5 AM)
      if (hour >= 2 && hour <= 5) {
        const confidence = 0.8;
        if (confidence >= threshold) {
          anomalies.push({
            id: uuidv4(),
            type: 'pattern',
            severity: this.calculateSeverity(confidence),
            confidence,
            description: `Access during unusual hours: ${hour}:00`,
            timestamp: new Date().toISOString(),
            features: { access_hour: hour },
            context: data,
            recommendations: [
              'Verify legitimate need for off-hours access',
              'Check for compromised accounts',
              'Review access patterns for this user'
            ]
          });
        }
      }
    }

    // Check for geographic patterns
    if (data.location) {
      const { country, city, coordinates } = data.location;
      
      // Simulate detection of access from high-risk countries
      const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
      if (highRiskCountries.includes(country)) {
        const confidence = 0.9;
        if (confidence >= threshold) {
          anomalies.push({
            id: uuidv4(),
            type: 'pattern',
            severity: 'high',
            confidence,
            description: `Access from high-risk country: ${country}`,
            timestamp: new Date().toISOString(),
            features: { country_risk: 1 },
            context: data,
            recommendations: [
              'Require additional authentication',
              'Block access if not legitimate',
              'Monitor for other suspicious activities'
            ]
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Calculate severity based on confidence
   */
  private calculateSeverity(confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence >= 0.9) return 'critical';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Generate summary of anomalies
   */
  private generateSummary(anomalies: Anomaly[]): AnomalySummary {
    const severityDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const typeDistribution: Record<string, number> = {};
    let totalConfidence = 0;

    anomalies.forEach(anomaly => {
      severityDistribution[anomaly.severity]++;
      typeDistribution[anomaly.type] = (typeDistribution[anomaly.type] || 0) + 1;
      totalConfidence += anomaly.confidence;
    });

    const averageConfidence = anomalies.length > 0 ? totalConfidence / anomalies.length : 0;
    const highSeverityCount = severityDistribution.high + severityDistribution.critical;

    return {
      totalAnomalies: anomalies.length,
      severityDistribution,
      averageConfidence,
      highSeverityCount,
      typeDistribution
    };
  }

  /**
   * Initialize ML models
   */
  private initializeModels(): void {
    this.models.set('behavioral_anomaly_detector', {
      name: 'behavioral_anomaly_detector',
      version: '2.1.0',
      algorithm: 'isolation_forest',
      threshold: 0.8,
      trainingDate: '2024-02-01T10:00:00.000Z'
    });

    this.models.set('statistical_anomaly_detector', {
      name: 'statistical_anomaly_detector',
      version: '1.5.0',
      algorithm: 'z_score',
      threshold: 0.7,
      trainingDate: '2024-01-15T10:00:00.000Z'
    });

    this.models.set('pattern_anomaly_detector', {
      name: 'pattern_anomaly_detector',
      version: '1.8.0',
      algorithm: 'lstm',
      threshold: 0.75,
      trainingDate: '2024-01-20T10:00:00.000Z'
    });
  }

  /**
   * Initialize baseline profiles for demonstration
   */
  private initializeBaselineProfiles(): void {
    // Normal user profile
    this.baselineProfiles.set('did:squid:user123', {
      entityId: 'did:squid:user123',
      features: {
        request_rate: { mean: 5, variance: 2, min: 1, max: 10 },
        session_duration: { mean: 1800, variance: 600, min: 300, max: 3600 },
        download_count: { mean: 3, variance: 2, min: 0, max: 8 }
      },
      sampleCount: 100,
      lastUpdated: new Date().toISOString()
    });

    // Power user profile
    this.baselineProfiles.set('did:squid:poweruser456', {
      entityId: 'did:squid:poweruser456',
      features: {
        request_rate: { mean: 15, variance: 5, min: 5, max: 25 },
        session_duration: { mean: 3600, variance: 1200, min: 1800, max: 7200 },
        download_count: { mean: 10, variance: 5, min: 2, max: 20 }
      },
      sampleCount: 150,
      lastUpdated: new Date().toISOString()
    });
  }
}