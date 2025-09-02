# Documentation Consolidation Testing Suite

This comprehensive testing suite validates the documentation consolidation and video script generation system for the Q ecosystem.

## Overview

The testing suite covers all aspects of the documentation consolidation system:

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing  
- **Quality Tests**: Content validation and consistency
- **CI/CD Tests**: Automated pipeline integration

## Test Structure

```
tests/docs-consolidation/
├── unit/                           # Unit tests for individual components
│   ├── ScriptGenerator.test.mjs           # Video script generation logic
│   ├── ModuleDocumentationNormalizer.test.mjs  # Document normalization
│   ├── ContentExtractionEngine.test.mjs   # Content analysis and extraction
│   └── DocsValidator.test.mjs             # Validation and quality checks
├── integration/                    # Integration tests
│   └── DocumentationFlow.test.mjs        # End-to-end documentation pipeline
├── quality/                        # Content quality tests
│   └── ContentQuality.test.mjs           # Completeness, links, language consistency
├── ci/                            # CI/CD integration tests
│   └── CIIntegration.test.mjs            # Automated pipeline testing
├── setup/                         # Test utilities and helpers
│   └── test-helpers.mjs                  # Common test utilities and mock data
└── README.md                      # This file
```

## Running Tests

### Quick Start

```bash
# Run all documentation consolidation tests
npm run test:docs-consolidation

# Run tests with coverage
npm run test:docs-consolidation:coverage

# Run tests in watch mode
npm run test:docs-consolidation:watch

# Run comprehensive test suite with reporting
node scripts/run-docs-consolidation-tests.mjs
```

### Individual Test Suites

```bash
# Unit tests only
npx vitest run tests/docs-consolidation/unit/

# Integration tests only  
npx vitest run tests/docs-consolidation/integration/

# Quality tests only
npx vitest run tests/docs-consolidation/quality/

# CI tests only
npx vitest run tests/docs-consolidation/ci/
```

### CI/CD Mode

```bash
# Run in CI mode (exits with error code on failure)
node scripts/run-docs-consolidation-tests.mjs --ci

# Verbose output
node scripts/run-docs-consolidation-tests.mjs --verbose
```

## Test Coverage

The test suite aims for comprehensive coverage of:

### Components Tested

- **ScriptGenerator**: Video script generation for global and module content
- **ModuleDocumentationNormalizer**: Document structure normalization and metadata management
- **ContentExtractionEngine**: Content analysis, key point extraction, and summarization
- **DocsValidator**: Structure validation, accessibility checks, and quality assurance

### Coverage Targets

- **Lines**: ≥70%
- **Functions**: ≥70% 
- **Branches**: ≥70%
- **Statements**: ≥70%

### Quality Metrics

- **Test Success Rate**: ≥95%
- **Performance**: Script generation <30s, Document processing <15s
- **Accessibility**: Zero accessibility errors
- **Link Integrity**: Zero broken links

## Test Categories

### Unit Tests

Test individual functions and methods in isolation:

- **ScriptGenerator**: Template loading, content extraction, script assembly, validation
- **ModuleDocumentationNormalizer**: Document parsing, metadata handling, structure normalization
- **ContentExtractionEngine**: Key point extraction, content analysis, summarization
- **DocsValidator**: Validation rules, error detection, reporting

### Integration Tests

Test complete workflows and component interactions:

- **Documentation Flow**: Raw files → normalized structure → video scripts
- **Cross-Module Integration**: Module discovery and relationship mapping
- **Bilingual Consistency**: English/Spanish content parity
- **Error Recovery**: Graceful handling of partial failures

### Quality Tests

Validate content quality and consistency:

- **Completeness**: Required sections, metadata, content depth
- **Link Validation**: Internal links, cross-references, anchor links
- **Language Consistency**: Terminology, structure, bilingual parity
- **Content Extraction**: Key point quality, coherence, relevance

### CI/CD Tests

Validate automated pipeline integration:

- **Test Execution**: Automated test running and reporting
- **Performance Benchmarking**: Speed and efficiency metrics
- **Quality Gates**: Coverage thresholds, success rates
- **Deployment Readiness**: Artifact validation, rollback procedures

## Mock Data and Helpers

The test suite includes comprehensive mock data and utilities:

### Mock File System

```javascript
import { mockFileSystem } from './setup/test-helpers.mjs';

const mockFS = mockFileSystem.createMockFS({
  'docs/modules/qwallet/README.md': sampleContent.moduleDoc('qwallet'),
  'docs/global/vision-overview.md': sampleContent.globalDoc('Vision Overview')
});

mockFileSystem.setupFSMocks(mockFS, fs);
```

### Sample Content Generators

```javascript
import { sampleContent } from './setup/test-helpers.mjs';

// Generate module documentation
const moduleDoc = sampleContent.moduleDoc('qwallet', {
  features: ['Secure storage', 'Multi-chain support'],
  integrations: ['qindex', 'qerberos']
});

// Generate video scripts
const script = sampleContent.videoScript('Qwallet Overview', 'en', {
  duration: '3 minutes',
  sections: 5
});
```

### Validation Helpers

```javascript
import { validationHelpers } from './setup/test-helpers.mjs';

// Validate script structure
const validation = validationHelpers.validateScriptStructure(script);
expect(validation.isValid).toBe(true);

// Validate metadata completeness
const errors = validationHelpers.validateMetadata(metadata);
expect(errors).toHaveLength(0);
```

## Performance Testing

### Benchmarks

The test suite includes performance benchmarks for:

- **Script Generation**: Target <30 seconds for all scripts
- **Document Processing**: Target <15 seconds for all documents  
- **Content Extraction**: Target <1 second per document
- **Validation**: Target <5 seconds for comprehensive validation

### Load Testing

```javascript
// Test with large content
const largeContent = performanceHelpers.generateLargeContent(1000);
const { result, duration } = await performanceHelpers.measureTime(async () => {
  return await contentEngine.extractKeyPoints(largeContent);
});

expect(duration).toBeLessThan(1000); // 1 second threshold
```

## Error Scenarios

The test suite validates error handling for:

- **Missing Files**: Graceful handling of missing documentation
- **Malformed Content**: Invalid YAML, broken markdown, syntax errors
- **Network Issues**: Timeout handling, retry logic
- **Resource Constraints**: Memory limits, processing timeouts
- **Validation Failures**: Schema violations, content quality issues

## Continuous Integration

### GitHub Actions Workflow

The test suite integrates with GitHub Actions for:

- **Automated Testing**: Run on every push and pull request
- **Multi-Node Testing**: Test on Node.js 18.x and 20.x
- **Coverage Reporting**: Upload to Codecov
- **Performance Monitoring**: Track benchmark results
- **Quality Gates**: Enforce coverage and success rate thresholds

### Quality Gates

Tests must pass these gates for deployment:

1. **Test Success Rate**: ≥95%
2. **Coverage Thresholds**: All metrics ≥70%
3. **Performance Limits**: Within benchmark thresholds
4. **Security Scan**: No high/critical vulnerabilities
5. **Documentation Validation**: All structure and quality checks pass

## Troubleshooting

### Common Issues

**Tests failing locally but passing in CI:**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Clear node_modules and reinstall

**Coverage below thresholds:**
- Add tests for uncovered functions
- Test error paths and edge cases
- Verify test files are included in coverage

**Performance benchmarks failing:**
- Check system resources
- Optimize slow operations
- Adjust thresholds if needed

**Mock data issues:**
- Verify mock file system setup
- Check sample content generators
- Validate test helper imports

### Debug Mode

```bash
# Run with debug output
DEBUG=* npm run test:docs-consolidation

# Run specific test with verbose output
npx vitest run tests/docs-consolidation/unit/ScriptGenerator.test.mjs --reporter=verbose
```

## Contributing

When adding new tests:

1. **Follow naming conventions**: `ComponentName.test.mjs`
2. **Use test helpers**: Leverage existing mock data and utilities
3. **Add performance tests**: For new components or significant changes
4. **Update coverage**: Ensure new code is tested
5. **Document test cases**: Add clear descriptions and comments

### Test Template

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockFileSystem, sampleContent } from '../setup/test-helpers.mjs';

describe('ComponentName', () => {
  let component;
  
  beforeEach(() => {
    component = new ComponentName();
    vi.clearAllMocks();
  });

  describe('Feature Group', () => {
    it('should handle normal case', async () => {
      // Arrange
      const input = sampleContent.moduleDoc('test');
      
      // Act
      const result = await component.process(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle error case', async () => {
      // Test error scenarios
    });
  });
});
```

## Reporting

Test results are automatically generated in multiple formats:

- **JSON Report**: `test-results/docs-consolidation-test-report.json`
- **Markdown Report**: `test-results/docs-consolidation-test-report.md`
- **Coverage Report**: `test-results/docs-consolidation-coverage-report.json`
- **CI Dashboard**: Integration with GitHub Actions summary

Reports include:
- Test execution summary
- Coverage analysis
- Performance benchmarks
- Quality recommendations
- Environment information

---

For questions or issues with the testing suite, please refer to the main project documentation or create an issue in the repository.