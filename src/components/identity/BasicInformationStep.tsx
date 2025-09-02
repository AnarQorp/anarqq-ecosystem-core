/**
 * Basic Information Step
 * Second step of the subidentity creation wizard - collects name, description, tags, and avatar
 * Requirements: 2.3, 2.4
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  FileText, 
  Tag, 
  Upload, 
  X, 
  Plus, 
  AlertCircle, 
  Info,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { IdentityType, SubidentityMetadata } from '@/types/identity';
import { IDENTITY_HIERARCHY_LIMITS, VALIDATION_PATTERNS } from '@/types/identity-constants';

// Props interface
export interface BasicInformationStepProps {
  /** Selected identity type from previous step */
  selectedType: IdentityType;
  /** Current form data */
  formData: Partial<SubidentityMetadata>;
  /** Callback when form data changes */
  onFormDataChange: (data: Partial<SubidentityMetadata>) => void;
  /** Validation errors */
  validationErrors: Record<string, string[]>;
  /** Whether the form is being submitted */
  isSubmitting?: boolean;
}

// Avatar upload component
interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarChange: (avatar: string | undefined) => void;
  disabled?: boolean;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onAvatarChange,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    setUploading(true);
    try {
      // Convert to base64 for now - in real implementation would upload to IPFS
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onAvatarChange(result);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setUploading(false);
    }
  }, [onAvatarChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled || uploading) return;
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    }
  }, [disabled, uploading, handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  return (
    <div className="space-y-3">
      <Label>Avatar (Optional)</Label>
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />
        
        {currentAvatar ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                src={currentAvatar}
                alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-muted"
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAvatarChange(undefined);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Click to change or drag a new image here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              {uploading ? (
                <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {uploading ? 'Uploading...' : 'Upload Avatar'}
              </p>
              <p className="text-xs text-muted-foreground">
                Drag and drop an image or click to browse
              </p>
            </div>
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Supported formats: JPG, PNG, GIF. Max size: 5MB
      </p>
    </div>
  );
};

// Tag input component
interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onTagsChange,
  maxTags = IDENTITY_HIERARCHY_LIMITS.MAX_TAGS,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    
    if (!trimmedTag) {
      setInputError('Tag cannot be empty');
      return;
    }
    
    if (trimmedTag.length > IDENTITY_HIERARCHY_LIMITS.MAX_TAG_LENGTH) {
      setInputError(`Tag must be ${IDENTITY_HIERARCHY_LIMITS.MAX_TAG_LENGTH} characters or less`);
      return;
    }
    
    if (!VALIDATION_PATTERNS.TAG.test(trimmedTag)) {
      setInputError('Tag can only contain letters, numbers, hyphens, and underscores');
      return;
    }
    
    if (tags.includes(trimmedTag)) {
      setInputError('Tag already exists');
      return;
    }
    
    if (tags.length >= maxTags) {
      setInputError(`Maximum ${maxTags} tags allowed`);
      return;
    }
    
    onTagsChange([...tags, trimmedTag]);
    setInputValue('');
    setInputError(null);
  }, [tags, onTagsChange, maxTags]);

  const removeTag = useCallback((tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  }, [tags, onTagsChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }, [inputValue, tags, addTag, removeTag]);

  return (
    <div className="space-y-3">
      <Label>Tags (Optional)</Label>
      
      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {tag}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-4 h-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeTag(tag)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Tag input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setInputError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Add a tag..."
            disabled={disabled || tags.length >= maxTags}
            className={inputError ? 'border-destructive' : ''}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTag(inputValue)}
            disabled={disabled || !inputValue.trim() || tags.length >= maxTags}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {inputError && (
          <p className="text-sm text-destructive">{inputError}</p>
        )}
        
        <p className="text-xs text-muted-foreground">
          Press Enter or comma to add a tag. {tags.length}/{maxTags} tags used.
        </p>
      </div>
    </div>
  );
};

export const BasicInformationStep: React.FC<BasicInformationStepProps> = ({
  selectedType,
  formData,
  onFormDataChange,
  validationErrors,
  isSubmitting = false
}) => {
  const handleFieldChange = useCallback((field: keyof SubidentityMetadata, value: any) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  }, [formData, onFormDataChange]);

  const getFieldError = useCallback((field: string): string[] => {
    return validationErrors[field] || [];
  }, [validationErrors]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
        <p className="text-muted-foreground">
          Provide basic details for your new {selectedType.toLowerCase()} identity.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="identity-name" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Identity Name *
          </Label>
          <Input
            id="identity-name"
            value={formData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Enter a unique name for this identity"
            disabled={isSubmitting}
            className={getFieldError('name').length > 0 ? 'border-destructive' : ''}
            maxLength={IDENTITY_HIERARCHY_LIMITS.MAX_NAME_LENGTH}
          />
          {getFieldError('name').length > 0 && (
            <div className="space-y-1">
              {getFieldError('name').map((error, index) => (
                <p key={index} className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {formData.name?.length || 0}/{IDENTITY_HIERARCHY_LIMITS.MAX_NAME_LENGTH} characters. 
            Must be unique within your identity tree.
          </p>
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <Label htmlFor="identity-description" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Description (Optional)
          </Label>
          <Textarea
            id="identity-description"
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Describe the purpose and use case for this identity"
            disabled={isSubmitting}
            className={getFieldError('description').length > 0 ? 'border-destructive' : ''}
            maxLength={IDENTITY_HIERARCHY_LIMITS.MAX_DESCRIPTION_LENGTH}
            rows={3}
          />
          {getFieldError('description').length > 0 && (
            <div className="space-y-1">
              {getFieldError('description').map((error, index) => (
                <p key={index} className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {formData.description?.length || 0}/{IDENTITY_HIERARCHY_LIMITS.MAX_DESCRIPTION_LENGTH} characters
          </p>
        </div>

        <Separator />

        {/* Avatar Upload */}
        <AvatarUpload
          currentAvatar={formData.avatar}
          onAvatarChange={(avatar) => handleFieldChange('avatar', avatar)}
          disabled={isSubmitting}
        />

        <Separator />

        {/* Tags Input */}
        <TagInput
          tags={formData.tags || []}
          onTagsChange={(tags) => handleFieldChange('tags', tags)}
          disabled={isSubmitting}
        />

        {/* General validation errors */}
        {getFieldError('general').length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {getFieldError('general').map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Help Information */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            <strong>Tips for creating your identity:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Choose a descriptive name that reflects the identity's purpose</li>
              <li>• Add relevant tags to help organize and find your identities</li>
              <li>• Upload an avatar to make your identity easily recognizable</li>
              <li>• The description helps others understand this identity's role</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default BasicInformationStep;