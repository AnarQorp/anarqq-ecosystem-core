/**
 * Pi Smart Contract Integration Tests
 * 
 * Tests for Pi Network smart contract deployment, templates, and Qflow integration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PiIntegrationLayer } from '../services/PiIntegrationLayer.mjs';
import { EventBusService } from '../services/EventBusService.mjs';
import { QwalletIntegrationService } from '../services/QwalletIntegrationService.mjs';

describe('Pi Smart Contract Integration', () => {
  let piIntegration;
  let eventBus;
  let qwalletIntegration;

  beforeEach(async () => {
    eventBus = new EventBusService();
    qwalletIntegration = new QwalletIntegrationService({ 
      sandboxMode: true,
      eventBus 
    });
    
    piIntegration = new PiIntegrationLayer({
      environment: 'sandbox',
      eventBus,
      qwalletIntegration
    });

    await qwalletIntegration.initialize();
    await piIntegration.initialize();
  });

  afterEach(async () => {
    await piIntegration.shutdown();
    await qwalletIntegration.shutdown();
  });

  describe('Contract Templates', () => {
    it('should create payment contract template', async () => {
      const template = await piIntegration.createContractTemplate('payment', {
        contractName: 'CustomPaymentContract',
        expectedOwner: '0x742d35Cc6634C0532925a3b8D4C0C8b3C2e1e1e1'
      });

      expect(template.name).toBe('PaymentContract');
      expect(template.templateType).toBe('payment');
      expect(template.code).toContain('CustomPaymentContract');
      expect(template.gasEstimate).toBe(150000);
      expect(template.qflowIntegration.triggerEvents).toContain('Deposit');
      expect(template.qflowIntegration.triggerEvents).toContain('Withdrawal');
    });

    it('should create governance contract template', async () => {
      const template = await piIntegration.createContractTemplate('governance');

      expect(template.name).toBe('GovernanceContract');
      expect(template.templateType).toBe('governance');
      expect(template.code).toContain('function createProposal');
      expect(template.code).toContain('function vote');
      expect(template.gasEstimate).toBe(200000);
      expect(template.qflowIntegration.triggerEvents).toContain('ProposalCreated');
      expect(template.qflowIntegration.triggerEvents).toContain('VoteCast');
    });

    it('should create NFT contract template', async () => {
      const template = await piIntegration.createContractTemplate('nft');

      expect(template.name).toBe('NFTContract');
      expect(template.templateType).toBe('nft');
      expect(template.code).toContain('function mint');
      expect(template.code).toContain('function ownerOf');
      expect(template.gasEstimate).toBe(250000);
      expect(template.qflowIntegration.triggerEvents).toContain('Transfer');
      expect(template.qflowIntegration.triggerEvents).toContain('Mint');
    });

    it('should throw error for unknown template type', async () => {
      await expect(
        piIntegration.createContractTemplate('unknown')
      ).rejects.toThrow('Unknown contract template type: unknown');
    });
  });

  describe('Contract Deployment', () => {
    let paymentTemplate;

    beforeEach(async () => {
      paymentTemplate = await piIntegration.createContractTemplate('payment');
    });

    it('should deploy contract successfully', async () => {
      const qflowWorkflow = {
        contractName: 'TestPaymentContract',
        contractVersion: '1.0.0',
        qflowIntegration: {
          workflowId: 'test_payment_workflow',
          triggerEvents: ['Deposit', 'Withdrawal'],
          callbackEndpoints: ['https://api.test.com/webhook']
        }
      };

      const result = await piIntegration.deployPiSmartContract(
        paymentTemplate.code,
        qflowWorkflow
      );

      expect(result.success).toBe(true);
      expect(result.contractId).toBeDefined();
      expect(result.contractAddress).toBeDefined();
      expect(result.deploymentTxHash).toBeDefined();
      expect(result.gasUsed).toBeGreaterThan(0);
      expect(result.gasEstimate).toBeDefined();
      expect(result.status).toMatch(/^(DEPLOYED|DEPLOYING)$/);
    });

    it('should validate contract code before deployment', async () => {
      const invalidCode = 'invalid contract code';

      const result = await piIntegration.deployPiSmartContract(invalidCode);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Contract code validation failed');
    });

    it('should estimate gas correctly', async () => {
      const gasEstimate = await piIntegration.estimateContractGas(
        paymentTemplate.code,
        ['arg1', 'arg2']
      );

      expect(gasEstimate.estimated).toBeGreaterThan(100000); // Should be more than base
      expect(gasEstimate.maximum).toBeGreaterThanOrEqual(gasEstimate.estimated);
      expect(gasEstimate.baseFee).toBe(100000);
      expect(gasEstimate.argumentsFee).toBe(10000); // 2 args * 5000
      expect(gasEstimate.complexityFee).toBeGreaterThan(0);
    });

    it('should handle deployment failure gracefully', async () => {
      // Mock a deployment failure by using invalid contract code
      const result = await piIntegration.deployPiSmartContract('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Qflow Integration', () => {
    let deployedContract;

    beforeEach(async () => {
      const template = await piIntegration.createContractTemplate('payment');
      const deploymentResult = await piIntegration.deployPiSmartContract(
        template.code,
        {
          contractName: 'QflowTestContract',
          qflowIntegration: {
            workflowId: 'test_qflow_workflow',
            triggerEvents: ['Deposit', 'Withdrawal'],
            callbackEndpoints: ['https://api.qflow.test/webhook'],
            stateValidation: {
              owner: '0x742d35Cc6634C0532925a3b8D4C0C8b3C2e1e1e1',
              isActive: true
            }
          }
        }
      );

      deployedContract = deploymentResult;
    });

    it('should set up Qflow integration for deployed contract', async () => {
      expect(deployedContract.success).toBe(true);
      
      // Verify contract is stored with Qflow integration
      const contract = piIntegration.smartContracts.get(deployedContract.contractId);
      expect(contract).toBeDefined();
      expect(contract.qflowIntegration.workflowId).toBe('test_qflow_workflow');
      expect(contract.qflowIntegration.triggerEvents).toContain('Deposit');
      expect(contract.qflowIntegration.callbackEndpoints).toContain('https://api.qflow.test/webhook');
    });

    it('should validate contract state', async () => {
      const validation = await piIntegration.validateContractState(
        deployedContract.contractId,
        {
          isActive: true,
          balance: 0
        }
      );

      expect(validation.contractId).toBe(deployedContract.contractId);
      expect(validation.valid).toBeDefined();
      expect(validation.validationResults).toBeInstanceOf(Array);
      expect(validation.timestamp).toBeDefined();
    });

    it('should get contract state', async () => {
      const state = await piIntegration.getContractState(deployedContract.contractId);

      expect(state.owner).toBeDefined();
      expect(state.balance).toBeGreaterThanOrEqual(0);
      expect(state.isActive).toBe(true);
      expect(state.lastUpdated).toBeDefined();
    });
  });

  describe('Contract Validation', () => {
    it('should validate valid contract code', async () => {
      const validCode = `
        contract TestContract {
          address public owner;
          
          constructor() {
            owner = msg.sender;
          }
          
          function test() public view returns (bool) {
            return true;
          }
        }
      `;

      // Should not throw
      await expect(
        piIntegration.validateContractCode(validCode)
      ).resolves.not.toThrow();
    });

    it('should reject invalid contract code', async () => {
      const invalidCode = 'not a contract';

      await expect(
        piIntegration.validateContractCode(invalidCode)
      ).rejects.toThrow('Contract code validation failed');
    });

    it('should warn about dangerous patterns', async () => {
      const dangerousCode = `
        contract DangerousContract {
          function dangerous() public {
            selfdestruct(payable(msg.sender));
          }
        }
      `;

      // Should not throw but should log warning
      await expect(
        piIntegration.validateContractCode(dangerousCode)
      ).resolves.not.toThrow();
    });

    it('should reject empty or null contract code', async () => {
      await expect(
        piIntegration.validateContractCode('')
      ).rejects.toThrow('Invalid contract code');

      await expect(
        piIntegration.validateContractCode(null)
      ).rejects.toThrow('Invalid contract code');
    });
  });

  describe('Gas Estimation', () => {
    it('should estimate gas based on code complexity', async () => {
      const simpleCode = 'contract Simple { function test() {} }';
      const complexCode = `
        contract Complex {
          mapping(address => uint256) public balances;
          mapping(address => mapping(address => uint256)) public allowances;
          
          function transfer(address to, uint256 amount) public returns (bool) {
            require(balances[msg.sender] >= amount, "Insufficient balance");
            balances[msg.sender] -= amount;
            balances[to] += amount;
            return true;
          }
          
          function approve(address spender, uint256 amount) public returns (bool) {
            allowances[msg.sender][spender] = amount;
            return true;
          }
        }
      `;

      const simpleEstimate = await piIntegration.estimateContractGas(simpleCode);
      const complexEstimate = await piIntegration.estimateContractGas(complexCode);

      expect(complexEstimate.complexityFee).toBeGreaterThan(simpleEstimate.complexityFee);
      expect(complexEstimate.estimated).toBeGreaterThan(simpleEstimate.estimated);
    });

    it('should account for constructor arguments in gas estimation', async () => {
      const code = 'contract Test { constructor(uint256 a, string memory b) {} }';
      
      const noArgsEstimate = await piIntegration.estimateContractGas(code, []);
      const withArgsEstimate = await piIntegration.estimateContractGas(code, [123, 'test']);

      expect(withArgsEstimate.argumentsFee).toBeGreaterThan(noArgsEstimate.argumentsFee);
      expect(withArgsEstimate.estimated).toBeGreaterThan(noArgsEstimate.estimated);
      expect(withArgsEstimate.argumentsFee).toBe(10000); // 2 args * 5000
    });

    it('should respect gas limit maximum', async () => {
      const hugeCode = 'contract Huge { ' + 'function test() {} '.repeat(1000) + ' }';
      
      const estimate = await piIntegration.estimateContractGas(hugeCode);
      const maxGas = piIntegration.environments[piIntegration.environment].gasLimit;

      expect(estimate.estimated).toBeLessThanOrEqual(maxGas);
      expect(estimate.maximum).toBe(maxGas);
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should complete full contract deployment and integration workflow', async () => {
      // Step 1: Create contract template
      const template = await piIntegration.createContractTemplate('governance', {
        contractName: 'IntegrationTestGovernance'
      });

      expect(template.templateType).toBe('governance');

      // Step 2: Deploy contract with Qflow integration
      const deploymentResult = await piIntegration.deployPiSmartContract(
        template.code,
        {
          contractName: 'IntegrationTestGovernance',
          qflowIntegration: {
            workflowId: 'integration_test_governance_workflow',
            triggerEvents: ['ProposalCreated', 'VoteCast'],
            callbackEndpoints: ['https://api.integration.test/webhook'],
            stateValidation: {
              owner: '0x742d35Cc6634C0532925a3b8D4C0C8b3C2e1e1e1'
            }
          }
        }
      );

      expect(deploymentResult.success).toBe(true);

      // Step 3: Validate contract state
      const stateValidation = await piIntegration.validateContractState(
        deploymentResult.contractId,
        { isActive: true }
      );

      expect(stateValidation.valid).toBeDefined();

      // Step 4: Verify contract is properly stored and accessible
      const contract = piIntegration.smartContracts.get(deploymentResult.contractId);
      expect(contract).toBeDefined();
      expect(contract.contractName).toBe('IntegrationTestGovernance');
      expect(contract.status).toMatch(/^(DEPLOYED|DEPLOYING)$/);
      expect(contract.qflowIntegration.workflowId).toBe('integration_test_governance_workflow');

      // Verify health check includes contract information
      const healthCheck = await piIntegration.healthCheck();
      expect(healthCheck.smartContracts).toBeGreaterThan(0);
    });

    it('should handle multiple contract deployments', async () => {
      const contracts = [];

      // Deploy multiple different contract types
      for (const contractType of ['payment', 'governance', 'nft']) {
        const template = await piIntegration.createContractTemplate(contractType);
        const result = await piIntegration.deployPiSmartContract(
          template.code,
          {
            contractName: `Multi${contractType.charAt(0).toUpperCase() + contractType.slice(1)}Contract`,
            qflowIntegration: {
              workflowId: `multi_${contractType}_workflow`
            }
          }
        );

        expect(result.success).toBe(true);
        contracts.push(result);
      }

      // Verify all contracts are deployed and tracked
      expect(contracts).toHaveLength(3);
      expect(piIntegration.smartContracts.size).toBeGreaterThanOrEqual(3);

      // Verify each contract has unique ID and address
      const contractIds = contracts.map(c => c.contractId);
      const contractAddresses = contracts.map(c => c.contractAddress);
      
      expect(new Set(contractIds).size).toBe(3); // All unique IDs
      expect(new Set(contractAddresses).size).toBe(3); // All unique addresses
    });
  });
});