/**
 * useIdentityQwallet Hook Example
 * 
 * This example demonstrates how to use the core identity wallet hook
 * for building wallet applications.
 */

import React, { useState, useEffect } from 'react';
import { useIdentityQwallet } from '@/hooks/useIdentityQwallet';
import { useIdentityManager } from '@/hooks/useIdentityManager';

// Basic usage example
export function BasicWalletHookExample() {
  const { activeIdentity } = useIdentityManager();
  const {
    // State
    balances,
    limits,
    recentTransactions,
    riskStatus,
    loading,
    error,
    
    // Actions
    transfer,
    refreshData,
    validateTransfer
  } = useIdentityQwallet(activeIdentity.id);

  if (loading) return <div>Loading wallet data...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="wallet-hook-example">
      <h2>Wallet Data from Hook</h2>
      
      {/* Display balances */}
      <div className="balances">
        <h3>Balances</h3>
        {Object.entries(balances).map(([token, amount]) => (
          <div key={token}>
            {token}: {amount.toLocaleString()}
          </div>
        ))}
      </div>
      
      {/* Display limits */}
      <div className="limits">
        <h3>Limits</h3>
        <p>Daily: {limits.dailyTransferLimit.toLocaleString()}</p>
        <p>Max Transaction: {limits.maxTransactionAmount.toLocaleString()}</p>
      </div>
      
      {/* Display risk status */}
      <div className="risk-status">
        <h3>Risk Status: {riskStatus.overallRisk}</h3>
      </div>
      
      <button onClick={refreshData}>Refresh Data</button>
    </div>
  );
}

// Advanced usage with transfer functionality
export function TransferHookExample() {
  const { activeIdentity } = useIdentityManager();
  const { transfer, validateTransfer, balances } = useIdentityQwallet(activeIdentity.id);
  
  const [transferData, setTransferData] = useState({
    to: '',
    amount: 0,
    token: 'ANARQ'
  });
  const [validation, setValidation] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Real-time validation
  useEffect(() => {
    const validate = async () => {
      if (transferData.to && transferData.amount > 0) {
        try {
          const result = await validateTransfer(transferData);
          setValidation(result);
        } catch (error) {
          console.error('Validation error:', error);
        }
      }
    };
    
    const debounceTimer = setTimeout(validate, 500);
    return () => clearTimeout(debounceTimer);
  }, [transferData, validateTransfer]);

  const handleTransfer = async () => {
    if (!validation?.isValid) return;
    
    setIsTransferring(true);
    try {
      const result = await transfer(transferData);
      console.log('Transfer result:', result);
      
      if (result.success) {
        setTransferData({ to: '', amount: 0, token: 'ANARQ' });
      }
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="transfer-hook-example">
      <h2>Transfer with Hook</h2>
      
      <div className="transfer-form">
        <input
          type="text"
          placeholder="Recipient address"
          value={transferData.to}
          onChange={(e) => setTransferData(prev => ({ ...prev, to: e.target.value }))}
        />
        
        <input
          type="number"
          placeholder="Amount"
          value={transferData.amount}
          onChange={(e) => setTransferData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
        />
        
        <select
          value={transferData.token}
          onChange={(e) => setTransferData(prev => ({ ...prev, token: e.target.value }))}
        >
          {Object.keys(balances).map(token => (
            <option key={token} value={token}>{token}</option>
          ))}
        </select>
        
        {validation && (
          <div className={`validation ${validation.isValid ? 'valid' : 'invalid'}`}>
            {validation.isValid ? '✓ Valid' : '✗ Invalid'}
            {validation.errors.map((error, i) => (
              <div key={i} className="error">{error}</div>
            ))}
          </div>
        )}
        
        <button
          onClick={handleTransfer}
          disabled={!validation?.isValid || isTransferring}
        >
          {isTransferring ? 'Transferring...' : 'Transfer'}
        </button>
      </div>
    </div>
  );
}

// Hook with error handling
export function ErrorHandlingHookExample() {
  const { activeIdentity } = useIdentityManager();
  const { 
    balances, 
    error, 
    retry, 
    loading 
  } = useIdentityQwallet(activeIdentity.id, {
    // Hook options
    autoRefresh: true,
    refreshInterval: 30000,
    retryOnError: true,
    maxRetries: 3
  });

  const handleRetry = async () => {
    try {
      await retry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <h3>Wallet Error</h3>
        <p>{error.message}</p>
        <div className="error-actions">
          <button onClick={handleRetry}>Retry</button>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
        {error.suggestedActions && (
          <div className="suggested-actions">
            <h4>Suggested Actions:</h4>
            <ul>
              {error.suggestedActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="wallet-data">
      <h2>Wallet loaded successfully</h2>
      {Object.entries(balances).map(([token, amount]) => (
        <div key={token}>{token}: {amount}</div>
      ))}
    </div>
  );
}

// Hook with custom configuration
export function ConfiguredHookExample() {
  const { activeIdentity } = useIdentityManager();
  const walletConfig = {
    cacheTimeout: 60000, // 1 minute cache
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    errorRetryDelay: 2000,
    maxRetries: 5
  };
  
  const wallet = useIdentityQwallet(activeIdentity.id, walletConfig);

  return (
    <div className="configured-wallet">
      <h2>Configured Wallet Hook</h2>
      <pre>{JSON.stringify(wallet, null, 2)}</pre>
    </div>
  );
}