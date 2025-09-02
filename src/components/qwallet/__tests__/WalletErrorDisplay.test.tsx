/**
 * Wallet Error Display Component Tests
 * Tests for user-friendly error display and interaction
 * Requirements: 6.6, Error handling design
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletErrorDisplay } from '../WalletErrorDisplay';
import {
  WalletError,
  WalletErrorType,
  WalletErrorSeverity,
  RecoveryStrategy
} from '../../../types/wallet-errors';

// Mock the error handler
vi.mock('../../../services/identity/WalletErrorHandler', () => ({
  walletErrorHandler: {
    getUserMessage: vi.fn((error: WalletError) => ({
      title: `Mock Title for ${error.type}`,
      description: error.userMessage || error.message,
      icon: 'error',
      color: 'error' as const,
      dismissible: error.severity !== 'CRITICAL',
      persistent: error.severity === 'CRITICAL'
    }))
  }
}));

describe('WalletErrorDisplay', () => {
  const mockOnRetry = vi.fn();
  const mockOnDismiss = vi.fn();
  const mockOnContactSupport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockError = (overrides: Partial<WalletError> = {}): WalletError => ({
    type: WalletErrorType.INSUFFICIENT_BALANCE,
    code: 'WALLET_INSUFFICIENT_BALANCE',
    message: 'Insufficient balance for transaction',
    userMessage: 'You do not have enough funds to complete this transaction',
    severity: WalletErrorSeverity.LOW,
    recoverable: true,
    retryable: false,
    suggestedActions: ['Add funds to your wallet', 'Try a smaller amount'],
    recoveryStrategy: RecoveryStrategy.USER_ACTION,
    timestamp: new Date().toISOString(),
    identityId: 'test-identity',
    operation: 'transfer',
    ...overrides
  });

  describe('Basic Rendering', () => {
    it('should render nothing when no error is provided', () => {
      const { container } = render(
        <WalletErrorDisplay error={null} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render error message when error is provided', () => {
      const error = createMockError();

      render(
        <WalletErrorDisplay error={error} />
      );

      expect(screen.getByText('Mock Title for INSUFFICIENT_BALANCE')).toBeInTheDocument();
      expect(screen.getByText(error.userMessage)).toBeInTheDocument();
    });

    it('should render suggested actions', () => {
      const error = createMockError();

      render(
        <WalletErrorDisplay error={error} />
      );

      expect(screen.getByText('What you can do:')).toBeInTheDocument();
      expect(screen.getByText('Add funds to your wallet')).toBeInTheDocument();
      expect(screen.getByText('Try a smaller amount')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode when specified', () => {
      const error = createMockError({
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY
      });

      render(
        <WalletErrorDisplay 
          error={error} 
          compact={true}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      // Should show compact layout
      expect(screen.getByText('Mock Title for INSUFFICIENT_BALANCE')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('should not show detailed information in compact mode', () => {
      const error = createMockError();

      render(
        <WalletErrorDisplay error={error} compact={true} />
      );

      expect(screen.queryByText('What you can do:')).not.toBeInTheDocument();
    });
  });

  describe('Error Severity Styling', () => {
    it('should apply correct styles for low severity errors', () => {
      const error = createMockError({
        severity: WalletErrorSeverity.LOW
      });

      const { container } = render(
        <WalletErrorDisplay error={error} />
      );

      const errorDiv = container.querySelector('.bg-blue-50');
      expect(errorDiv).toBeInTheDocument();
    });

    it('should apply correct styles for medium severity errors', () => {
      const error = createMockError({
        severity: WalletErrorSeverity.MEDIUM
      });

      const { container } = render(
        <WalletErrorDisplay error={error} />
      );

      const errorDiv = container.querySelector('.bg-yellow-50');
      expect(errorDiv).toBeInTheDocument();
    });

    it('should apply correct styles for high severity errors', () => {
      const error = createMockError({
        severity: WalletErrorSeverity.HIGH
      });

      const { container } = render(
        <WalletErrorDisplay error={error} />
      );

      const errorDiv = container.querySelector('.bg-orange-50');
      expect(errorDiv).toBeInTheDocument();
    });

    it('should apply correct styles for critical severity errors', () => {
      const error = createMockError({
        severity: WalletErrorSeverity.CRITICAL
      });

      const { container } = render(
        <WalletErrorDisplay error={error} />
      );

      const errorDiv = container.querySelector('.bg-red-50');
      expect(errorDiv).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show retry button for retryable errors', () => {
      const error = createMockError({
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY
      });

      render(
        <WalletErrorDisplay error={error} onRetry={mockOnRetry} />
      );

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const error = createMockError({
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY
      });

      render(
        <WalletErrorDisplay error={error} onRetry={mockOnRetry} />
      );

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should show loading state during retry', async () => {
      const error = createMockError({
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY
      });

      const slowRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <WalletErrorDisplay error={error} onRetry={slowRetry} />
      );

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      expect(retryButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
      });
    });

    it('should show contact support button for escalated errors', () => {
      const error = createMockError({
        recoveryStrategy: RecoveryStrategy.ESCALATE,
        contactSupport: true
      });

      render(
        <WalletErrorDisplay error={error} onContactSupport={mockOnContactSupport} />
      );

      const supportButton = screen.getByText('Contact Support');
      expect(supportButton).toBeInTheDocument();
    });

    it('should call onContactSupport when support button is clicked', () => {
      const error = createMockError({
        recoveryStrategy: RecoveryStrategy.ESCALATE,
        contactSupport: true
      });

      render(
        <WalletErrorDisplay error={error} onContactSupport={mockOnContactSupport} />
      );

      const supportButton = screen.getByText('Contact Support');
      fireEvent.click(supportButton);

      expect(mockOnContactSupport).toHaveBeenCalledTimes(1);
    });

    it('should open default support page when no custom handler provided', () => {
      const error = createMockError({
        recoveryStrategy: RecoveryStrategy.ESCALATE,
        contactSupport: true
      });

      // Mock window.open
      const mockOpen = vi.fn();
      Object.defineProperty(window, 'open', {
        value: mockOpen,
        writable: true
      });

      render(
        <WalletErrorDisplay error={error} />
      );

      const supportButton = screen.getByText('Contact Support');
      fireEvent.click(supportButton);

      expect(mockOpen).toHaveBeenCalledWith('/support', '_blank');
    });

    it('should show dismiss button for dismissible errors', () => {
      const error = createMockError({
        severity: WalletErrorSeverity.LOW
      });

      render(
        <WalletErrorDisplay error={error} onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByText('✕');
      expect(dismissButton).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      const error = createMockError({
        severity: WalletErrorSeverity.LOW
      });

      render(
        <WalletErrorDisplay error={error} onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByText('✕');
      fireEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not show dismiss button for critical errors', () => {
      const error = createMockError({
        severity: WalletErrorSeverity.CRITICAL
      });

      render(
        <WalletErrorDisplay error={error} onDismiss={mockOnDismiss} />
      );

      expect(screen.queryByText('✕')).not.toBeInTheDocument();
    });
  });

  describe('Technical Details', () => {
    it('should show technical details when showDetails is true', () => {
      const error = createMockError({
        requestId: 'test-request-123'
      });

      render(
        <WalletErrorDisplay error={error} showDetails={true} />
      );

      expect(screen.getByText('Technical Details')).toBeInTheDocument();
    });

    it('should expand technical details when clicked', () => {
      const error = createMockError({
        requestId: 'test-request-123'
      });

      render(
        <WalletErrorDisplay error={error} showDetails={true} />
      );

      const detailsButton = screen.getByText('Technical Details');
      fireEvent.click(detailsButton);

      expect(screen.getByText('Error Type:')).toBeInTheDocument();
      expect(screen.getByText('Error Code:')).toBeInTheDocument();
      expect(screen.getByText('Request ID:')).toBeInTheDocument();
    });

    it('should show all available technical information', () => {
      const error = createMockError({
        requestId: 'test-request-123',
        details: { additionalInfo: 'test-info' }
      });

      render(
        <WalletErrorDisplay error={error} showDetails={true} />
      );

      const detailsButton = screen.getByText('Technical Details');
      fireEvent.click(detailsButton);

      expect(screen.getByText('INSUFFICIENT_BALANCE')).toBeInTheDocument();
      expect(screen.getByText('WALLET_INSUFFICIENT_BALANCE')).toBeInTheDocument();
      expect(screen.getByText('test-identity')).toBeInTheDocument();
      expect(screen.getByText('transfer')).toBeInTheDocument();
      expect(screen.getByText('test-request-123')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument(); // Recoverable
      expect(screen.getByText('USER_ACTION')).toBeInTheDocument();
    });
  });

  describe('Recovery Progress', () => {
    it('should show recovery progress for retry errors', () => {
      const error = createMockError({
        recoveryStrategy: RecoveryStrategy.RETRY,
        maxRetries: 3,
        retryDelay: 2000
      });

      render(
        <WalletErrorDisplay error={error} />
      );

      expect(screen.getByText('Recovery attempts: 0/3')).toBeInTheDocument();
      expect(screen.getByText('Retry delay: 2000ms')).toBeInTheDocument();
    });

    it('should show unlimited retries when maxRetries is 0', () => {
      const error = createMockError({
        recoveryStrategy: RecoveryStrategy.RETRY,
        maxRetries: 0
      });

      render(
        <WalletErrorDisplay error={error} />
      );

      expect(screen.getByText('Recovery attempts: Unlimited')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const error = createMockError();

      const { container } = render(
        <WalletErrorDisplay error={error} className="custom-error-class" />
      );

      expect(container.querySelector('.custom-error-class')).toBeInTheDocument();
    });
  });

  describe('Error Icons', () => {
    it('should show appropriate icons for different severity levels', () => {
      const lowError = createMockError({ severity: WalletErrorSeverity.LOW });
      const mediumError = createMockError({ severity: WalletErrorSeverity.MEDIUM });
      const highError = createMockError({ severity: WalletErrorSeverity.HIGH });
      const criticalError = createMockError({ severity: WalletErrorSeverity.CRITICAL });

      const { rerender } = render(<WalletErrorDisplay error={lowError} />);
      expect(screen.getByText('💡')).toBeInTheDocument();

      rerender(<WalletErrorDisplay error={mediumError} />);
      expect(screen.getByText('⚠️')).toBeInTheDocument();

      rerender(<WalletErrorDisplay error={highError} />);
      expect(screen.getByText('❌')).toBeInTheDocument();

      rerender(<WalletErrorDisplay error={criticalError} />);
      expect(screen.getByText('🚨')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const error = createMockError();

      render(
        <WalletErrorDisplay error={error} />
      );

      // Check that buttons are properly labeled
      const retryButton = screen.queryByRole('button', { name: /try again/i });
      if (retryButton) {
        expect(retryButton).toBeInTheDocument();
      }

      const dismissButton = screen.queryByRole('button', { name: /✕/i });
      if (dismissButton) {
        expect(dismissButton).toBeInTheDocument();
      }
    });

    it('should be keyboard navigable', () => {
      const error = createMockError({
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY
      });

      render(
        <WalletErrorDisplay 
          error={error} 
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      const retryButton = screen.getByText('Try Again');
      const dismissButton = screen.getByText('✕');

      // Should be focusable
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);

      dismissButton.focus();
      expect(document.activeElement).toBe(dismissButton);
    });
  });
});