/**
 * Tests for IdentitySwitchLoading Component
 * Requirements: 1.6, 4.7
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IdentitySwitchLoading } from '../IdentitySwitchLoading';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => <div data-testid="loader-icon" className={className} />,
  CheckCircle: ({ className }: any) => <div data-testid="check-icon" className={className} />,
  XCircle: ({ className }: any) => <div data-testid="error-icon" className={className} />,
  AlertCircle: ({ className }: any) => <div data-testid="warning-icon" className={className} />
}));

describe('IdentitySwitchLoading', () => {
  describe('Loading State', () => {
    it('should render loading spinner and message', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true,
            message: 'Switching to DAO Identity...',
            progress: 50
          }}
        />
      );
      
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByText('Switching to DAO Identity...')).toBeInTheDocument();
    });

    it('should show progress bar when progress is provided', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true,
            message: 'Loading...',
            progress: 75
          }}
        />
      );
      
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('should animate loading spinner', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true,
            message: 'Loading...'
          }}
        />
      );
      
      const spinner = screen.getByTestId('loader-icon');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should show default loading message when none provided', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true
          }}
        />
      );
      
      expect(screen.getByText('Switching identity...')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should render success icon and message', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            success: true,
            message: 'Successfully switched to DAO Identity'
          }}
        />
      );
      
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      expect(screen.getByText('Successfully switched to DAO Identity')).toBeInTheDocument();
    });

    it('should apply success styling', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            success: true,
            message: 'Success!'
          }}
        />
      );
      
      const container = document.querySelector('.text-green-600');
      expect(container).toBeInTheDocument();
    });

    it('should show default success message when none provided', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            success: true
          }}
        />
      );
      
      expect(screen.getByText('Identity switched successfully')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render error icon and message', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            success: false,
            error: 'Failed to switch identity',
            message: 'Switch failed due to network error'
          }}
        />
      );
      
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      expect(screen.getByText('Switch failed due to network error')).toBeInTheDocument();
    });

    it('should apply error styling', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            success: false,
            error: 'Error occurred'
          }}
        />
      );
      
      const container = document.querySelector('.text-red-600');
      expect(container).toBeInTheDocument();
    });

    it('should show error message when provided', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            success: false,
            error: 'Network timeout'
          }}
        />
      );
      
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });

    it('should show default error message when none provided', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            success: false
          }}
        />
      );
      
      expect(screen.getByText('Failed to switch identity')).toBeInTheDocument();
    });
  });

  describe('Warning State', () => {
    it('should render warning icon and message', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            warning: 'Identity switch completed with warnings',
            message: 'Some modules may need manual refresh'
          }}
        />
      );
      
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
      expect(screen.getByText('Some modules may need manual refresh')).toBeInTheDocument();
    });

    it('should apply warning styling', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            warning: 'Warning message'
          }}
        />
      );
      
      const container = document.querySelector('.text-yellow-600');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply custom className', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{ isLoading: true }}
          className="custom-loading-class"
        />
      );
      
      const container = document.querySelector('.custom-loading-class');
      expect(container).toBeInTheDocument();
    });

    it('should render with compact mode', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{ isLoading: true }}
          compact={true}
        />
      );
      
      const container = document.querySelector('.p-2');
      expect(container).toBeInTheDocument();
    });

    it('should render with full mode by default', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{ isLoading: true }}
        />
      );
      
      const container = document.querySelector('.p-4');
      expect(container).toBeInTheDocument();
    });

    it('should center content properly', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{ isLoading: true }}
        />
      );
      
      const container = document.querySelector('.flex.items-center.justify-center');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for loading state', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true,
            message: 'Loading...'
          }}
        />
      );
      
      const container = document.querySelector('[role="status"]');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper ARIA attributes for progress bar', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true,
            progress: 60
          }}
        />
      );
      
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have proper ARIA attributes for success state', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            success: true,
            message: 'Success!'
          }}
        />
      );
      
      const container = document.querySelector('[role="status"]');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper ARIA attributes for error state', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            success: false,
            error: 'Error occurred'
          }}
        />
      );
      
      const container = document.querySelector('[role="alert"]');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-live', 'assertive');
    });

    it('should provide screen reader friendly text', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true,
            message: 'Switching identity...'
          }}
        />
      );
      
      const srText = document.querySelector('.sr-only');
      expect(srText).toBeInTheDocument();
      expect(srText).toHaveTextContent('Loading');
    });
  });

  describe('Animation and Transitions', () => {
    it('should apply fade-in animation', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{ isLoading: true }}
        />
      );
      
      const container = document.querySelector('.animate-fade-in');
      expect(container).toBeInTheDocument();
    });

    it('should apply pulse animation for loading state', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{ isLoading: true }}
        />
      );
      
      const pulseElement = document.querySelector('.animate-pulse');
      expect(pulseElement).toBeInTheDocument();
    });

    it('should not animate when not loading', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: false,
            success: true
          }}
        />
      );
      
      const spinner = screen.queryByTestId('loader-icon');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty loading state', () => {
      render(<IdentitySwitchLoading loadingState={{}} />);
      
      // Should render something meaningful even with empty state
      const container = document.querySelector('[role="status"]');
      expect(container).toBeInTheDocument();
    });

    it('should handle null message', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true,
            message: null as any
          }}
        />
      );
      
      expect(screen.getByText('Switching identity...')).toBeInTheDocument();
    });

    it('should handle undefined progress', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true,
            progress: undefined
          }}
        />
      );
      
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('should handle progress values outside 0-100 range', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true,
            progress: 150
          }}
        />
      );
      
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should handle negative progress values', () => {
      render(
        <IdentitySwitchLoading 
          loadingState={{
            isLoading: true,
            progress: -10
          }}
        />
      );
      
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(
        <IdentitySwitchLoading 
          loadingState={{ isLoading: true, message: 'Loading...' }}
        />
      );
      
      // Re-render with same props
      rerender(
        <IdentitySwitchLoading 
          loadingState={{ isLoading: true, message: 'Loading...' }}
        />
      );
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should update when loading state changes', () => {
      const { rerender } = render(
        <IdentitySwitchLoading 
          loadingState={{ isLoading: true, message: 'Loading...' }}
        />
      );
      
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      
      // Change to success state
      rerender(
        <IdentitySwitchLoading 
          loadingState={{ 
            isLoading: false, 
            success: true, 
            message: 'Success!' 
          }}
        />
      );
      
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });
  });
});