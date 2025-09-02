/**
 * useEcosystemValidation Hook
 * 
 * React hook for validating ecosystem compliance in real-time.
 * Ensures all file operations follow Q∞ architecture.
 */

import { useState, useCallback, useEffect } from 'react';
import { QsocialFileAttachment } from '../types/qsocial';
import { EcosystemValidator, EcosystemValidationResult } from '../utils/ecosystemValidator';

export interface UseEcosystemValidationOptions {
  autoValidate?: boolean;
  showWarnings?: boolean;
  strictMode?: boolean; // Requires 100% compliance
}

export interface UseEcosystemValidationReturn {
  // Validation state
  isValidating: boolean;
  lastValidation: EcosystemValidationResult | null;
  
  // Validation actions
  validateFile: (attachment: QsocialFileAttachment) => EcosystemValidationResult;
  validateMultipleFiles: (attachments: QsocialFileAttachment[]) => any;
  generateReport: (result: EcosystemValidationResult) => string;
  
  // Compliance helpers
  isCompliant: (attachment: QsocialFileAttachment) => boolean;
  getComplianceScore: (attachment: QsocialFileAttachment) => number;
  checkRequiredComponents: (attachment: QsocialFileAttachment) => string[];
  
  // Real-time validation
  validateInRealTime: (attachments: QsocialFileAttachment[]) => void;
  clearValidation: () => void;
}

export function useEcosystemValidation(
  options: UseEcosystemValidationOptions = {}
): UseEcosystemValidationReturn {
  const {
    autoValidate = true,
    showWarnings = true,
    strictMode = false
  } = options;

  // State
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<EcosystemValidationResult | null>(null);

  // Validate single file
  const validateFile = useCallback((attachment: QsocialFileAttachment): EcosystemValidationResult => {
    setIsValidating(true);
    
    try {
      const result = EcosystemValidator.validateFileAttachment(attachment);
      setLastValidation(result);
      
      // Log validation results in development
      if (process.env.NODE_ENV === 'development') {
        console.group(`[Ecosystem Validation] ${attachment.originalName}`);
        console.log('Compliance Score:', `${result.score}/100`);
        console.log('Valid:', result.isValid ? '✅' : '❌');
        
        if (result.errors.length > 0) {
          console.error('Errors:', result.errors);
        }
        
        if (showWarnings && result.warnings.length > 0) {
          console.warn('Warnings:', result.warnings);
        }
        
        console.groupEnd();
      }
      
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [showWarnings]);

  // Validate multiple files
  const validateMultipleFiles = useCallback((attachments: QsocialFileAttachment[]) => {
    setIsValidating(true);
    
    try {
      const result = EcosystemValidator.validateMultipleAttachments(attachments);
      
      // Log summary in development
      if (process.env.NODE_ENV === 'development') {
        console.group('[Ecosystem Validation] Multiple Files');
        console.log('Total Files:', result.summary.totalFiles);
        console.log('Valid Files:', result.summary.validFiles);
        console.log('Average Score:', `${result.summary.averageScore}/100`);
        console.log('Overall Valid:', result.overallValid ? '✅' : '❌');
        
        if (result.summary.commonErrors.length > 0) {
          console.error('Common Errors:', result.summary.commonErrors);
        }
        
        console.groupEnd();
      }
      
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Generate compliance report
  const generateReport = useCallback((result: EcosystemValidationResult): string => {
    return EcosystemValidator.generateComplianceReport(result);
  }, []);

  // Check if file is compliant
  const isCompliant = useCallback((attachment: QsocialFileAttachment): boolean => {
    const result = EcosystemValidator.validateFileAttachment(attachment);
    return strictMode ? result.score === 100 : result.isValid;
  }, [strictMode]);

  // Get compliance score
  const getComplianceScore = useCallback((attachment: QsocialFileAttachment): number => {
    const result = EcosystemValidator.validateFileAttachment(attachment);
    return result.score;
  }, []);

  // Check required components
  const checkRequiredComponents = useCallback((attachment: QsocialFileAttachment): string[] => {
    const result = EcosystemValidator.validateFileAttachment(attachment);
    const missing: string[] = [];

    Object.entries(result.compliance).forEach(([component, valid]) => {
      if (!valid) {
        const name = component.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        missing.push(name);
      }
    });

    return missing;
  }, []);

  // Real-time validation
  const validateInRealTime = useCallback((attachments: QsocialFileAttachment[]) => {
    if (!autoValidate) return;

    // Debounce validation
    const timeoutId = setTimeout(() => {
      if (attachments.length === 1) {
        validateFile(attachments[0]);
      } else if (attachments.length > 1) {
        validateMultipleFiles(attachments);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [autoValidate, validateFile, validateMultipleFiles]);

  // Clear validation
  const clearValidation = useCallback(() => {
    setLastValidation(null);
  }, []);

  // Auto-validate when enabled
  useEffect(() => {
    if (autoValidate && lastValidation) {
      // Perform any auto-validation logic here
    }
  }, [autoValidate, lastValidation]);

  return {
    // Validation state
    isValidating,
    lastValidation,
    
    // Validation actions
    validateFile,
    validateMultipleFiles,
    generateReport,
    
    // Compliance helpers
    isCompliant,
    getComplianceScore,
    checkRequiredComponents,
    
    // Real-time validation
    validateInRealTime,
    clearValidation
  };
}

export default useEcosystemValidation;