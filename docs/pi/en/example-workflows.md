# Pi Network Example Workflows

## Overview

This guide provides complete, working examples of Pi Network integration workflows with the AnarQ&Q ecosystem. Each workflow demonstrates real-world use cases with step-by-step implementation details.

## Prerequisites

- Pi Network Developer Account
- AnarQ&Q ecosystem setup
- Pi Browser or Pi SDK access
- Basic understanding of JavaScript/Node.js

## Workflow 1: Pi Wallet Payment Integration

### Complete Payment Flow

```javascript
import { PiIntegrationLayer } from '../../../backend/services/PiIntegrationLayer.mjs';
import { QwalletIntegrationService } from '../../../backend/services/QwalletIntegrationService.mjs';

class PiPaymentWorkflow {
  constructor() {
    this.piIntegration = new PiIntegrationLayer();
    this.qwalletService = new QwalletIntegrationService();
  }
  
  async executePaymentWorkflow(paymentRequest) {
    try {
      console.log('Starting Pi payment workflow...');
      
      // Step 1: Validate payment request
      const validation = await this.validatePaymentRequest(paymentRequest);
      if (!validation.valid) {
        throw new Error(`Payment validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Step 2: Initialize Pi integration
      await this.piIntegration.setEnvironment(paymentRequest.environment || 'sandbox');
      
      // Step 3: Authenticate user with Pi
      const piAuth = await this.authenticateWithPi(paymentRequest.piUserId);
      
      // Step 4: Check Pi wallet balance
      const balance = await this.checkPiBalance(piAuth.accessToken);
      if (balance < paymentRequest.amount) {
        throw new Error('Insufficient Pi balance');
      }
      
      // Step 5: Execute Pi payment
      const piPayment = await this.executePiPayment(paymentRequest);
      
      // Step 6: Update Qwallet
      const qwalletUpdate = await this.updateQwallet(piPayment, paymentRequest);
      
      // Step 7: Log to Qerberos
      await this.logPaymentToQerberos(piPayment, qwalletUpdate);
      
      return {
        success: true,
        paymentId: piPayment.paymentId,
        transactionHash: piPayment.transactionHash,
        qwalletTransactionId: qwalletUpdate.transactionId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Pi payment workflow failed:', error);
      await this.logErrorToQerberos(error, paymentRequest);
      throw error;
    }
  }
  
  async validatePaymentRequest(request) {
    const validation = { valid: true, errors: [] };
    
    if (!request.amount || request.amount <= 0) {
      validation.errors.push('Invalid payment amount');
    }
    
    if (!request.recipient) {
      validation.errors.push('Recipient address required');
    }
    
    if (!request.piUserId) {
      validation.errors.push('Pi user ID required');
    }
    
    if (!request.squidId) {
      validation.errors.push('sQuid ID required');
    }
    
    validation.valid = validation.errors.length === 0;
    return validation;
  }
  
  async authenticateWithPi(piUserId) {
    try {
      // Initialize Pi SDK if in browser
      if (typeof window !== 'undefined' && window.Pi) {
        const auth = await window.Pi.authenticate(['payments'], (payment) => {
          console.log('Incomplete payment found:', payment);
        });
        
        return {
          accessToken: auth.accessToken,
          user: auth.user
        };
      }
      
      // Server-side authentication
      return await this.piIntegration.authenticateUser(piUserId);
      
    } catch (error) {
      console.error('Pi authentication failed:', error);
      throw new Error('Failed to authenticate with Pi Network');
    }
  }
  
  async executePiPayment(paymentRequest) {
    try {
      const paymentData = {
        amount: paymentRequest.amount,
        memo: paymentRequest.memo || `Payment from ${paymentRequest.squidId}`,
        metadata: {
          squidId: paymentRequest.squidId,
          recipient: paymentRequest.recipient
        }
      };
      
      const piPayment = await this.piIntegration.executePiTransaction(paymentData);
      
      // Wait for confirmation
      const confirmation = await this.piIntegration.waitForConfirmation(
        piPayment.paymentId,
        { timeout: 300000 } // 5 minutes
      );
      
      return {
        paymentId: piPayment.paymentId,
        transactionHash: confirmation.transactionHash,
        status: 'confirmed',
        amount: paymentRequest.amount,
        recipient: paymentRequest.recipient
      };
      
    } catch (error) {
      console.error('Pi payment execution failed:', error);
      throw new Error(`Pi payment failed: ${error.message}`);
    }
  }
}

// Usage Example
async function runPaymentWorkflow() {
  const workflow = new PiPaymentWorkflow();
  
  const paymentRequest = {
    amount: 10.5,
    recipient: 'pi-recipient-address',
    piUserId: 'pi-user-123',
    squidId: 'squid-456',
    memo: 'Payment for services',
    environment: 'sandbox'
  };
  
  try {
    const result = await workflow.executePaymentWorkflow(paymentRequest);
    console.log('Payment completed successfully:', result);
  } catch (error) {
    console.error('Payment workflow failed:', error);
  }
}
```

## Workflow 2: Identity Linking and Verification

### Complete Identity Linking Flow

```javascript
class PiIdentityLinkingWorkflow {
  constructor() {
    this.piIntegration = new PiIntegrationLayer();
    this.squidService = new sQuidService();
    this.qerberosService = new QerberosIntegrationService();
  }
  
  async executeIdentityLinkingWorkflow(linkingRequest) {
    try {
      console.log('Starting Pi identity linking workflow...');
      
      // Step 1: Validate linking request
      const validation = await this.validateLinkingRequest(linkingRequest);
      if (!validation.valid) {
        throw new Error(`Linking validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Step 2: Verify sQuid identity
      const squidVerification = await this.verifySquidIdentity(linkingRequest.squidId);
      
      // Step 3: Verify Pi identity
      const piVerification = await this.verifyPiIdentity(linkingRequest.piUserId);
      
      // Step 4: Generate identity proofs
      const identityProofs = await this.generateIdentityProofs(linkingRequest);
      
      // Step 5: Create binding on smart contract
      const contractBinding = await this.createContractBinding(identityProofs);
      
      // Step 6: Verify and activate binding
      const activation = await this.activateBinding(contractBinding);
      
      // Step 7: Grant cross-platform permissions
      const permissions = await this.grantCrossPlatformPermissions(activation);
      
      // Step 8: Log to Qerberos
      await this.logIdentityLinking(activation, permissions);
      
      return {
        success: true,
        bindingId: activation.bindingId,
        squidId: linkingRequest.squidId,
        piUserId: linkingRequest.piUserId,
        contractAddress: contractBinding.contractAddress,
        transactionHash: contractBinding.transactionHash,
        permissions: permissions,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Identity linking workflow failed:', error);
      await this.logLinkingError(error, linkingRequest);
      throw error;
    }
  }
  
  async generateIdentityProofs(linkingRequest) {
    try {
      // Generate sQuid signature proof
      const squidProof = await this.squidService.generateBindingProof(
        linkingRequest.squidId,
        linkingRequest.piUserId,
        linkingRequest.nonce || Date.now().toString()
      );
      
      // Generate Pi identity proof
      const piProof = await this.piIntegration.generateIdentityProof(
        linkingRequest.piUserId,
        linkingRequest.squidId
      );
      
      // Generate Qerberos attestation
      const qerberosAttestation = await this.qerberosService.generateAttestation({
        type: 'identity_binding_request',
        squidId: linkingRequest.squidId,
        piUserId: linkingRequest.piUserId,
        timestamp: new Date().toISOString(),
        nonce: linkingRequest.nonce
      });
      
      return {
        squidProof,
        piProof,
        qerberosAttestation,
        bindingHash: this.calculateBindingHash(linkingRequest)
      };
      
    } catch (error) {
      console.error('Failed to generate identity proofs:', error);
      throw new Error(`Proof generation failed: ${error.message}`);
    }
  }
}

// Usage Example
async function runIdentityLinkingWorkflow() {
  const workflow = new PiIdentityLinkingWorkflow();
  
  const linkingRequest = {
    squidId: 'squid-user-789',
    piUserId: 'pi-user-123',
    piSignature: 'pi-signature-data',
    squidSignature: 'squid-signature-data',
    nonce: Date.now().toString()
  };
  
  try {
    const result = await workflow.executeIdentityLinkingWorkflow(linkingRequest);
    console.log('Identity linking completed successfully:', result);
  } catch (error) {
    console.error('Identity linking workflow failed:', error);
  }
}
```

## Testing Workflows

### Comprehensive Workflow Testing

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Pi Integration Workflows', () => {
  let paymentWorkflow;
  let identityWorkflow;
  
  beforeEach(() => {
    paymentWorkflow = new PiPaymentWorkflow();
    identityWorkflow = new PiIdentityLinkingWorkflow();
  });
  
  describe('Payment Workflow', () => {
    it('should execute complete payment workflow', async () => {
      const paymentRequest = {
        amount: 5.0,
        recipient: 'test-recipient',
        piUserId: 'pi-test-user',
        squidId: 'squid-test-user',
        memo: 'Test payment',
        environment: 'sandbox'
      };
      
      const result = await paymentWorkflow.executePaymentWorkflow(paymentRequest);
      
      expect(result.success).toBe(true);
      expect(result.paymentId).toBeDefined();
      expect(result.transactionHash).toBeDefined();
    });
  });
  
  describe('Identity Linking Workflow', () => {
    it('should execute complete identity linking workflow', async () => {
      const linkingRequest = {
        squidId: 'squid-test-123',
        piUserId: 'pi-test-456',
        piSignature: 'test-pi-signature',
        squidSignature: 'test-squid-signature',
        nonce: Date.now().toString()
      };
      
      const result = await identityWorkflow.executeIdentityLinkingWorkflow(linkingRequest);
      
      expect(result.success).toBe(true);
      expect(result.bindingId).toBeDefined();
      expect(result.contractAddress).toBeDefined();
      expect(result.permissions.length).toBeGreaterThan(0);
    });
  });
});
```

## Best Practices

1. **Error Handling**: Always implement comprehensive error handling and logging
2. **Validation**: Validate all inputs at each workflow step
3. **Security**: Verify identities and permissions at each step
4. **Auditability**: Log all workflow actions to Qerberos
5. **Testing**: Test workflows across all Pi Network environments

## Support

For workflow implementation support:
- Review individual component documentation
- Check Qerberos audit logs for detailed execution traces
- Test workflows in Pi sandbox environment first
- Contact development team through DAO governance system