/**
 * Pi Wallet Interface Component
 * Provides a comprehensive interface for Pi Wallet operations including
 * connection status, balance display, transfer controls, and error handling
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, 
  RefreshCw, 
  Send, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Info,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { piWalletService } from '@/services/identity/PiWalletService';
import { 
  PiWalletStatus, 
  PiWalletBalance, 
  TransferResult,
  PiWalletError 
} from '@/types/wallet-config';

interface PiWalletInterfaceProps {
  identityId?: string;
  showBalance?: boolean;
  allowTransfers?: boolean;
  onConnectionChange?: (connected: boolean) => void;
  onTransferComplete?: (result: TransferResult) => void;
  onError?: (error: PiWalletError) => void;
  className?: string;
}

interface TransferFormData {
  amount: string;
  direction: 'TO_PI' | 'FROM_PI';
  memo: string;
}

export const PiWalletInterface: React.FC<PiWalletInterfaceProps> = ({
  identityId: propIdentityId,
  showBalance = true,
  allowTransfers = true,
  onConnectionChange,
  onTransferComplete,
  onError,
  className = ''
}) => {
  const { activeIdentity } = useActiveIdentity();
  const identityId = propIdentityId || activeIdentity?.id || '';

  // State management
  const [piWalletStatus, setPiWalletStatus] = useState<PiWalletStatus | null>(null);
  const [piWalletBalance, setPiWalletBalance] = useState<PiWalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [lastError, setLastError] = useState<PiWalletError | null>(null);
  const [showBalanceVisible, setShowBalanceVisible] = useState(true);
  const [transferForm, setTransferForm] = useState<TransferFormData>({
    amount: '',
    direction: 'TO_PI',
    memo: ''
  });

  // Load Pi Wallet status and balance
  const loadPiWalletData = useCallback(async () => {
    if (!identityId) return;

    setIsLoading(true);
    try {
      const [status, balance, error] = await Promise.all([
        piWalletService.getPiWalletStatus(identityId),
        showBalance ? piWalletService.getPiWalletBalance(identityId) : null,
        piWalletService.getLastError(identityId)
      ]);

      setPiWalletStatus(status);
      setPiWalletBalance(balance);
      setLastError(error);

      // Notify connection change
      if (onConnectionChange && status) {
        onConnectionChange(status.connected);
      }
    } catch (error) {
      console.error('[PiWalletInterface] Error loading Pi Wallet data:', error);
      const piError: PiWalletError = {
        code: 'LOAD_ERROR',
        message: 'Failed to load Pi Wallet data',
        timestamp: new Date().toISOString(),
        recoverable: true,
        details: error
      };
      setLastError(piError);
      if (onError) onError(piError);
    } finally {
      setIsLoading(false);
    }
  }, [identityId, showBalance, onConnectionChange, onError]);

  // Connect to Pi Wallet
  const handleConnect = async () => {
    if (!identityId) {
      toast({
        title: "Identity Required",
        description: "Please select an identity to connect Pi Wallet",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Check if Pi Wallet is available
      if (!window.Pi) {
        throw new Error('Pi Browser not detected. Please open this in Pi Browser.');
      }

      // Authenticate with Pi Network
      const authResult = await window.Pi.authenticate();
      
      const credentials = {
        piUserId: authResult.user.uid,
        accessToken: 'mock_access_token', // In real implementation, get from Pi SDK
        refreshToken: 'mock_refresh_token'
      };

      const connection = await piWalletService.connectPiWallet(identityId, credentials);
      
      if (connection.status === 'CONNECTED') {
        toast({
          title: "Pi Wallet Connected",
          description: `Successfully connected to Pi Wallet for ${authResult.user.username}`,
        });
        
        await loadPiWalletData();
      } else {
        throw new Error('Failed to establish Pi Wallet connection');
      }
    } catch (error) {
      console.error('[PiWalletInterface] Connection error:', error);
      const piError: PiWalletError = {
        code: 'CONNECTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to connect to Pi Wallet',
        timestamp: new Date().toISOString(),
        recoverable: true
      };
      setLastError(piError);
      if (onError) onError(piError);
      
      toast({
        title: "Connection Failed",
        description: piError.message,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from Pi Wallet
  const handleDisconnect = async () => {
    if (!identityId) return;

    try {
      const success = await piWalletService.disconnectPiWallet(identityId);
      
      if (success) {
        setPiWalletStatus(null);
        setPiWalletBalance(null);
        setLastError(null);
        
        if (onConnectionChange) {
          onConnectionChange(false);
        }
        
        toast({
          title: "Pi Wallet Disconnected",
          description: "Successfully disconnected from Pi Wallet",
        });
      }
    } catch (error) {
      console.error('[PiWalletInterface] Disconnect error:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect from Pi Wallet",
        variant: "destructive"
      });
    }
  };

  // Refresh connection and data
  const handleRefresh = async () => {
    if (!identityId) return;

    setIsLoading(true);
    try {
      await piWalletService.refreshConnection(identityId);
      await loadPiWalletData();
      
      toast({
        title: "Data Refreshed",
        description: "Pi Wallet data has been updated",
      });
    } catch (error) {
      console.error('[PiWalletInterface] Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh Pi Wallet data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle transfer
  const handleTransfer = async () => {
    if (!identityId || !transferForm.amount) return;

    const amount = parseFloat(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid transfer amount",
        variant: "destructive"
      });
      return;
    }

    setIsTransferring(true);
    try {
      let result: TransferResult;
      
      if (transferForm.direction === 'TO_PI') {
        result = await piWalletService.transferToPiWallet(identityId, amount, 'PI');
      } else {
        result = await piWalletService.transferFromPiWallet(identityId, amount, 'PI');
      }

      if (result.success) {
        toast({
          title: "Transfer Successful",
          description: `Successfully transferred ${amount} PI ${transferForm.direction === 'TO_PI' ? 'to' : 'from'} Pi Wallet`,
        });
        
        // Reset form
        setTransferForm({ amount: '', direction: 'TO_PI', memo: '' });
        
        // Refresh data
        await loadPiWalletData();
        
        if (onTransferComplete) {
          onTransferComplete(result);
        }
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (error) {
      console.error('[PiWalletInterface] Transfer error:', error);
      const piError: PiWalletError = {
        code: 'TRANSFER_ERROR',
        message: error instanceof Error ? error.message : 'Transfer failed',
        timestamp: new Date().toISOString(),
        recoverable: true
      };
      setLastError(piError);
      if (onError) onError(piError);
      
      toast({
        title: "Transfer Failed",
        description: piError.message,
        variant: "destructive"
      });
    } finally {
      setIsTransferring(false);
    }
  };

  // Clear errors
  const handleClearErrors = async () => {
    if (!identityId) return;
    
    try {
      await piWalletService.clearErrors(identityId);
      setLastError(null);
      
      toast({
        title: "Errors Cleared",
        description: "Pi Wallet errors have been cleared",
      });
    } catch (error) {
      console.error('[PiWalletInterface] Clear errors failed:', error);
    }
  };

  // Load data on component mount and identity change
  useEffect(() => {
    if (identityId) {
      loadPiWalletData();
    }
  }, [identityId, loadPiWalletData]);

  // Auto-refresh every 30 seconds if connected
  useEffect(() => {
    if (piWalletStatus?.connected) {
      const interval = setInterval(loadPiWalletData, 30000);
      return () => clearInterval(interval);
    }
  }, [piWalletStatus?.connected, loadPiWalletData]);

  // Render connection status badge
  const renderStatusBadge = () => {
    if (!piWalletStatus) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }

    switch (piWalletStatus.status) {
      case 'CONNECTED':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'DISCONNECTED':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Disconnected</Badge>;
      case 'ERROR':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'EXPIRED':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (!identityId) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Please select an identity to use Pi Wallet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Pi Wallet Interface
          </CardTitle>
          <div className="flex items-center gap-2">
            {renderStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {lastError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{lastError.message}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearErrors}
              >
                Clear
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Section */}
        {!piWalletStatus?.connected ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Connect Your Pi Wallet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Pi Wallet to enable transfers and view your balance
              </p>
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Pi Wallet
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Balance Section */}
            {showBalance && piWalletBalance && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Pi Wallet Balance</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBalanceVisible(!showBalanceVisible)}
                    aria-label="Toggle balance visibility"
                  >
                    {showBalanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {showBalanceVisible ? piWalletBalance.available.toFixed(2) : '••••'}
                    </div>
                    <div className="text-sm text-muted-foreground">Available</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {showBalanceVisible ? piWalletBalance.locked.toFixed(2) : '••••'}
                    </div>
                    <div className="text-sm text-muted-foreground">Locked</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {showBalanceVisible ? piWalletBalance.total.toFixed(2) : '••••'}
                    </div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground text-center">
                  Last updated: {new Date(piWalletBalance.lastUpdated).toLocaleString()}
                </div>
              </div>
            )}

            {/* Transfer Section */}
            {allowTransfers && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold">Transfer Funds</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={transferForm.direction === 'TO_PI' ? 'default' : 'outline'}
                        onClick={() => setTransferForm(prev => ({ ...prev, direction: 'TO_PI' }))}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        To Pi Wallet
                      </Button>
                      <Button
                        variant={transferForm.direction === 'FROM_PI' ? 'default' : 'outline'}
                        onClick={() => setTransferForm(prev => ({ ...prev, direction: 'FROM_PI' }))}
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        From Pi Wallet
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (PI)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={transferForm.amount}
                        onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="memo">Memo (Optional)</Label>
                      <Input
                        id="memo"
                        placeholder="Transfer memo..."
                        value={transferForm.memo}
                        onChange={(e) => setTransferForm(prev => ({ ...prev, memo: e.target.value }))}
                        maxLength={100}
                      />
                    </div>

                    <Button
                      onClick={handleTransfer}
                      disabled={isTransferring || !transferForm.amount}
                      className="w-full"
                    >
                      {isTransferring ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {transferForm.direction === 'TO_PI' ? (
                            <Send className="w-4 h-4 mr-2" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Transfer {transferForm.amount || '0'} PI
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Connection Info */}
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Connection Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </div>
              
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span>{piWalletStatus.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connected:</span>
                  <span>{new Date(piWalletStatus.connectedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Activity:</span>
                  <span>{new Date(piWalletStatus.lastActivity).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Info Section */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Pi Wallet Integration</p>
              <p>
                Connect your Pi Wallet to transfer PI tokens between your identity wallet 
                and Pi Network. All transfers are validated and logged for security.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PiWalletInterface;