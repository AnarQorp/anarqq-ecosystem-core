/**
 * Identity Management Page
 * Main hub for identity management with overview dashboard, creation wizard, and detailed views
 * Requirements: All requirements from squid-identity-expansion spec
 */

import React, { useState, useCallback } from 'react';
import { Layout } from '@/components/common/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Plus, 
  Settings, 
  Shield, 
  Activity, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

// Identity Components
import { IdentityOverviewDashboard } from '@/components/identity/IdentityOverviewDashboard';
import { SubidentityCreationWizard } from '@/components/identity/SubidentityCreationWizard';
import { IdentityDetailView } from '@/components/identity/IdentityDetailView';
import { SecurityMonitoringDashboard } from '@/components/identity/SecurityMonitoringDashboard';
import { IdentitySwitcher } from '@/components/identity/IdentitySwitcher';

// Hooks
import { useIdentityManager } from '@/hooks/useIdentityManager';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { useToast } from '@/hooks/use-toast';

// Types
import { ExtendedSquidIdentity, IdentityType } from '@/types/identity';

export default function IdentityManagement() {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreationWizard, setShowCreationWizard] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState<ExtendedSquidIdentity | null>(null);
  const [showIdentityDetails, setShowIdentityDetails] = useState(false);

  // Hooks
  const { identities, activeIdentity, loading, error, getIdentityStats } = useIdentityManager();
  const { identity: currentIdentity, canCreateSubidentities, isRoot } = useActiveIdentity();
  const { toast } = useToast();

  // Get statistics
  const stats = getIdentityStats();

  // Handle identity creation
  const handleCreateIdentity = useCallback(() => {
    if (!canCreateSubidentities) {
      toast({
        title: "Permission Denied",
        description: "Your current identity cannot create subidentities.",
        variant: "destructive"
      });
      return;
    }
    setShowCreationWizard(true);
  }, [canCreateSubidentities, toast]);

  // Handle identity creation success
  const handleIdentityCreated = useCallback((identity: ExtendedSquidIdentity) => {
    toast({
      title: "Identity Created",
      description: `Successfully created ${identity.type.toLowerCase()} identity "${identity.name}".`,
    });
    setShowCreationWizard(false);
    // Optionally switch to the new identity or show its details
    setSelectedIdentity(identity);
    setShowIdentityDetails(true);
  }, [toast]);

  // Handle identity selection for details
  const handleViewIdentityDetails = useCallback((identity: ExtendedSquidIdentity) => {
    setSelectedIdentity(identity);
    setShowIdentityDetails(true);
  }, []);

  // Handle identity editing
  const handleEditIdentity = useCallback((identity: ExtendedSquidIdentity) => {
    setSelectedIdentity(identity);
    setShowIdentityDetails(true);
    // Focus on edit mode in the detail view
  }, []);

  // Handle identity deletion
  const handleDeleteIdentity = useCallback((identity: ExtendedSquidIdentity) => {
    // This would typically show a confirmation dialog
    console.log('Delete identity:', identity.did);
    toast({
      title: "Delete Identity",
      description: "Identity deletion functionality would be implemented here.",
      variant: "destructive"
    });
  }, [toast]);

  // Handle identity switching from switcher
  const handleIdentitySwitch = useCallback((identity: ExtendedSquidIdentity) => {
    toast({
      title: "Identity Switched",
      description: `Now operating as ${identity.name}`,
    });
  }, [toast]);

  // Render loading state
  if (loading && identities.length === 0) {
    return (
      <Layout module="squid" title="Identity Management" description="Manage your identities and subidentities">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  // Render error state
  if (error && identities.length === 0) {
    return (
      <Layout module="squid" title="Identity Management" description="Manage your identities and subidentities">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load identity management: {error}
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout module="squid" title="Identity Management" description="Manage your identities and subidentities">
      <div className="space-y-6">
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Identity Management</h1>
            <p className="text-gray-600 mt-1">
              Manage your identities and subidentities across the ecosystem
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Identity Switcher */}
            {identities.length > 1 && (
              <IdentitySwitcher 
                mode="dropdown"
                showSecurityBadges={true}
                onIdentitySwitch={handleIdentitySwitch}
                className="min-w-[200px]"
              />
            )}
            
            {/* Create Identity Button */}
            {canCreateSubidentities && (
              <Button onClick={handleCreateIdentity} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Identity
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Identities</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">KYC Verified</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.withKYC}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Eye className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Root Identities</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.byType[IdentityType.ROOT]}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Identity Info */}
        {currentIdentity && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Currently Operating As</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-blue-700">{currentIdentity.name}</span>
                      <Badge variant="secondary">{currentIdentity.type}</Badge>
                      {currentIdentity.kyc.approved && (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          KYC
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-blue-600">
                    {canCreateSubidentities ? 'Can create subidentities' : 'Limited permissions'}
                  </p>
                  <p className="text-xs text-blue-500">
                    Privacy: {currentIdentity.privacyLevel.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <Users className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <IdentityOverviewDashboard
              onCreateIdentity={handleCreateIdentity}
              onEditIdentity={handleEditIdentity}
              onDeleteIdentity={handleDeleteIdentity}
              onViewDetails={handleViewIdentityDetails}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecurityMonitoringDashboard />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identity Settings</CardTitle>
                <CardDescription>
                  Configure global identity management settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Identity settings and preferences will be implemented here.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Creation Wizard Modal */}
        <SubidentityCreationWizard
          open={showCreationWizard}
          onClose={() => setShowCreationWizard(false)}
          onIdentityCreated={handleIdentityCreated}
        />

        {/* Identity Detail Modal */}
        {selectedIdentity && (
          <IdentityDetailView
            identity={selectedIdentity}
            open={showIdentityDetails}
            onClose={() => {
              setShowIdentityDetails(false);
              setSelectedIdentity(null);
            }}
            onEdit={handleEditIdentity}
            onDelete={handleDeleteIdentity}
          />
        )}
      </div>
    </Layout>
  );
}