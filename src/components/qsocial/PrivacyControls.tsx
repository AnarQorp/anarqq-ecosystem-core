/**
 * Privacy Controls Component for Qsocial
 * Provides UI for managing privacy settings and content visibility
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Shield, Eye, EyeOff, Users, Lock, Globe } from 'lucide-react';
import { PrivacyService } from '../../services/qsocial/PrivacyService';
import { getPrivacySettings, updatePrivacySettings, getPrivacyLevelInfo } from '../../api/qonsent';
import { getActiveIdentity } from '../../state/identity';
import type { PrivacyLevel as QsocialPrivacyLevel } from '../../types/qsocial';
import type { PrivacyLevel as QonsentPrivacyLevel, User } from '../../types';

interface PrivacyControlsProps {
  currentPrivacyLevel?: QsocialPrivacyLevel;
  onPrivacyLevelChange?: (level: QsocialPrivacyLevel) => void;
  contentType?: 'post' | 'comment';
  subcommunityId?: string;
  showUserSettings?: boolean;
  className?: string;
}

interface PrivacyLevelInfo {
  id: QonsentPrivacyLevel;
  name: string;
  description: string;
  features: string[];
}

export const PrivacyControls: React.FC<PrivacyControlsProps> = ({
  currentPrivacyLevel = QsocialPrivacyLevel.PUBLIC,
  onPrivacyLevelChange,
  contentType = 'post',
  subcommunityId,
  showUserSettings = false,
  className = ''
}) => {
  const [userPrivacySettings, setUserPrivacySettings] = useState<User['privacySettings'] | null>(null);
  const [privacyLevels, setPrivacyLevels] = useState<PrivacyLevelInfo[]>([]);
  const [recommendedLevel, setRecommendedLevel] = useState<QsocialPrivacyLevel>(QsocialPrivacyLevel.PUBLIC);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identity = getActiveIdentity();

  useEffect(() => {
    loadPrivacyData();
  }, [identity?.did]);

  useEffect(() => {
    if (identity?.did) {
      loadRecommendedLevel();
    }
  }, [identity?.did, contentType, subcommunityId]);

  const loadPrivacyData = async () => {
    if (!identity?.did) return;

    setLoading(true);
    setError(null);

    try {
      const [userSettings, levelInfo] = await Promise.all([
        PrivacyService.getUserPrivacySettings(identity.did),
        getPrivacyLevelInfo()
      ]);

      setUserPrivacySettings(userSettings);
      setPrivacyLevels(levelInfo.levels);
    } catch (err) {
      setError('Failed to load privacy settings');
      console.error('Privacy data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendedLevel = async () => {
    if (!identity?.did) return;

    try {
      const recommended = await PrivacyService.getRecommendedPrivacyLevel(
        identity.did,
        contentType,
        subcommunityId
      );
      setRecommendedLevel(recommended);
    } catch (err) {
      console.error('Failed to get recommended privacy level:', err);
    }
  };

  const handlePrivacyLevelChange = async (newLevel: QsocialPrivacyLevel) => {
    if (!identity?.did) return;

    try {
      const canCreate = await PrivacyService.canCreateContentWithPrivacy(identity.did, newLevel);
      
      if (!canCreate.canCreate) {
        setError(canCreate.reason || 'Cannot use this privacy level');
        return;
      }

      setError(null);
      onPrivacyLevelChange?.(newLevel);
    } catch (err) {
      setError('Failed to validate privacy level');
      console.error('Privacy level validation error:', err);
    }
  };

  const handleUserSettingsUpdate = async (newSettings: User['privacySettings']) => {
    if (!identity?.did) return;

    setLoading(true);
    try {
      const success = await PrivacyService.updateUserPrivacySettings(identity.did, newSettings);
      
      if (success) {
        setUserPrivacySettings(newSettings);
        await loadRecommendedLevel(); // Refresh recommended level
      } else {
        setError('Failed to update privacy settings');
      }
    } catch (err) {
      setError('Failed to update privacy settings');
      console.error('Privacy settings update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPrivacyLevelIcon = (level: QsocialPrivacyLevel) => {
    switch (level) {
      case QsocialPrivacyLevel.PUBLIC:
        return <Globe className="w-4 h-4" />;
      case QsocialPrivacyLevel.COMMUNITY:
        return <Users className="w-4 h-4" />;
      case QsocialPrivacyLevel.PRIVATE:
        return <Lock className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getPrivacyLevelColor = (level: QsocialPrivacyLevel) => {
    switch (level) {
      case QsocialPrivacyLevel.PUBLIC:
        return 'bg-green-100 text-green-800 border-green-200';
      case QsocialPrivacyLevel.COMMUNITY:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case QsocialPrivacyLevel.PRIVATE:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPrivacyLevelDescription = (level: QsocialPrivacyLevel) => {
    switch (level) {
      case QsocialPrivacyLevel.PUBLIC:
        return 'Visible to everyone on the platform';
      case QsocialPrivacyLevel.COMMUNITY:
        return 'Visible to community members and users with medium+ privacy settings';
      case QsocialPrivacyLevel.PRIVATE:
        return 'Visible only to you and mentioned users';
      default:
        return 'Unknown privacy level';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 animate-spin" />
            <span>Loading privacy settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Shield className="w-4 h-4" />
          <span>Privacy Controls</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Content Privacy Level Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Content Privacy Level</label>
          <Select
            value={currentPrivacyLevel}
            onValueChange={handlePrivacyLevelChange}
          >
            <SelectTrigger>
              <SelectValue>
                <div className="flex items-center space-x-2">
                  {getPrivacyLevelIcon(currentPrivacyLevel)}
                  <span className="capitalize">{currentPrivacyLevel}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(QsocialPrivacyLevel).map((level) => (
                <SelectItem key={level} value={level}>
                  <div className="flex items-center space-x-2">
                    {getPrivacyLevelIcon(level)}
                    <span className="capitalize">{level}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600">
            {getPrivacyLevelDescription(currentPrivacyLevel)}
          </p>
        </div>

        {/* Current Privacy Level Badge */}
        <div className="flex items-center space-x-2">
          <Badge className={getPrivacyLevelColor(currentPrivacyLevel)}>
            {getPrivacyLevelIcon(currentPrivacyLevel)}
            <span className="ml-1 capitalize">{currentPrivacyLevel}</span>
          </Badge>
          {recommendedLevel !== currentPrivacyLevel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrivacyLevelChange(recommendedLevel)}
              className="text-xs"
            >
              Use Recommended ({recommendedLevel})
            </Button>
          )}
        </div>

        {/* User Privacy Settings */}
        {showUserSettings && userPrivacySettings && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium">Account Privacy Settings</h4>
            
            <div className="space-y-2">
              <label className="text-sm">Default Privacy Level</label>
              <Select
                value={userPrivacySettings.level}
                onValueChange={(level: QonsentPrivacyLevel) =>
                  handleUserSettingsUpdate({
                    ...userPrivacySettings,
                    level
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {privacyLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      <div>
                        <div className="font-medium">{level.name}</div>
                        <div className="text-xs text-gray-600">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium">Data Retention:</span>
                <span className="ml-1">{userPrivacySettings.dataRetention} days</span>
              </div>
              <div>
                <span className="font-medium">Encryption:</span>
                <span className="ml-1 capitalize">{userPrivacySettings.encryptionStrength}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs">
              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={!userPrivacySettings.thirdPartySharing}
                  onChange={(e) =>
                    handleUserSettingsUpdate({
                      ...userPrivacySettings,
                      thirdPartySharing: !e.target.checked
                    })
                  }
                  className="rounded"
                />
                <span>Block third-party sharing</span>
              </label>
              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={!userPrivacySettings.metadataCollection}
                  onChange={(e) =>
                    handleUserSettingsUpdate({
                      ...userPrivacySettings,
                      metadataCollection: !e.target.checked
                    })
                  }
                  className="rounded"
                />
                <span>Limit metadata collection</span>
              </label>
            </div>
          </div>
        )}

        {/* Privacy Level Information */}
        {privacyLevels.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Privacy Level Guide</h4>
            <div className="space-y-2">
              {privacyLevels.map((level) => (
                <div key={level.id} className="text-xs">
                  <div className="font-medium">{level.name}</div>
                  <div className="text-gray-600">{level.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrivacyControls;