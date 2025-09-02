
import { useState, useEffect } from 'react';
import { Layout } from '@/components/common/Layout';
import { PrivacySettings } from '@/components/qonsent/PrivacySettings';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Shield, ShieldCheck } from 'lucide-react';
import { generateMockUser } from '@/utils/mockData';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { IdentityExposureLevel, QonsentSettings } from '@/types/qonsent';

export default function Config() {
  const [user, setUser] = useState<User | null>(null);
  const [qonsentSettings, setQonsentSettings] = useState<QonsentSettings>({
    exposureLevel: IdentityExposureLevel.MEDIUM,
    moduleSharing: {
      squid: true,
      qlock: true,
      qmail: false
    },
    useQmask: false
  });
  
  useEffect(() => {
    // TODO: Connect with real user service and IPFS config storage
    const mockUser = generateMockUser();
    setUser(mockUser);
  }, []);

  const handleUpdatePrivacySettings = (settings: QonsentSettings) => {
    // TODO: Integrate with Qmask anonymization engine
    // TODO: Store consent on blockchain
    // TODO: Export settings to IPFS
    setQonsentSettings(settings);
    
    toast({
      title: 'Privacy Settings Updated',
      description: 'Your privacy preferences have been saved.',
    });
  };

  const handleExposureLevelChange = (level: IdentityExposureLevel) => {
    setQonsentSettings(prev => ({
      ...prev,
      exposureLevel: level,
      useQmask: level === IdentityExposureLevel.ANONYMOUS
    }));
  };

  const handleModuleSharingToggle = (moduleId: string) => {
    setQonsentSettings(prev => ({
      ...prev,
      moduleSharing: {
        ...prev.moduleSharing,
        [moduleId]: !prev.moduleSharing[moduleId]
      }
    }));
  };
  
  return (
    <Layout module="qonsent">
      <div className="max-w-4xl mx-auto space-y-8">
        {user ? (
          <>
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Privacy Management</h2>
              
              <div className="space-y-6">
                {/* Identity Exposure Level */}
                <div className="space-y-4">
                  <Label>Identity Exposure Level</Label>
                  <Select 
                    value={qonsentSettings.exposureLevel}
                    onValueChange={(value) => handleExposureLevelChange(value as IdentityExposureLevel)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={IdentityExposureLevel.HIGH}>
                        <div className="flex items-center">
                          <Eye className="mr-2 h-4 w-4 text-green-500" />
                          <span>High - Full Identity Exposure</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={IdentityExposureLevel.MEDIUM}>
                        <div className="flex items-center">
                          <Eye className="mr-2 h-4 w-4 text-yellow-500" />
                          <span>Medium - Partial Identity Protection</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={IdentityExposureLevel.LOW}>
                        <div className="flex items-center">
                          <EyeOff className="mr-2 h-4 w-4 text-red-500" />
                          <span>Low - Enhanced Privacy</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={IdentityExposureLevel.ANONYMOUS}>
                        <div className="flex items-center">
                          <Shield className="mr-2 h-4 w-4 text-purple-500" />
                          <span>Anonymous - Maximum Protection</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Module Sharing Controls */}
                <div className="space-y-4">
                  <Label>Module Data Sharing</Label>
                  <div className="space-y-4">
                    {Object.entries(qonsentSettings.moduleSharing).map(([moduleId, isEnabled]) => (
                      <div key={moduleId} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="font-medium capitalize">
                            {moduleId}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Allow data sharing with {moduleId}
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleModuleSharingToggle(moduleId)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Qmask Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">
                        Enable Qmask Protection
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Advanced anonymization for maximum privacy
                      </div>
                    </div>
                    <Switch
                      checked={qonsentSettings.useQmask}
                      onCheckedChange={(checked) => 
                        setQonsentSettings(prev => ({
                          ...prev,
                          useQmask: checked
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Privacy Summary */}
                <Card className="bg-secondary/30 p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Current Privacy Status</h3>
                  </div>
                  <div className="text-sm space-y-2 text-muted-foreground">
                    <p>Exposure Level: {qonsentSettings.exposureLevel}</p>
                    <p>Modules with Data Access: {Object.entries(qonsentSettings.moduleSharing)
                      .filter(([, enabled]) => enabled)
                      .map(([moduleId]) => moduleId)
                      .join(", ")}</p>
                    <p>Qmask Protection: {qonsentSettings.useQmask ? "Active" : "Inactive"}</p>
                  </div>
                </Card>

                <Button 
                  onClick={() => handleUpdatePrivacySettings(qonsentSettings)}
                  className="w-full"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Update Privacy Settings
                </Button>
              </div>
            </Card>

            {/* Updated: We need to map our QonsentSettings to the structure expected by PrivacySettings */}
            {user && (
              <PrivacySettings 
                user={{
                  ...user,
                  privacySettings: {
                    ...user.privacySettings,
                    // Map any additional properties that might be needed
                  }
                }}
                onUpdatePrivacySettings={(updatedSettings) => {
                  // Convert the User settings back to QonsentSettings
                  handleUpdatePrivacySettings({
                    exposureLevel: qonsentSettings.exposureLevel,
                    moduleSharing: qonsentSettings.moduleSharing,
                    useQmask: qonsentSettings.useQmask,
                    qmaskStrength: qonsentSettings.qmaskStrength
                  });
                }}
              />
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p>Loading privacy settings...</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
