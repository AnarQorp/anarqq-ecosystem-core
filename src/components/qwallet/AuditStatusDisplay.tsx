/**
 * Audit Status Display Component
 * Shows security risk flags, compliance status, recent audit events,
 * and risk mitigation recommendations for wallet operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  Settings,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { enhancedAuditService } from '@/services/identity/EnhancedAuditService';
import { 
  RiskAssessment, 
  SecurityAlert, 
  ComplianceViolation,
  WalletAuditLog,
  RiskFactor
} from '@/services/identity/EnhancedAuditService';

interface AuditStatusDisplayProps {
  identityId?: string;
  showRecentEvents?: boolean;
  showRecommendations?: boolean;
  maxEvents?: number;
  onRiskLevelChange?: (riskLevel: string) => void;
  onAlertGenerated?: (alert: SecurityAlert) => void;
  className?: string;
}

interface AuditSummary {
  riskAssessment: RiskAssessment | null;
  recentAlerts: SecurityAlert[];
  recentViolations: ComplianceViolation[];
  recentEvents: WalletAuditLog[];
  complianceScore: number;
}

export const AuditStatusDisplay: React.FC<AuditStatusDisplayProps> = ({
  identityId: propIdentityId,
  showRecentEvents = true,
  showRecommendations = true,
  maxEvents = 10,
  onRiskLevelChange,
  onAlertGenerated,
  className = ''
}) => {
  const { activeIdentity } = useActiveIdentity();
  const identityId = propIdentityId || activeIdentity?.id || '';

  // State management
  const [auditSummary, setAuditSummary] = useState<AuditSummary>({
    riskAssessment: null,
    recentAlerts: [],
    recentViolations: [],
    recentEvents: [],
    complianceScore: 1.0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Load audit data
  const loadAuditData = useCallback(async () => {
    if (!identityId) return;

    setIsLoading(true);
    try {
      // Get current risk assessment
      const riskAssessment = await enhancedAuditService.calculateRiskScore(identityId);
      
      // Get recent audit events
      const recentEvents = await enhancedAuditService.getAuditTrail(identityId, {
        limit: maxEvents
      });

      // Generate compliance report for recent period
      const complianceReport = await enhancedAuditService.generateComplianceReport(
        identityId,
        {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          end: new Date().toISOString()
        }
      );

      const summary: AuditSummary = {
        riskAssessment,
        recentAlerts: [], // Would be populated from security alerts
        recentViolations: complianceReport.violations,
        recentEvents,
        complianceScore: complianceReport.summary.totalViolations === 0 ? 1.0 : 
                        Math.max(0, 1 - (complianceReport.summary.totalViolations * 0.1))
      };

      setAuditSummary(summary);
      setLastUpdated(new Date().toISOString());

      // Notify risk level change
      if (onRiskLevelChange && riskAssessment) {
        onRiskLevelChange(riskAssessment.riskLevel);
      }

    } catch (error) {
      console.error('[AuditStatusDisplay] Error loading audit data:', error);
      toast({
        title: "Audit Data Error",
        description: "Failed to load audit information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [identityId, maxEvents, onRiskLevelChange]);

  // Refresh audit data
  const handleRefresh = async () => {
    await loadAuditData();
    toast({
      title: "Audit Data Refreshed",
      description: "Security and compliance status updated",
    });
  };

  // Load data on component mount and identity change
  useEffect(() => {
    if (identityId) {
      loadAuditData();
    }
  }, [identityId, loadAuditData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (identityId) {
      const interval = setInterval(loadAuditData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [identityId, loadAuditData]);

  // Render risk level badge
  const renderRiskBadge = (riskLevel: string) => {
    const config = {
      LOW: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      MEDIUM: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      HIGH: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-orange-600' },
      CRITICAL: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' }
    };

    const { variant, icon: Icon, color } = config[riskLevel as keyof typeof config] || config.MEDIUM;

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${color}`} />
        {riskLevel}
      </Badge>
    );
  };

  // Render compliance score
  const renderComplianceScore = (score: number) => {
    const percentage = Math.round(score * 100);
    const isGood = score >= 0.8;
    
    return (
      <div className="flex items-center gap-2">
        <div className={`text-2xl font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
          {percentage}%
        </div>
        {isGood ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
      </div>
    );
  };

  // Render recent events
  const renderRecentEvents = () => {
    if (!showRecentEvents || auditSummary.recentEvents.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Recent Activity</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedSection(expandedSection === 'events' ? null : 'events')}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
        
        {expandedSection === 'events' && (
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {auditSummary.recentEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-muted-foreground" />
                    <span>{event.operation}</span>
                    {event.amount && (
                      <Badge variant="outline" className="text-xs">
                        {event.amount} {event.token || 'ETH'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {event.success ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-600" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  };

  // Render risk factors
  const renderRiskFactors = () => {
    if (!auditSummary.riskAssessment?.factors.length) {
      return null;
    }

    const topFactors = auditSummary.riskAssessment.factors
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return (
      <div className="space-y-3">
        <h4 className="font-medium">Top Risk Factors</h4>
        <div className="space-y-2">
          {topFactors.map((factor, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  factor.score > 0.7 ? 'bg-red-500' :
                  factor.score > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <span>{factor.name}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {Math.round(factor.score * 100)}%
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render recommendations
  const renderRecommendations = () => {
    if (!showRecommendations || !auditSummary.riskAssessment?.recommendations.length) {
      return null;
    }

    return (
      <div className="space-y-3">
        <h4 className="font-medium">Security Recommendations</h4>
        <div className="space-y-2">
          {auditSummary.riskAssessment.recommendations.slice(0, 3).map((recommendation, index) => (
            <Alert key={index}>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {recommendation}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </div>
    );
  };

  // Render violations
  const renderViolations = () => {
    if (auditSummary.recentViolations.length === 0) {
      return null;
    }

    const criticalViolations = auditSummary.recentViolations.filter(v => v.severity === 'CRITICAL');
    const highViolations = auditSummary.recentViolations.filter(v => v.severity === 'HIGH');

    return (
      <div className="space-y-3">
        <h4 className="font-medium">Compliance Issues</h4>
        <div className="space-y-2">
          {criticalViolations.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {criticalViolations.length} critical compliance violation(s) detected
              </AlertDescription>
            </Alert>
          )}
          {highViolations.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {highViolations.length} high-priority compliance issue(s) require attention
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  };

  if (!identityId) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Please select an identity to view audit status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Compliance Status
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Risk Assessment Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium">Risk Level</h3>
            <div className="flex items-center gap-2">
              {auditSummary.riskAssessment ? (
                <>
                  {renderRiskBadge(auditSummary.riskAssessment.riskLevel)}
                  <span className="text-sm text-muted-foreground">
                    Score: {Math.round(auditSummary.riskAssessment.riskScore * 100)}%
                  </span>
                </>
              ) : (
                <Badge variant="secondary">Calculating...</Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Compliance Score</h3>
            {renderComplianceScore(auditSummary.complianceScore)}
          </div>
        </div>

        <Separator />

        {/* Risk Factors */}
        {renderRiskFactors()}

        {/* Compliance Violations */}
        {renderViolations()}

        <Separator />

        {/* Recent Events */}
        {renderRecentEvents()}

        <Separator />

        {/* Recommendations */}
        {renderRecommendations()}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center">
          {lastUpdated && (
            <>
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Security Monitoring</p>
              <p>
                Real-time monitoring of wallet security, compliance status, and risk factors. 
                Data is automatically updated every 5 minutes.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditStatusDisplay;