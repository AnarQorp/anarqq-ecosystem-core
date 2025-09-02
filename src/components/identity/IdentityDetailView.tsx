/**
 * Identity Detail View Component
 * Displays detailed identity information with editing and configuration options
 * Requirements: 1.2, 1.3
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  User,
  Edit3,
  Trash2,
  Shield,
  Key,
  Clock,
  Activity,
  Eye,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Copy,
  ExternalLink,
  Save,
  X
} from 'lucide-react';

import { useIdentityManager } from '@/hooks/useIdentityManager';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { 
  IdentityTypeIcon, 
  IdentityTypeBadge, 
  PrivacyLevelBadge,
  SecurityStatusBadge,
  KYCStatusBadge,
  GovernanceBadge
} from './IdentityVisualIndicators';
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel,
  IdentityStatus,
  AuditEntry,
  SecurityFlag
} from '@/types/identity';

interface IdentityDetailViewProps {
  identity: ExtendedSquidIdentity;
  onClose?: () => void;
  onEdit?: (identity: ExtendedSquidIdentity) => void;
  onDelete?: (identity: ExtendedSquidIdentity) => void;
  onSave?: (identity: ExtendedSquidIdentity, updates: Partial<ExtendedSquidIdentity>) => void;
  className?: string;
}

export const IdentityDetailView: React.FC<IdentityDetailViewProps> = ({
  identity,
  onClose,
  onEdit,
  onDelete,
  onSave,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: identity.name,
    description: identity.description || '',
    tags: identity.tags.join(', ')
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { deleteIdentity, updateIdentity, loading } = useIdentityManager();
  const { identity: activeIdentity, canPerformAction } = useActiveIdentity();

  // Check permissions
  const canEdit = useMemo(() => {
    return canPerformAction('modify', 'identity') && 
           (activeIdentity?.did === identity.did || activeIdentity?.did === identity.parentId);
  }, [canPerformAction, activeIdentity, identity]);

  const canDelete = useMemo(() => {
    return identity.type !== IdentityType.ROOT && 
           canPerformAction('delete', 'identity') &&
           (activeIdentity?.did === identity.parentId || activeIdentity?.permissions.canDeleteSubidentities);
  }, [canPerformAction, activeIdentity, identity]);

  // Handle form changes
  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    try {
      const updates: Partial<ExtendedSquidIdentity> = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        tags: editForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        updatedAt: new Date().toISOString()
      };

      if (onSave) {
        await onSave(identity, updates);
      } else {
        await updateIdentity(identity.did, updates);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save identity:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      if (onDelete) {
        await onDelete(identity);
      } else {
        await deleteIdentity(identity.did);
      }
      setShowDeleteDialog(false);
      onClose?.();
    } catch (error) {
      console.error('Failed to delete identity:', error);
    }
  };

  // Handle copy to clipboard
  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status color
  const getStatusColor = (status: IdentityStatus) => {
    switch (status) {
      case IdentityStatus.ACTIVE:
        return 'text-green-600';
      case IdentityStatus.INACTIVE:
        return 'text-gray-600';
      case IdentityStatus.SUSPENDED:
        return 'text-red-600';
      case IdentityStatus.DELETED:
        return 'text-red-800';
      case IdentityStatus.PENDING_VERIFICATION:
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IdentityTypeIcon type={identity.type} className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{identity.name}</h2>
            <p className="text-gray-600">
              {identity.description || 'No description provided'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={loading}
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          )}
          
          {canDelete && (
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Identity</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{identity.name}"? This action cannot be undone.
                    {identity.children.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Warning</span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">
                          This identity has {identity.children.length} child identities that will also be deleted.
                        </p>
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Identity
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <IdentityTypeBadge type={identity.type} />
        <PrivacyLevelBadge level={identity.privacyLevel} />
        <GovernanceBadge governanceType={identity.governanceLevel} />
        <KYCStatusBadge kyc={identity.kyc} />
        <Badge variant="outline" className={getStatusColor(identity.status)}>
          {identity.status}
        </Badge>
        {identity.children.length > 0 && (
          <Badge variant="secondary">
            {identity.children.length} Children
          </Badge>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="Identity name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editForm.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      placeholder="Identity description"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={editForm.tags}
                      onChange={(e) => handleFormChange('tags', e.target.value)}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Name</Label>
                    <p className="text-sm text-gray-900">{identity.name}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Description</Label>
                    <p className="text-sm text-gray-900">
                      {identity.description || 'No description provided'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {identity.tags.length > 0 ? (
                        identity.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No tags</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hierarchy Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Hierarchy Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Depth</Label>
                  <p className="text-sm text-gray-900">{identity.depth}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-600">Children</Label>
                  <p className="text-sm text-gray-900">{identity.children.length}</p>
                </div>
                
                {identity.parentId && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-600">Parent Identity</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-900 font-mono">{identity.parentId}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopy(identity.parentId!, 'parent')}
                      >
                        {copiedField === 'parent' ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-600">Path</Label>
                  <div className="text-sm text-gray-900 mt-1">
                    {identity.path.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {identity.path.map((pathId, index) => (
                          <React.Fragment key={pathId}>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {pathId.split(':').pop()?.slice(0, 8)}...
                            </span>
                            {index < identity.path.length - 1 && (
                              <span className="text-gray-400">→</span>
                            )}
                          </React.Fragment>
                        ))}
                        <span className="text-gray-400">→</span>
                        <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                          {identity.did.split(':').pop()?.slice(0, 8)}...
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Root identity</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created</Label>
                  <p className="text-sm text-gray-900">{formatDate(identity.createdAt)}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-600">Last Updated</Label>
                  <p className="text-sm text-gray-900">{formatDate(identity.updatedAt)}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-600">Last Used</Label>
                  <p className="text-sm text-gray-900">{formatDate(identity.lastUsed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <SecurityPanel identity={identity} onCopy={handleCopy} copiedField={copiedField} />
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <PrivacyPanel identity={identity} />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-6">
          <AuditLogPanel identity={identity} />
        </TabsContent>

        {/* Technical Tab */}
        <TabsContent value="technical" className="space-y-6">
          <TechnicalPanel identity={identity} onCopy={handleCopy} copiedField={copiedField} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Security Panel Component
interface SecurityPanelProps {
  identity: ExtendedSquidIdentity;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}

const SecurityPanel: React.FC<SecurityPanelProps> = ({ identity, onCopy, copiedField }) => {
  return (
    <div className="space-y-6">
      {/* KYC Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            KYC Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <KYCStatusBadge kyc={identity.kyc} />
            {identity.kyc.approved ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : identity.kyc.submitted ? (
              <Clock className="h-5 w-5 text-yellow-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-600">Required</Label>
              <p>{identity.kyc.required ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <Label className="text-gray-600">Submitted</Label>
              <p>{identity.kyc.submitted ? 'Yes' : 'No'}</p>
            </div>
            {identity.kyc.level && (
              <div>
                <Label className="text-gray-600">Level</Label>
                <p>{identity.kyc.level}</p>
              </div>
            )}
            {identity.kyc.approvedAt && (
              <div>
                <Label className="text-gray-600">Approved At</Label>
                <p>{new Date(identity.kyc.approvedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {identity.securityFlags.length > 0 ? (
            <div className="space-y-2">
              {identity.securityFlags.map((flag) => (
                <SecurityFlagItem key={flag.id} flag={flag} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No security flags</p>
          )}
        </CardContent>
      </Card>

      {/* Encryption Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Encryption Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-600">Algorithm</Label>
              <p>{identity.qlockKeyPair.algorithm}</p>
            </div>
            <div>
              <Label className="text-gray-600">Key Size</Label>
              <p>{identity.qlockKeyPair.keySize} bits</p>
            </div>
            <div>
              <Label className="text-gray-600">Created</Label>
              <p>{new Date(identity.qlockKeyPair.createdAt).toLocaleDateString()}</p>
            </div>
            {identity.qlockKeyPair.expiresAt && (
              <div>
                <Label className="text-gray-600">Expires</Label>
                <p>{new Date(identity.qlockKeyPair.expiresAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          
          <div>
            <Label className="text-gray-600">Public Key</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs bg-gray-100 p-2 rounded flex-1 truncate">
                {identity.qlockKeyPair.publicKey}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onCopy(identity.qlockKeyPair.publicKey, 'publicKey')}
              >
                {copiedField === 'publicKey' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Privacy Panel Component
interface PrivacyPanelProps {
  identity: ExtendedSquidIdentity;
}

const PrivacyPanel: React.FC<PrivacyPanelProps> = ({ identity }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-600">Privacy Level</Label>
            <div className="mt-1">
              <PrivacyLevelBadge level={identity.privacyLevel} />
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-600">Qonsent Profile ID</Label>
            <p className="text-sm text-gray-900 font-mono">{identity.qonsentProfileId}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-600">Governance Level</Label>
            <div className="mt-1">
              <GovernanceBadge governanceType={identity.governanceLevel} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Audit Log Panel Component
interface AuditLogPanelProps {
  identity: ExtendedSquidIdentity;
}

const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ identity }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Audit Log
        </CardTitle>
        <CardDescription>
          Recent activity and changes to this identity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {identity.auditLog.length > 0 ? (
            <div className="space-y-4">
              {identity.auditLog.map((entry) => (
                <AuditLogEntry key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No audit log entries</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Technical Panel Component
interface TechnicalPanelProps {
  identity: ExtendedSquidIdentity;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}

const TechnicalPanel: React.FC<TechnicalPanelProps> = ({ identity, onCopy, copiedField }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Technical Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-600">DID</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs bg-gray-100 p-2 rounded flex-1 font-mono">
                {identity.did}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onCopy(identity.did, 'did')}
              >
                {copiedField === 'did' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-600">Root ID</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs bg-gray-100 p-2 rounded flex-1 font-mono">
                {identity.rootId}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onCopy(identity.rootId, 'rootId')}
              >
                {copiedField === 'rootId' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {identity.qindexRegistered && (
            <div>
              <Label className="text-sm font-medium text-gray-600">Qindex Status</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Registered
                </Badge>
                {identity.qindexMetadata && (
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Qindex
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {identity.usageStats && (
            <div>
              <Label className="text-sm font-medium text-gray-600">Usage Statistics</Label>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <Label className="text-gray-500">Switch Count</Label>
                  <p>{identity.usageStats.switchCount}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Total Sessions</Label>
                  <p>{identity.usageStats.totalSessions}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper Components
const SecurityFlagItem: React.FC<{ flag: SecurityFlag }> = ({ flag }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-3 border rounded-lg ${getSeverityColor(flag.severity)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium text-sm">{flag.type}</span>
          <Badge variant="outline" className="text-xs">
            {flag.severity}
          </Badge>
        </div>
        {flag.resolved && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
      </div>
      <p className="text-sm mt-1">{flag.description}</p>
      <p className="text-xs mt-2 opacity-75">
        {new Date(flag.timestamp).toLocaleString()}
      </p>
    </div>
  );
};

const AuditLogEntry: React.FC<{ entry: AuditEntry }> = ({ entry }) => {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'UPDATED': return <Edit3 className="h-4 w-4 text-blue-600" />;
      case 'DELETED': return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'SWITCHED': return <Activity className="h-4 w-4 text-purple-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      {getActionIcon(entry.action)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{entry.action}</span>
          <Badge variant="outline" className="text-xs">
            {entry.metadata.securityLevel}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {new Date(entry.timestamp).toLocaleString()}
        </p>
        {entry.metadata.triggeredBy && (
          <p className="text-xs text-gray-500 mt-1">
            Triggered by: {entry.metadata.triggeredBy}
          </p>
        )}
      </div>
    </div>
  );
};

export default IdentityDetailView;