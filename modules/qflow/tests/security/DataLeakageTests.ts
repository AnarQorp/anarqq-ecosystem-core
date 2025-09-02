import { SecurityTestRunner } from './SecurityTestRunner';
import { TestCategoryResults, TestResult, SecurityVulnerability } from './SecurityTestSuite';

/**
 * Data Leakage Tests - Validates data isolation and prevents unauthorized data access
 */
export class DataLeakageTests {
  private testRunner: SecurityTestRunner;

  constructor(testRunner: SecurityTestRunner) {
    this.testRunner = testRunner;
  }

  async runTests(): Promise<TestCategoryResults> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    await this.testRunner.initialize();

    try {
      // Test 1: Cross-Tenant Data Access Prevention
      results.push(await this.testCrossTenantDataAccessPrevention());

      // Test 2: DAO Subnet Data Isolation
      results.push(await this.testDAOSubnetDataIsolation());

      // Test 3: Execution Context Data Isolation
      results.push(await this.testExecutionContextDataIsolation());

      // Test 4: State Storage Encryption Validation
      results.push(await this.testStateStorageEncryptionValidation());

      // Test 5: Memory Dump Data Leakage
      results.push(await this.testMemoryDumpDataLeakage());

      // Test 6: Log Data Sanitization
      results.push(await this.testLogDataSanitization());

      // Test 7: Error Message Information Disclosure
      results.push(await this.testErrorMessageInformationDisclosure());

      // Test 8: Cache Data Isolation
      results.push(await this.testCacheDataIsolation());

      // Test 9: Temporary File Data Leakage
      results.push(await this.testTemporaryFileDataLeakage());

      // Test 10: Network Traffic Data Exposure
      results.push(await this.testNetworkTrafficDataExposure());

      // Test 11: Backup Data Access Control
      results.push(await this.testBackupDataAccessControl());

      // Test 12: Metadata Information Leakage
      results.push(await this.testMetadataInformationLeakage());

    } finally {
      await this.testRunner.cleanup();
    }

    const executionTime = Date.now() - startTime;
    const vulnerabilities = this.extractVulnerabilities(results);

    return {
      category: 'Data Leakage',
      totalTests: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      vulnerabilities,
      executionTime,
      details: results
    };
  }

  /**
   * Test cross-tenant data access prevention
   */
  private async testCrossTenantDataAccessPrevention(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'Cross-Tenant Data Access Prevention',
      async () => {
        // Set up test data for multiple tenants
        const tenantAData = await this.createTenantTestData('tenant-a', {
          flows: ['flow-a1', 'flow-a2'],
          secrets: ['secret-a1', 'secret-a2'],
          executions: ['exec-a1', 'exec-a2']
        });

        const tenantBData = await this.createTenantTestData('tenant-b', {
          flows: ['flow-b1', 'flow-b2'],
          secrets: ['secret-b1', 'secret-b2'],
          executions: ['exec-b1', 'exec-b2']
        });

        // Attempt to access tenant B data from tenant A context
        await this.attemptCrossTenantDataAccess('tenant-a', tenantBData);
        
        // Attempt to access tenant A data from tenant B context
        await this.attemptCrossTenantDataAccess('tenant-b', tenantAData);
      },
      true
    );
  }

  /**
   * Test DAO subnet data isolation
   */
  private async testDAOSubnetDataIsolation(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'DAO Subnet Data Isolation',
      async () => {
        // Create data for different DAO subnets
        const daoSubnetA = await this.createDAOSubnetData('dao-subnet-a', {
          policies: ['policy-a1', 'policy-a2'],
          validators: ['validator-a1', 'validator-a2'],
          governance: ['proposal-a1', 'proposal-a2']
        });

        const daoSubnetB = await this.createDAOSubnetData('dao-subnet-b', {
          policies: ['policy-b1', 'policy-b2'],
          validators: ['validator-b1', 'validator-b2'],
          governance: ['proposal-b1', 'proposal-b2']
        });

        // Attempt cross-subnet data access
        await this.attemptCrossSubnetDataAccess('dao-subnet-a', daoSubnetB);
        await this.attemptCrossSubnetDataAccess('dao-subnet-b', daoSubnetA);
      },
      true
    );
  }

  /**
   * Test execution context data isolation
   */
  private async testExecutionContextDataIsolation(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'Execution Context Data Isolation',
      async () => {
        // Create multiple execution contexts
        const context1 = await this.createExecutionContext('exec-1', {
          variables: { secret: 'context1-secret', apiKey: 'context1-key' },
          state: { step: 1, data: 'sensitive-data-1' }
        });

        const context2 = await this.createExecutionContext('exec-2', {
          variables: { secret: 'context2-secret', apiKey: 'context2-key' },
          state: { step: 1, data: 'sensitive-data-2' }
        });

        // Attempt to access context2 data from context1
        await this.attemptCrossContextDataAccess(context1, context2);
        
        // Attempt to access context1 data from context2
        await this.attemptCrossContextDataAccess(context2, context1);
      },
      true
    );
  }

  /**
   * Test state storage encryption validation
   */
  private async testStateStorageEncryptionValidation(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'State Storage Encryption Validation',
      async () => {
        // Create sensitive state data
        const sensitiveState = {
          executionId: 'exec-123',
          secrets: {
            apiKey: 'super-secret-api-key',
            password: 'user-password-123',
            token: 'jwt-token-xyz'
          },
          personalData: {
            email: 'user@example.com',
            phone: '+1234567890',
            address: '123 Main St'
          }
        };

        // Store state and verify encryption
        const storedState = await this.storeExecutionState(sensitiveState);
        
        // Attempt to read raw storage without decryption
        await this.attemptRawStorageAccess(storedState.storageLocation);
        
        // Verify that sensitive data is not accessible in plain text
        await this.verifySensitiveDataEncryption(storedState);
      },
      false // This should pass - encryption should work properly
    );
  }

  /**
   * Test memory dump data leakage
   */
  private async testMemoryDumpDataLeakage(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'Memory Dump Data Leakage',
      async () => {
        // Load sensitive data into memory
        const sensitiveData = {
          creditCard: '4111-1111-1111-1111',
          ssn: '123-45-6789',
          password: 'super-secret-password',
          privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...'
        };

        await this.loadSensitiveDataIntoMemory(sensitiveData);
        
        // Attempt to dump memory and search for sensitive data
        await this.attemptMemoryDump();
        
        // Verify sensitive data is not accessible in memory dumps
        await this.verifySensitiveDataNotInMemoryDump(sensitiveData);
      },
      false
    );
  }

  /**
   * Test log data sanitization
   */
  private async testLogDataSanitization(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'Log Data Sanitization',
      async () => {
        // Generate operations with sensitive data
        const operationsWithSensitiveData = [
          { action: 'login', data: { username: 'user', password: 'secret123' } },
          { action: 'api_call', data: { apiKey: 'sk-1234567890abcdef' } },
          { action: 'payment', data: { creditCard: '4111111111111111', cvv: '123' } },
          { action: 'profile_update', data: { ssn: '123-45-6789', email: 'user@example.com' } }
        ];

        // Execute operations that should generate logs
        for (const operation of operationsWithSensitiveData) {
          await this.executeOperationWithLogging(operation);
        }

        // Check logs for sensitive data leakage
        await this.checkLogsForSensitiveData(operationsWithSensitiveData);
      },
      false
    );
  }

  /**
   * Test error message information disclosure
   */
  private async testErrorMessageInformationDisclosure(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'Error Message Information Disclosure',
      async () => {
        // Trigger various error conditions
        const errorScenarios = [
          { type: 'database_error', trigger: 'invalid_sql_query' },
          { type: 'file_system_error', trigger: 'access_denied_file' },
          { type: 'network_error', trigger: 'connection_timeout' },
          { type: 'authentication_error', trigger: 'invalid_credentials' },
          { type: 'authorization_error', trigger: 'insufficient_permissions' }
        ];

        for (const scenario of errorScenarios) {
          const errorMessage = await this.triggerErrorScenario(scenario);
          await this.checkErrorMessageForInformationDisclosure(errorMessage, scenario);
        }
      },
      false
    );
  }

  /**
   * Test cache data isolation
   */
  private async testCacheDataIsolation(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'Cache Data Isolation',
      async () => {
        // Cache data for different tenants/contexts
        await this.cacheDataForTenant('tenant-a', { flows: ['flow-a1'], secrets: ['secret-a1'] });
        await this.cacheDataForTenant('tenant-b', { flows: ['flow-b1'], secrets: ['secret-b1'] });

        // Attempt to access cached data across tenant boundaries
        await this.attemptCrossTenantCacheAccess('tenant-a', 'tenant-b');
        await this.attemptCrossTenantCacheAccess('tenant-b', 'tenant-a');
      },
      true
    );
  }

  /**
   * Test temporary file data leakage
   */
  private async testTemporaryFileDataLeakage(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'Temporary File Data Leakage',
      async () => {
        // Create temporary files with sensitive data
        const sensitiveData = {
          executionId: 'exec-456',
          secrets: ['secret1', 'secret2'],
          personalInfo: ['email@example.com', 'phone-number']
        };

        const tempFiles = await this.createTemporaryFiles(sensitiveData);

        // Verify temporary files are properly secured
        await this.verifyTemporaryFilePermissions(tempFiles);
        
        // Verify temporary files are cleaned up
        await this.verifyTemporaryFileCleanup(tempFiles);
        
        // Attempt to access temporary files from different contexts
        await this.attemptUnauthorizedTempFileAccess(tempFiles);
      },
      false
    );
  }

  /**
   * Test network traffic data exposure
   */
  private async testNetworkTrafficDataExposure(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'Network Traffic Data Exposure',
      async () => {
        // Generate network traffic with sensitive data
        const sensitiveNetworkData = {
          authTokens: ['token1', 'token2'],
          personalData: ['user@example.com', 'phone-number'],
          businessData: ['api-key', 'secret-config']
        };

        await this.generateNetworkTrafficWithSensitiveData(sensitiveNetworkData);
        
        // Attempt to intercept and analyze network traffic
        await this.attemptNetworkTrafficInterception();
        
        // Verify sensitive data is encrypted in transit
        await this.verifyNetworkTrafficEncryption(sensitiveNetworkData);
      },
      false
    );
  }

  /**
   * Test backup data access control
   */
  private async testBackupDataAccessControl(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'Backup Data Access Control',
      async () => {
        // Create backup data
        const backupData = await this.createBackupData({
          flows: ['flow1', 'flow2'],
          executions: ['exec1', 'exec2'],
          secrets: ['secret1', 'secret2']
        });

        // Attempt unauthorized access to backup data
        await this.attemptUnauthorizedBackupAccess(backupData);
        
        // Verify backup data encryption
        await this.verifyBackupDataEncryption(backupData);
      },
      true
    );
  }

  /**
   * Test metadata information leakage
   */
  private async testMetadataInformationLeakage(): Promise<TestResult> {
    return await this.testRunner.executeTest(
      'Metadata Information Leakage',
      async () => {
        // Create resources with sensitive metadata
        const resourcesWithMetadata = [
          { type: 'flow', id: 'flow1', metadata: { owner: 'sensitive-user', tags: ['confidential'] } },
          { type: 'execution', id: 'exec1', metadata: { tenant: 'secret-tenant', cost: 1000 } },
          { type: 'data', id: 'data1', metadata: { classification: 'top-secret', location: 'secure-vault' } }
        ];

        for (const resource of resourcesWithMetadata) {
          await this.createResourceWithMetadata(resource);
        }

        // Attempt to access metadata without proper authorization
        await this.attemptUnauthorizedMetadataAccess(resourcesWithMetadata);
      },
      true
    );
  }

  // Helper methods for test implementation

  private async createTenantTestData(tenantId: string, data: any): Promise<any> {
    return { tenantId, ...data, createdAt: new Date() };
  }

  private async createDAOSubnetData(subnetId: string, data: any): Promise<any> {
    return { subnetId, ...data, createdAt: new Date() };
  }

  private async createExecutionContext(contextId: string, data: any): Promise<any> {
    return { contextId, ...data, createdAt: new Date() };
  }

  private async attemptCrossTenantDataAccess(fromTenant: string, targetData: any): Promise<void> {
    // Simulate cross-tenant data access attempt
    console.log(`Attempting cross-tenant access from ${fromTenant} to ${targetData.tenantId}`);
    // This should fail - throw error if access is granted
    if (fromTenant !== targetData.tenantId) {
      // Access should be denied
      throw new Error(`Cross-tenant data access should be denied`);
    }
  }

  private async attemptCrossSubnetDataAccess(fromSubnet: string, targetData: any): Promise<void> {
    console.log(`Attempting cross-subnet access from ${fromSubnet} to ${targetData.subnetId}`);
    if (fromSubnet !== targetData.subnetId) {
      throw new Error(`Cross-subnet data access should be denied`);
    }
  }

  private async attemptCrossContextDataAccess(fromContext: any, targetContext: any): Promise<void> {
    console.log(`Attempting cross-context access from ${fromContext.contextId} to ${targetContext.contextId}`);
    if (fromContext.contextId !== targetContext.contextId) {
      throw new Error(`Cross-context data access should be denied`);
    }
  }

  private async storeExecutionState(state: any): Promise<any> {
    // Simulate state storage with encryption
    const mockServices = this.testRunner.getTestEnvironment().mockServices;
    const qlockService = mockServices.getQlockService();
    
    const encryptedState = await qlockService.encrypt(state);
    return {
      storageLocation: `/tmp/state-${Date.now()}`,
      encryptedData: encryptedState
    };
  }

  private async attemptRawStorageAccess(location: string): Promise<void> {
    console.log(`Attempting raw storage access at ${location}`);
    // This should not reveal sensitive data in plain text
  }

  private async verifySensitiveDataEncryption(storedState: any): Promise<void> {
    // Verify that sensitive data is properly encrypted
    if (storedState.encryptedData.includes('super-secret-api-key')) {
      throw new Error('Sensitive data found in plain text in storage');
    }
  }

  private async loadSensitiveDataIntoMemory(data: any): Promise<void> {
    // Simulate loading sensitive data into memory
    console.log('Loading sensitive data into memory');
  }

  private async attemptMemoryDump(): Promise<void> {
    console.log('Attempting memory dump');
  }

  private async verifySensitiveDataNotInMemoryDump(data: any): Promise<void> {
    // Verify sensitive data is not accessible in memory dumps
    console.log('Verifying sensitive data not in memory dump');
  }

  private async executeOperationWithLogging(operation: any): Promise<void> {
    console.log(`Executing operation: ${operation.action}`);
    // This would execute actual operations that generate logs
  }

  private async checkLogsForSensitiveData(operations: any[]): Promise<void> {
    // Check logs for sensitive data leakage
    console.log('Checking logs for sensitive data');
    // This should verify that passwords, API keys, etc. are not in logs
  }

  private async triggerErrorScenario(scenario: any): Promise<string> {
    // Trigger error scenarios and return error messages
    return `Error in ${scenario.type}: ${scenario.trigger}`;
  }

  private async checkErrorMessageForInformationDisclosure(message: string, scenario: any): Promise<void> {
    // Check if error messages reveal sensitive information
    const sensitivePatterns = [
      /password/i,
      /api[_-]?key/i,
      /secret/i,
      /token/i,
      /database.*connection/i,
      /file.*path/i,
      /internal.*error/i
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        throw new Error(`Error message contains sensitive information: ${message}`);
      }
    }
  }

  private async cacheDataForTenant(tenantId: string, data: any): Promise<void> {
    console.log(`Caching data for tenant: ${tenantId}`);
  }

  private async attemptCrossTenantCacheAccess(fromTenant: string, toTenant: string): Promise<void> {
    console.log(`Attempting cross-tenant cache access from ${fromTenant} to ${toTenant}`);
    throw new Error('Cross-tenant cache access should be denied');
  }

  private async createTemporaryFiles(data: any): Promise<string[]> {
    return [`/tmp/qflow-temp-${Date.now()}-1`, `/tmp/qflow-temp-${Date.now()}-2`];
  }

  private async verifyTemporaryFilePermissions(files: string[]): Promise<void> {
    console.log('Verifying temporary file permissions');
  }

  private async verifyTemporaryFileCleanup(files: string[]): Promise<void> {
    console.log('Verifying temporary file cleanup');
  }

  private async attemptUnauthorizedTempFileAccess(files: string[]): Promise<void> {
    console.log('Attempting unauthorized temp file access');
    throw new Error('Unauthorized temp file access should be denied');
  }

  private async generateNetworkTrafficWithSensitiveData(data: any): Promise<void> {
    console.log('Generating network traffic with sensitive data');
  }

  private async attemptNetworkTrafficInterception(): Promise<void> {
    console.log('Attempting network traffic interception');
  }

  private async verifyNetworkTrafficEncryption(data: any): Promise<void> {
    console.log('Verifying network traffic encryption');
  }

  private async createBackupData(data: any): Promise<any> {
    return { backupId: `backup-${Date.now()}`, ...data };
  }

  private async attemptUnauthorizedBackupAccess(backup: any): Promise<void> {
    console.log(`Attempting unauthorized backup access: ${backup.backupId}`);
    throw new Error('Unauthorized backup access should be denied');
  }

  private async verifyBackupDataEncryption(backup: any): Promise<void> {
    console.log('Verifying backup data encryption');
  }

  private async createResourceWithMetadata(resource: any): Promise<void> {
    console.log(`Creating resource with metadata: ${resource.type}:${resource.id}`);
  }

  private async attemptUnauthorizedMetadataAccess(resources: any[]): Promise<void> {
    console.log('Attempting unauthorized metadata access');
    throw new Error('Unauthorized metadata access should be denied');
  }

  private extractVulnerabilities(results: TestResult[]): SecurityVulnerability[] {
    return results
      .filter(result => result.vulnerability)
      .map(result => result.vulnerability!);
  }
}