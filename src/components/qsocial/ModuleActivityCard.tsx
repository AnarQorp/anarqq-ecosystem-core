/**
 * Module Activity Card Component
 * Displays activity summary for a specific AnarQ module
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Clock } from 'lucide-react';
import { ModuleActivity } from '@/types/qsocial';

interface ModuleActivityCardProps {
  module: ModuleActivity;
  icon: React.ComponentType<any>;
  colorClass: string;
}

export const ModuleActivityCard: React.FC<ModuleActivityCardProps> = ({
  module,
  icon: Icon,
  colorClass
}) => {
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{module.moduleName}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {formatTimeAgo(module.lastUpdated)}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">
            {module.activities.length} activities
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {module.activities.length > 0 ? (
          <div className="space-y-3">
            {module.activities.slice(0, 3).map((activity) => (
              <div key={activity.id} className="border-l-2 border-gray-200 pl-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {activity.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 p-1 h-auto"
                    asChild
                  >
                    <a href={activity.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
            
            {module.activities.length > 3 && (
              <div className="pt-2 border-t">
                <Button variant="ghost" size="sm" className="w-full">
                  View {module.activities.length - 3} more activities
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Icon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent activity
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuleActivityCard;