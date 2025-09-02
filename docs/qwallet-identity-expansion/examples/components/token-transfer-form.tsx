/**
 * Token Transfer Form Example
 * 
 * This example demonstrates how to create a comprehensive token transfer form
 * with identity-aware validation, real-time feedback, and error handling.
 */

import React, { useState, useEffect } from 'react';
import { useIdentityQwallet } from '@/hooks/useIdentityQwallet';
import { useIdentityManager } from '@/hooks/useIdentityManager';

interface TransferFormData {
  recipient: string;
  amount: number;
  token: string;
  memo?: string;
}

interface TransferValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresApproval: boolean;
  estimatedFees: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function TokenTransferForm() {
  const { activeIdentity } = useIdentityManager();
  const { 
    balances, 
    limits, 
    transfer, 
    validateTransfer,
    getSupportedTokens 
  } = useIdentityQwallet(activeIdentity.id);

  const [formData, setFormData] = useState<TransferFormData>({
    recipient: '',
    amount: 0,
    token: '',
    memo: ''
  });

  const [validation, setValidation] = useState<TransferValidation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);

  // Load supported tokens on mount
  useEffect(() => {
    const loadTokens = async () => {
      const tokens = await getSupportedTokens();
      setSupportedTokens(tokens.map(t => t.symbol));
      if (tokens.length > 0 && !formData.token) {
        setFormData(prev => ({ ...prev, token: tokens[0].symbol }));
      }
    };
    loadTokens();
  }, [activeIdentity.id]);

  // Real-time validation
  useEffect(() => {
    const validateForm = async () => {
      if (formData.recipient && formData.amount > 0 && formData.token) {
        try {
          const result = await validateTransfer(formData);
          setValidation(result);
        } catch (error) {
          console.error('Validation error:', error);
        }
      } else {
        setValidation(null);
      }
    };

    const debounceTimer = setTimeout(validateForm, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData]);

  const handleInputChange = (field: keyof TransferFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitResult(null); // Clear previous results
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation?.isValid) {
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const result = await transfer(formData);
      setSubmitResult(result);
      
      if (result.success) {
        // Reset form on success
        setFormData({
          recipient: '',
          amount: 0,
          token: formData.token, // Keep token selected
          memo: ''
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        error: error.message || 'Transfer failed'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMaxAmount = () => {
    const tokenBalance = balances[formData.token] || 0;
    const dailyRemaining = limits.dailyTransferLimit - (limits.dailyUsed || 0);
    return Math.min(tokenBalance, dailyRemaining, limits.maxTransactionAmount);
  };

  const setMaxAmount = () => {
    const maxAmount = getMaxAmount();
    handleInputChange('amount', maxAmount);
  };

  return (
    <div className="token-transfer-form">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Token Selection */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token
          </label>
          <select
            value={formData.token}
            onChange={(e) => handleInputChange('token', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a token</option>
            {supportedTokens.map(token => (
              <option key={token} value={token}>
                {token} (Balance: {balances[token]?.toLocaleString() || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Recipient Address */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={formData.recipient}
            onChange={(e) => handleInputChange('recipient', e.target.value)}
            placeholder="Enter recipient address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {validation?.errors.some(e => e.includes('recipient')) && (
            <p className="mt-1 text-sm text-red-600">
              Invalid recipient address
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={setMaxAmount}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              MAX
            </button>
          </div>
          
          {/* Amount Info */}
          <div className="mt-1 text-sm text-gray-500">
            Available: {balances[formData.token]?.toLocaleString() || 0} {formData.token}
            <br />
            Max per transaction: {limits.maxTransactionAmount.toLocaleString()}
          </div>
        </div>

        {/* Memo (optional) */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Memo (Optional)
          </label>
          <input
            type="text"
            value={formData.memo}
            onChange={(e) => handleInputChange('memo', e.target.value)}
            placeholder="Add a note for this transaction"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={100}
          />
        </div>

        {/* Validation Feedback */}
        {validation && (
          <div className="validation-feedback">
            {/* Errors */}
            {validation.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                <h4 className="text-sm font-medium text-red-800">Errors:</h4>
                <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                <h4 className="text-sm font-medium text-yellow-800">Warnings:</h4>
                <ul className="mt-1 text-sm text-yellow-600 list-disc list-inside">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Level */}
            <div className={`risk-indicator p-3 rounded-md mb-3 ${
              validation.riskLevel === 'LOW' ? 'bg-green-50 border border-green-200' :
              validation.riskLevel === 'MEDIUM' ? 'bg-yellow-50 border border-yellow-200' :
              validation.riskLevel === 'HIGH' ? 'bg-orange-50 border border-orange-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                <span className={`text-sm font-medium ${
                  validation.riskLevel === 'LOW' ? 'text-green-800' :
                  validation.riskLevel === 'MEDIUM' ? 'text-yellow-800' :
                  validation.riskLevel === 'HIGH' ? 'text-orange-800' :
                  'text-red-800'
                }`}>
                  Risk Level: {validation.riskLevel}
                </span>
              </div>
            </div>

            {/* Approval Required */}
            {validation.requiresApproval && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                <p className="text-sm text-blue-800">
                  ⚠️ This transaction requires additional approval
                  {activeIdentity.type === 'CONSENTIDA' && ' from your guardian'}
                  {activeIdentity.type === 'DAO' && ' from DAO governance'}
                  {activeIdentity.type === 'ENTERPRISE' && ' from authorized signers'}
                </p>
              </div>
            )}

            {/* Estimated Fees */}
            {validation.estimatedFees > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3">
                <p className="text-sm text-gray-700">
                  Estimated fees: {validation.estimatedFees.toLocaleString()} {formData.token}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Submit Result */}
        {submitResult && (
          <div className={`submit-result p-3 rounded-md ${
            submitResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              submitResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {submitResult.success 
                ? '✅ Transfer successful!' 
                : '❌ Transfer failed'
              }
            </p>
            {submitResult.transactionId && (
              <p className="text-sm text-green-600 mt-1">
                Transaction ID: {submitResult.transactionId}
              </p>
            )}
            {submitResult.error && (
              <p className="text-sm text-red-600 mt-1">
                Error: {submitResult.error}
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!validation?.isValid || isSubmitting}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            validation?.isValid && !isSubmitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : validation?.requiresApproval ? (
            'Submit for Approval'
          ) : (
            'Send Tokens'
          )}
        </button>
      </form>

      {/* Identity-Specific Help */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-800 mb-2">
          {activeIdentity.type} Identity Guidelines
        </h4>
        <div className="text-sm text-gray-600">
          {activeIdentity.type === 'ROOT' && (
            <p>As ROOT, you have unlimited transfer capabilities. Use responsibly.</p>
          )}
          {activeIdentity.type === 'DAO' && (
            <p>Large transfers may require DAO governance approval. Check your DAO's policies.</p>
          )}
          {activeIdentity.type === 'ENTERPRISE' && (
            <p>All transfers are logged for compliance. Ensure proper authorization.</p>
          )}
          {activeIdentity.type === 'CONSENTIDA' && (
            <p>Your guardian will be notified of all transactions for approval.</p>
          )}
          {activeIdentity.type === 'AID' && (
            <p>Anonymous transfers have lower limits and enhanced privacy protection.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Simplified version for basic use cases
export function SimpleTransferForm({ 
  identityId, 
  onTransferComplete 
}: { 
  identityId: string;
  onTransferComplete?: (result: any) => void;
}) {
  const { transfer, balances } = useIdentityQwallet(identityId);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('ANARQ');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await transfer({
        recipient,
        amount: parseFloat(amount),
        token
      });
      
      if (result.success) {
        setRecipient('');
        setAmount('');
        onTransferComplete?.(result);
      }
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="simple-transfer-form space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">To:</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient address"
          className="w-full px-3 py-2 border rounded-md"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Amount:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full px-3 py-2 border rounded-md"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Token:</label>
        <select
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          {Object.keys(balances).map(tokenSymbol => (
            <option key={tokenSymbol} value={tokenSymbol}>
              {tokenSymbol}
            </option>
          ))}
        </select>
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isSubmitting ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}