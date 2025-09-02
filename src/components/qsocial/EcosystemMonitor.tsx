/**
 * EcosystemMonitor Component
 * 
 * Real-time monitoring dashboard for AnarQ&Q ecosystem compliance.
 * Shows health status, validation results, and performance metrics.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Activity, 
  Shield, 
  Lock, 
  Globe, 
  Search, 
  Network,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  FileText,
  Users,
  Clock
} from 'lucide-react';
import { ecosystemFileService } from '../../services/qsocial/EcosystemFileService';
import { useEcosystemValidation } from '../../hooks/useEcosystemValidation';
import { QsocialFileAttachment } from '../../types/qsocial';

interface EcosystemMonitorProps {
  attachments?: QsocialFileAttachment[];
  showDetailedMetrics?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

interface EcosystemHealth {
  qonsent: { status: string; responseTime?: number };
  qlock: { status: string; responseTime?: number };
  qindex: { status: string; responseTime?: number };
  qerberos: { status: string; responseTime?: number };
  qnet: { status: string; responseTime?: number };
}

interface EcosystemStats {
  totalFiles: number;
  encryptedFiles: number;
  indexedFiles: number;
  publicFiles: number;
  privateFiles: number;
  daoFiles: number;
  averageProcessingTime: number;
  complianceScore: number;
}

export const EcosystemMonitor: React.FC<EcosystemMonitorProps> = ({
  attachments = [],
  showDetailedMetrics = true,
  autoRefresh = true,
  refreshInterval = 30
}) => {
  // State
  const [health, setHealth] = useState<EcosystemHealth | null>(null);
  const [stats, setStats] = useState<EcosystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Validation hook
  const { validateMultipleFiles, lastValidation } = useEcosystemValidation({
    autoValidate: true,
    showWarnings: true
  });

  // Load ecosystem health
  const loadEcosystemHealth = async () => {
    try {
      setLoading(true);
      const healthData = await ecosystemFileService.checkEcosystemHealth();
      
      if (healthData && healthData.ecosystem) {
        setHealth(healthData.ecosystem.services);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load ecosystem health:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load ecosystem stats
  const loadEcosystemStats = async () => {
    try {
      const statsData = await ecosystemFileService.getEcosystemStats();
      
      if (statsData) {
        // Calculate derived stats
        const totalFiles = statsData.qindex?.totalFiles || 0;
        const encryptedFiles = statsData.qlock?.totalKeys || 0;
        const indexedFiles = statsData.qindex?.searchableFiles || 0;
        
        const visibilityStats = statsData.qonsent?.byVisibility || {};
        const publicFiles = visibilityStats.public || 0;
        const privateFiles = visibilityStats.private || 0;
        const daoFiles = visibilityStats['dao-only'] || 0;
        
        const averageProcessingTime = statsData.qerberos?.averageProcessingTime || 0;
        
        // Calculate overall compliance score
        const complianceScore = totalFiles > 0 ? 
          Math.round(((encryptedFiles + indexedFiles) / (totalFiles * 2)) * 100) : 100;

        setStats({
          totalFiles,
          encryptedFiles,
          indexedFiles,
          publicFiles,
          privateFiles,
          daoFiles,
          averageProcessingTime,
          complianceScore
        });
      }
    } catch (error) {
      console.error('Failed to load ecosystem stats:', error);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    await Promise.all([
      loadEcosystemHealth(),
      loadEcosystemStats()
    ]);
  };

  // Auto-refresh effect
  useEffect(() => {
    refreshData();

    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Validate attachments when they change
  useEffect(() => {
    if (attachments.length > 0) {
      validateMultipleFiles(attachments);
    }
  }, [attachments, validateMultipleFiles]);

  // Render service status badge
  const renderServiceStatus = (serviceName: string, serviceData: any) => {
    const isHealthy = serviceData?.status === 'healthy';
    const variant = isHealthy ? 'default' : 'destructive';
    const icon = isHealthy ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />;

    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          {serviceName === 'qonsent' && <Shield className="h-4 w-4" />}
          {serviceName === 'qlock' && <Lock className="h-4 w-4" />}
          {serviceName === 'qindex' && <Search className="h-4 w-4" />}
          {serviceName === 'qerberos' && <Activity className="h-4 w-4" />}
          {serviceName === 'qnet' && <Network className="h-4 w-4" />}
          <span className="font-medium capitalize">{serviceName}</span>
        </div>
        <div className="flex items-center gap-2">
          {serviceData?.responseTime && (
            <span className="text-xs text-muted-foreground">
              {serviceData.responseTime}ms
            </span>
          )}
          <Badge variant={variant} className="text-xs">
            {icon}
            {isHealthy ? 'Healthy' : 'Error'}
          </Badge>
        </div>
      </div>
    );
  };

  // Render stats card
  const renderStatsCard = (title: string, value: number | string, icon: React.ReactNode, description?: string) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ecosystem Monitor</h2>
          <p className="text-muted-foreground">
            Real-time AnarQ&Q ecosystem health and compliance monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Service Health</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          {attachments.length > 0 && (
            <TabsTrigger value="validation">File Validation</TabsTrigger>
          )}
        </TabsList>

        {/* Service Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Ecosystem Services Status
              </CardTitle>
              <CardDescription>
                Real-time health status of all AnarQ&Q ecosystem services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {health ? (
                Object.entries(health).map(([serviceName, serviceData]) => (
                  <div key={serviceName}>
                    {renderServiceStatus(serviceName, serviceData)}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {loading ? 'Loading health status...' : 'Health data unavailable'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderStatsCard(
                  'Total Files',
                  stats.totalFiles,
                  <FileText className="h-6 w-6" />,
                  'Files in ecosystem'
                )}
                {renderStatsCard(
                  'Encrypted Files',
                  stats.encryptedFiles,
                  <Lock className="h-6 w-6" />,
                  'Qlock encrypted'
                )}
                {renderStatsCard(
                  'Indexed Files',
                  stats.indexedFiles,
                  <Search className="h-6 w-6" />,
                  'Qindex searchable'
                )}
                {renderStatsCard(
                  'Compliance Score',
                  `${stats.complianceScore}%`,
                  <TrendingUp className="h-6 w-6" />,
                  'Overall ecosystem compliance'
                )}
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>File Visibility Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Public Files
                      </span>
                      <Badge variant="outline">{stats.publicFiles}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        DAO Files
                      </span>
                      <Badge variant="outline">{stats.daoFiles}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Private Files
                      </span>
                      <Badge variant="outline">{stats.privateFiles}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Avg Processing Time
                      </span>
                      <Badge variant="outline">{stats.averageProcessingTime}ms</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Compliance Score</span>
                      <div className="flex items-center gap-2">
                        <Progress value={stats.complianceScore} className="w-16 h-2" />
                        <span className="text-sm">{stats.complianceScore}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Q∞ Architecture Compliance</CardTitle>
              <CardDescription>
                Validation of the complete Q∞ flow: sQuid → Qonsent → Qlock → Storj → IPFS → Qindex → Qerberos → QNET
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Q∞ Flow Visualization */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>sQuid</span>
                    <span>→</span>
                    <Shield className="h-4 w-4" />
                    <span>Qonsent</span>
                    <span>→</span>
                    <Lock className="h-4 w-4" />
                    <span>Qlock</span>
                    <span>→</span>
                    <span>Storj</span>
                    <span>→</span>
                    <Globe className="h-4 w-4" />
                    <span>IPFS</span>
                    <span>→</span>
                    <Search className="h-4 w-4" />
                    <span>Qindex</span>
                    <span>→</span>
                    <Activity className="h-4 w-4" />
                    <span>Qerberos</span>
                    <span>→</span>
                    <Network className="h-4 w-4" />
                    <span>QNET</span>
                  </div>
                </div>

                {stats && (
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">
                      {stats.complianceScore}%
                    </div>
                    <p className="text-muted-foreground">
                      Overall Ecosystem Compliance Score
                    </p>
                    <Progress value={stats.complianceScore} className="mt-4" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Validation Tab */}
        {attachments.length > 0 && (
          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>File Attachment Validation</CardTitle>
                <CardDescription>
                  Ecosystem compliance validation for current file attachments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lastValidation ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Validation Results</span>
                      <Badge variant={lastValidation.overallValid ? 'default' : 'destructive'}>
                        {lastValidation.overallValid ? 'All Valid' : 'Issues Found'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{lastValidation.summary.totalFiles}</div>
                        <div className="text-muted-foreground">Total Files</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{lastValidation.summary.validFiles}</div>
                        <div className="text-muted-foreground">Valid Files</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{lastValidation.summary.averageScore}%</div>
                        <div className="text-muted-foreground">Avg Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{lastValidation.summary.commonErrors.length}</div>
                        <div className="text-muted-foreground">Common Errors</div>
                      </div>
                    </div>

                    {lastValidation.summary.commonErrors.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-destructive">Common Issues:</h4>
                        {lastValidation.summary.commonErrors.map((error, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            {error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No validation results available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default EcosystemMonitor;