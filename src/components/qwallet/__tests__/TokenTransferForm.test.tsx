/**
 * TokenTransferForm Component Tests
 * 
 * Comprehensive unit tests for the token transfer form component
 * covering all identity types, validation, and transfer scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TokenTransferForm from '../TokenTransferForm';
import { useIdentityQwallet } from '../../../hooks/useIdentityQwallet';
import { useSquidContext } from '../../../contexts/SquidContext';
import { IdentityType } from '../../../types/identity';

// Mock dependencies
vi.mock('../../../hooks/useIdentityQwallet');
vi.mock('../../../contexts/SquidContext');

const mockUseIdentityQwallet = vi.mocked(useIdentityQwallet);
const mockUseSquidContext = vi.mocked(useSquidContext);

describe('TokenTransferForm', () => {
  const mockTransferTokens = vi.fn();
  
  const mockWalletData = {
    state: {
      balances: {
        QToken: 1000,
        PiToken: 500,
        ETH: 0.5
      },
      permissions: {
        canTransfer: true,
        canReceive: true,
        dailyLimit: 10000,
        monthlyLimit: 100000,
        allowedTokens: ['QToken', 'PiToken', 'ETH']
      },
      loading: false,
      error: null
    },
    actions: {
      transferTokens: mockTransferTokens,
      clearError: vi.fn()
    }
  };

  const mockSquidContext = {
    currentSquid: {
      did: 'did:squid:test123',
      identityType: IdentityType.ROOT,
      displayName: 'Test User',
      isActive: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSquidContext.mockReturnValue(mockSquidContext);
    mockUseIdentityQwallet.mockReturnValue(mockWalletData);
  });

  describe('Form Rendering', () => {
    it('should render transfer form with all fields', () => {
      render(<TokenTransferForm />);
      
      expect(screen.getByLabelText('Recipient Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Token')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Transfer' })).toBeInTheDocument();
    });

    it('should populate token dropdown with available tokens', () => {
      render(<TokenTransferForm />);
      
      const tokenSelect = screen.getByLabelText('Token');
      fireEvent.click(tokenSelect);
      
      expect(screen.getByText('QToken')).toBeInTheDocument();
      expect(screen.getByText('PiToken')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
    });

    it('should show balance information for selected token', () => {
      render(<TokenTransferForm />);
      
      const tokenSelect = screen.getByLabelText('Token');
      fireEvent.change(tokenSelect, { target: { value: 'QToken' } });
      
      expect(screen.getByText('Balance: 1,000 QToken')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate recipient address format', async () => {
      render(<TokenTransferForm />);
      
      const recipientInput = screen.getByLabelText('Recipient Address');
      const transferButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(recipientInput, { target: { value: 'invalid-address' } });
      fireEvent.click(transferButton);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid recipient address format')).toBeInTheDocument();
      });
    });

    it('should validate amount is positive', async () => {
      render(<TokenTransferForm />);
      
      const amountInput = screen.getByLabelText('Amount');
      const transferButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(amountInput, { target: { value: '-10' } });
      fireEvent.click(transferButton);
      
      await waitFor(() => {
        expect(screen.getByText('Amount must be positive')).toBeInTheDocument();
      });
    });

    it('should validate amount does not exceed balance', async () => {
      render(<TokenTransferForm />);
      
      const tokenSelect = screen.getByLabelText('Token');
      const amountInput = screen.getByLabelText('Amount');
      const transferButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(tokenSelect, { target: { value: 'QToken' } });
      fireEvent.change(amountInput, { target: { value: '2000' } });
      fireEvent.click(transferButton);
      
      await waitFor(() => {
        expect(screen.getByText('Amount exceeds available balance')).toBeInTheDocument();
      });
    });

    it('should validate daily limit is not exceeded', async () => {
      render(<TokenTransferForm />);
      
      const amountInput = screen.getByLabelText('Amount');
      const transferButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(amountInput, { target: { value: '15000' } });
      fireEvent.click(transferButton);
      
      await waitFor(() => {
        expect(screen.getByText('Amount exceeds daily limit')).toBeInTheDocument();
      });
    });
  });

  describe('Identity Type Restrictions', () => {
    it('should disable form for CONSENTIDA identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.CONSENTIDA
        }
      });

      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          permissions: {
            ...mockWalletData.state.permissions,
            canTransfer: false
          }
        }
      });

      render(<TokenTransferForm />);
      
      expect(screen.getByText('Transfers not allowed for this identity type')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Transfer' })).toBeDisabled();
    });

    it('should show governance warning for DAO identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.DAO
        }
      });

      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          permissions: {
            ...mockWalletData.state.permissions,
            requiresGovernance: true
          }
        }
      });

      render(<TokenTransferForm />);
      
      expect(screen.getByText('Large transfers may require governance approval')).toBeInTheDocument();
    });

    it('should restrict token options for AID identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.AID
        }
      });

      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          permissions: {
            ...mockWalletData.state.permissions,
            allowedTokens: ['QToken'],
            singleTokenOnly: true
          }
        }
      });

      render(<TokenTransferForm />);
      
      const tokenSelect = screen.getByLabelText('Token');
      fireEvent.click(tokenSelect);
      
      expect(screen.getByText('QToken')).toBeInTheDocument();
      expect(screen.queryByText('PiToken')).not.toBeInTheDocument();
      expect(screen.queryByText('ETH')).not.toBeInTheDocument();
    });
  });

  describe('Transfer Execution', () => {
    it('should execute successful transfer', async () => {
      mockTransferTokens.mockResolvedValue({
        success: true,
        data: { transactionId: 'tx-123' }
      });

      render(<TokenTransferForm />);
      
      const recipientInput = screen.getByLabelText('Recipient Address');
      const amountInput = screen.getByLabelText('Amount');
      const tokenSelect = screen.getByLabelText('Token');
      const transferButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(recipientInput, { target: { value: '0x1234567890123456789012345678901234567890' } });
      fireEvent.change(amountInput, { target: { value: '100' } });
      fireEvent.change(tokenSelect, { target: { value: 'QToken' } });
      fireEvent.click(transferButton);
      
      await waitFor(() => {
        expect(mockTransferTokens).toHaveBeenCalledWith({
          to: '0x1234567890123456789012345678901234567890',
          amount: 100,
          token: 'QToken'
        });
      });
      
      expect(screen.getByText('Transfer successful! Transaction ID: tx-123')).toBeInTheDocument();
    });

    it('should handle transfer failure', async () => {
      mockTransferTokens.mockResolvedValue({
        success: false,
        error: 'Insufficient funds'
      });

      render(<TokenTransferForm />);
      
      const recipientInput = screen.getByLabelText('Recipient Address');
      const amountInput = screen.getByLabelText('Amount');
      const transferButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(recipientInput, { target: { value: '0x1234567890123456789012345678901234567890' } });
      fireEvent.change(amountInput, { target: { value: '100' } });
      fireEvent.click(transferButton);
      
      await waitFor(() => {
        expect(screen.getByText('Transfer failed: Insufficient funds')).toBeInTheDocument();
      });
    });

    it('should show loading state during transfer', async () => {
      mockTransferTokens.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<TokenTransferForm />);
      
      const recipientInput = screen.getByLabelText('Recipient Address');
      const amountInput = screen.getByLabelText('Amount');
      const transferButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(recipientInput, { target: { value: '0x1234567890123456789012345678901234567890' } });
      fireEvent.change(amountInput, { target: { value: '100' } });
      fireEvent.click(transferButton);
      
      expect(screen.getByText('Processing transfer...')).toBeInTheDocument();
      expect(transferButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<TokenTransferForm />);
      
      expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Token Transfer Form');
      expect(screen.getByLabelText('Recipient Address')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('Amount')).toHaveAttribute('aria-required', 'true');
    });

    it('should support keyboard navigation', () => {
      render(<TokenTransferForm />);
      
      const recipientInput = screen.getByLabelText('Recipient Address');
      const amountInput = screen.getByLabelText('Amount');
      const tokenSelect = screen.getByLabelText('Token');
      const transferButton = screen.getByRole('button', { name: 'Transfer' });
      
      recipientInput.focus();
      expect(recipientInput).toHaveFocus();
      
      fireEvent.keyDown(recipientInput, { key: 'Tab' });
      expect(amountInput).toHaveFocus();
      
      fireEvent.keyDown(amountInput, { key: 'Tab' });
      expect(tokenSelect).toHaveFocus();
      
      fireEvent.keyDown(tokenSelect, { key: 'Tab' });
      expect(transferButton).toHaveFocus();
    });
  });

  describe('Form Reset', () => {
    it('should reset form after successful transfer', async () => {
      mockTransferTokens.mockResolvedValue({
        success: true,
        data: { transactionId: 'tx-123' }
      });

      render(<TokenTransferForm />);
      
      const recipientInput = screen.getByLabelText('Recipient Address');
      const amountInput = screen.getByLabelText('Amount');
      const transferButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(recipientInput, { target: { value: '0x1234567890123456789012345678901234567890' } });
      fireEvent.change(amountInput, { target: { value: '100' } });
      fireEvent.click(transferButton);
      
      await waitFor(() => {
        expect(recipientInput.value).toBe('');
        expect(amountInput.value).toBe('');
      });
    });

    it('should provide manual reset option', () => {
      render(<TokenTransferForm />);
      
      const recipientInput = screen.getByLabelText('Recipient Address');
      const amountInput = screen.getByLabelText('Amount');
      const resetButton = screen.getByRole('button', { name: 'Reset' });
      
      fireEvent.change(recipientInput, { target: { value: '0x1234567890123456789012345678901234567890' } });
      fireEvent.change(amountInput, { target: { value: '100' } });
      fireEvent.click(resetButton);
      
      expect(recipientInput.value).toBe('');
      expect(amountInput.value).toBe('');
    });
  });
});