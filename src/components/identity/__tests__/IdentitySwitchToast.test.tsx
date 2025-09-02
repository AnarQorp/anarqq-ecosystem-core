/**
 * Tests for IdentitySwitchToast Component
 * Requirements: 1.6, 4.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentitySwitchToast } from '../IdentitySwitchToast';
import { IdentityType, PrivacyLevel } from '@/types/identity';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  CheckCircle: ({ className }: any) => <div data-testid="check-icon" className={className} />,
  XCircle: ({ className }: any) => <div data-testid="error-icon" className={className} />,
  AlertCircle: ({ className }: any) => <div data-testid="warning-icon" className={className} />,
  Info: ({ className }: any) => <div data-testid="info-icon" className={className} />,
  X: ({ className }: any) => <div data-testid="close-icon" className={className} />,
  Crown: ({ className }: any) => <div data-testid="crown-icon" className={className} />,
  Users: ({ className }: any) => <div data-testid="users-icon" className={className} />,
  Building2: ({ className }: any) => <div data-testid="building-icon" className={className} />,
  Shield: ({ className }: any) => <div data-testid="shield-icon" className={className} />,
  EyeOff: ({ className }: any) => <div data-testid="eye-off-icon" className={className} />
}));

// Mock UI components
vi.mock('@/components/ui/toast', () => ({
  Toast: ({ children, className, ...props }: any) => (
    <div className={`toast ${className}`} {...props}>{children}</div>
  ),
  ToastAction: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} className="toast-action" {...props}>{children}</button>
  ),
  ToastClose: ({ onClick, ...props }: any) => (
    <button onClick={onClick} className="toast-close" {...props}>
      <div data-testid="close-icon" />
    </button>
  ),
  ToastDescription: ({ children, className }: any) => (
    <div className={`toast-description ${className}`}>{children}</div>
  ),
  ToastProvider: ({ children }: any) => <div>{children}</div>,
  ToastTitle: ({ children, className }: any) => (
    <div className={`toast-title ${className}`}>{children}</div>
  ),
  ToastViewport: ({ className }: any) => <div className={`toast-viewport ${className}`} />
}));

const mockIdentity = {
  did: 'did:squid:dao-123',
  name: 'DAO Identity',
  type: IdentityType.DAO,
  privacyLevel: PrivacyLevel.PUBLIC,
  avatar: 'https://example.com/avatar.jpg'
};

describe('IdentitySwitchToast', () => {
  const mockOnDismiss = vi.fn();
  const mockOnUndo = vi.fn();
  const mockOnViewDetails = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Feedback', () => {
    it('should render success toast with identity information', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Identity Switched',
            message: 'Successfully switched to DAO Identity',
            identity: mockIdentity,
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      expect(screen.getByText('Identity Switched')).toBeInTheDocument();
      expect(screen.getByText('Successfully switched to DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
    });

    it('should show identity type icon', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Switched successfully',
            identity: mockIdentity,
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
    });

    it('should show identity avatar when available', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Switched successfully',
            identity: mockIdentity,
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      const avatar = screen.getByAltText('DAO Identity');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should show fallback avatar when none provided', () => {
      const identityWithoutAvatar = { ...mockIdentity, avatar: undefined };
      
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Switched successfully',
            identity: identityWithoutAvatar,
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
    });

    it('should apply success styling', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Switched successfully',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('border-green-200', 'bg-green-50');
    });
  });

  describe('Error Feedback', () => {
    it('should render error toast with error information', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'error',
            title: 'Switch Failed',
            message: 'Failed to switch identity due to network error',
            error: 'Network timeout',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      expect(screen.getByText('Switch Failed')).toBeInTheDocument();
      expect(screen.getByText('Failed to switch identity due to network error')).toBeInTheDocument();
    });

    it('should show error details when provided', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'error',
            title: 'Error',
            message: 'Something went wrong',
            error: 'Detailed error message',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('Detailed error message')).toBeInTheDocument();
    });

    it('should apply error styling', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'error',
            title: 'Error',
            message: 'Error occurred',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('border-red-200', 'bg-red-50');
    });

    it('should show retry action when onRetry is provided', () => {
      const mockOnRetry = vi.fn();
      
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'error',
            title: 'Error',
            message: 'Error occurred',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('Warning Feedback', () => {
    it('should render warning toast', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'warning',
            title: 'Switch Warning',
            message: 'Identity switched but some modules may need refresh',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
      expect(screen.getByText('Switch Warning')).toBeInTheDocument();
      expect(screen.getByText('Identity switched but some modules may need refresh')).toBeInTheDocument();
    });

    it('should apply warning styling', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'warning',
            title: 'Warning',
            message: 'Warning message',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('border-yellow-200', 'bg-yellow-50');
    });
  });

  describe('Info Feedback', () => {
    it('should render info toast', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'info',
            title: 'Information',
            message: 'Identity context updated',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
      expect(screen.getByText('Information')).toBeInTheDocument();
      expect(screen.getByText('Identity context updated')).toBeInTheDocument();
    });

    it('should apply info styling', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'info',
            title: 'Info',
            message: 'Info message',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('border-blue-200', 'bg-blue-50');
    });
  });

  describe('Actions', () => {
    it('should show undo action when onUndo is provided', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          onUndo={mockOnUndo}
        />
      );

      const undoButton = screen.getByText('Undo');
      expect(undoButton).toBeInTheDocument();
      
      fireEvent.click(undoButton);
      expect(mockOnUndo).toHaveBeenCalled();
    });

    it('should show view details action when onViewDetails is provided', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            identity: mockIdentity,
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          onViewDetails={mockOnViewDetails}
        />
      );

      const viewButton = screen.getByText('View Details');
      expect(viewButton).toBeInTheDocument();
      
      fireEvent.click(viewButton);
      expect(mockOnViewDetails).toHaveBeenCalledWith(mockIdentity);
    });

    it('should call onDismiss when close button is clicked', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      const closeButton = document.querySelector('.toast-close');
      expect(closeButton).toBeInTheDocument();
      
      fireEvent.click(closeButton!);
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('Auto Dismiss', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto dismiss after specified duration', async () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          autoDismiss={true}
          duration={3000}
        />
      );

      expect(mockOnDismiss).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });

    it('should not auto dismiss when autoDismiss is false', async () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          autoDismiss={false}
          duration={3000}
        />
      );

      vi.advanceTimersByTime(3000);
      
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('should use default duration when none provided', async () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          autoDismiss={true}
        />
      );

      vi.advanceTimersByTime(5000); // Default duration
      
      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });

    it('should clear timeout when component unmounts', () => {
      const { unmount } = render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          autoDismiss={true}
          duration={3000}
        />
      );

      unmount();
      
      vi.advanceTimersByTime(3000);
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Timestamp Display', () => {
    it('should show relative timestamp', () => {
      const timestamp = new Date(Date.now() - 30000).toISOString(); // 30 seconds ago
      
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp
          }}
          onDismiss={mockOnDismiss}
          showTimestamp={true}
        />
      );

      expect(screen.getByText(/30 seconds ago|just now/)).toBeInTheDocument();
    });

    it('should not show timestamp when showTimestamp is false', () => {
      const timestamp = new Date().toISOString();
      
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp
          }}
          onDismiss={mockOnDismiss}
          showTimestamp={false}
        />
      );

      expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      const toast = document.querySelector('.toast');
      expect(toast).toHaveAttribute('role', 'status');
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });

    it('should have assertive aria-live for errors', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'error',
            title: 'Error',
            message: 'Switch failed',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      const toast = document.querySelector('.toast');
      expect(toast).toHaveAttribute('role', 'alert');
      expect(toast).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have proper button labels', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            identity: mockIdentity,
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          onUndo={mockOnUndo}
          onViewDetails={mockOnViewDetails}
        />
      );

      const undoButton = screen.getByText('Undo');
      const viewButton = screen.getByText('View Details');
      const closeButton = document.querySelector('.toast-close');

      expect(undoButton).toHaveAttribute('aria-label', 'Undo identity switch');
      expect(viewButton).toHaveAttribute('aria-label', 'View identity details');
      expect(closeButton).toHaveAttribute('aria-label', 'Dismiss notification');
    });

    it('should support keyboard navigation', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          onUndo={mockOnUndo}
        />
      );

      const undoButton = screen.getByText('Undo');
      const closeButton = document.querySelector('.toast-close') as HTMLElement;

      // Should be focusable
      undoButton.focus();
      expect(undoButton).toHaveFocus();

      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Animation and Transitions', () => {
    it('should apply slide-in animation', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('animate-slide-in');
    });

    it('should apply fade-out animation when dismissing', async () => {
      const { rerender } = render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      // Simulate dismissing
      rerender(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString(),
            dismissing: true
          }}
          onDismiss={mockOnDismiss}
        />
      );

      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('animate-fade-out');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing feedback properties gracefully', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            timestamp: new Date().toISOString()
          } as any}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should handle invalid timestamp', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: 'invalid-timestamp'
          }}
          onDismiss={mockOnDismiss}
          showTimestamp={true}
        />
      );

      // Should not crash and should render without timestamp
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(500);
      
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: longMessage,
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle missing identity gracefully', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            identity: undefined,
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          onViewDetails={mockOnViewDetails}
        />
      );

      // View Details button should not be shown when no identity
      expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          className="custom-toast-class"
        />
      );

      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('custom-toast-class');
    });

    it('should support compact mode', () => {
      render(
        <IdentitySwitchToast
          feedback={{
            type: 'success',
            title: 'Success',
            message: 'Identity switched',
            timestamp: new Date().toISOString()
          }}
          onDismiss={mockOnDismiss}
          compact={true}
        />
      );

      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('p-2');
    });
  });
});