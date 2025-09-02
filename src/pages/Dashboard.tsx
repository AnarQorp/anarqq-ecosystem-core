
import { useState, useEffect } from 'react';
import { Layout } from '@/components/common/Layout';
import { ModuleCard } from '@/components/common/ModuleCard';
import { generateMockUser, moduleInfo } from '@/utils/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserIdentities } from '@/components/user/IdentityDisplay';
import { User } from '@/types';
import { canCreateSubIdentities } from '@/lib/identityUtils';
import { getAvailableModules } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  
  useEffect(() => {
    // In a real app, this would fetch the user from an API or context
    const mockUser = generateMockUser();
    setUser(mockUser);
    
    // Get available modules based on user identity level
    if (mockUser) {
      const modules = getAvailableModules(mockUser);
      setAvailableModules(modules);
    }
  }, []);
  
  if (!user) {
    return (
      <Layout title="Dashboard">
        <div className="flex justify-center items-center h-64">
          <p>Loading user data...</p>
        </div>
      </Layout>
    );
  }
  
  // Get all module IDs
  const allModules = Object.keys(moduleInfo);
  
  // Split into active and inactive modules
  const activeModules = allModules.filter(id => moduleInfo[id as keyof typeof moduleInfo].active);
  const inactiveModules = allModules.filter(id => !moduleInfo[id as keyof typeof moduleInfo].active);
  
  return (
    <Layout title="Dashboard" description="AnarQ & Q Ecosystem Overview">
      <div className="space-y-10">
        {/* User Identity Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Your Identities</h2>
            {canCreateSubIdentities(user) && (
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Create Sub-identity
              </Button>
            )}
          </div>
          
          <UserIdentities 
            user={user} 
            activeIdentityId={user.primaryIdentity.id}
          />
        </section>
        
        {/* Active Modules Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Active Modules</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeModules.map((moduleId) => (
              <ModuleCard
                key={moduleId}
                moduleId={moduleId}
                isActive={availableModules.includes(moduleId)}
              />
            ))}
          </div>
        </section>
        
        {/* Coming Soon Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Coming Soon</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {inactiveModules.map((moduleId) => (
              <ModuleCard
                key={moduleId}
                moduleId={moduleId}
                isActive={false}
                showDescription={false}
              />
            ))}
          </div>
        </section>
        
        {/* System Status */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Current status of the AnarQ & Q ecosystem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{user.activeModules.length}</div>
                  <div className="text-sm text-muted-foreground">Active Modules</div>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-secondary">{user.subIdentities.length + 1}</div>
                  <div className="text-sm text-muted-foreground">Identities</div>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold" style={{ color: 'hsl(var(--qmail))' }}>
                    {user.privacySettings.level.toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">Privacy Level</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
