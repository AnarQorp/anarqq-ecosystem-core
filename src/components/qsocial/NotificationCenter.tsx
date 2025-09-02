/**
 * Notification Center Component
 * Displays and manages user notifications with real-time updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, Settings, Moon, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useNotifications, useWebSocket } from '../../hooks/useWebSocket';

interface NotificationItemProps {
  notification: any;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return '👤';
      case 'reply':
        return '💬';
      case 'vote':
        return '👍';
      case 'post_in_community':
        return '📝';
      case 'moderation':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'mention':
        return 'bg-blue-100 border-blue-200';
      case 'reply':
        return 'bg-green-100 border-green-200';
      case 'vote':
        return 'bg-purple-100 border-purple-200';
      case 'post_in_community':
        return 'bg-yellow-100 border-yellow-200';
      case 'moderation':
        return 'bg-red-100 border-red-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <Card className={`mb-2 ${!notification.isRead ? 'border-l-4 border-l-blue-500' : ''} ${getNotificationColor(notification.type)}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-sm">{notification.title}</h4>
                {!notification.isRead && (
                  <Badge variant="secondary" className="text-xs">New</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
              {notification.data?.content && (
                <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                  "{notification.data.content}"
                </p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">
                  {formatTimeAgo(notification.createdAt)}
                </span>
                <div className="flex items-center space-x-1">
                  {!notification.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onMarkAsRead(notification.id)}
                      className="h-6 px-2 text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Mark read
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(notification.id)}
                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface NotificationPreferencesProps {
  preferences: any;
  onUpdatePreferences: (prefs: any) => void;
  dndSettings: any;
  onToggleDND: (enabled: boolean, options?: any) => void;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  preferences,
  onUpdatePreferences,
  dndSettings,
  onToggleDND
}) => {
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [dndDuration, setDndDuration] = useState<number | null>(null);

  const handlePreferenceChange = (key: string, value: boolean) => {
    const newPrefs = { ...localPrefs, [key]: value };
    setLocalPrefs(newPrefs);
    onUpdatePreferences(newPrefs);
  };

  const handleDNDToggle = (enabled: boolean) => {
    if (enabled) {
      onToggleDND(true, {
        duration: dndDuration,
        allowUrgent: true,
        allowMentions: false
      });
    } else {
      onToggleDND(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Do Not Disturb */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Moon className="h-5 w-5" />
            <span>Do Not Disturb</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Do Not Disturb</p>
              <p className="text-sm text-gray-600">
                Temporarily pause all notifications
              </p>
            </div>
            <Switch
              checked={dndSettings.enabled}
              onCheckedChange={handleDNDToggle}
            />
          </div>
          
          {dndSettings.enabled && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                Do Not Disturb is active
                {dndSettings.expiresAt && (
                  <span> until {new Date(dndSettings.expiresAt).toLocaleString()}</span>
                )}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Duration (minutes)</label>
            <input
              type="number"
              value={dndDuration || ''}
              onChange={(e) => setDndDuration(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Leave empty for indefinite"
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            <p className="text-xs text-gray-500">
              Leave empty to enable indefinitely
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mentions</p>
              <p className="text-sm text-gray-600">When someone mentions you</p>
            </div>
            <Switch
              checked={localPrefs.mention}
              onCheckedChange={(checked) => handlePreferenceChange('mention', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Replies</p>
              <p className="text-sm text-gray-600">When someone replies to your posts</p>
            </div>
            <Switch
              checked={localPrefs.reply}
              onCheckedChange={(checked) => handlePreferenceChange('reply', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Votes</p>
              <p className="text-sm text-gray-600">When someone votes on your content</p>
            </div>
            <Switch
              checked={localPrefs.vote}
              onCheckedChange={(checked) => handlePreferenceChange('vote', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Community Posts</p>
              <p className="text-sm text-gray-600">New posts in your communities</p>
            </div>
            <Switch
              checked={localPrefs.post_in_community}
              onCheckedChange={(checked) => handlePreferenceChange('post_in_community', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Moderation</p>
              <p className="text-sm text-gray-600">Moderation actions on your content</p>
            </div>
            <Switch
              checked={localPrefs.moderation}
              onCheckedChange={(checked) => handlePreferenceChange('moderation', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-gray-600">Browser push notifications</p>
            </div>
            <Switch
              checked={localPrefs.push}
              onCheckedChange={(checked) => handlePreferenceChange('push', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sound</p>
              <p className="text-sm text-gray-600">Play sound for notifications</p>
            </div>
            <Switch
              checked={localPrefs.sound}
              onCheckedChange={(checked) => handlePreferenceChange('sound', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Desktop Notifications</p>
              <p className="text-sm text-gray-600">Show desktop notifications</p>
            </div>
            <Switch
              checked={localPrefs.desktop}
              onCheckedChange={(checked) => handlePreferenceChange('desktop', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<any>({});
  const [dndSettings, setDndSettings] = useState<any>({ enabled: false });
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { status } = useWebSocket({ autoConnect: true });

  // Fetch user preferences and settings
  const fetchPreferences = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const [prefsResponse, dndResponse, statsResponse] = await Promise.all([
        fetch('/api/notifications/preferences', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/notifications/dnd', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/notifications/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (prefsResponse.ok) {
        const prefs = await prefsResponse.json();
        setPreferences(prefs);
      }

      if (dndResponse.ok) {
        const dnd = await dndResponse.json();
        setDndSettings(dnd);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        markAsRead(notificationId);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        markAllAsRead();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        // Remove from local state (this would be handled by the hook)
        console.log('Notification deleted');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        clearAll();
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleUpdatePreferences = async (newPreferences: any) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newPreferences)
      });

      if (response.ok) {
        setPreferences(newPreferences);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const handleToggleDND = async (enabled: boolean, options?: any) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const endpoint = enabled ? '/api/notifications/dnd/enable' : '/api/notifications/dnd/disable';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: enabled ? JSON.stringify(options || {}) : undefined
      });

      if (response.ok) {
        const result = await response.json();
        setDndSettings(enabled ? result : { enabled: false });
      }
    } catch (error) {
      console.error('Error toggling DND:', error);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-96 max-h-96 z-50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant={status.connected ? 'default' : 'secondary'}>
                  {status.connected ? 'Live' : 'Offline'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <div className="flex items-center space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs text-red-600"
                >
                  Clear all
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <ScrollArea className="h-80">
                  <div className="p-4">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                          onDelete={handleDeleteNotification}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="unread" className="mt-0">
                <ScrollArea className="h-80">
                  <div className="p-4">
                    {unreadNotifications.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>All caught up!</p>
                      </div>
                    ) : (
                      unreadNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                          onDelete={handleDeleteNotification}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <ScrollArea className="h-80">
                  <div className="p-4">
                    <NotificationPreferences
                      preferences={preferences}
                      onUpdatePreferences={handleUpdatePreferences}
                      dndSettings={dndSettings}
                      onToggleDND={handleToggleDND}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationCenter;