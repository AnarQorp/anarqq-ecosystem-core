# Qwallet Identity Expansion Test Suite

This directory contains comprehensive tests for the Qwallet Identity Expansion feature, covering all aspects of wallet functionality across different identity types.

## Test Structure

```
src/__tests__/
├── utils/
│   └── qwallet-test-utils.ts          # Common test utilities and helpers
├── integration/
│   ├── qwallet-identity-switching.test.ts    # Identity switching integration tests
│   └── identity-ecosystem-integration.test.ts # Ecosystem integration tests
├── e2e/
│   └── qwallet-end-to-end.test.tsx           # End-to-end user journey tests
├── performance/
│   ├── qwallet-performance.test.ts           # Performance and load tests
│   └── identity-load-testing.test.ts         # Identity-specific load tests
├── security/
│   └── qwallet-security-permissions.test.ts  # Security and permissions tests
└── README.md                                  # This file
```

## Component Tests

Located in `src/components/qwallet/__tests__/`:

- **QwalletDashboard.test.tsx**: Main dashboard component tests
- **TokenTransferForm.test.tsx**: Token transfer form tests
- **PiWalletInterface.test.tsx**: Pi Wallet integration tests
- **NFTGallery.test.tsx**: NFT gallery and management tests
- **TransactionHistory.test.tsx**: Transaction history display tests
- **WalletErrorDisplay.test.tsx**: Error handling and display tests
- **EmergencyControlsDashboard.test.tsx**: Emergency controls tests
- **AuditStatusDisplay.test.tsx**: Audit status and logging tests

## Hook Tests

Located in `src/hooks/__tests__/`:

- **useIdentityQwallet.test.ts**: Core identity wallet hook tests
- **useQwalletPlugins.test.ts**: Plugin management hook tests
- **useQwalletState.test.ts**: Wallet state management tests
- **useWalletAudit.test.ts**: Audit logging hook tests
- **useWalletErrorHandler.test.ts**: Error handling hook tests
- **useEmergencyControls.test.ts**: Emergency controls hook tests
- **usePiWallet.test.ts**: Pi Wallet integration hook tests
- **useSandboxWallet.test.ts**: Sandbox wallet hook tests
- **useQonsentWallet.test.ts**: Qonsent integration hook tests
- **useQlockWallet.test.ts**: Qlock integration hook tests

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual components and functions in isolation.

**Coverage**:
- Component rendering and props handling
- User interactions (clicks, form submissions, etc.)
- State management and updates
- Error handling and edge cases
- Accessibility features
- Identity-specific behavior

**Example**:
```typescript
it('should show full access for ROOT identity', () => {
  mockUseSquidContext.mockReturnValue({
    currentSquid: { identityType: IdentityType.ROOT }
  });

  render(<QwalletDashboard />);
  
  expect(screen.getByText('Send Tokens')).toBeInTheDocument();
  expect(screen.getByText('Receive')).toBeInTheDocument();
});
```

### 2. Integration Tests

**Purpose**: Test interactions between multiple components and services.

**Coverage**:
- Identity switching workflows
- Cross-service communication (Qonsent, Qlock, Qerberos)
- Data flow between components
- API integration
- Error propagation and recovery

**Example**:
```typescript
it('should switch from ROOT to DAO identity with proper context updates', async () => {
  const result = await identitySwitcher.switchIdentity(mockRootIdentity, mockDAOIdentity);
  
  expect(result.success).toBe(true);
  expect(result.newContext.permissions.requiresGovernance).toBe(true);
});
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows from start to finish.

**Coverage**:
- Complete wallet operations (dashboard → transfer → confirmation)
- Multi-step processes (Pi Wallet linking, NFT transfers)
- Cross-component state consistency
- Error recovery workflows
- Identity-specific user journeys

**Example**:
```typescript
it('should complete full wallet workflow from dashboard to transfer', async () => {
  // Step 1: Render dashboard
  render(<QwalletDashboard />);
  
  // Step 2: Navigate to transfer
  fireEvent.click(screen.getByRole('button', { name: 'Send Tokens' }));
  
  // Step 3: Complete transfer
  // ... test implementation
});
```

### 4. Performance Tests

**Purpose**: Ensure the application performs well under various conditions.

**Coverage**:
- Identity switching performance
- Large dataset handling
- Memory usage optimization
- Concurrent user simulation
- API response time optimization
- Resource cleanup

**Example**:
```typescript
it('should switch identities within acceptable time limits', async () => {
  const results = [];
  
  for (let i = 0; i < 10; i++) {
    const result = await identitySwitcher.switchIdentity(fromIdentity, toIdentity);
    results.push(result.switchTime);
  }
  
  const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
  expect(averageTime).toBeLessThan(200); // Under 200ms
});
```

### 5. Security Tests

**Purpose**: Validate security controls and prevent unauthorized access.

**Coverage**:
- Identity validation and authentication
- Permission-based access controls
- Transaction security (signatures, validation)
- Input sanitization and validation
- Rate limiting and abuse prevention
- Audit trail integrity

**Example**:
```typescript
it('should reject operations from inactive identities', async () => {
  const result = await walletService.transferTokens(inactiveIdentity, transferData);
  
  expect(result.success).toBe(false);
  expect(result.error).toBe('Identity is not active');
});
```

## Identity Types Tested

### ROOT Identity
- **Permissions**: Full wallet access, plugin management, external linking
- **Features**: All wallet operations, unlimited daily limits, all token types
- **Tests**: Complete functionality, admin features, security controls

### DAO Identity
- **Permissions**: DAO-specific access, governance requirements, limited plugins
- **Features**: Governance-controlled transfers, DAO tokens, voting integration
- **Tests**: Governance workflows, token restrictions, collective decision making

### ENTERPRISE Identity
- **Permissions**: Business-focused access, enterprise plugins, compliance features
- **Features**: Business tokens, compliance reporting, enterprise integrations
- **Tests**: Business workflows, compliance requirements, enterprise features

### CONSENTIDA Identity
- **Permissions**: View-only access, guardian approval requirements
- **Features**: Balance viewing, guardian-approved operations, educational features
- **Tests**: Guardian workflows, restricted operations, educational content

### AID Identity
- **Permissions**: Anonymous access, single token support, ephemeral sessions
- **Features**: Privacy-focused operations, limited functionality, temporary sessions
- **Tests**: Privacy preservation, session management, limited functionality

## Running Tests

### All Tests
```bash
npm run test:qwallet
# or
./scripts/run-qwallet-tests.sh
```

### Specific Categories
```bash
# Unit tests only
./scripts/run-qwallet-tests.sh unit

# Integration tests only
./scripts/run-qwallet-tests.sh integration

# End-to-end tests only
./scripts/run-qwallet-tests.sh e2e

# Performance tests only
./scripts/run-qwallet-tests.sh performance

# Security tests only
./scripts/run-qwallet-tests.sh security

# Coverage analysis only
./scripts/run-qwallet-tests.sh coverage
```

### Individual Test Files
```bash
# Specific component test
npx vitest run src/components/qwallet/__tests__/QwalletDashboard.test.tsx

# Specific hook test
npx vitest run src/hooks/__tests__/useIdentityQwallet.test.ts

# Watch mode for development
npx vitest watch src/components/qwallet/__tests__/TokenTransferForm.test.tsx
```

## Test Configuration

### Vitest Configuration
- **File**: `vitest.qwallet.config.ts`
- **Environment**: jsdom (for React component testing)
- **Coverage**: v8 provider with HTML, LCOV, and JSON reports
- **Thresholds**: 85% overall, 95% for critical components

### Coverage Thresholds
- **Global**: 85% lines, functions, branches, statements
- **Critical Components**: 95% (TokenTransferForm, useIdentityQwallet)
- **API Layer**: 90% (qwallet.ts)

## Test Utilities

### Mock Factories
```typescript
// Create mock identities
const rootIdentity = createMockIdentity(IdentityType.ROOT);
const daoIdentity = createMockIdentity(IdentityType.DAO, { displayName: 'Custom DAO' });

// Create mock wallet data
const walletData = createMockWalletData(rootIdentity);

// Create mock API responses
const successResponse = createMockApiResponse(true, { balance: 1000 });
const errorResponse = createMockApiResponse(false, null, 'Network error');
```

### Test Data Generators
```typescript
// Generate test transactions
const transactions = generateMockTransactions(50);

// Generate test NFTs
const nfts = generateMockNFTs(10);

// Create malicious inputs for security testing
const maliciousInputs = createMaliciousInputs();
```

### Performance Helpers
```typescript
// Measure operation performance
const { result, duration } = await measurePerformance(async () => {
  return await walletService.transferTokens(identity, transferData);
});

expect(duration).toBeLessThan(200);
```

## Best Practices

### Test Organization
1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the expected behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Clean up after tests** using `beforeEach` and `afterEach`

### Mocking Strategy
1. **Mock external dependencies** (APIs, services)
2. **Use factory functions** for consistent test data
3. **Mock at the boundary** (API layer, not internal functions)
4. **Verify mock interactions** when testing side effects

### Identity Testing
1. **Test all identity types** for each feature
2. **Verify permission enforcement** for restricted operations
3. **Test identity switching** scenarios
4. **Validate audit logging** for all operations

### Error Testing
1. **Test error states** for all user-facing operations
2. **Verify error recovery** mechanisms
3. **Test network failure** scenarios
4. **Validate error messages** are user-friendly

### Performance Testing
1. **Set realistic thresholds** based on user expectations
2. **Test with large datasets** to identify bottlenecks
3. **Monitor memory usage** during long-running operations
4. **Test concurrent operations** for race conditions

### Security Testing
1. **Test with malicious inputs** to prevent injection attacks
2. **Verify permission boundaries** are enforced
3. **Test rate limiting** mechanisms
4. **Validate audit trail** completeness

## Continuous Integration

### Pre-commit Hooks
- Run unit tests for changed files
- Verify test coverage thresholds
- Lint test files for consistency

### CI Pipeline
1. **Unit Tests**: Fast feedback on individual components
2. **Integration Tests**: Verify component interactions
3. **E2E Tests**: Validate complete user workflows
4. **Performance Tests**: Monitor for regressions
5. **Security Tests**: Validate security controls
6. **Coverage Report**: Ensure adequate test coverage

### Quality Gates
- **All tests must pass** before merge
- **Coverage thresholds** must be met
- **Performance benchmarks** must not regress
- **Security tests** must pass without violations

## Troubleshooting

### Common Issues

#### Test Timeouts
```typescript
// Increase timeout for slow operations
it('should handle large dataset', async () => {
  // ... test implementation
}, 15000); // 15 second timeout
```

#### Mock Issues
```typescript
// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

// Restore original implementations
afterEach(() => {
  vi.restoreAllMocks();
});
```

#### Async Testing
```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// Use act for state updates
await act(async () => {
  await result.current.actions.transferTokens(transferData);
});
```

### Debugging Tests
1. **Use `screen.debug()`** to see rendered output
2. **Add `console.log`** statements for debugging
3. **Use `--reporter=verbose`** for detailed output
4. **Run single tests** with `--run` flag for faster iteration

## Contributing

### Adding New Tests
1. **Follow naming conventions**: `ComponentName.test.tsx` or `hookName.test.ts`
2. **Use test utilities** from `qwallet-test-utils.ts`
3. **Include all identity types** when testing permissions
4. **Add performance benchmarks** for new operations
5. **Include security tests** for new features

### Updating Existing Tests
1. **Maintain backward compatibility** when possible
2. **Update coverage thresholds** if needed
3. **Add regression tests** for bug fixes
4. **Update documentation** for significant changes

### Test Review Checklist
- [ ] Tests cover all identity types
- [ ] Error cases are tested
- [ ] Performance implications considered
- [ ] Security aspects validated
- [ ] Accessibility features tested
- [ ] Documentation updated
- [ ] Coverage thresholds met