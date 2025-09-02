/**
 * Simple DocumentationGenerator Integration Test
 */

import { DocumentationGenerator } from './services/DocumentationGenerator.mjs';
import fs from 'fs/promises';
import path from 'path';

async function testDocumentationGenerator() {
  console.log('Testing DocumentationGenerator...');

  const tempDir = path.join(process.cwd(), 'test-docs-output');
  
  try {
    // Clean up any existing test directory
    await fs.rm(tempDir, { recursive: true, force: true });

    // Create DocumentationGenerator
    const docGen = new DocumentationGenerator({
      outputPath: tempDir,
      artifactsPath: path.join(tempDir, 'artifacts'),
      diagramsPath: path.join(tempDir, 'diagrams')
    });

    // Initialize
    console.log('Initializing DocumentationGenerator...');
    await docGen.initialize();
    console.log('✓ Initialization successful');

    // Test Pi documentation generation
    console.log('Generating Pi documentation (EN)...');
    const piEnResult = await docGen.generatePiDocumentation('en');
    console.log('✓ Pi EN documentation:', piEnResult.success ? 'SUCCESS' : 'FAILED');
    if (piEnResult.success) {
      console.log(`  Generated ${piEnResult.filesGenerated} files in ${piEnResult.duration}ms`);
    }

    console.log('Generating Pi documentation (ES)...');
    const piEsResult = await docGen.generatePiDocumentation('es');
    console.log('✓ Pi ES documentation:', piEsResult.success ? 'SUCCESS' : 'FAILED');
    if (piEsResult.success) {
      console.log(`  Generated ${piEsResult.filesGenerated} files in ${piEsResult.duration}ms`);
    }

    // Test Demo documentation generation
    console.log('Generating Demo documentation (EN)...');
    const demoEnResult = await docGen.generateDemoDocumentation('en');
    console.log('✓ Demo EN documentation:', demoEnResult.success ? 'SUCCESS' : 'FAILED');
    if (demoEnResult.success) {
      console.log(`  Generated ${demoEnResult.filesGenerated} files in ${demoEnResult.duration}ms`);
    }

    // Test diagram generation
    console.log('Updating diagrams with metrics...');
    const diagramResult = await docGen.updateDiagramsWithRealMetrics();
    console.log('✓ Diagram generation:', diagramResult.success ? 'SUCCESS' : 'FAILED');
    if (diagramResult.success) {
      console.log(`  Updated ${diagramResult.diagramsUpdated} diagrams in ${diagramResult.duration}ms`);
    }

    // Test consistency validation
    console.log('Validating documentation consistency...');
    const validationResult = await docGen.validateDocumentationConsistency();
    console.log('✓ Consistency validation:', validationResult.success ? 'SUCCESS' : 'FAILED');
    if (validationResult.success) {
      console.log(`  Status: ${validationResult.status}, Score: ${validationResult.score}/100, Parity: ${validationResult.bilingualParity}%`);
    }

    // Verify files were created
    console.log('Verifying generated files...');
    const expectedFiles = [
      'pi/en/wallet-integration.md',
      'pi/en/README.md',
      'pi/es/integracion-wallet.md',
      'pi/es/README.md',
      'demo/en/setup-guide.md',
      'demo/en/README.md',
      'diagrams/pi-integration-flow.mermaid',
      'diagrams/system-architecture.mermaid'
    ];

    let filesFound = 0;
    for (const file of expectedFiles) {
      const filePath = path.join(tempDir, file);
      try {
        await fs.access(filePath);
        filesFound++;
        console.log(`  ✓ ${file}`);
      } catch (error) {
        console.log(`  ✗ ${file} - NOT FOUND`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Files expected: ${expectedFiles.length}`);
    console.log(`  Files found: ${filesFound}`);
    console.log(`  Success rate: ${Math.round((filesFound / expectedFiles.length) * 100)}%`);

    if (filesFound === expectedFiles.length) {
      console.log('\n🎉 All tests passed! DocumentationGenerator is working correctly.');
    } else {
      console.log('\n⚠️  Some files were not generated. Check the implementation.');
    }

    // Show directory structure
    console.log('\n📁 Generated directory structure:');
    await showDirectoryStructure(tempDir, '');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function showDirectoryStructure(dir, indent) {
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items.slice(0, 10)) { // Limit to first 10 items
      console.log(`${indent}${item.isDirectory() ? '📁' : '📄'} ${item.name}`);
      if (item.isDirectory() && indent.length < 6) { // Limit depth
        await showDirectoryStructure(path.join(dir, item.name), indent + '  ');
      }
    }
    if (items.length > 10) {
      console.log(`${indent}... and ${items.length - 10} more items`);
    }
  } catch (error) {
    console.log(`${indent}❌ Error reading directory: ${error.message}`);
  }
}

// Run the test
testDocumentationGenerator().catch(console.error);