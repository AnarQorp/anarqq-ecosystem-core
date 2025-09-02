/**
 * CreateProposalForm - Proposal creation interface for DAO governance
 * 
 * Allows authorized DAO members to create new proposals with title, description,
 * voting options, expiration date, and optional file attachments.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDAO } from '../../composables/useDAO';
import { useSessionContext } from '../../contexts/SessionContext';
import { 
  DocumentTextIcon,
  PlusIcon,
  XMarkIcon,
  CalendarIcon,
  PaperClipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface CreateProposalFormProps {
  daoId: string;
  embedded?: boolean;
  onSuccess?: (proposalId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface FormData {
  title: string;
  description: string;
  options: string[];
  expirationDate: string;
  expirationTime: string;
  attachments: File[];
}

interface FormErrors {
  title?: string;
  description?: string;
  options?: string[];
  expiration?: string;
  general?: string;
}

const CreateProposalForm: React.FC<CreateProposalFormProps> = ({
  daoId,
  embedded = false,
  onSuccess,
  onCancel,
  className
}) => {
  const { isAuthenticated } = useSessionContext();
  const {
    currentDAO,
    membership,
    loading,
    error,
    createProposal,
    getDAO,
    getMembership,
    clearError
  } = useDAO();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    options: ['', ''],
    expirationDate: '',
    expirationTime: '',
    attachments: []
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Load DAO data on mount
  useEffect(() => {
    if (daoId && isAuthenticated) {
      Promise.all([
        getDAO(daoId),
        getMembership(daoId)
      ]);
    }
  }, [daoId, isAuthenticated]);

  // Set default expiration to 7 days from now
  useEffect(() => {
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 7);
    
    setFormData(prev => ({
      ...prev,
      expirationDate: defaultExpiration.toISOString().split('T')[0],
      expirationTime: '23:59'
    }));
  }, []);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleInputChange = (field: keyof FormData, value: string | string[] | File[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    handleInputChange('options', newOptions);
  };

  const addOption = () => {
    if (formData.options.length < 5) {
      handleInputChange('options', [...formData.options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      handleInputChange('options', newOptions);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      const validFiles = newFiles.filter(file => {
        // Basic file validation (size < 10MB)
        return file.size <= 10 * 1024 * 1024;
      });
      
      handleInputChange('attachments', [...formData.attachments, ...validFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = formData.attachments.filter((_, i) => i !== index);
    handleInputChange('attachments', newAttachments);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    } else if (formData.description.length > 5000) {
      newErrors.description = 'Description must be less than 5000 characters';
    }

    // Options validation
    const validOptions = formData.options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      newErrors.options = ['At least 2 options are required'];
    } else {
      const optionErrors: string[] = [];
      formData.options.forEach((option, index) => {
        if (option.trim() && option.length > 100) {
          optionErrors[index] = 'Option must be less than 100 characters';
        }
      });
      if (optionErrors.some(err => err)) {
        newErrors.options = optionErrors;
      }
    }

    // Expiration validation
    if (!formData.expirationDate || !formData.expirationTime) {
      newErrors.expiration = 'Expiration date and time are required';
    } else {
      const expirationDateTime = new Date(`${formData.expirationDate}T${formData.expirationTime}`);
      const now = new Date();
      const minExpiration = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      
      if (expirationDateTime <= minExpiration) {
        newErrors.expiration = 'Expiration must be at least 1 hour from now';
      }
      
      const maxExpiration = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      if (expirationDateTime > maxExpiration) {
        newErrors.expiration = 'Expiration cannot be more than 1 year from now';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!isAuthenticated) {
      setErrors({ general: 'Authentication required to create proposal' });
      return;
    }

    if (!membership?.canCreateProposals) {
      setErrors({ general: 'You do not have permission to create proposals in this DAO' });
      return;
    }

    setSubmitting(true);
    setErrors({});
    clearError();

    try {
      // Prepare proposal data
      const expirationDateTime = new Date(`${formData.expirationDate}T${formData.expirationTime}`);
      const durationHours = Math.ceil((expirationDateTime.getTime() - Date.now()) / (1000 * 60 * 60));
      
      const validOptions = formData.options.filter(opt => opt.trim());
      
      const proposalData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        options: validOptions,
        durationHours,
        attachments: formData.attachments.map(file => file.name) // For now, just file names
      };

      const proposal = await createProposal(daoId, proposalData);
      
      if (proposal) {
        setSuccess(`Proposal "${proposal.title}" created successfully!`);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          options: ['', ''],
          expirationDate: '',
          expirationTime: '',
          attachments: []
        });

        // Set default expiration again
        const defaultExpiration = new Date();
        defaultExpiration.setDate(defaultExpiration.getDate() + 7);
        setFormData(prev => ({
          ...prev,
          expirationDate: defaultExpiration.toISOString().split('T')[0],
          expirationTime: '23:59'
        }));

        // Call success callback
        if (onSuccess) {
          onSuccess(proposal.id);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create proposal';
      setErrors({ general: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      options: ['', ''],
      expirationDate: '',
      expirationTime: '',
      attachments: []
    });
    setErrors({});
    setSuccess(null);
    clearError();

    // Set default expiration
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 7);
    setFormData(prev => ({
      ...prev,
      expirationDate: defaultExpiration.toISOString().split('T')[0],
      expirationTime: '23:59'
    }));
  };

  // Check if user can create proposals
  if (!isAuthenticated) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600">
              Please authenticate with your sQuid identity to create proposals.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!membership?.canCreateProposals) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Permission Required</h3>
            <p className="text-gray-600 mb-4">
              You do not have permission to create proposals in this DAO.
            </p>
            {currentDAO?.governanceRules?.tokenRequirement && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Required:</span>{' '}
                  {currentDAO.governanceRules.tokenRequirement.amount}{' '}
                  {currentDAO.governanceRules.tokenRequirement.token}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {(error || errors.general) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800">{error || errors.general}</p>
            </div>
          </div>
        </div>
      )}

      {/* Title Field */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Proposal Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className={cn(
            "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
            errors.title ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
          )}
          placeholder="Enter a clear, descriptive title for your proposal"
          maxLength={200}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        {errors.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600">
            {errors.title}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          {formData.title.length}/200 characters
        </p>
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={6}
          className={cn(
            "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
            errors.description ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
          )}
          placeholder="Provide a detailed description of your proposal, including rationale and expected outcomes"
          maxLength={5000}
          aria-describedby={errors.description ? "description-error" : undefined}
        />
        {errors.description && (
          <p id="description-error" className="mt-1 text-sm text-red-600">
            {errors.description}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          {formData.description.length}/5000 characters • Markdown supported
        </p>
      </div>

      {/* Voting Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Voting Options * (2-5 options)
        </label>
        <div className="space-y-3">
          {formData.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                className={cn(
                  "flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                  errors.options?.[index] ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
                )}
                placeholder={`Option ${index + 1}`}
                maxLength={100}
                aria-describedby={errors.options?.[index] ? `option-${index}-error` : undefined}
              />
              {formData.options.length > 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeOption(index)}
                  className="p-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        {formData.options.length < 5 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            className="mt-3"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        )}

        {errors.options && Array.isArray(errors.options) && (
          <div className="mt-2 space-y-1">
            {errors.options.map((error, index) => 
              error && (
                <p key={index} id={`option-${index}-error`} className="text-sm text-red-600">
                  Option {index + 1}: {error}
                </p>
              )
            )}
          </div>
        )}
        
        {errors.options && !Array.isArray(errors.options) && (
          <p className="mt-1 text-sm text-red-600">
            {errors.options}
          </p>
        )}
      </div>

      {/* Expiration Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="expiration-date" className="block text-sm font-medium text-gray-700 mb-2">
            Expiration Date *
          </label>
          <div className="relative">
            <input
              type="date"
              id="expiration-date"
              value={formData.expirationDate}
              onChange={(e) => handleInputChange('expirationDate', e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                errors.expiration ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
              )}
              min={new Date().toISOString().split('T')[0]}
              aria-describedby={errors.expiration ? "expiration-error" : undefined}
            />
            <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label htmlFor="expiration-time" className="block text-sm font-medium text-gray-700 mb-2">
            Expiration Time *
          </label>
          <input
            type="time"
            id="expiration-time"
            value={formData.expirationTime}
            onChange={(e) => handleInputChange('expirationTime', e.target.value)}
            className={cn(
              "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
              errors.expiration ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
            )}
            aria-describedby={errors.expiration ? "expiration-error" : undefined}
          />
        </div>
      </div>
      
      {errors.expiration && (
        <p id="expiration-error" className="text-sm text-red-600">
          {errors.expiration}
        </p>
      )}

      {/* File Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attachments (Optional)
        </label>
        
        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          )}
        >
          <PaperClipIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop files here, or{' '}
            <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
              browse
              <input
                type="file"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              />
            </label>
          </p>
          <p className="text-xs text-gray-500">
            PDF, DOC, TXT, or image files up to 10MB each
          </p>
        </div>

        {/* Attached Files */}
        {formData.attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Attached Files:</p>
            {formData.attachments.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center">
                  <PaperClipIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{file.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  className="p-1"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <Button
            type="submit"
            disabled={submitting}
            className="min-w-[120px]"
          >
            {submitting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Create Proposal
              </>
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={submitting}
          >
            Reset
          </Button>
        </div>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="mt-4 sm:mt-0"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  if (embedded) {
    return (
      <div className={className}>
        {formContent}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600" />
          Create New Proposal
        </CardTitle>
        <CardDescription>
          Submit a new proposal for {currentDAO?.name || 'this DAO'} members to vote on
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
};

export default CreateProposalForm;