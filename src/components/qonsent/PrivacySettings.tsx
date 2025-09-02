
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, PrivacyLevel } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Clock, 
  HardDrive,
  Lock, 
  Share2,
  Save 
} from 'lucide-react';

interface PrivacySettingsProps {
  user: User;
  onUpdatePrivacySettings: (updatedSettings: User['privacySettings']) => void;
}

export function PrivacySettings({ user, onUpdatePrivacySettings }: PrivacySettingsProps) {
  const [settings, setSettings] = useState<User['privacySettings']>({
    ...user.privacySettings
  });
  const [hasChanges, setHasChanges] = useState(false);
  
  const handleChange = (key: keyof User['privacySettings'], value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(user.privacySettings));
      return newSettings;
    });
  };
  
  const handleSave = () => {
    onUpdatePrivacySettings(settings);
    setHasChanges(false);
  };
  
  const getPrivacyLevelDescription = (level: PrivacyLevel) => {
    switch (level) {
      case PrivacyLevel.LOW:
        return "Minimal privacy - most data visible to contacts";
      case PrivacyLevel.MEDIUM:
        return "Balanced privacy - some data restricted to verified contacts";
      case PrivacyLevel.HIGH:
        return "Maximum privacy - strict data controls, minimal metadata";
      default:
        return "";
    }
  };
  
  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid grid-cols-3 mb-8">
        <TabsTrigger value="general" className="flex items-center space-x-2">
          <Shield className="h-4 w-4" />
          <span>General Privacy</span>
        </TabsTrigger>
        <TabsTrigger value="data" className="flex items-center space-x-2">
          <HardDrive className="h-4 w-4" />
          <span>Data Management</span>
        </TabsTrigger>
        <TabsTrigger value="encryption" className="flex items-center space-x-2">
          <Lock className="h-4 w-4" />
          <span>Encryption</span>
        </TabsTrigger>
      </TabsList>
      
      {/* General Privacy Tab */}
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Level</CardTitle>
            <CardDescription>
              Control the visibility of your data and communications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="privacyLevel">Privacy Level</Label>
                <Select
                  value={settings.level}
                  onValueChange={(value) => handleChange('level', value)}
                >
                  <SelectTrigger id="privacyLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PrivacyLevel.LOW}>
                      <div className="flex items-center">
                        <Eye className="mr-2 h-4 w-4 text-green-500" />
                        <span>Low - Standard Privacy</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={PrivacyLevel.MEDIUM}>
                      <div className="flex items-center">
                        <Eye className="mr-2 h-4 w-4 text-amber-500" />
                        <span>Medium - Enhanced Privacy</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={PrivacyLevel.HIGH}>
                      <div className="flex items-center">
                        <EyeOff className="mr-2 h-4 w-4 text-red-500" />
                        <span>High - Maximum Privacy</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {getPrivacyLevelDescription(settings.level as PrivacyLevel)}
                </p>
              </div>
              
              <div>
                <Label className="block mb-2">Third-party Sharing</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">
                      Allow sharing data with third parties
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Controls whether your data can be shared outside the AnarQ ecosystem
                    </div>
                  </div>
                  <Switch 
                    checked={settings.thirdPartySharing}
                    onCheckedChange={(checked) => handleChange('thirdPartySharing', checked)}
                  />
                </div>
              </div>
              
              <div>
                <Label className="block mb-2">Metadata Collection</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">
                      Allow collection of usage metadata
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Helps improve AnarQ by collecting anonymized usage patterns
                    </div>
                  </div>
                  <Switch 
                    checked={settings.metadataCollection}
                    onCheckedChange={(checked) => handleChange('metadataCollection', checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setSettings(user.privacySettings)}>
              Reset
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges}
              className="flex items-center"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      {/* Data Management Tab */}
      <TabsContent value="data">
        <Card>
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
            <CardDescription>
              Control how long your data is stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <Label>Data Retention Period (Days)</Label>
                  <span className="text-sm font-medium">{settings.dataRetention} days</span>
                </div>
                <Slider
                  value={[settings.dataRetention]}
                  min={7}
                  max={365}
                  step={1}
                  onValueChange={(value) => handleChange('dataRetention', value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>7 days</span>
                  <span>1 year</span>
                </div>
                <p className="text-sm text-muted-foreground mt-3 flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Messages and content will be automatically deleted after {settings.dataRetention} days
                </p>
              </div>
              
              <div className="pt-4 border-t">
                <Label className="block mb-4">Data Management Options</Label>
                
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <HardDrive className="mr-2 h-4 w-4" />
                    Export all my data (coming soon)
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Delete all my data (coming soon)
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setSettings(user.privacySettings)}>
              Reset
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges}
              className="flex items-center"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      {/* Encryption Tab */}
      <TabsContent value="encryption">
        <Card>
          <CardHeader>
            <CardTitle>Encryption Settings</CardTitle>
            <CardDescription>
              Control your encryption preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="encryptionStrength">Encryption Strength</Label>
                <Select
                  value={settings.encryptionStrength}
                  onValueChange={(value) => handleChange('encryptionStrength', value)}
                >
                  <SelectTrigger id="encryptionStrength">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">
                      <div className="flex items-center">
                        <Lock className="mr-2 h-4 w-4 text-blue-500" />
                        <span>Standard Encryption</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="enhanced">
                      <div className="flex items-center">
                        <Lock className="mr-2 h-4 w-4 text-purple-500" />
                        <span>Enhanced Encryption</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="quantum">
                      <div className="flex items-center">
                        <Lock className="mr-2 h-4 w-4 text-primary" />
                        <span>Quantum-Resistant Encryption</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="bg-secondary/30 p-3 rounded-md mt-4 space-y-2 text-sm">
                  <div className="font-medium flex items-center">
                    <Lock className="mr-2 h-4 w-4" />
                    Encryption Information
                  </div>
                  <p className="text-muted-foreground">
                    Your current encryption setting ({settings.encryptionStrength}) determines how your data is protected both at rest and in transit.
                  </p>
                  <p className="text-muted-foreground">
                    Quantum-resistant encryption provides the highest level of security against both conventional and quantum computing attacks.
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Label className="block mb-2">Advanced Options</Label>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">
                        Enable forward secrecy
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Generates new session keys for each conversation
                      </div>
                    </div>
                    <Switch 
                      checked={true}
                      disabled
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">
                        Encrypt metadata
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Applies encryption to message metadata
                      </div>
                    </div>
                    <Switch 
                      checked={settings.level === PrivacyLevel.HIGH}
                      disabled={settings.level !== PrivacyLevel.HIGH}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setSettings(user.privacySettings)}>
              Reset
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges}
              className="flex items-center"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
