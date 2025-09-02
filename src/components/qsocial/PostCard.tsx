/**
 * PostCard Component
 * Individual post display with voting, commenting, and sharing
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronUp, 
  ChevronDown, 
  MessageSquare, 
  Share2, 
  MoreHorizontal,
  Edit,
  Trash2,
  Pin,
  Lock,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { PostService } from '@/services/qsocial/PostService';
import { QsocialPost, ContentType, VoteResult, QsocialFileAttachment } from '@/types/qsocial';
import { useSession } from '@/hooks/useSession';
import { ecosystemFileService } from '@/services/qsocial/EcosystemFileService';
import EcosystemFileDisplay from './EcosystemFileDisplay';
import { formatTimeAgo } from '@/utils/formatDate';

interface PostCardProps {
  post: QsocialPost;
  onUpdate?: (post: QsocialPost) => void;
  onDelete?: (postId: string) => void;
  showSubcommunity?: boolean;
  compact?: boolean;
  className?: string;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onUpdate,
  onDelete,
  showSubcommunity = true,
  compact = false,
  className = ''
}) => {
  const [currentPost, setCurrentPost] = useState(post);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [voting, setVoting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  
  const { session } = useSession();

  useEffect(() => {
    setCurrentPost(post);
    checkPermissions();
  }, [post, session]);

  const checkPermissions = async () => {
    if (!session) return;
    
    try {
      const editPermission = await PostService.canEditPost(post);
      const deletePermission = await PostService.canDeletePost(post);
      setCanEdit(editPermission);
      setCanDelete(deletePermission);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!session) {
      // TODO: Show login prompt
      return;
    }

    if (voting) return;

    try {
      setVoting(true);
      
      // Determine the vote action
      let action: 'up' | 'down' | 'remove';
      if (userVote === voteType) {
        action = 'remove';
      } else {
        action = voteType;
      }

      const result: VoteResult = await PostService.votePost(currentPost.id, action);
      
      if (result.success) {
        const updatedPost = {
          ...currentPost,
          upvotes: result.newUpvotes,
          downvotes: result.newDownvotes,
        };
        
        setCurrentPost(updatedPost);
        setUserVote(result.userVote);
        
        if (onUpdate) {
          onUpdate(updatedPost);
        }
      }
    } catch (error) {
      console.error('Voting error:', error);
      // TODO: Show error toast
    } finally {
      setVoting(false);
    }
  };

  const handleEdit = () => {
    // TODO: Navigate to edit post page or open edit modal
    window.location.href = `/post/${currentPost.id}/edit`;
  };

  const handleDelete = async () => {
    try {
      await PostService.deletePost(currentPost.id);
      if (onDelete) {
        onDelete(currentPost.id);
      }
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Delete error:', error);
      // TODO: Show error toast
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${currentPost.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentPost.title,
          text: currentPost.content.substring(0, 100) + '...',
          url: url,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(url);
        // TODO: Show success toast
      } catch (error) {
        console.error('Copy to clipboard failed:', error);
      }
    }
  };

  const handleCommentClick = () => {
    window.location.href = `/post/${currentPost.id}`;
  };

  const getContentTypeIcon = (contentType: ContentType) => {
    switch (contentType) {
      case ContentType.MEDIA:
        return <ImageIcon className="h-4 w-4" />;
      case ContentType.LINK:
        return <LinkIcon className="h-4 w-4" />;
      case ContentType.CROSS_POST:
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getContentTypeColor = (contentType: ContentType) => {
    switch (contentType) {
      case ContentType.MEDIA:
        return 'bg-purple-100 text-purple-800';
      case ContentType.LINK:
        return 'bg-blue-100 text-blue-800';
      case ContentType.CROSS_POST:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderContent = () => {
    if (compact) {
      return (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {currentPost.content}
        </p>
      );
    }

    switch (currentPost.contentType) {
      case ContentType.LINK:
        return (
          <div className="space-y-2">
            <p className="text-sm">{currentPost.content}</p>
            {/* TODO: Add link preview */}
          </div>
        );
      
      case ContentType.MEDIA:
        return (
          <div className="space-y-2">
            <p className="text-sm">{currentPost.content}</p>
            {/* Ecosystem-integrated media display */}
            {currentPost.attachments && currentPost.attachments.length > 0 && (
              <div className="space-y-3">
                {currentPost.attachments.map((attachment) => (
                  <EcosystemFileDisplay 
                    key={attachment.fileId} 
                    attachment={attachment}
                    compact={compact}
                  />
                ))}
              </div>
            )}
          </div>
        );
      
      case ContentType.CROSS_POST:
        return (
          <div className="space-y-2">
            <p className="text-sm">{currentPost.content}</p>
            {currentPost.sourceModule && (
              <div className="border rounded-lg p-3 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    From {currentPost.sourceModule}
                  </Badge>
                </div>
                {/* TODO: Add source content preview */}
                <p className="text-xs text-muted-foreground">
                  Original content from {currentPost.sourceModule}
                </p>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: currentPost.content }}
          />
        );
    }
  };

  const stats = PostService.getPostStatistics(currentPost);

  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardHeader className={compact ? 'pb-2' : 'pb-4'}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {/* Author Avatar */}
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentPost.authorIdentity.avatar} />
                <AvatarFallback>
                  {currentPost.authorIdentity.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                {/* Author and Metadata */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {currentPost.authorIdentity.name || 'Anonymous'}
                  </span>
                  
                  {showSubcommunity && currentPost.subcommunityId && (
                    <>
                      <span className="text-muted-foreground">in</span>
                      <Badge variant="outline" className="text-xs">
                        r/{currentPost.subcommunityId}
                      </Badge>
                    </>
                  )}
                  
                  <span className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatTimeAgo(currentPost.createdAt)}
                  </span>
                  
                  {currentPost.isEdited && (
                    <Badge variant="secondary" className="text-xs">
                      edited
                    </Badge>
                  )}
                </div>
                
                {/* Title */}
                <h3 className={`font-semibold mt-1 ${compact ? 'text-sm' : 'text-base'}`}>
                  <a 
                    href={`/post/${currentPost.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {currentPost.title}
                  </a>
                </h3>
                
                {/* Tags and Content Type */}
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getContentTypeColor(currentPost.contentType)}`}
                  >
                    {getContentTypeIcon(currentPost.contentType)}
                    <span className="ml-1">{currentPost.contentType}</span>
                  </Badge>
                  
                  {currentPost.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                  
                  {currentPost.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{currentPost.tags.length - 3} more
                    </Badge>
                  )}
                  
                  {/* Status Indicators */}
                  {currentPost.isPinned && (
                    <Pin className="h-3 w-3 text-green-600" />
                  )}
                  {currentPost.isLocked && (
                    <Lock className="h-3 w-3 text-red-600" />
                  )}
                  {currentPost.privacyLevel === 'private' && (
                    <EyeOff className="h-3 w-3 text-muted-foreground" />
                  )}
                  {currentPost.privacyLevel === 'public' && (
                    <Eye className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Actions Menu */}
            {session && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Post
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  )}
                  {(canEdit || canDelete) && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        {!compact && (
          <CardContent className="pt-0">
            {/* Post Content */}
            <div className="mb-4">
              {renderContent()}
            </div>
            
            <Separator className="mb-4" />
            
            {/* Engagement Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Voting */}
                <div className="flex items-center">
                  <Button
                    variant={userVote === 'up' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleVote('up')}
                    disabled={voting || !session}
                    className="h-8 px-2"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  
                  <span className={`text-sm font-medium px-2 ${
                    stats.score > 0 ? 'text-green-600' : 
                    stats.score < 0 ? 'text-red-600' : 
                    'text-muted-foreground'
                  }`}>
                    {stats.score}
                  </span>
                  
                  <Button
                    variant={userVote === 'down' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleVote('down')}
                    disabled={voting || !session}
                    className="h-8 px-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Comments */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCommentClick}
                  className="h-8 px-3"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {currentPost.commentCount}
                </Button>
                
                {/* Share */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="h-8 px-3"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
              
              {/* Post Stats */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {stats.isPopular && (
                  <Badge variant="secondary" className="text-xs">
                    Popular
                  </Badge>
                )}
                {stats.isControversial && (
                  <Badge variant="outline" className="text-xs">
                    Controversial
                  </Badge>
                )}
                <span>{Math.round(stats.upvoteRatio * 100)}% upvoted</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PostCard;