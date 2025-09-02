import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  AdminMonitoringService,
  PlatformHealthMetrics,
  SpamDetectionResult,
  AbuseReport,
  SystemAlert,
  UserActivityPattern
} from '../AdminMonitoringService';

// Mock identity
const mockIdentity = {
  did: 'did:example:123',
  name: 'Test User',
  type: 'ROOT' as const,
  kyc: true,
  reputation: 100
};

describe('AdminMonitoringService', () => {
  beforeEach(async () => {
    // Reset service state before each test
    (AdminMonitoringService as any).healthMetrics = null;
    (AdminMonitoringService as any).abuseReports = [];
    (AdminMonitoringService as any).systemAlerts = [];
    (AdminMonitoringService as any).userActivityPatterns = new Map();
    (AdminMonitoringService as any).platformTrends = new Map();
  });

  describe('getPlatformHealth', () => {
    it('should return platform health metrics', async () => {
      const health = await AdminMonitoringService.getPlatformHealth();
      
      expect(health).toBeDefined();
      expect(health.totalUsers).toBeGreaterThan(0);
      expect(health.activeUsers).toBeGreaterThan(0);
      expect(health.totalPosts).toBeGreaterThan(0);
      expect(health.totalComments).toBeGreaterThan(0);
      expect(health.lastUpdated).toBeInstanceOf(Date);
      expect(['healthy', 'degraded', 'down']).toContain(health.storjFilecoinHealth);
    });

    it('should cache metrics and not update if not stale', async () => {
      const health1 = await AdminMonitoringService.getPlatformHealth();
      const health2 = await AdminMonitoringService.getPlatformHealth();
      
      expect(health1.lastUpdated).toEqual(health2.lastUpdated);
    });
  });

  describe('updateHealthMetrics', () => {
    it('should update health metrics with current data', async () => {
      await AdminMonitoringService.updateHealthMetrics();
      const health = await AdminMonitoringService.getPlatformHealth();
      
      expect(health.lastUpdated.getTime()).toBeCloseTo(Date.now(), -2); // Within 100ms
      expect(health.totalUsers).toBeGreaterThan(0);
      expect(health.systemUptime).toBeGreaterThan(0);
      expect(health.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('detectSpam', () => {
    it('should detect clean content as not spam', async () => {
      const result = await AdminMonitoringService.detectSpam(
        'This is a normal post about technology',
        'user_123',
        'post'
      );
      
      expect(result.isSpam).toBe(false);
      expect(result.riskScore).toBeLessThan(40);
      expect(result.recommendedAction).toBe('allow');
    });

    it('should detect content with excessive links as spam', async () => {
      const spamContent = 'Check out https://link1.com and https://link2.com and https://link3.com and https://link4.com';
      
      const result = await AdminMonitoringService.detectSpam(
        spamContent,
        'user_123',
        'post'
      );
      
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('Excessive links'))).toBe(true);
    });

    it('should detect repetitive content as spam', async () => {
      const repetitiveContent = 'This is a test message that repeats. This is a test message that repeats. This is a test message that repeats.';
      
      const result = await AdminMonitoringService.detectSpam(
        repetitiveContent,
        'user_123',
        'post'
      );
      
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('Repetitive content'))).toBe(true);
    });

    it('should detect excessive caps as spam indicator', async () => {
      const capsContent = 'THIS IS REALLY IMPORTANT EVERYONE MUST READ THIS NOW';
      
      const result = await AdminMonitoringService.detectSpam(
        capsContent,
        'user_123',
        'post'
      );
      
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('Excessive capitalization'))).toBe(true);
    });

    it('should detect spam keywords', async () => {
      const spamContent = 'Buy now! Limited time offer! Click here for free money!';
      
      const result = await AdminMonitoringService.detectSpam(
        spamContent,
        'user_123',
        'post'
      );
      
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('spam keywords'))).toBe(true);
    });

    it('should recommend appropriate actions based on risk score', async () => {
      // Low risk content
      const lowRisk = await AdminMonitoringService.detectSpam(
        'Normal content',
        'user_123',
        'post'
      );
      expect(lowRisk.recommendedAction).toBe('allow');

      // High risk content
      const highRisk = await AdminMonitoringService.detectSpam(
        'Buy now! Click here! Free money! https://spam1.com https://spam2.com https://spam3.com https://spam4.com',
        'user_123',
        'post'
      );
      expect(highRisk.recommendedAction).toBe('block');
    });
  });

  describe('createAbuseReport', () => {
    it('should create abuse report with correct data', async () => {
      const report = await AdminMonitoringService.createAbuseReport(
        'reporter_123',
        mockIdentity,
        'post',
        'post_456',
        'spam',
        'This post contains spam content',
        ['screenshot1.png']
      );

      expect(report.id).toBeDefined();
      expect(report.reporterId).toBe('reporter_123');
      expect(report.contentType).toBe('post');
      expect(report.contentId).toBe('post_456');
      expect(report.reason).toBe('spam');
      expect(report.description).toBe('This post contains spam content');
      expect(report.evidence).toEqual(['screenshot1.png']);
      expect(report.status).toBe('pending');
      expect(report.priority).toBe('low'); // spam is low priority
    });

    it('should set high priority for hate speech reports', async () => {
      const report = await AdminMonitoringService.createAbuseReport(
        'reporter_123',
        mockIdentity,
        'comment',
        'comment_456',
        'hate_speech',
        'Contains hate speech'
      );

      expect(report.priority).toBe('high');
    });

    it('should set high priority for harassment reports', async () => {
      const report = await AdminMonitoringService.createAbuseReport(
        'reporter_123',
        mockIdentity,
        'user',
        'user_456',
        'harassment',
        'User is harassing others'
      );

      expect(report.priority).toBe('high');
    });
  });

  describe('getAbuseReports', () => {
    beforeEach(async () => {
      // Create test reports
      await AdminMonitoringService.createAbuseReport(
        'reporter_1',
        mockIdentity,
        'post',
        'post_1',
        'spam',
        'Spam post'
      );
      await AdminMonitoringService.createAbuseReport(
        'reporter_2',
        mockIdentity,
        'comment',
        'comment_1',
        'hate_speech',
        'Hate speech comment'
      );
      await AdminMonitoringService.createAbuseReport(
        'reporter_3',
        mockIdentity,
        'user',
        'user_1',
        'harassment',
        'Harassment behavior'
      );
    });

    it('should return all reports by default', async () => {
      const reports = await AdminMonitoringService.getAbuseReports();
      expect(reports).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const reports = await AdminMonitoringService.getAbuseReports({ status: 'pending' });
      expect(reports).toHaveLength(3);
      expect(reports.every(r => r.status === 'pending')).toBe(true);
    });

    it('should filter by priority', async () => {
      const reports = await AdminMonitoringService.getAbuseReports({ priority: 'high' });
      expect(reports).toHaveLength(2); // hate_speech and harassment
      expect(reports.every(r => r.priority === 'high')).toBe(true);
    });

    it('should filter by reason', async () => {
      const reports = await AdminMonitoringService.getAbuseReports({ reason: 'spam' });
      expect(reports).toHaveLength(1);
      expect(reports[0].reason).toBe('spam');
    });

    it('should filter by content type', async () => {
      const reports = await AdminMonitoringService.getAbuseReports({ contentType: 'post' });
      expect(reports).toHaveLength(1);
      expect(reports[0].contentType).toBe('post');
    });

    it('should sort by priority and creation date', async () => {
      const reports = await AdminMonitoringService.getAbuseReports();
      
      // Should be sorted by priority (high first), then by creation date
      expect(reports[0].priority).toBe('high');
      expect(reports[1].priority).toBe('high');
      expect(reports[2].priority).toBe('low');
    });

    it('should respect limit and offset', async () => {
      const reports = await AdminMonitoringService.getAbuseReports({ limit: 2, offset: 1 });
      expect(reports).toHaveLength(2);
    });
  });

  describe('updateAbuseReport', () => {
    it('should update report status', async () => {
      const report = await AdminMonitoringService.createAbuseReport(
        'reporter_123',
        mockIdentity,
        'post',
        'post_456',
        'spam',
        'Spam content'
      );

      const success = await AdminMonitoringService.updateAbuseReport(report.id, {
        status: 'investigating',
        assignedTo: 'moderator_123'
      });

      expect(success).toBe(true);

      const reports = await AdminMonitoringService.getAbuseReports();
      const updatedReport = reports.find(r => r.id === report.id);
      expect(updatedReport?.status).toBe('investigating');
      expect(updatedReport?.assignedTo).toBe('moderator_123');
    });

    it('should set resolved date when status is resolved', async () => {
      const report = await AdminMonitoringService.createAbuseReport(
        'reporter_123',
        mockIdentity,
        'post',
        'post_456',
        'spam',
        'Spam content'
      );

      await AdminMonitoringService.updateAbuseReport(report.id, {
        status: 'resolved',
        resolution: 'Content removed'
      });

      const reports = await AdminMonitoringService.getAbuseReports();
      const updatedReport = reports.find(r => r.id === report.id);
      expect(updatedReport?.status).toBe('resolved');
      expect(updatedReport?.resolvedAt).toBeInstanceOf(Date);
      expect(updatedReport?.resolution).toBe('Content removed');
    });

    it('should return false for non-existent report', async () => {
      const success = await AdminMonitoringService.updateAbuseReport('non_existent', {
        status: 'resolved'
      });
      expect(success).toBe(false);
    });
  });

  describe('createSystemAlert', () => {
    it('should create system alert with correct data', async () => {
      const alert = await AdminMonitoringService.createSystemAlert(
        'performance',
        'warning',
        'High CPU Usage',
        'CPU usage is above 80%',
        { cpuUsage: 85 }
      );

      expect(alert.id).toBeDefined();
      expect(alert.type).toBe('performance');
      expect(alert.severity).toBe('warning');
      expect(alert.title).toBe('High CPU Usage');
      expect(alert.message).toBe('CPU usage is above 80%');
      expect(alert.details).toEqual({ cpuUsage: 85 });
      expect(alert.isActive).toBe(true);
      expect(alert.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getSystemAlerts', () => {
    beforeEach(async () => {
      // Create test alerts
      await AdminMonitoringService.createSystemAlert(
        'performance',
        'warning',
        'High CPU',
        'CPU usage high'
      );
      await AdminMonitoringService.createSystemAlert(
        'security',
        'critical',
        'Security Breach',
        'Potential security issue'
      );
      await AdminMonitoringService.createSystemAlert(
        'storage',
        'error',
        'Storage Full',
        'Storage is full'
      );
    });

    it('should return all alerts by default', async () => {
      const alerts = await AdminMonitoringService.getSystemAlerts();
      expect(alerts).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const alerts = await AdminMonitoringService.getSystemAlerts({ type: 'performance' });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('performance');
    });

    it('should filter by severity', async () => {
      const alerts = await AdminMonitoringService.getSystemAlerts({ severity: 'critical' });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
    });

    it('should filter by active status', async () => {
      const alerts = await AdminMonitoringService.getSystemAlerts({ isActive: true });
      expect(alerts).toHaveLength(3);
      expect(alerts.every(a => a.isActive)).toBe(true);
    });

    it('should sort by severity and creation date', async () => {
      const alerts = await AdminMonitoringService.getSystemAlerts();
      
      // Should be sorted by severity (critical first)
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[1].severity).toBe('error');
      expect(alerts[2].severity).toBe('warning');
    });
  });

  describe('resolveSystemAlert', () => {
    it('should resolve active alert', async () => {
      const alert = await AdminMonitoringService.createSystemAlert(
        'performance',
        'warning',
        'Test Alert',
        'Test message'
      );

      const success = await AdminMonitoringService.resolveSystemAlert(alert.id, 'admin_123');
      expect(success).toBe(true);

      const alerts = await AdminMonitoringService.getSystemAlerts();
      const resolvedAlert = alerts.find(a => a.id === alert.id);
      expect(resolvedAlert?.isActive).toBe(false);
      expect(resolvedAlert?.resolvedAt).toBeInstanceOf(Date);
      expect(resolvedAlert?.resolvedBy).toBe('admin_123');
    });

    it('should return false for non-existent alert', async () => {
      const success = await AdminMonitoringService.resolveSystemAlert('non_existent', 'admin_123');
      expect(success).toBe(false);
    });
  });

  describe('analyzeUserActivity', () => {
    it('should analyze user activity and return pattern', async () => {
      const pattern = await AdminMonitoringService.analyzeUserActivity('user_123');
      
      expect(pattern.userId).toBe('user_123');
      expect(['normal', 'suspicious', 'spam', 'bot']).toContain(pattern.pattern);
      expect(pattern.confidence).toBeGreaterThanOrEqual(0);
      expect(pattern.confidence).toBeLessThanOrEqual(1);
      expect(pattern.riskScore).toBeGreaterThanOrEqual(0);
      expect(pattern.indicators).toBeInstanceOf(Array);
      expect(pattern.lastAnalyzed).toBeInstanceOf(Date);
    });

    it('should cache analysis results', async () => {
      const pattern1 = await AdminMonitoringService.analyzeUserActivity('user_123');
      const pattern2 = await AdminMonitoringService.analyzeUserActivity('user_123');
      
      expect(pattern1.lastAnalyzed).toEqual(pattern2.lastAnalyzed);
    });
  });

  describe('getPlatformTrends', () => {
    it('should return trends for requested metrics', async () => {
      const trends = await AdminMonitoringService.getPlatformTrends(['posts', 'comments'], 'day');
      
      expect(trends).toHaveLength(2);
      expect(trends[0].metric).toBe('posts');
      expect(trends[1].metric).toBe('comments');
      
      for (const trend of trends) {
        expect(trend.timeframe).toBe('day');
        expect(trend.values).toBeInstanceOf(Array);
        expect(trend.values.length).toBeGreaterThan(0);
        expect(['increasing', 'decreasing', 'stable']).toContain(trend.trend);
        expect(typeof trend.changePercentage).toBe('number');
      }
    });

    it('should handle different timeframes', async () => {
      const hourlyTrends = await AdminMonitoringService.getPlatformTrends(['posts'], 'hour');
      const weeklyTrends = await AdminMonitoringService.getPlatformTrends(['posts'], 'week');
      
      expect(hourlyTrends[0].timeframe).toBe('hour');
      expect(weeklyTrends[0].timeframe).toBe('week');
      expect(hourlyTrends[0].values.length).toBe(12); // 12 5-minute intervals
      expect(weeklyTrends[0].values.length).toBe(7); // 7 days
    });
  });

  describe('getAdminDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      // Create some test data
      await AdminMonitoringService.createAbuseReport(
        'reporter_123',
        mockIdentity,
        'post',
        'post_456',
        'spam',
        'Spam content'
      );
      await AdminMonitoringService.createSystemAlert(
        'performance',
        'warning',
        'Test Alert',
        'Test message'
      );

      const dashboard = await AdminMonitoringService.getAdminDashboard();
      
      expect(dashboard.healthMetrics).toBeDefined();
      expect(dashboard.moderationStats).toBeDefined();
      expect(dashboard.activeAlerts).toBeInstanceOf(Array);
      expect(dashboard.pendingReports).toBeInstanceOf(Array);
      expect(dashboard.recentTrends).toBeInstanceOf(Array);
      expect(dashboard.suspiciousUsers).toBeInstanceOf(Array);
      
      expect(dashboard.activeAlerts.length).toBeGreaterThan(0);
      expect(dashboard.pendingReports.length).toBeGreaterThan(0);
      expect(dashboard.recentTrends.length).toBe(3); // posts, comments, users
    });
  });
});