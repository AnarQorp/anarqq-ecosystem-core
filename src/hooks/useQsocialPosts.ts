/**
 * useQsocialPosts Hook
 * 
 * React hook for managing Qsocial posts with ecosystem file integration.
 * Provides a unified interface for post creation, editing, and file management.
 */

import { useState, useCallback } from 'react';
import { PostService } from '../services/qsocial/PostService';
import { 
  QsocialPost, 
  CreatePostRequest, 
  UpdatePostRequest,
  QsocialFileAttachment,
  ContentType,
  PrivacyLevel
} from '../types/qsocial';
import { useEcosystemFiles, EcosystemUploadedFile } from './useEcosystemFiles';

export interface UseQsocialPostsOptions {
  autoSave?: boolean;
  maxAttachments?: number;
}

export interface UseQsocialPostsReturn {
  // Post management
  posts: QsocialPost[];
  currentPost: QsocialPost | null;
  
  // Post operations
  createPost: (postData: CreatePostRequest) => Promise<QsocialPost | null>;
  updatePost: (postId: string, updates: UpdatePostRequest) => Promise<QsocialPost | null>;
  deletePost: (postId: string) => Promise<boolean>;
  getPost: (postId: string) => Promise<QsocialPost | null>;
  
  // File integration
  attachFilesToPost: (files: EcosystemUploadedFile[]) => QsocialFileAttachment[];
  removeAttachmentFromPost: (attachmentId: string) => void;
  
  // State management
  loading: boolean;
  error: string | null;
  clearError: () => void;
  
  // Ecosystem file management
  ecosystemFiles: ReturnType<typeof useEcosystemFiles>;
}

export function useQsocialPosts(options: UseQsocialPostsOptions = {}): UseQsocialPostsReturn {
  const {
    autoSave = false,
    maxAttachments = 10
  } = options;

  // State
  const [posts, setPosts] = useState<QsocialPost[]>([]);
  const [currentPost, setCurrentPost] = useState<QsocialPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ecosystem file management
  const ecosystemFiles = useEcosystemFiles({
    maxFiles: maxAttachments,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    autoUpload: autoSave
  });

  // Create post with ecosystem integration
  const createPost = useCallback(async (postData: CreatePostRequest): Promise<QsocialPost | null> => {
    try {
      setLoading(true);
      setError(null);

      // Ensure attachments are properly formatted
      if (postData.attachments) {
        postData.attachments = postData.attachments.map(attachment => ({
          ...attachment,
          // Ensure all required fields are present
          uploadedAt: attachment.uploadedAt || new Date().toISOString(),
          ecosystem: attachment.ecosystem || {
            qonsent: {
              profileId: 'default_profile',
              visibility: 'private',
              encryptionLevel: 'standard'
            },
            qlock: {
              encrypted: true,
              encryptionLevel: 'standard'
            },
            ipfs: {
              generated: false
            },
            qindex: {
              indexId: 'default_index',
              searchable: false
            },
            qnet: {
              routingId: 'default_routing',
              routedUrl: attachment.storjUrl
            }
          }
        }));
      }

      const newPost = await PostService.createPost(postData);
      
      if (newPost) {
        setPosts(prev => [newPost, ...prev]);
        setCurrentPost(newPost);
        
        // Clear ecosystem files after successful post creation
        ecosystemFiles.clearFiles();
      }

      return newPost;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating post';
      setError(errorMessage);
      console.error('Create post error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [ecosystemFiles]);

  // Update post
  const updatePost = useCallback(async (postId: string, updates: UpdatePostRequest): Promise<QsocialPost | null> => {
    try {
      setLoading(true);
      setError(null);

      const updatedPost = await PostService.updatePost(postId, updates);
      
      if (updatedPost) {
        setPosts(prev => prev.map(post => 
          post.id === postId ? updatedPost : post
        ));
        
        if (currentPost?.id === postId) {
          setCurrentPost(updatedPost);
        }
      }

      return updatedPost;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating post';
      setError(errorMessage);
      console.error('Update post error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentPost]);

  // Delete post
  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      await PostService.deletePost(postId);
      
      setPosts(prev => prev.filter(post => post.id !== postId));
      
      if (currentPost?.id === postId) {
        setCurrentPost(null);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting post';
      setError(errorMessage);
      console.error('Delete post error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentPost]);

  // Get single post
  const getPost = useCallback(async (postId: string): Promise<QsocialPost | null> => {
    try {
      setLoading(true);
      setError(null);

      const post = await PostService.getPost(postId);
      
      if (post) {
        setCurrentPost(post);
        
        // Add to posts list if not already present
        setPosts(prev => {
          const exists = prev.some(p => p.id === postId);
          return exists ? prev : [post, ...prev];
        });
      }

      return post;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching post';
      setError(errorMessage);
      console.error('Get post error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Convert ecosystem files to post attachments
  const attachFilesToPost = useCallback((files: EcosystemUploadedFile[]): QsocialFileAttachment[] => {
    return files.map(file => ({
      fileId: file.fileId,
      originalName: file.originalName,
      storjUrl: file.storjUrl,
      storjKey: file.storjKey,
      fileSize: file.fileSize,
      contentType: file.contentType,
      thumbnailUrl: file.thumbnailUrl,
      uploadedAt: file.uploadedAt,
      ecosystem: file.ecosystem,
      processingTime: file.processingTime
    }));
  }, []);

  // Remove attachment from current post
  const removeAttachmentFromPost = useCallback((attachmentId: string) => {
    if (currentPost && currentPost.attachments) {
      const updatedAttachments = currentPost.attachments.filter(
        attachment => attachment.fileId !== attachmentId
      );
      
      const updatedPost = {
        ...currentPost,
        attachments: updatedAttachments
      };
      
      setCurrentPost(updatedPost);
      
      // Update in posts list
      setPosts(prev => prev.map(post => 
        post.id === currentPost.id ? updatedPost : post
      ));
    }
  }, [currentPost]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Post management
    posts,
    currentPost,
    
    // Post operations
    createPost,
    updatePost,
    deletePost,
    getPost,
    
    // File integration
    attachFilesToPost,
    removeAttachmentFromPost,
    
    // State management
    loading,
    error,
    clearError,
    
    // Ecosystem file management
    ecosystemFiles
  };
}

export default useQsocialPosts;