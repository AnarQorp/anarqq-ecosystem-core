/**
 * Trending Communities Card Component
 * Displays trending subcommunities
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, Users, MessageSquare, ExternalLink } from 'lucide-react';
import { Subcommunity } from '@/types/qsocial';

interface TrendingCommunitiesCardProps {
  communities: Subcommunity[];
}

export const TrendingCommunitiesCard: React.FC<TrendingCommunitiesCardProps> = ({ 
  communities 
}) => {
  const formatMemberCount = (count: number): string => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trending Communities
        </CardTitle>
        <CardDescription>
          Popular subcommunities to explore
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {communities.length > 0 ? (
          <div className="space-y-4">
            {communities.slice(0, 5).map((community) => (
              <div key={community.id} className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={community.avatar} alt={community.displayName} />
                  <AvatarFallback>
                    {community.displayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm truncate">
                        {community.displayName}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {community.description}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatMemberCount(community.memberCount)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {community.postCount}
                          </span>
                        </div>
                        
                        {community.isPrivate && (
                          <Badge variant="secondary" className="text-xs">
                            Private
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 p-1 h-auto"
                      asChild
                    >
                      <a href={`/qsocial/community/${community.name}`}>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-2 border-t">
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <a href="/qsocial/communities">
                  Explore All Communities
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No trending communities yet
            </p>
            <Button variant="ghost" size="sm" className="mt-2" asChild>
              <a href="/qsocial/communities/create">
                Create Community
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingCommunitiesCard;