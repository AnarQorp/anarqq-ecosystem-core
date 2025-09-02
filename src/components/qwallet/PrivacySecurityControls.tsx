/**
 * Privacy and Security Controls Component
 * Provides UI for managing identity-specific privacy settings, device verification,
 * and ephemeral storage controls
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Smartphone, 
  Clock, 
  Trash2, 
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

import { usePrivacySecurity, useEphemeralStorage, useDeviceVerification, usePrivacyAudit } from '../../hooks/usePrivacySecurity';
import { useActiveIdentity } from '../../hooks/useActiveIdentity';
import { IdentityType, PrivacyLevel } from '../../types/identity';
import { PrivacySettings } from '../../types/wallet-config';

interface PrivacySecurityControlsProps {
  className?: string;
  compact?: boolean;
}

export function PrivacySecurityControls({ className, compact = false }: PrivacySecurityControlsProps) {
  const { identity } = useActiveIdentity();
  const { 
    updatePrivacySettings, 
    performDataCleanup, 
    exportPrivacyData,
    loading: privacyLoading,
    error: privacyError
  } = usePrivacySecurity();

  const [currentSettings, setCurrentSettings] = useState<Partial<PrivacySettings>>({});
  const [cleanupResult, setCleanupResult] = useState<{ cleaned: string[]; errors: string[] } | null>(null);
  const [showCleanupResult, setShowCleanupResult] = useState(false);

  // Load current privacy settings
  useEffect(() => {
    if (identity) {
      // In a real implementation, load current settings from wallet config
      setCurrentSettings({
        logTransactions: true,
        shareWithAnalytics: false,
        anonymizeMetadata: identity.type === IdentityType.AID,
        ephemeralStorage: identity.type === IdentityType.AID,
        dataRetentionPeriod: getDefaultRetentionPeriod(identity.type),
        privacyLevel: getDefaultPrivacyLevel(identity.type),
        hideBalances: false,
        hideTransactionHistory: false,
        encryptMetadata: identity.type !== IdentityType.ROOT
      });
    }
  }, [identity]);

  const handleSettingChange = async (key: keyof PrivacySettings, value: any) => {
    const newSettings = { ...currentSettings, [key]: value };
    setCurrentSettings(newSettings);
    
    // Update the setting immediately
    await updatePrivacySettings({ [key]: value });
  };

  const handleDataCleanup = async () => {
    const result = await performDataCleanup();
    setCleanupResult(result);
    setShowCleanupResult(true);
    
    // Hide result after 5 seconds
    setTimeout(() => setShowCleanupResult(false), 5000);
  };

  const handleExportData = async () => {
    try {
      const data = await exportPrivacyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacy-data-${identity?.did}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export privacy data:', error);
    }
  };

  if (!identity) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No active identity selected
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return <CompactPrivacyControls identity={identity} />;
  }

  return (
    <div className={className}>
      <Tabs defaultValue="privacy" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="device">Device</TabsTrigger>
          <TabsTrigger value="ephemeral">Ephemeral</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="privacy" className="space-y-4">
          <PrivacySettingsPanel 
            identity={identity}
            settings={currentSettings}
            onSettingChange={handleSettingChange}
            loading={privacyLoading}
            error={privacyError}
          />
        </TabsContent>

        <TabsContent value="device" className="space-y-4">
          <DeviceVerificationPanel />
        </TabsContent>

        <TabsContent value="ephemeral" className="space-y-4">
          <EphemeralStoragePanel identity={identity} />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <PrivacyAuditPanel 
            onDataCleanup={handleDataCleanup}
            onExportData={handleExportData}
            cleanupResult={cleanupResult}
            showCleanupResult={showCleanupResult}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Privacy Settings Panel
function PrivacySettingsPanel({ 
  identity, 
  settings, 
  onSettingChange, 
  loading, 
  error 
}: {
  identity: any;
  settings: Partial<PrivacySettings>;
  onSettingChange: (key: keyof PrivacySettings, value: any) => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Configure privacy controls for {identity.type} identity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Transaction Logging</label>
              <p className="text-xs text-muted-foreground">
                Log wallet transactions for audit purposes
              </p>
            </div>
            <Switch
              checked={settings.logTransactions || false}
              onCheckedChange={(checked) => onSettingChange('logTransactions', checked)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Analytics Sharing</label>
              <p className="text-xs text-muted-foreground">
                Share anonymized usage data for analytics
              </p>
            </div>
            <Switch
              checked={settings.shareWithAnalytics || false}
              onCheckedChange={(checked) => onSettingChange('shareWithAnalytics', checked)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Anonymize Metadata</label>
              <p className="text-xs text-muted-foreground">
                Remove identifying information from transaction metadata
              </p>
            </div>
            <Switch
              checked={settings.anonymizeMetadata || false}
              onCheckedChange={(checked) => onSettingChange('anonymizeMetadata', checked)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Hide Balances</label>
              <p className="text-xs text-muted-foreground">
                Hide wallet balances in the interface
              </p>
            </div>
            <Switch
              checked={settings.hideBalances || false}
              onCheckedChange={(checked) => onSettingChange('hideBalances', checked)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Hide Transaction History</label>
              <p className="text-xs text-muted-foreground">
                Hide transaction history from the interface
              </p>
            </div>
            <Switch
              checked={settings.hideTransactionHistory || false}
              onCheckedChange={(checked) => onSettingChange('hideTransactionHistory', checked)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Encrypt Metadata</label>
              <p className="text-xs text-muted-foreground">
                Encrypt sensitive metadata before storage
              </p>
            </div>
            <Switch
              checked={settings.encryptMetadata || false}
              onCheckedChange={(checked) => onSettingChange('encryptMetadata', checked)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Retention Period</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="2555"
                value={settings.dataRetentionPeriod || 365}
                onChange={(e) => onSettingChange('dataRetentionPeriod', parseInt(e.target.value))}
                className="w-20 px-2 py-1 text-sm border rounded"
                disabled={loading}
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              How long to retain data before automatic cleanup
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Privacy Level</label>
            <select
              value={settings.privacyLevel || PrivacyLevel.PRIVATE}
              onChange={(e) => onSettingChange('privacyLevel', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded"
              disabled={loading}
            >
              <option value={PrivacyLevel.PUBLIC}>Public</option>
              <option value={PrivacyLevel.DAO_ONLY}>DAO Only</option>
              <option value={PrivacyLevel.PRIVATE}>Private</option>
              <option value={PrivacyLevel.ANONYMOUS}>Anonymous</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Overall privacy level for this identity
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Device Verification Panel
function DeviceVerificationPanel() {
  const { 
    deviceFingerprint, 
    deviceVerification, 
    isDeviceTrusted, 
    requiresAdditionalAuth, 
    riskScore,
    verifyDevice,
    updateDeviceTrust,
    loading,
    error
  } = useDeviceVerification();

  const handleVerifyDevice = async () => {
    await verifyDevice();
  };

  const handleUpdateTrust = async (trustLevel: 'TRUSTED' | 'UNKNOWN' | 'SUSPICIOUS' | 'BLOCKED') => {
    if (deviceVerification) {
      await updateDeviceTrust(deviceVerification.deviceId, trustLevel);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Device Verification
        </CardTitle>
        <CardDescription>
          Manage device trust and verification settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {deviceVerification && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Device Status</span>
              <Badge variant={isDeviceTrusted ? 'default' : 'destructive'}>
                {deviceVerification.trustLevel}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Risk Score</span>
                <span className="text-sm">{riskScore}%</span>
              </div>
              <Progress value={riskScore} className="h-2" />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Device ID</span>
              <code className="block text-xs bg-muted p-2 rounded">
                {deviceVerification.deviceId}
              </code>
            </div>

            {requiresAdditionalAuth && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This device requires additional authentication for sensitive operations.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <span className="text-sm font-medium">Verification Reasons</span>
              <ul className="text-xs text-muted-foreground space-y-1">
                {deviceVerification.reasons.map((reason, index) => (
                  <li key={index}>• {reason}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleVerifyDevice}
                disabled={loading}
                size="sm"
              >
                Re-verify Device
              </Button>
              
              {!isDeviceTrusted && (
                <Button
                  onClick={() => handleUpdateTrust('TRUSTED')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  Mark as Trusted
                </Button>
              )}
            </div>
          </div>
        )}

        {deviceFingerprint && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium">Device Fingerprint</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium">Platform:</span>
                <div className="text-muted-foreground">{deviceFingerprint.platform}</div>
              </div>
              <div>
                <span className="font-medium">Language:</span>
                <div className="text-muted-foreground">{deviceFingerprint.language}</div>
              </div>
              <div>
                <span className="font-medium">Timezone:</span>
                <div className="text-muted-foreground">{deviceFingerprint.timezone}</div>
              </div>
              <div>
                <span className="font-medium">Screen:</span>
                <div className="text-muted-foreground">{deviceFingerprint.screenResolution}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Ephemeral Storage Panel (AID identities only)
function EphemeralStoragePanel({ identity }: { identity: any }) {
  const {
    isAIDIdentity,
    isEphemeralEnabled,
    enableEphemeralStorage,
    disableEphemeralStorage,
    ephemeralConfig,
    loading,
    error
  } = useEphemeralStorage();

  if (!isAIDIdentity) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Ephemeral storage is only available for AID identities</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Ephemeral Storage
        </CardTitle>
        <CardDescription>
          Temporary storage that self-destructs for maximum privacy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium">Enable Ephemeral Storage</label>
            <p className="text-xs text-muted-foreground">
              Store data temporarily with automatic cleanup
            </p>
          </div>
          <Switch
            checked={isEphemeralEnabled}
            onCheckedChange={async (checked) => {
              if (checked) {
                await enableEphemeralStorage();
              } else {
                await disableEphemeralStorage();
              }
            }}
            disabled={loading}
          />
        </div>

        {isEphemeralEnabled && ephemeralConfig && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium">Ephemeral Configuration</h4>
            
            <div className="grid grid-cols-1 gap-4 text-xs">
              <div>
                <span className="font-medium">Expires At:</span>
                <div className="text-muted-foreground">
                  {new Date(ephemeralConfig.expiresAt).toLocaleString()}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {ephemeralConfig.destructOnLogout ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>Destruct on logout</span>
                </div>
                
                <div className="flex items-center gap-1">
                  {ephemeralConfig.destructOnSessionLoss ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>Destruct on session loss</span>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Ephemeral storage will automatically clean up when you log out or lose your session.
                All wallet data will be permanently deleted.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Privacy Audit Panel
function PrivacyAuditPanel({ 
  onDataCleanup, 
  onExportData, 
  cleanupResult, 
  showCleanupResult 
}: {
  onDataCleanup: () => void;
  onExportData: () => void;
  cleanupResult: { cleaned: string[]; errors: string[] } | null;
  showCleanupResult: boolean;
}) {
  const { privacyAuditLogs, recentLogs, privacyViolations, loading } = usePrivacyAudit();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Audit
        </CardTitle>
        <CardDescription>
          Monitor privacy actions and manage data retention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showCleanupResult && cleanupResult && (
          <Alert variant={cleanupResult.errors.length > 0 ? 'destructive' : 'default'}>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div>Data cleanup completed:</div>
                {cleanupResult.cleaned.length > 0 && (
                  <div className="text-xs">
                    Cleaned: {cleanupResult.cleaned.join(', ')}
                  </div>
                )}
                {cleanupResult.errors.length > 0 && (
                  <div className="text-xs text-red-600">
                    Errors: {cleanupResult.errors.join(', ')}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{privacyAuditLogs.length}</div>
            <div className="text-xs text-muted-foreground">Total Actions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{privacyViolations}</div>
            <div className="text-xs text-muted-foreground">Violations</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Privacy Actions</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  {log.allowed ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>{log.action}</span>
                  <Badge variant="outline" className="text-xs">
                    {log.dataType}
                  </Badge>
                </div>
                <span className="text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onDataCleanup}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Up Data
          </Button>
          
          <Button
            onClick={onExportData}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard
function CompactPrivacyControls({ identity }: { identity: any }) {
  const { isDeviceTrusted, riskScore } = useDeviceVerification();
  const { isEphemeralEnabled } = useEphemeralStorage();
  const { privacyViolations } = usePrivacyAudit();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Privacy & Security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span>Device Trust</span>
          <Badge variant={isDeviceTrusted ? 'default' : 'destructive'} className="text-xs">
            {isDeviceTrusted ? 'Trusted' : 'Unverified'}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span>Risk Score</span>
          <span className={riskScore > 50 ? 'text-red-600' : 'text-green-600'}>
            {riskScore}%
          </span>
        </div>

        {identity.type === IdentityType.AID && (
          <div className="flex items-center justify-between text-xs">
            <span>Ephemeral Storage</span>
            <Badge variant={isEphemeralEnabled ? 'default' : 'secondary'} className="text-xs">
              {isEphemeralEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        )}

        {privacyViolations > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span>Privacy Violations</span>
            <Badge variant="destructive" className="text-xs">
              {privacyViolations}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions
function getDefaultRetentionPeriod(identityType: IdentityType): number {
  switch (identityType) {
    case IdentityType.AID:
      return 1;
    case IdentityType.CONSENTIDA:
      return 30;
    case IdentityType.ENTERPRISE:
      return 180;
    case IdentityType.DAO:
      return 365;
    case IdentityType.ROOT:
      return 365;
    default:
      return 90;
  }
}

function getDefaultPrivacyLevel(identityType: IdentityType): PrivacyLevel {
  switch (identityType) {
    case IdentityType.AID:
      return PrivacyLevel.ANONYMOUS;
    case IdentityType.CONSENTIDA:
      return PrivacyLevel.PRIVATE;
    case IdentityType.ENTERPRISE:
      return PrivacyLevel.DAO_ONLY;
    case IdentityType.DAO:
      return PrivacyLevel.PUBLIC;
    case IdentityType.ROOT:
      return PrivacyLevel.PUBLIC;
    default:
      return PrivacyLevel.PRIVATE;
  }
}