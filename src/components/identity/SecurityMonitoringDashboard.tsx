/**
 * Security Monitoring Dashboard for Identity Management
 * 
 * Provides comprehensive security monitoring, audit log viewing,
 * anomaly detection, and security event management for identity operations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Clock,
  User,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { 
  AuditEntry, 
  SecurityFlag, 
  IdentityAction,
  ExtendedSquidIdentity 
} from '@/types/identity';
import { AccessLogEntry } from '@/api/qerberos';
import { useIdentityStore } from '@/state/identity';

// Security Event Types
export interface SecurityEvent {
  id: string;
  type: 'AUDIT_LOG' | 'SECURITY_FLAG' | 'ACCESS_LOG' | 'ANOMALY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  timestamp: string;
  identityId?: string;
  metadata?: Record<string, any>;
  resolved: boolean;
}

// Anomaly Detection Types
export interface AnomalyPattern {
  type: 'RAPID_SWITCHING' | 'UNUSUAL_HOURS' | 'MULTIPLE_LOCATIONS' | 'EXCESSIVE_CREATION';
  threshold: number;
  timeWindow: number; // minutes
  description: string;
}

// Filter and Search Types
export interface SecurityEventFilter {
  type?: string;
  severity?: string;
  identityId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  resolved?: boolean;
}

interface SecurityMonitoringDashboardProps {
  identityId?: string; // If provided, shows logs for specific identity
  className?: string;
}

export const SecurityMonitoringDashboard: React.FC<SecurityMonitoringDashboardProps> = ({
  identityId,
  className = ''
}) => {
  // State management
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [anomalies, setAnomalies] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<SecurityEventFilter>({});
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Identity store
  const { identities, getAuditLog } = useIdentityStore();

  // Load security data
  useEffect(() => {
    loadSecurityData();
  }, [identityId]);

  const loadSecurityData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load audit logs
      if (identityId) {
        const logs = await getAuditLog(identityId);
        setAuditLogs(logs);
      } else {
        // Load all audit logs from all identities
        const allLogs: AuditEntry[] = [];
        identities.forEach(identity => {
          allLogs.push(...identity.auditLog);
        });
        setAuditLogs(allLogs.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      }

      // Load access logs from Qerberos
      const { getAccessLogs } = await import('@/api/qerberos');
      const accessLogData = await getAccessLogs(100);
      setAccessLogs(accessLogData);

      // Generate security events from logs
      const events = generateSecurityEvents(auditLogs, accessLogData);
      setSecurityEvents(events);

      // Detect anomalies
      const detectedAnomalies = detectAnomalies(auditLogs, accessLogData);
      setAnomalies(detectedAnomalies);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  // Generate security events from audit and access logs
  const generateSecurityEvents = (
    auditLogs: AuditEntry[], 
    accessLogs: AccessLogEntry[]
  ): SecurityEvent[] => {
    const events: SecurityEvent[] = [];

    // Convert audit logs to security events
    auditLogs.forEach(log => {
      const severity = log.metadata.securityLevel === 'CRITICAL' ? 'CRITICAL' :
                      log.metadata.securityLevel === 'HIGH' ? 'HIGH' :
                      log.metadata.securityLevel === 'MEDIUM' ? 'MEDIUM' : 'LOW';

      events.push({
        id: log.id,
        type: 'AUDIT_LOG',
        severity,
        title: `Identity ${log.action}`,
        description: `Identity action: ${log.action} by ${log.metadata.triggeredBy}`,
        timestamp: log.timestamp,
        identityId: log.identityId,
        metadata: log.metadata,
        resolved: true
      });
    });

    // Convert failed access logs to security events
    accessLogs
      .filter(log => log.status === 'FAILED' || log.status === 'DENIED')
      .forEach(log => {
        events.push({
          id: log.id,
          type: 'ACCESS_LOG',
          severity: log.status === 'DENIED' ? 'HIGH' : 'MEDIUM',
          title: `Access ${log.status}`,
          description: `${log.operation} operation failed: ${log.reason || 'Unknown reason'}`,
          timestamp: log.timestamp,
          metadata: { ...log.metadata, cid: log.cid },
          resolved: false
        });
      });

    return events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  // Anomaly detection logic
  const detectAnomalies = (
    auditLogs: AuditEntry[], 
    accessLogs: AccessLogEntry[]
  ): SecurityEvent[] => {
    const anomalies: SecurityEvent[] = [];
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // Detect rapid identity switching
    const recentSwitches = auditLogs.filter(log => 
      log.action === IdentityAction.SWITCHED &&
      new Date(log.timestamp).getTime() > now.getTime() - oneHour
    );

    if (recentSwitches.length > 10) {
      anomalies.push({
        id: `anomaly-rapid-switching-${Date.now()}`,
        type: 'ANOMALY',
        severity: 'HIGH',
        title: 'Rapid Identity Switching Detected',
        description: `${recentSwitches.length} identity switches in the last hour`,
        timestamp: now.toISOString(),
        metadata: { count: recentSwitches.length, timeWindow: '1 hour' },
        resolved: false
      });
    }

    // Detect unusual activity hours (activity between 2 AM and 6 AM)
    const nightActivity = auditLogs.filter(log => {
      const hour = new Date(log.timestamp).getHours();
      return hour >= 2 && hour <= 6 && 
             new Date(log.timestamp).getTime() > now.getTime() - oneDay;
    });

    if (nightActivity.length > 5) {
      anomalies.push({
        id: `anomaly-night-activity-${Date.now()}`,
        type: 'ANOMALY',
        severity: 'MEDIUM',
        title: 'Unusual Activity Hours',
        description: `${nightActivity.length} activities detected during night hours (2-6 AM)`,
        timestamp: now.toISOString(),
        metadata: { count: nightActivity.length, timeWindow: 'Last 24 hours' },
        resolved: false
      });
    }

    // Detect excessive identity creation
    const recentCreations = auditLogs.filter(log => 
      log.action === IdentityAction.CREATED &&
      new Date(log.timestamp).getTime() > now.getTime() - oneDay
    );

    if (recentCreations.length > 5) {
      anomalies.push({
        id: `anomaly-excessive-creation-${Date.now()}`,
        type: 'ANOMALY',
        severity: 'HIGH',
        title: 'Excessive Identity Creation',
        description: `${recentCreations.length} identities created in the last 24 hours`,
        timestamp: now.toISOString(),
        metadata: { count: recentCreations.length, timeWindow: '24 hours' },
        resolved: false
      });
    }

    return anomalies;
  };

  // Filter and search logic
  const filteredEvents = useMemo(() => {
    let filtered = [...securityEvents, ...anomalies];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.identityId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (eventFilter.type) {
      filtered = filtered.filter(event => event.type === eventFilter.type);
    }

    if (eventFilter.severity) {
      filtered = filtered.filter(event => event.severity === eventFilter.severity);
    }

    if (eventFilter.identityId) {
      filtered = filtered.filter(event => event.identityId === eventFilter.identityId);
    }

    if (eventFilter.resolved !== undefined) {
      filtered = filtered.filter(event => event.resolved === eventFilter.resolved);
    }

    return filtered;
  }, [securityEvents, anomalies, searchTerm, eventFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalEvents = securityEvents.length + anomalies.length;
    const criticalEvents = filteredEvents.filter(e => e.severity === 'CRITICAL').length;
    const unresolvedEvents = filteredEvents.filter(e => !e.resolved).length;
    const recentEvents = filteredEvents.filter(e => 
      new Date(e.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    return {
      total: totalEvents,
      critical: criticalEvents,
      unresolved: unresolvedEvents,
      recent: recentEvents
    };
  }, [securityEvents, anomalies, filteredEvents]);

  // Event severity badge color
  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  // Event type icon
  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'AUDIT_LOG': return <Activity className="h-4 w-4" />;
      case 'ACCESS_LOG': return <Eye className="h-4 w-4" />;
      case 'SECURITY_FLAG': return <Shield className="h-4 w-4" />;
      case 'ANOMALY': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitoring Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading security data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitoring Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadSecurityData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Monitoring Dashboard
              </CardTitle>
              <CardDescription>
                Monitor identity security events, audit logs, and anomalies
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadSecurityData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Events</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unresolved</p>
                <p className="text-2xl font-bold text-orange-600">{stats.unresolved}</p>
              </div>
              <XCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last 24h</p>
                <p className="text-2xl font-bold">{stats.recent}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events, identities, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={eventFilter.type || ''} onValueChange={(value) => 
                setEventFilter(prev => ({ ...prev, type: value || undefined }))
              }>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="AUDIT_LOG">Audit Log</SelectItem>
                  <SelectItem value="ACCESS_LOG">Access Log</SelectItem>
                  <SelectItem value="SECURITY_FLAG">Security Flag</SelectItem>
                  <SelectItem value="ANOMALY">Anomaly</SelectItem>
                </SelectContent>
              </Select>

              <Select value={eventFilter.severity || ''} onValueChange={(value) => 
                setEventFilter(prev => ({ ...prev, severity: value || undefined }))
              }>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Levels</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="events">Security Events</TabsTrigger>
              <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Recent Critical Events */}
              {filteredEvents.filter(e => e.severity === 'CRITICAL').length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Critical Security Events Detected</AlertTitle>
                  <AlertDescription>
                    {filteredEvents.filter(e => e.severity === 'CRITICAL').length} critical security events require immediate attention.
                  </AlertDescription>
                </Alert>
              )}

              {/* Recent Events Table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Security Events</h3>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Identity</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.slice(0, 20).map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEventTypeIcon(event.type)}
                              <span className="text-sm">{event.type.replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getSeverityBadgeVariant(event.severity)}>
                              {event.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{event.title}</p>
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {event.identityId ? (
                              <span className="text-sm font-mono">
                                {event.identityId.substring(0, 8)}...
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            {event.resolved ? (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Open
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Identity</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEventTypeIcon(event.type)}
                            <span className="text-sm">{event.type.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityBadgeVariant(event.severity)}>
                            {event.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {event.identityId ? (
                            <span className="text-sm font-mono">
                              {event.identityId.substring(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {event.resolved ? (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Open
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="anomalies" className="space-y-4">
              {anomalies.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No Anomalies Detected</h3>
                  <p className="text-muted-foreground">
                    All identity activities appear normal based on current patterns.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {anomalies.map((anomaly) => (
                    <Alert key={anomaly.id} variant={anomaly.severity === 'CRITICAL' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        {anomaly.title}
                        <Badge variant={getSeverityBadgeVariant(anomaly.severity)}>
                          {anomaly.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        <p>{anomaly.description}</p>
                        <p className="text-sm mt-2">
                          Detected at: {new Date(anomaly.timestamp).toLocaleString()}
                        </p>
                        {anomaly.metadata && (
                          <div className="mt-2 text-sm">
                            <strong>Details:</strong> {JSON.stringify(anomaly.metadata, null, 2)}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityMonitoringDashboard;