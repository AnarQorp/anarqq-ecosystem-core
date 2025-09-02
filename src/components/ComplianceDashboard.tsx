/**
 * Compliance Dashboard Component
 * Displays compliance status, violations, metrics, and alerts
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Shield, 
  TrendingUp,
  AlertCircle,
  Calendar,
  Users,
  Database
} from 'lucide-react';

interface ComplianceOverview {
  complianceScore: number;
  activeViolations: number;
  pendingDSRs: number;
  upcomingDeadlines: number;
}

interface ComplianceViolation {
  violationId: string;
  type: string;
  severity: string;
  timestamp: string;
  status: string;
  description?: string;
}

interface ComplianceMetrics {
  period: { startDate: string; endDate: string };
  overallScore: number;
  violations: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  dsrRequests: {
    total: number;
    completed: number;
    pending: number;
    averageProcessingTime: number;
  };
  piaAssessments: {
    total: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

interface ComplianceAlert {
  alertId: string;
  type: string;
  severity: string;
  timestamp: string;
  violations: ComplianceViolation[];
  recommendedActions: string[];
}

interface ComplianceDeadline {
  type: string;
  id: string;
  description: string;
  deadline: string;
  daysRemaining: number;
}

export const ComplianceDashboard: React.FC = () => {
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [deadlines, setDeadlines] = useState<ComplianceDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load dashboard overview
      const dashboardResponse = await fetch('/api/compliance/dashboard');
      if (!dashboardResponse.ok) throw new Error('Failed to load dashboard');
      const dashboardData = await dashboardResponse.json();

      setOverview(dashboardData.data.overview);
      setViolations(dashboardData.data.activeViolations);
      setDeadlines(dashboardData.data.upcomingDeadlines);

      // Load metrics
      const metricsResponse = await fetch(`/api/compliance/metrics?period=${selectedPeriod}`);
      if (!metricsResponse.ok) throw new Error('Failed to load metrics');
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData.data);

      // Load alerts
      const alertsResponse = await fetch('/api/compliance/alerts?limit=10');
      if (!alertsResponse.ok) throw new Error('Failed to load alerts');
      const alertsData = await alertsResponse.json();
      setAlerts(alertsData.data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeViolation = async (violationId: string) => {
    try {
      const response = await fetch(`/api/compliance/violations/${violationId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acknowledgment: 'Violation acknowledged and remediation in progress'
        })
      });

      if (!response.ok) throw new Error('Failed to acknowledge violation');
      
      // Refresh data
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge violation');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'default';
    }
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button onClick={loadDashboardData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getComplianceScoreColor(overview.complianceScore)}`}>
                {overview.complianceScore}%
              </div>
              <Progress value={overview.complianceScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Violations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {overview.activeViolations}
              </div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending DSRs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {overview.pendingDSRs}
              </div>
              <p className="text-xs text-muted-foreground">
                Data Subject Requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {overview.upcomingDeadlines}
              </div>
              <p className="text-xs text-muted-foreground">
                Next 30 days
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="violations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
        </TabsList>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Compliance Violations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {violations.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No Active Violations</p>
                  <p className="text-muted-foreground">All compliance requirements are being met</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {violations.map((violation) => (
                    <div key={violation.violationId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{violation.type.replace(/_/g, ' ')}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(violation.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={getSeverityColor(violation.severity)}>
                            {violation.severity}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeViolation(violation.violationId)}
                          >
                            Acknowledge
                          </Button>
                        </div>
                      </div>
                      {violation.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {violation.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Violations by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(metrics.violations.byType).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="text-sm">{type.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">DSR Processing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Requests</span>
                        <span className="font-medium">{metrics.dsrRequests.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Completed</span>
                        <span className="font-medium text-green-600">{metrics.dsrRequests.completed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Pending</span>
                        <span className="font-medium text-yellow-600">{metrics.dsrRequests.pending}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg. Processing Time</span>
                        <span className="font-medium">{metrics.dsrRequests.averageProcessingTime} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Privacy Impact Assessments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total PIAs</span>
                        <span className="font-medium">{metrics.piaAssessments.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">High Risk</span>
                        <span className="font-medium text-red-600">{metrics.piaAssessments.highRisk}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Medium Risk</span>
                        <span className="font-medium text-yellow-600">{metrics.piaAssessments.mediumRisk}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Low Risk</span>
                        <span className="font-medium text-green-600">{metrics.piaAssessments.lowRisk}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Recent Compliance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No Recent Alerts</p>
                  <p className="text-muted-foreground">System is operating within compliance parameters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.alertId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{alert.type.replace(/_/g, ' ')}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <h5 className="text-sm font-medium mb-2">Recommended Actions:</h5>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {alert.recommendedActions.map((action, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-500">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Compliance Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deadlines.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No Upcoming Deadlines</p>
                  <p className="text-muted-foreground">All compliance deadlines are met</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deadlines.map((deadline, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{deadline.description}</h4>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(deadline.deadline).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge 
                          variant={deadline.daysRemaining <= 3 ? 'destructive' : 
                                  deadline.daysRemaining <= 7 ? 'default' : 'secondary'}
                        >
                          {deadline.daysRemaining} days
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};