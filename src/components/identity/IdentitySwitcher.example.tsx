/**
 * IdentitySwitcher Example Usage
 * Demonstrates how to use the IdentitySwitcher component in different modes
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IdentitySwitcher } from './IdentitySwitcher';
import { useToast } from '@/hooks/use-toast';
import { ExtendedSquidIdentity } from '@/types/identity';

export const IdentitySwitcherExample: React.FC = () => {
  const { toast } = useToast();

  const handleIdentitySwitch = (identity: ExtendedSquidIdentity) => {
    console.log('Identity switched to:', identity.name);
    toast({
      title: "Identity Switched",
      description: `Now operating as ${identity.name}`,
    });
  };

  const handleSwitchError = (error: string) => {
    console.error('Identity switch failed:', error);
    toast({
      title: "Switch Failed",
      description: error,
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Identity Switcher Examples</h1>
      
      {/* Dropdown Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Dropdown Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Standard Dropdown</h3>
            <IdentitySwitcher
              mode="dropdown"
              showSecurityBadges={true}
              onIdentitySwitch={handleIdentitySwitch}
              onSwitchError={handleSwitchError}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Compact Dropdown</h3>
            <IdentitySwitcher
              mode="dropdown"
              compactMode={true}
              showSecurityBadges={false}
              onIdentitySwitch={handleIdentitySwitch}
              onSwitchError={handleSwitchError}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Grid Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Standard Grid</h3>
            <IdentitySwitcher
              mode="grid"
              showSecurityBadges={true}
              onIdentitySwitch={handleIdentitySwitch}
              onSwitchError={handleSwitchError}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Compact Grid</h3>
            <IdentitySwitcher
              mode="grid"
              compactMode={true}
              showSecurityBadges={true}
              onIdentitySwitch={handleIdentitySwitch}
              onSwitchError={handleSwitchError}
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage in Header */}
      <Card>
        <CardHeader>
          <CardTitle>Header Integration Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Application Header</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <IdentitySwitcher
                mode="dropdown"
                compactMode={true}
                showSecurityBadges={true}
                className="min-w-[180px]"
                onIdentitySwitch={handleIdentitySwitch}
                onSwitchError={handleSwitchError}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Responsive Example */}
      <Card>
        <CardHeader>
          <CardTitle>Mobile Responsive</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="block md:hidden">
              <h3 className="text-sm font-medium mb-2">Mobile View (Grid)</h3>
              <IdentitySwitcher
                mode="grid"
                compactMode={true}
                showSecurityBadges={false}
                onIdentitySwitch={handleIdentitySwitch}
                onSwitchError={handleSwitchError}
              />
            </div>
            
            <div className="hidden md:block">
              <h3 className="text-sm font-medium mb-2">Desktop View (Dropdown)</h3>
              <IdentitySwitcher
                mode="dropdown"
                showSecurityBadges={true}
                onIdentitySwitch={handleIdentitySwitch}
                onSwitchError={handleSwitchError}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IdentitySwitcherExample;