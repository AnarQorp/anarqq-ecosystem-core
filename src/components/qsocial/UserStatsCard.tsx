/**
 * User Stats Card Component
 * Displays user statistics and achievements
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Zap, 
  FileText, 
  MessageSquare, 
  Users,
  TrendingUp,
  Award
} from 'lucide-react';

interface UserStatsCardProps {
  stats: {
    totalPosts: number;
    totalComments: number;
    totalQarma: number;
    joinedCommunities: number;
    moduleStats?: Record<string, any>;
  };
}

export const UserStatsCard: React.FC<UserStatsCardProps> = ({ stats }) => {
  const getQarmaLevel = (qarma: number): { level: number; progress: number; nextLevel: number } => {
    // Simple leveling system based on qarma
    const levels = [0, 100, 250, 500, 1000, 2000, 5000, 10000];
    let level = 0;
    
    for (let i = 0; i < levels.length; i++) {
      if (qarma >= levels[i]) {
        level = i;
      } else {
        break;
      }
    }
    
    const currentLevelQarma = levels[level] || 0;
    const nextLevelQarma = levels[level + 1] || levels[levels.length - 1];
    const progress = nextLevelQarma > currentLevelQarma 
      ? ((qarma - currentLevelQarma) / (nextLevelQarma - currentLevelQarma)) * 100
      : 100;
    
    return { level, progress, nextLevel: nextLevelQarma };
  };

  const qarmaInfo = getQarmaLevel(stats.totalQarma);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Your Stats
        </CardTitle>
        <CardDescription>
          Your activity and reputation across AnarQ
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Qarma Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">Level {qarmaInfo.level}</span>
            </div>
            <Badge variant="secondary">
              {stats.totalQarma} Qarma
            </Badge>
          </div>
          <Progress value={qarmaInfo.progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {qarmaInfo.nextLevel - stats.totalQarma} Qarma to next level
          </p>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <FileText className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">{stats.totalPosts}</p>
            <p className="text-xs text-blue-600">Posts</p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <MessageSquare className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{stats.totalComments}</p>
            <p className="text-xs text-green-600">Comments</p>
          </div>
        </div>

        {/* Community Participation */}
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            <span className="font-medium text-purple-700">Communities</span>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            {stats.joinedCommunities}
          </Badge>
        </div>

        {/* Module Stats */}
        {stats.moduleStats && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Module Activity
            </h4>
            
            {stats.moduleStats.qpic && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">QpiC Media</span>
                <span>{stats.moduleStats.qpic.totalImages + stats.moduleStats.qpic.totalVideos} files</span>
              </div>
            )}
            
            {stats.moduleStats.qmail && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Qmail Messages</span>
                <span>{stats.moduleStats.qmail.total} messages</span>
              </div>
            )}
            
            {stats.moduleStats.qdrive && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Qdrive Files</span>
                <span>{stats.moduleStats.qdrive.totalFiles} files</span>
              </div>
            )}
            
            {stats.moduleStats.qchat && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Qchat Messages</span>
                <span>{stats.moduleStats.qchat.totalMessages} messages</span>
              </div>
            )}
          </div>
        )}

        {/* Achievements */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Award className="h-4 w-4" />
            Recent Achievements
          </h4>
          
          <div className="space-y-1">
            {stats.totalPosts >= 1 && (
              <Badge variant="outline" className="text-xs">
                First Post
              </Badge>
            )}
            {stats.totalQarma >= 100 && (
              <Badge variant="outline" className="text-xs">
                100 Qarma
              </Badge>
            )}
            {stats.totalPosts >= 10 && (
              <Badge variant="outline" className="text-xs">
                Active Poster
              </Badge>
            )}
            {stats.totalQarma >= 500 && (
              <Badge variant="outline" className="text-xs">
                Qarma Master
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserStatsCard;