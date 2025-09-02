/**
 * Example: React Module Registration Form
 * 
 * This example demonstrates how to create a comprehensive module registration
 * form using React and the useQindexRegistration hook.
 * 
 * Prerequisites:
 * - React 18+
 * - @qwallet/hooks package
 * - @qwallet/module-registry package
 * 
 * Features:
 * - Real-time form validation
 * - Progress tracking
 * - Error handling with recovery suggestions
 * - Responsive design
 * - Accessibility support
 */

import React, { useState, useEffect } from 'react';
import { useQindexRegistration } from '@qwallet/hooks';
import { 
  ModuleInfo, 
  IdentityType, 
  ModuleRegistrationRequest,
  RegistrationProgress 
} from '@qwallet/module-registry';

// Types for form state
interface FormData extends Partial<ModuleInfo> {
  testMode?: boolean;
  skipValidation?: boolean;
}

interface FormErrors {
  [key: string]: string;
}

// Component props
interface ModuleRegistrationFormProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  defaultValues?: Partial<FormData>;
  className?: string;
}

export const ModuleRegistrationForm: React.FC<ModuleRegistrationFormProps> = ({
  onSuccess,
  onError,
  defaultValues = {},
  className = ''
}) => {
  // Hook for module registration
  const {
    registerModule,
    loading,
    error,
    registrationResult,
    progress,
    validateField,
    clearError,
    resetRegistration
  } = useQindexRegistration();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    version: '1.0.0',
    description: '',
    identitiesSupported: [IdentityType.ROOT],
    integrations: ['Qindex'],
    repositoryUrl: '',
    documentationCid: '',
    auditHash: '',
    testMode: false,
    skipValidation: false,
    ...defaultValues
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available options
  const identityOptions = Object.values(IdentityType);
  const integrationOptions = ['Qindex', 'Qlock', 'Qerberos', 'Qonsent', 'Qpic', 'Qdrive'];

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required field validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Module name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Module name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Module name must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
      newErrors.name = 'Module name can only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.version?.trim()) {
      newErrors.version = 'Version is required';
    } else if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(formData.version)) {
      newErrors.version = 'Version must follow semantic versioning (e.g., 1.0.0)';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (!formData.repositoryUrl?.trim()) {
      newErrors.repositoryUrl = 'Repository URL is required';
    } else if (!/^https?:\/\/[^\s]+$/.test(formData.repositoryUrl)) {
      newErrors.repositoryUrl = 'Repository URL must be a valid HTTP/HTTPS URL';
    }

    if (!formData.identitiesSupported?.length) {
      newErrors.identitiesSupported = 'At least one supported identity type is required';
    }

    // Optional field validation
    if (formData.documentationCid && !/^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/.test(formData.documentationCid)) {
      newErrors.documentationCid = 'Documentation CID must be a valid IPFS CID';
    }

    if (formData.auditHash && !/^[a-f0-9]{64}$/i.test(formData.auditHash)) {
      newErrors.auditHash = 'Audit hash must be a valid SHA256 hash (64 hex characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      const registrationRequest: ModuleRegistrationRequest = {
        moduleInfo: {
          name: formData.name!,
          version: formData.version!,
          description: formData.description!,
          identitiesSupported: formData.identitiesSupported!,
          integrations: formData.integrations || [],
          repositoryUrl: formData.repositoryUrl!,
          documentationCid: formData.documentationCid || undefined,
          auditHash: formData.auditHash || undefined,
          compliance: {
            audit: !!formData.auditHash,
            privacy_enforced: true,
            gdpr_compliant: true,
            data_retention_policy: '30_days'
          }
        },
        testMode: formData.testMode,
        skipValidation: formData.skipValidation
      };

      const result = await registerModule(registrationRequest);
      
      if (result.success) {
        onSuccess?.(result);
      } else {
        onError?.(result.error || 'Registration failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setFormData({
      name: '',
      version: '1.0.0',
      description: '',
      identitiesSupported: [IdentityType.ROOT],
      integrations: ['Qindex'],
      repositoryUrl: '',
      documentationCid: '',
      auditHash: '',
      testMode: false,
      skipValidation: false,
      ...defaultValues
    });
    setErrors({});
    setTouched({});
    resetRegistration();
  };

  // Progress indicator component
  const ProgressIndicator: React.FC<{ progress: any }> = ({ progress }) => {
    if (!progress) return null;

    const getProgressColor = (stage: RegistrationProgress) => {
      switch (stage) {
        case RegistrationProgress.COMPLETED:
          return 'bg-green-500';
        case RegistrationProgress.FAILED:
          return 'bg-red-500';
        default:
          return 'bg-blue-500';
      }
    };

    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {progress.message}
          </span>
          <span className="text-sm text-gray-500">
            {progress.progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.stage)}`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Stage: {progress.stage}
        </div>
      </div>
    );
  };

  // Error display component
  const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Registration Error</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  );

  // Success display component
  const SuccessDisplay: React.FC<{ result: any }> = ({ result }) => (
    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">Registration Successful!</h3>
          <div className="mt-2 text-sm text-green-700">
            <p><strong>Module ID:</strong> {result.moduleId}</p>
            <p><strong>IPFS CID:</strong> {result.cid}</p>
            <p><strong>Index ID:</strong> {result.indexId}</p>
            <p><strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg ${className}`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Register New Module
        </h2>
        <p className="text-gray-600">
          Register your module in the Q ecosystem to make it discoverable and usable by other participants.
        </p>
      </div>

      {/* Progress indicator */}
      {progress && <ProgressIndicator progress={progress} />}

      {/* Error display */}
      {error && <ErrorDisplay error={error} />}

      {/* Success display */}
      {registrationResult?.success && <SuccessDisplay result={registrationResult} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Module Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Module Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="my-awesome-module"
            disabled={loading}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600">
              {errors.name}
            </p>
          )}
        </div>

        {/* Version */}
        <div>
          <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
            Version *
          </label>
          <input
            type="text"
            id="version"
            value={formData.version || ''}
            onChange={(e) => handleFieldChange('version', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.version ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="1.0.0"
            disabled={loading}
            aria-describedby={errors.version ? 'version-error' : undefined}
          />
          {errors.version && (
            <p id="version-error" className="mt-1 text-sm text-red-600">
              {errors.version}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Use semantic versioning (e.g., 1.0.0, 1.2.3-beta.1)
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Describe what your module does and its key features..."
            disabled={loading}
            aria-describedby={errors.description ? 'description-error' : undefined}
          />
          {errors.description && (
            <p id="description-error" className="mt-1 text-sm text-red-600">
              {errors.description}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.description?.length || 0}/500 characters
          </p>
        </div>

        {/* Repository URL */}
        <div>
          <label htmlFor="repositoryUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Repository URL *
          </label>
          <input
            type="url"
            id="repositoryUrl"
            value={formData.repositoryUrl || ''}
            onChange={(e) => handleFieldChange('repositoryUrl', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.repositoryUrl ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="https://github.com/username/module-name"
            disabled={loading}
            aria-describedby={errors.repositoryUrl ? 'repository-error' : undefined}
          />
          {errors.repositoryUrl && (
            <p id="repository-error" className="mt-1 text-sm text-red-600">
              {errors.repositoryUrl}
            </p>
          )}
        </div>

        {/* Supported Identities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supported Identity Types *
          </label>
          <div className="space-y-2">
            {identityOptions.map((identity) => (
              <label key={identity} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.identitiesSupported?.includes(identity) || false}
                  onChange={(e) => {
                    const current = formData.identitiesSupported || [];
                    const updated = e.target.checked
                      ? [...current, identity]
                      : current.filter(i => i !== identity);
                    handleFieldChange('identitiesSupported', updated);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-700">{identity}</span>
              </label>
            ))}
          </div>
          {errors.identitiesSupported && (
            <p className="mt-1 text-sm text-red-600">
              {errors.identitiesSupported}
            </p>
          )}
        </div>

        {/* Integrations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ecosystem Integrations
          </label>
          <div className="grid grid-cols-2 gap-2">
            {integrationOptions.map((integration) => (
              <label key={integration} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.integrations?.includes(integration) || false}
                  onChange={(e) => {
                    const current = formData.integrations || [];
                    const updated = e.target.checked
                      ? [...current, integration]
                      : current.filter(i => i !== integration);
                    handleFieldChange('integrations', updated);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-700">{integration}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Optional Fields */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Optional Information</h3>
          
          {/* Documentation CID */}
          <div className="mb-4">
            <label htmlFor="documentationCid" className="block text-sm font-medium text-gray-700 mb-1">
              Documentation IPFS CID
            </label>
            <input
              type="text"
              id="documentationCid"
              value={formData.documentationCid || ''}
              onChange={(e) => handleFieldChange('documentationCid', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.documentationCid ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
              disabled={loading}
            />
            {errors.documentationCid && (
              <p className="mt-1 text-sm text-red-600">
                {errors.documentationCid}
              </p>
            )}
          </div>

          {/* Audit Hash */}
          <div className="mb-4">
            <label htmlFor="auditHash" className="block text-sm font-medium text-gray-700 mb-1">
              Security Audit Hash (SHA256)
            </label>
            <input
              type="text"
              id="auditHash"
              value={formData.auditHash || ''}
              onChange={(e) => handleFieldChange('auditHash', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.auditHash ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890"
              disabled={loading}
            />
            {errors.auditHash && (
              <p className="mt-1 text-sm text-red-600">
                {errors.auditHash}
              </p>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Registration Options</h3>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.testMode || false}
                onChange={(e) => handleFieldChange('testMode', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <span className="ml-2 text-sm text-gray-700">
                Register in sandbox mode (for testing)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.skipValidation || false}
                onChange={(e) => handleFieldChange('skipValidation', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <span className="ml-2 text-sm text-gray-700">
                Skip validation checks (not recommended)
              </span>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between pt-6 border-t">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          >
            Reset Form
          </button>

          <button
            type="submit"
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || isSubmitting}
          >
            {loading || isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Registering...
              </span>
            ) : (
              'Register Module'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ModuleRegistrationForm;