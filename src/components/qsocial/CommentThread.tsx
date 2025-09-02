/**
 * CommentThread Component
 * Nested comment display with reply functionality
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronUp, 
  ChevronDown, 
  Reply, 
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  MessageSquare
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { CommentService } from '@/services/qsocial/CommentService';
import { QsocialComment, CreateCommentRequest, VoteResult } from '@/types/qsocial';
import { useSession } from '@/hooks/useSession';
import { formatTimeAgo } from '@/utils/formatDate';

interface CommentThreadProps {
  postId: string;
  comments?: QsocialComment[];
  onUpdate?: (comment: QsocialComment) => void;
  onDelete?: (commentId: string) => void;
  onReply?: (parentId: string, comment: QsocialComment) => void;
  maxDepth?: number;
  className?: string;
}

interface CommentItemProps {
  comment: QsocialComment;
  postId: string;
  onUpdate?: (comment: QsocialComment) => void;
  onDelete?: (commentId: string) => void;
  onReply?: (parentId: string, comment: QsocialComment) => void;
  maxDepth?: number;
  allComments?: QsocialComment[];
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  onUpdate,
  onDelete,
  onReply,
  maxDepth = 10,
  allComments = []
}) => {
  const [currentComment, setCurrentComment] = useState(comment);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [voting, setVoting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [childComments, setChildComments] = useState<QsocialComment[]>([]);
  
  const { session } = useSession();

  useEffect(() => {
    setCurrentComment(comment);
    checkPermissions();
    loadChildComments();
  }, [comment, session]);

  const checkPermissions = async () => {
    if (!session) return;
    
    try {
      const editPermission = await CommentService.canEditComment(comment);
      const deletePermission = await CommentService.canDeleteComment(comment);
      setCanEdit(editPermission);
      setCanDelete(deletePermission);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const loadChildComments = () => {
    const children = allComments.filter(c => c.parentCommentId === comment.id);
    setChildComments(children);
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

      const result: VoteResult = await CommentService.voteComment(currentComment.id, action);
      
      if (result.success) {
        const updatedComment = {
          ...currentComment,
          upvotes: result.newUpvotes,
          downvotes: result.newDownvotes,
        };
        
        setCurrentComment(updatedComment);
        setUserVote(result.userVote);
        
        if (onUpdate) {
          onUpdate(updatedComment);
        }
      }
    } catch (error) {
      console.error('Voting error:', error);
      // TODO: Show error toast
    } finally {
      setVoting(false);
    }
  };

  const handleReply = async () => {
    if (!session || !replyContent.trim()) return;

    try {
      setSubmittingReply(true);
      
      const replyData: CreateCommentRequest = {
        postId,
        content: replyContent.trim(),
        parentCommentId: currentComment.id,
      };

      const newComment = await CommentService.createComment(replyData);
      
      setReplyContent('');
      setShowReplyForm(false);
      
      if (onReply) {
        onReply(currentComment.id, newComment);
      }
      
      // Add to local child comments
      setChildComments(prev => [...prev, newComment]);
      
    } catch (error) {
      console.error('Reply error:', error);
      // TODO: Show error toast
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleEdit = () => {
    // TODO: Implement inline editing
    console.log('Edit comment:', currentComment.id);
  };

  const handleDelete = async () => {
    try {
      await CommentService.deleteComment(currentComment.id);
      if (onDelete) {
        onDelete(currentComment.id);
      }
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Delete error:', error);
      // TODO: Show error toast
    }
  };

  const stats = CommentService.getCommentStatistics(currentComment);
  const indentLevel = Math.min(currentComment.depth, 5);
  const canReply = currentComment.depth < maxDepth && session;

  return (
    <div 
      className={`${indentLevel > 0 ? 'ml-4 border-l-2 border-muted pl-4' : ''}`}
      style={{ marginLeft: indentLevel > 0 ? `${indentLevel * 16}px` : '0' }}
    >
      <div className="group">
        <div className="flex items-start gap-3 py-3">
          {/* Avatar */}
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={currentComment.authorIdentity.avatar} />
            <AvatarFallback className="text-xs">
              {currentComment.authorIdentity.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            {/* Author and Metadata */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-sm">
                {currentComment.authorIdentity.name || 'Anonymous'}
              </span>
              
              <span className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-1" />
                {formatTimeAgo(currentComment.createdAt)}
              </span>
              
              {currentComment.isEdited && (
                <Badge variant="secondary" className="text-xs">
                  edited
                </Badge>
              )}
              
              <span className="text-xs text-muted-foreground">
                {stats.score} points
              </span>
            </div>
            
            {/* Comment Content */}
            <div 
              className="prose prose-sm max-w-none mb-2"
              dangerouslySetInnerHTML={{ __html: currentComment.content }}
            />
            
            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Voting */}
              <div className="flex items-center">
                <Button
                  variant={userVote === 'up' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleVote('up')}
                  disabled={voting || !session}
                  className="h-6 px-1"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                
                <span className={`text-xs font-medium px-1 ${
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
                  className="h-6 px-1"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Reply */}
              {canReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="h-6 px-2 text-xs"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
              
              {/* Collapse/Expand */}
              {childComments.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="h-6 px-2 text-xs"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3 mr-1" />
                  )}
                  {childComments.length} {childComments.length === 1 ? 'reply' : 'replies'}
                </Button>
              )}
              
              {/* More Actions */}
              {session && (canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {/* Reply Form */}
            {showReplyForm && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleReply}
                    disabled={!replyContent.trim() || submittingReply}
                  >
                    {submittingReply ? 'Posting...' : 'Reply'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Child Comments */}
        {childComments.length > 0 && (
          <Collapsible open={!isCollapsed} onOpenChange={setIsCollapsed}>
            <CollapsibleContent>
              <div className="space-y-0">
                {childComments.map((childComment) => (
                  <CommentItem
                    key={childComment.id}
                    comment={childComment}
                    postId={postId}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onReply={onReply}
                    maxDepth={maxDepth}
                    allComments={allComments}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
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
    </div>
  );
};

export const CommentThread: React.FC<CommentThreadProps> = ({
  postId,
  comments = [],
  onUpdate,
  onDelete,
  onReply,
  maxDepth = 10,
  className = ''
}) => {
  const [allComments, setAllComments] = useState<QsocialComment[]>(comments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const { session } = useSession();

  useEffect(() => {
    if (comments.length === 0) {
      loadComments();
    } else {
      setAllComments(comments);
    }
  }, [postId, comments]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedComments = await CommentService.getPostComments(postId, {
        limit: 100,
        sortBy: 'popular',
        maxDepth,
      });
      setAllComments(loadedComments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleNewComment = async () => {
    if (!session || !newCommentContent.trim()) return;

    try {
      setSubmittingComment(true);
      
      const commentData: CreateCommentRequest = {
        postId,
        content: newCommentContent.trim(),
      };

      const newComment = await CommentService.createComment(commentData);
      
      setNewCommentContent('');
      setAllComments(prev => [newComment, ...prev]);
      
    } catch (error) {
      console.error('Comment creation error:', error);
      // TODO: Show error toast
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentUpdate = (updatedComment: QsocialComment) => {
    setAllComments(prev => prev.map(comment => 
      comment.id === updatedComment.id ? updatedComment : comment
    ));
    if (onUpdate) {
      onUpdate(updatedComment);
    }
  };

  const handleCommentDelete = (deletedCommentId: string) => {
    setAllComments(prev => prev.filter(comment => comment.id !== deletedCommentId));
    if (onDelete) {
      onDelete(deletedCommentId);
    }
  };

  const handleCommentReply = (parentId: string, newComment: QsocialComment) => {
    setAllComments(prev => [...prev, newComment]);
    if (onReply) {
      onReply(parentId, newComment);
    }
  };

  // Build threaded structure
  const threadedComments = CommentService.buildThreadedComments(allComments);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-6 w-6 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-12 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {/* New Comment Form */}
        {session && (
          <div className="mb-6">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.avatar} />
                <AvatarFallback>
                  {session.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newCommentContent}
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleNewComment}
                    disabled={!newCommentContent.trim() || submittingComment}
                  >
                    {submittingComment ? 'Posting...' : 'Comment'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setNewCommentContent('')}
                    disabled={!newCommentContent.trim()}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
            <Separator className="mt-4" />
          </div>
        )}

        {/* Comments */}
        {error && (
          <div className="text-center py-4 text-destructive">
            {error}
            <Button onClick={loadComments} variant="outline" size="sm" className="ml-2">
              Retry
            </Button>
          </div>
        )}

        {threadedComments.length > 0 ? (
          <div className="space-y-0">
            {threadedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onUpdate={handleCommentUpdate}
                onDelete={handleCommentDelete}
                onReply={handleCommentReply}
                maxDepth={maxDepth}
                allComments={allComments}
              />
            ))}
          </div>
        ) : (
          !loading && (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No comments yet</h3>
              <p className="text-muted-foreground">
                {session ? 'Be the first to comment!' : 'Login to join the discussion'}
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default CommentThread;