/**
 * SubcommunityCard Component
 * Community display, creation, and management interface
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  Settings, 
  Crown,
  Shield,
  Lock,
  Globe,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  TrendingUp,
  MessageSquare,
  Calendar,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2
} from 'lucide-react';

import { SubcommunityService } from '@/services/qsocial/SubcommunityService';
import { 
  Subcommunity, 
  CreateSubcommunityRequest,
  UpdateSubcommunityRequest,
  User 
} from '@/types/qsocial';
import { useSession } from '@/hooks/useSession';

interface SubcommunityCardProps {
  subcommunity: Subcommunity;
  onUpdate?: (subcommunity: Subcommunity) => void;
  onDelete?: (subcommunityId: string) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

interface SubcommunityDiscoveryProps {
  onJoin?: (subcommunity: Subcommunity) => void;
  className?: string;
}

interface CreateSubcommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (subcommunity: Subcommunity) => void;
}

export const SubcommunityCard: React.FC<SubcommunityCardProps> = ({
  subcommunity,
  onUpdate,
  onDelete,
  showActions = true,
  compact = false,
  className = ''
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const [memberCount, setMemberCount] = useState(subcommunity.memberCount);
  const [loading, setLoading] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  
  const { session } = useSession();

  useEffect(() => {
    checkMembership();
  }, [subcommunity.id, session]);

  const checkMembership = async () => {
    if (!session) return;
    
    try {
      // TODO: Implement membership check
      // This would call SubcommunityService to check if user is a member
      setIsJoined(false); // Placeholder
    } catch (error) {
      console.error('Failed to check membership:', error);
    }
  };

  const handleJoinLeave = async () => {
    if (!session) return;

    try {
      setLoading(true);
      
      if (isJoined) {
        await SubcommunityService.leaveSubcommunity(subcommunity.id);
        setIsJoined(false);
        setMemberCount(prev => prev - 1);
      } else {
        await SubcommunityService.joinSubcommunity(subcommunity.id);
        setIsJoined(true);
        setMemberCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to join/leave subcommunity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!session || !canManage()) return;

    try {
      await SubcommunityService.deleteSubcommunity(subcommunity.id);
      if (onDelete) {
        onDelete(subcommunity.id);
      }
    } catch (error) {
      console.error('Failed to delete subcommunity:', error);
    }
  };

  const canManage = (): boolean => {
    if (!session) return false;
    return subcommunity.creatorId === session.did || 
           subcommunity.moderators.includes(session.did);
  };

  const isCreator = (): boolean => {
    if (!session) return false;
    return subcommunity.creatorId === session.did;
  };

  if (compact) {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={subcommunity.avatar} />
              <AvatarFallback>
                {subcommunity.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">
                  r/{subcommunity.name}
                </h3>
                {subcommunity.isPrivate && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {memberCount.toLocaleString()} members
              </p>
            </div>
            
            {session && (
              <Button
                size="sm"
                variant={isJoined ? "outline" : "default"}
                onClick={handleJoinLeave}
                disabled={loading}
              >
                {isJoined ? 'Joined' : 'Join'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Avatar className="h-12 w-12">
                <AvatarImage src={subcommunity.avatar} />
                <AvatarFallback>
                  {subcommunity.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg">r/{subcommunity.name}</CardTitle>
                  {subcommunity.isPrivate ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                <h4 className="font-medium text-muted-foreground mb-2">
                  {subcommunity.displayName}
                </h4>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {subcommunity.description}
                </p>
                
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {memberCount.toLocaleString()} members
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {subcommunity.postCount.toLocaleString()} posts
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created {new Date(subcommunity.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
            
            {showActions && (
              <div className="flex items-center gap-2">
                {session && (
                  <Button
                    variant={isJoined ? "outline" : "default"}
                    onClick={handleJoinLeave}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isJoined ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Leave
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Join
                      </>
                    )}
                  </Button>
                )}
                
                {canManage() && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowManageDialog(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Community
                      </DropdownMenuItem>
                      {isCreator() && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={handleDelete}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Community
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Community Rules */}
          {subcommunity.rules.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-sm mb-2">Community Rules</h5>
              <div className="space-y-1">
                {subcommunity.rules.slice(0, 3).map((rule, index) => (
                  <p key={index} className="text-sm text-muted-foreground">
                    {index + 1}. {rule}
                  </p>
                ))}
                {subcommunity.rules.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    +{subcommunity.rules.length - 3} more rules
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Moderators */}
          <div className="mb-4">
            <h5 className="font-medium text-sm mb-2">Moderators</h5>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Crown className="h-3 w-3 text-yellow-600" />
                <span className="text-sm">Creator</span>
              </div>
              {subcommunity.moderators.length > 0 && (
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-blue-600" />
                  <span className="text-sm">
                    {subcommunity.moderators.length} moderator{subcommunity.moderators.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Community Settings */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {subcommunity.isPrivate ? 'Private' : 'Public'}
            </Badge>
            {subcommunity.requiresApproval && (
              <Badge variant="outline" className="text-xs">
                Approval Required
              </Badge>
            )}
            {subcommunity.minimumQarma > 0 && (
              <Badge variant="outline" className="text-xs">
                Min Qarma: {subcommunity.minimumQarma}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Management Dialog */}
      {showManageDialog && (
        <SubcommunityManagementDialog
          subcommunity={subcommunity}
          open={showManageDialog}
          onOpenChange={setShowManageDialog}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
};

// Subcommunity Discovery Component
export const SubcommunityDiscovery: React.FC<SubcommunityDiscoveryProps> = ({
  onJoin,
  className = ''
}) => {
  const [subcommunities, setSubcommunities] = useState<Subcommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('trending');
  
  const { session } = useSession();

  useEffect(() => {
    loadSubcommunities();
  }, [activeTab, searchQuery]);

  const loadSubcommunities = async () => {
    try {
      setLoading(true);
      
      let loadedSubcommunities: Subcommunity[];
      
      if (searchQuery) {
        loadedSubcommunities = await SubcommunityService.searchSubcommunities(searchQuery);
      } else if (activeTab === 'trending') {
        loadedSubcommunities = await SubcommunityService.getTrendingSubcommunities();
      } else {
        // Load all subcommunities
        loadedSubcommunities = await SubcommunityService.getTrendingSubcommunities();
      }
      
      setSubcommunities(loadedSubcommunities);
    } catch (error) {
      console.error('Failed to load subcommunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (newSubcommunity: Subcommunity) => {
    setSubcommunities(prev => [newSubcommunity, ...prev]);
    setShowCreateDialog(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Discover Communities
            </CardTitle>
            
            {session && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Community
                  </Button>
                </DialogTrigger>
                <CreateSubcommunityDialog
                  open={showCreateDialog}
                  onOpenChange={setShowCreateDialog}
                  onSuccess={handleCreateSuccess}
                />
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trending">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Communities List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-12 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {subcommunities.length > 0 ? (
            subcommunities.map((subcommunity) => (
              <SubcommunityCard
                key={subcommunity.id}
                subcommunity={subcommunity}
                onUpdate={(updated) => {
                  setSubcommunities(prev => prev.map(s => 
                    s.id === updated.id ? updated : s
                  ));
                }}
                onDelete={(deletedId) => {
                  setSubcommunities(prev => prev.filter(s => s.id !== deletedId));
                }}
              />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? 'No communities found' : 'No communities yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? `No communities match "${searchQuery}"`
                    : 'Be the first to create a community!'
                  }
                </p>
                {session && !searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Community
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

// Create Subcommunity Dialog
const CreateSubcommunityDialog: React.FC<CreateSubcommunityDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CreateSubcommunityRequest>({
    name: '',
    displayName: '',
    description: '',
    isPrivate: false,
    requiresApproval: false,
    minimumQarma: 0,
    allowedContentTypes: ['text', 'link', 'media'],
    rules: [],
  });
  const [newRule, setNewRule] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Community name is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
      newErrors.name = 'Community name can only contain letters, numbers, underscores, and hyphens';
    } else if (formData.name.length < 3 || formData.name.length > 21) {
      newErrors.name = 'Community name must be between 3 and 21 characters';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.length > 100) {
      newErrors.displayName = 'Display name must be less than 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (formData.minimumQarma < 0) {
      newErrors.minimumQarma = 'Minimum Qarma cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const newSubcommunity = await SubcommunityService.createSubcommunity(formData);
      
      if (onSuccess) {
        onSuccess(newSubcommunity);
      }
      
      // Reset form
      setFormData({
        name: '',
        displayName: '',
        description: '',
        isPrivate: false,
        requiresApproval: false,
        minimumQarma: 0,
        allowedContentTypes: ['text', 'link', 'media'],
        rules: [],
      });
      
    } catch (error) {
      console.error('Failed to create subcommunity:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to create community' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRule = () => {
    if (newRule.trim() && formData.rules.length < 10) {
      setFormData(prev => ({
        ...prev,
        rules: [...prev.rules, newRule.trim()]
      }));
      setNewRule('');
    }
  };

  const handleRemoveRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Community</DialogTitle>
        <DialogDescription>
          Create a new subcommunity for focused discussions and content sharing.
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{errors.general}</p>
          </div>
        )}

        {/* Community Name */}
        <div>
          <Label htmlFor="name">Community Name *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              r/
            </span>
            <Input
              id="name"
              placeholder="community-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase() }))}
              className={`pl-8 ${errors.name ? 'border-destructive' : ''}`}
              maxLength={21}
            />
          </div>
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formData.name.length}/21 characters
          </p>
        </div>

        {/* Display Name */}
        <div>
          <Label htmlFor="displayName">Display Name *</Label>
          <Input
            id="displayName"
            placeholder="Community Display Name"
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            className={errors.displayName ? 'border-destructive' : ''}
            maxLength={100}
          />
          {errors.displayName && (
            <p className="text-sm text-destructive mt-1">{errors.displayName}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            placeholder="Describe what this community is about..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={`min-h-[80px] ${errors.description ? 'border-destructive' : ''}`}
            maxLength={500}
          />
          {errors.description && (
            <p className="text-sm text-destructive mt-1">{errors.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formData.description.length}/500 characters
          </p>
        </div>

        {/* Community Settings */}
        <div className="space-y-4">
          <h4 className="font-medium">Community Settings</h4>
          
          {/* Privacy */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Privacy</Label>
              <p className="text-sm text-muted-foreground">
                {formData.isPrivate ? 'Only members can see posts' : 'Anyone can see posts'}
              </p>
            </div>
            <Select 
              value={formData.isPrivate ? 'private' : 'public'} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, isPrivate: value === 'private' }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Public
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Approval Required */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Membership Approval</Label>
              <p className="text-sm text-muted-foreground">
                Require moderator approval for new members
              </p>
            </div>
            <Select 
              value={formData.requiresApproval ? 'required' : 'automatic'} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, requiresApproval: value === 'required' }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic</SelectItem>
                <SelectItem value="required">Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Minimum Qarma */}
          <div>
            <Label htmlFor="minimumQarma">Minimum Qarma</Label>
            <Input
              id="minimumQarma"
              type="number"
              min="0"
              placeholder="0"
              value={formData.minimumQarma}
              onChange={(e) => setFormData(prev => ({ ...prev, minimumQarma: parseInt(e.target.value) || 0 }))}
              className={errors.minimumQarma ? 'border-destructive' : ''}
            />
            {errors.minimumQarma && (
              <p className="text-sm text-destructive mt-1">{errors.minimumQarma}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Minimum Qarma required to join and post
            </p>
          </div>
        </div>

        {/* Community Rules */}
        <div>
          <Label>Community Rules</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add a community rule..."
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRule())}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAddRule}
                disabled={!newRule.trim() || formData.rules.length >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {formData.rules.length > 0 && (
              <div className="space-y-2">
                {formData.rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 border rounded">
                    <span className="text-sm font-medium text-muted-foreground mt-0.5">
                      {index + 1}.
                    </span>
                    <p className="text-sm flex-1">{rule}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRule(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              {formData.rules.length}/10 rules
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Community'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

// Subcommunity Management Dialog
const SubcommunityManagementDialog: React.FC<{
  subcommunity: Subcommunity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (subcommunity: Subcommunity) => void;
}> = ({ subcommunity, open, onOpenChange, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('settings');
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (activeTab === 'members') {
      loadMembers();
    }
  }, [activeTab]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const loadedMembers = await SubcommunityService.getMembers(subcommunity.id);
      setMembers(loadedMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage r/{subcommunity.name}</DialogTitle>
          <DialogDescription>
            Manage community settings, members, and moderation
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-4">
            {/* TODO: Implement settings management */}
            <p className="text-muted-foreground">Settings management coming soon...</p>
          </TabsContent>
          
          <TabsContent value="members" className="space-y-4">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {member.displayName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{member.displayName || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground">{member.did}</p>
                      </div>
                    </div>
                    {/* TODO: Add member management actions */}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="moderation" className="space-y-4">
            {/* TODO: Implement moderation tools */}
            <p className="text-muted-foreground">Moderation tools coming soon...</p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SubcommunityCard;