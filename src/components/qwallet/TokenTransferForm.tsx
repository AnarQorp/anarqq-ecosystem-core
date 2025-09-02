/**
 * Enhanced Token Transfer Form Component
 * Identity-based validation, real-time risk assessment, Qlock integration,
 * approval workflow, and multi-chain transfer support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Send, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Shield, 
  Zap,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';

import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';
import { 
  TokenBalance, 
  WalletPermissions, 
  TransferResult,
  RiskAssessment 
} from '../../types/wallet-config';

// Transfer form interfaces
export interface TokenTransferFormProps {
  identity: ExtendedSquidIdentity;
  availableTokens: TokenBalance[];
  permissions: WalletPermissions;
  onTransfer: (transferData: TransferFormData) => Promise<TransferResult>;
  onCancel?: () => void;
  prefilledData?: Partial<TransferFormData>;
}

export interface TransferFormData {
  recipient: string;
  amount: number;
  token: string;
  memo?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresApproval?: boolean;
  approvalReason?: string;
}

export interface TransferValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskAssessment: RiskAssessment;
  estimatedFees: number;
  estimatedTime: number; // minutes
  requiresQlockSigning: boolean;
  requiresApproval: boolean;
  approvalThreshold?: number;
}

export interface QlockSigningStatus {
  required: boolean;
  status: 'PENDING' | 'SIGNING' | 'SIGNED' | 'FAILED';
  signature?: string;
  error?: string;
}

// Real-time validation hook
const useTransferValidation = (
  formData: Partial<TransferFormData>,
  identity: ExtendedSquidIdentity,
  permissions: WalletPermissions,
  availableTokens: TokenBalance[]
) => {
  const [validation, setValidation] = useState<TransferValidationResult>({
    isValid: false,
    errors: [],
    warnings: [],
    riskAssessment: {
      identityId: identity.did,
      overallRisk: 'LOW',
      riskFactors: [],
      recommendations: [],
      lastAssessment: new Date().toISOString(),
      nextAssessment: new Date().toISOString(),
      autoActions: []
    },
    estimatedFees: 0,
    estimatedTime: 0,
    requiresQlockSigning: false,
    requiresApproval: false
  });

  const [isValidating, setIsValidating] = useState(false);

  const validateTransfer = useCallback(async () => {
    if (!formData.recipient || !formData.amount || !formData.token) {
      setValidation(prev => ({ ...prev, isValid: false, errors: ['Missing required fields'] }));
      return;
    }

    setIsValidating(true);
    
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Basic validation
      if (!formData.recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
        errors.push('Invalid recipient address format');
      }
      
      if (formData.amount <= 0) {
        errors.push('Amount must be greater than 0');
      }
      
      // Token availability check
      const selectedToken = availableTokens.find(t => t.token === formData.token);
      if (!selectedToken) {
        errors.push('Selected token not available');
      } else {
        const tokenBalance = selectedToken.balance / Math.pow(10, selectedToken.decimals);
        if (formData.amount > tokenBalance) {
          errors.push(`Insufficient balance. Available: ${tokenBalance.toFixed(4)} ${selectedToken.symbol}`);
        }
      }
      
      // Permission checks
      if (!permissions.canTransfer) {
        errors.push('Transfer permission denied for this identity');
      }
      
      if (formData.amount > permissions.maxTransactionAmount) {
        errors.push(`Amount exceeds maximum transaction limit of ${permissions.maxTransactionAmount}`);
      }
      
      if (!permissions.allowedTokens.includes(formData.token)) {
        errors.push('Token not allowed for this identity');
      }
      
      // Risk assessment
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      const riskFactors = [];
      
      if (formData.amount > 1000) {
        riskLevel = 'MEDIUM';
        riskFactors.push({
          type: 'AMOUNT' as const,
          severity: 'MEDIUM' as const,
          description: 'Large transaction amount',
          value: formData.amount,
          threshold: 1000,
          firstDetected: new Date().toISOString(),
          lastDetected: new Date().toISOString()
        });
      }
      
      if (formData.amount > 10000) {
        riskLevel = 'HIGH';
        warnings.push('High-value transaction detected');
      }
      
      if (formData.amount > 50000) {
        riskLevel = 'CRITICAL';
        warnings.push('Critical-value transaction requires additional approval');
      }
      
      // Identity-specific risk adjustments
      if (identity.type === IdentityType.AID && formData.amount > 100) {
        riskLevel = 'HIGH';
        warnings.push('AID identity with large transaction amount');
      }
      
      // Calculate fees and time estimates
      const estimatedFees = formData.amount * 0.001; // 0.1% fee
      const estimatedTime = riskLevel === 'LOW' ? 2 : riskLevel === 'MEDIUM' ? 5 : 10;
      
      // Determine if Qlock signing is required
      const requiresQlockSigning = formData.amount > 100 || riskLevel !== 'LOW';
      
      // Determine if approval is required
      const requiresApproval = formData.amount > (permissions.approvalThreshold || 1000) || 
                              riskLevel === 'HIGH' || 
                              riskLevel === 'CRITICAL';
      
      const riskAssessment: RiskAssessment = {
        identityId: identity.did,
        overallRisk: riskLevel,
        riskFactors,
        recommendations: riskLevel !== 'LOW' ? ['Consider reducing transaction amount', 'Verify recipient address'] : [],
        lastAssessment: new Date().toISOString(),
        nextAssessment: new Date().toISOString(),
        autoActions: []
      };
      
      setValidation({
        isValid: errors.length === 0,
        errors,
        warnings,
        riskAssessment,
        estimatedFees,
        estimatedTime,
        requiresQlockSigning,
        requiresApproval,
        approvalThreshold: permissions.approvalThreshold
      });
      
    } catch (error) {
      setValidation(prev => ({
        ...prev,
        isValid: false,
        errors: ['Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')]
      }));
    } finally {
      setIsValidating(false);
    }
  }, [formData, identity, permissions, availableTokens]);

  useEffect(() => {
    const timeoutId = setTimeout(validateTransfer, 300); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [validateTransfer]);

  return { validation, isValidating, revalidate: validateTransfer };
};

// Qlock signing hook
const useQlockSigning = () => {
  const [signingStatus, setSigningStatus] = useState<QlockSigningStatus>({
    required: false,
    status: 'PENDING'
  });

  const requestSigning = useCallback(async (transferData: TransferFormData) => {
    setSigningStatus({
      required: true,
      status: 'SIGNING'
    });

    try {
      // Mock Qlock signing process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockSignature = `0x${Math.random().toString(16).substring(2, 66)}`;
      
      setSigningStatus({
        required: true,
        status: 'SIGNED',
        signature: mockSignature
      });
      
      return mockSignature;
    } catch (error) {
      setSigningStatus({
        required: true,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Signing failed'
      });
      throw error;
    }
  }, []);

  const resetSigning = useCallback(() => {
    setSigningStatus({
      required: false,
      status: 'PENDING'
    });
  }, []);

  return { signingStatus, requestSigning, resetSigning };
};

// Risk indicator component
const RiskIndicator: React.FC<{ riskAssessment: RiskAssessment }> = ({ riskAssessment }) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-orange-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskPercentage = (risk: string) => {
    switch (risk) {
      case 'LOW': return 25;
      case 'MEDIUM': return 50;
      case 'HIGH': return 75;
      case 'CRITICAL': return 100;
      default: return 0;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Risk Level</span>
        <Badge className={getRiskColor(riskAssessment.overallRisk)}>
          {riskAssessment.overallRisk}
        </Badge>
      </div>
      <Progress 
        value={getRiskPercentage(riskAssessment.overallRisk)} 
        className="h-2"
      />
      {riskAssessment.recommendations.length > 0 && (
        <div className="text-xs text-gray-600">
          {riskAssessment.recommendations[0]}
        </div>
      )}
    </div>
  );
};

// Approval workflow component
const ApprovalWorkflow: React.FC<{
  required: boolean;
  amount: number;
  threshold?: number;
  onApprovalRequest: () => void;
}> = ({ required, amount, threshold, onApprovalRequest }) => {
  if (!required) return null;

  return (
    <Alert>
      <Shield className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium">Approval Required</p>
          <p className="text-sm">
            This transaction exceeds the approval threshold of {threshold} and requires additional authorization.
          </p>
          <Button size="sm" onClick={onApprovalRequest}>
            Request Approval
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

// Main component
export const TokenTransferForm: React.FC<TokenTransferFormProps> = ({
  identity,
  availableTokens,
  permissions,
  onTransfer,
  onCancel,
  prefilledData
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TransferFormData>({
    defaultValues: {
      recipient: prefilledData?.recipient || '',
      amount: prefilledData?.amount || 0,
      token: prefilledData?.token || (availableTokens[0]?.token || ''),
      memo: prefilledData?.memo || '',
      priority: prefilledData?.priority || 'MEDIUM'
    }
  });

  const formData = watch();
  const { validation, isValidating } = useTransferValidation(formData, identity, permissions, availableTokens);
  const { signingStatus, requestSigning, resetSigning } = useQlockSigning();

  const selectedToken = availableTokens.find(t => t.token === formData.token);

  const handleTransferSubmit = async (data: TransferFormData) => {
    try {
      setIsSubmitting(true);
      
      // Request Qlock signing if required
      if (validation.requiresQlockSigning) {
        await requestSigning(data);
      }
      
      // Add approval requirement to transfer data
      const transferData: TransferFormData = {
        ...data,
        requiresApproval: validation.requiresApproval,
        approvalReason: validation.requiresApproval ? 
          `Amount ${data.amount} exceeds threshold ${validation.approvalThreshold}` : undefined
      };
      
      const result = await onTransfer(transferData);
      setTransferResult(result);
      
      if (result.success) {
        // Reset form on success
        setValue('recipient', '');
        setValue('amount', 0);
        setValue('memo', '');
        resetSigning();
      }
      
    } catch (error) {
      console.error('Transfer failed:', error);
      setTransferResult({
        success: false,
        amount: data.amount,
        token: data.token,
        fromAddress: identity.did,
        toAddress: data.recipient,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Transfer failed'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBalance = (balance: number, decimals: number) => {
    return (balance / Math.pow(10, decimals)).toFixed(4);
  };

  const setMaxAmount = () => {
    if (selectedToken) {
      const maxAmount = selectedToken.balance / Math.pow(10, selectedToken.decimals);
      setValue('amount', Math.min(maxAmount, permissions.maxTransactionAmount));
    }
  };

  return (
    <Card className="token-transfer-form">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Send className="h-5 w-5" />
          <span>Send Tokens</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleTransferSubmit)} className="space-y-6">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label htmlFor="token">Token</Label>
            <Select value={formData.token} onValueChange={(value) => setValue('token', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                {availableTokens.map((token) => (
                  <SelectItem key={token.token} value={token.token}>
                    <div className="flex items-center justify-between w-full">
                      <span>{token.symbol}</span>
                      <span className="text-sm text-gray-500">
                        {formatBalance(token.balance, token.decimals)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedToken && (
              <div className="text-sm text-gray-600">
                Available: {formatBalance(selectedToken.balance, selectedToken.decimals)} {selectedToken.symbol}
              </div>
            )}
          </div>

          {/* Recipient Address */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              {...register('recipient', { 
                required: 'Recipient address is required',
                pattern: {
                  value: /^0x[a-fA-F0-9]{40}$/,
                  message: 'Invalid Ethereum address format'
                }
              })}
            />
            {errors.recipient && (
              <p className="text-sm text-red-600">{errors.recipient.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={setMaxAmount}
                className="text-xs"
              >
                Max
              </Button>
            </div>
            <Input
              id="amount"
              type="number"
              step="0.0001"
              placeholder="0.0"
              {...register('amount', { 
                required: 'Amount is required',
                min: { value: 0.0001, message: 'Amount must be greater than 0' }
              })}
            />
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount.message}</p>
            )}
            {selectedToken && formData.amount > 0 && (
              <div className="text-sm text-gray-600">
                ≈ ${(formData.amount * selectedToken.valueUSD / (selectedToken.balance / Math.pow(10, selectedToken.decimals))).toFixed(2)} USD
              </div>
            )}
          </div>

          {/* Memo (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="memo">Memo (Optional)</Label>
            <Input
              id="memo"
              placeholder="Transaction note..."
              {...register('memo')}
            />
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2"
            >
              {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>Advanced Options</span>
            </Button>

            {showAdvanced && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="priority">Transaction Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setValue('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low (Slower, Cheaper)</SelectItem>
                      <SelectItem value="MEDIUM">Medium (Balanced)</SelectItem>
                      <SelectItem value="HIGH">High (Faster, More Expensive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Real-time Validation Results */}
          {isValidating && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Validating transaction...</span>
            </div>
          )}

          {/* Validation Errors */}
          {validation.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warnings */}
          {validation.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Risk Assessment */}
          {validation.isValid && (
            <div className="space-y-4 p-4 border rounded-lg">
              <RiskIndicator riskAssessment={validation.riskAssessment} />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Estimated Fees:</span>
                  <span className="ml-2 font-medium">{validation.estimatedFees.toFixed(4)} {formData.token}</span>
                </div>
                <div>
                  <span className="text-gray-600">Estimated Time:</span>
                  <span className="ml-2 font-medium">{validation.estimatedTime} minutes</span>
                </div>
              </div>

              {validation.requiresQlockSigning && (
                <div className="flex items-center space-x-2 text-sm">
                  <Lock className="h-4 w-4" />
                  <span>Qlock signing required</span>
                </div>
              )}
            </div>
          )}

          {/* Approval Workflow */}
          <ApprovalWorkflow
            required={validation.requiresApproval}
            amount={formData.amount}
            threshold={validation.approvalThreshold}
            onApprovalRequest={() => console.log('Approval requested')}
          />

          {/* Qlock Signing Status */}
          {signingStatus.required && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span>Qlock Signing:</span>
                    <Badge variant={
                      signingStatus.status === 'SIGNED' ? 'default' :
                      signingStatus.status === 'FAILED' ? 'destructive' : 'secondary'
                    }>
                      {signingStatus.status}
                    </Badge>
                  </div>
                  {signingStatus.status === 'SIGNING' && (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Please sign the transaction in Qlock...</span>
                    </div>
                  )}
                  {signingStatus.error && (
                    <p className="text-sm text-red-600">{signingStatus.error}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Transfer Result */}
          {transferResult && (
            <Alert variant={transferResult.success ? "default" : "destructive"}>
              {transferResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertDescription>
                {transferResult.success ? (
                  <div className="space-y-1">
                    <p className="font-medium">Transfer Successful!</p>
                    <p className="text-sm">Transaction Hash: {transferResult.transactionHash}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium">Transfer Failed</p>
                    <p className="text-sm">{transferResult.error}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!validation.isValid || isSubmitting || signingStatus.status === 'SIGNING'}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send {formData.token}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TokenTransferForm;