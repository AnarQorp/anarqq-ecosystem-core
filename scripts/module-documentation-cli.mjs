#!/usr/bin/env node

/**
 * Module Documentation CLI Tool
 * Command-line interface for managing module documentation
 */

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

// Import the documentation service
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import to handle ES modules
let moduleDocumentationService;
try {
  const serviceModule = await import('../src/services/ModuleDocumentationService.ts');
  moduleDocumentationService = serviceModule.moduleDocumentationService;
} catch (error) {
  console.error(chalk.red('Error importing ModuleDocumentationService:'), error.message);
  process.exit(1);
}

const program = new Command();

program
  .name('module-docs')
  .description('CLI tool for managing module documentation')
  .version('1.0.0');

// Upload documentation command
program
  .command('upload')
  .description('Upload documentation for a module')
  .requiredOption('-m, --module <moduleId>', 'Module ID')
  .requiredOption('-v, --version <version>', 'Documentation version')
  .requiredOption('-f, --file <path>', 'Path to documentation file')
  .option('-t, --format <format>', 'Documentation format (markdown, html, pdf)', 'markdown')
  .option('-l, --language <language>', 'Documentation language', 'en')
  .option('-a, --author <author>', 'Documentation author')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--no-index', 'Skip generating search index')
  .action(async (options) => {
    const spinner = ora('Uploading documentation...').start();
    
    try {
      // Read documentation file
      const filePath = path.resolve(options.file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Parse tags
      const tags = options.tags ? options.tags.split(',').map(tag => tag.trim()) : [];
      
      // Upload documentation
      const result = await moduleDocumentationService.uploadDocumentation(content, {
        moduleId: options.module,
        version: options.version,
        format: options.format,
        language: options.language,
        author: options.author,
        tags,
        generateSearchIndex: options.index
      });
      
      spinner.succeed('Documentation uploaded successfully!');
      
      console.log(chalk.green('\nUpload Details:'));
      console.log(`  CID: ${chalk.cyan(result.cid)}`);
      console.log(`  Title: ${chalk.cyan(result.metadata.title)}`);
      console.log(`  Size: ${chalk.cyan((result.metadata.size / 1024).toFixed(1))} KB`);
      console.log(`  Checksum: ${chalk.gray(result.metadata.checksum)}`);
      
    } catch (error) {
      spinner.fail('Failed to upload documentation');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Download documentation command
program
  .command('download')
  .description('Download documentation by CID')
  .requiredOption('-c, --cid <cid>', 'Documentation CID')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <format>', 'Output format (raw, parsed, metadata-only)', 'raw')
  .action(async (options) => {
    const spinner = ora('Downloading documentation...').start();
    
    try {
      // Download documentation
      const result = await moduleDocumentationService.retrieveDocumentation(options.cid, {
        format: options.format,
        includeSearchIndex: false
      });
      
      // Determine output path
      let outputPath = options.output;
      if (!outputPath) {
        const extension = result.metadata.format === 'html' ? 'html' : 'md';
        outputPath = `${result.metadata.moduleId}-docs-${result.metadata.version}.${extension}`;
      }
      
      // Write content to file
      await fs.writeFile(outputPath, result.content);
      
      spinner.succeed('Documentation downloaded successfully!');
      
      console.log(chalk.green('\nDownload Details:'));
      console.log(`  File: ${chalk.cyan(outputPath)}`);
      console.log(`  Title: ${chalk.cyan(result.metadata.title)}`);
      console.log(`  Version: ${chalk.cyan(result.metadata.version)}`);
      console.log(`  Format: ${chalk.cyan(result.metadata.format)}`);
      
    } catch (error) {
      spinner.fail('Failed to download documentation');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Validate documentation command
program
  .command('validate')
  .description('Validate documentation CID')
  .requiredOption('-c, --cid <cid>', 'Documentation CID to validate')
  .action(async (options) => {
    const spinner = ora('Validating documentation...').start();
    
    try {
      const result = await moduleDocumentationService.validateDocumentationCID(options.cid);
      
      if (result.valid && result.available) {
        spinner.succeed('Documentation is valid and available!');
        
        console.log(chalk.green('\nValidation Results:'));
        console.log(`  Valid: ${chalk.green('✓')}`);
        console.log(`  Available: ${chalk.green('✓')}`);
        
        if (result.metadata) {
          console.log(`  Title: ${chalk.cyan(result.metadata.title)}`);
          console.log(`  Module: ${chalk.cyan(result.metadata.moduleId)}`);
          console.log(`  Version: ${chalk.cyan(result.metadata.version)}`);
          console.log(`  Size: ${chalk.cyan((result.metadata.size / 1024).toFixed(1))} KB`);
        }
        
        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach(warning => {
            console.log(`  ${chalk.yellow('⚠')} ${warning}`);
          });
        }
        
      } else {
        spinner.fail('Documentation validation failed');
        
        console.log(chalk.red('\nValidation Results:'));
        console.log(`  Valid: ${result.valid ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  Available: ${result.available ? chalk.green('✓') : chalk.red('✗')}`);
        
        if (result.errors.length > 0) {
          console.log(chalk.red('\nErrors:'));
          result.errors.forEach(error => {
            console.log(`  ${chalk.red('✗')} ${error}`);
          });
        }
        
        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach(warning => {
            console.log(`  ${chalk.yellow('⚠')} ${warning}`);
          });
        }
      }
      
    } catch (error) {
      spinner.fail('Validation failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// List versions command
program
  .command('versions')
  .description('List documentation versions for a module')
  .requiredOption('-m, --module <moduleId>', 'Module ID')
  .action(async (options) => {
    const spinner = ora('Loading documentation versions...').start();
    
    try {
      const versions = await moduleDocumentationService.getDocumentationVersions(options.module);
      
      if (versions.length === 0) {
        spinner.warn('No documentation versions found');
        return;
      }
      
      spinner.succeed(`Found ${versions.length} documentation version(s)`);
      
      console.log(chalk.green('\nDocumentation Versions:'));
      versions.forEach((version, index) => {
        const isDeprecated = version.deprecated;
        const versionColor = isDeprecated ? chalk.gray : chalk.cyan;
        const statusBadge = isDeprecated ? chalk.red('[DEPRECATED]') : chalk.green('[ACTIVE]');
        
        console.log(`\n  ${index + 1}. ${versionColor(version.version)} ${statusBadge}`);
        console.log(`     CID: ${chalk.gray(version.cid)}`);
        console.log(`     Title: ${version.metadata.title}`);
        console.log(`     Created: ${new Date(version.createdAt).toLocaleDateString()}`);
        console.log(`     Size: ${(version.metadata.size / 1024).toFixed(1)} KB`);
        
        if (version.metadata.tags.length > 0) {
          console.log(`     Tags: ${version.metadata.tags.join(', ')}`);
        }
      });
      
    } catch (error) {
      spinner.fail('Failed to load versions');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Search documentation command
program
  .command('search')
  .description('Search documentation across modules')
  .requiredOption('-q, --query <query>', 'Search query')
  .option('-m, --modules <modules>', 'Comma-separated module IDs to search')
  .option('-v, --version <version>', 'Specific version to search')
  .option('-l, --language <language>', 'Documentation language')
  .option('--tags <tags>', 'Comma-separated tags to filter by')
  .option('--limit <limit>', 'Maximum number of results', '10')
  .action(async (options) => {
    const spinner = ora('Searching documentation...').start();
    
    try {
      const moduleIds = options.modules ? options.modules.split(',').map(id => id.trim()) : undefined;
      const tags = options.tags ? options.tags.split(',').map(tag => tag.trim()) : undefined;
      
      const results = await moduleDocumentationService.searchDocumentation(options.query, {
        moduleIds,
        version: options.version,
        language: options.language,
        tags,
        limit: parseInt(options.limit)
      });
      
      if (results.length === 0) {
        spinner.warn('No documentation found matching your search');
        return;
      }
      
      spinner.succeed(`Found ${results.length} result(s)`);
      
      console.log(chalk.green('\nSearch Results:'));
      results.forEach((result, index) => {
        console.log(`\n  ${index + 1}. ${chalk.cyan(result.title)}`);
        console.log(`     Module: ${result.moduleId} (v${result.version})`);
        console.log(`     CID: ${chalk.gray(result.cid)}`);
        console.log(`     Relevance: ${chalk.yellow(result.relevanceScore.toFixed(1))}`);
        console.log(`     Excerpt: ${chalk.gray(result.excerpt.substring(0, 100))}...`);
        
        if (result.matchedSections.length > 0) {
          console.log(`     Matched sections: ${result.matchedSections.length}`);
        }
      });
      
    } catch (error) {
      spinner.fail('Search failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Update documentation command
program
  .command('update')
  .description('Update documentation to a new version')
  .requiredOption('-m, --module <moduleId>', 'Module ID')
  .requiredOption('-v, --version <version>', 'New version')
  .requiredOption('-f, --file <path>', 'Path to updated documentation file')
  .option('-t, --format <format>', 'Documentation format (markdown, html, pdf)', 'markdown')
  .option('-l, --language <language>', 'Documentation language', 'en')
  .option('-a, --author <author>', 'Documentation author')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(async (options) => {
    const spinner = ora('Updating documentation...').start();
    
    try {
      // Read documentation file
      const filePath = path.resolve(options.file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Parse tags
      const tags = options.tags ? options.tags.split(',').map(tag => tag.trim()) : [];
      
      // Update documentation
      const result = await moduleDocumentationService.updateDocumentation(
        options.module,
        options.version,
        content,
        {
          format: options.format,
          language: options.language,
          author: options.author,
          tags,
          generateSearchIndex: true
        }
      );
      
      spinner.succeed('Documentation updated successfully!');
      
      console.log(chalk.green('\nUpdate Details:'));
      console.log(`  CID: ${chalk.cyan(result.cid)}`);
      console.log(`  Title: ${chalk.cyan(result.metadata.title)}`);
      console.log(`  Version: ${chalk.cyan(result.metadata.version)}`);
      console.log(`  Size: ${chalk.cyan((result.metadata.size / 1024).toFixed(1))} KB`);
      
    } catch (error) {
      spinner.fail('Failed to update documentation');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Deprecate version command
program
  .command('deprecate')
  .description('Deprecate a documentation version')
  .requiredOption('-m, --module <moduleId>', 'Module ID')
  .requiredOption('-v, --version <version>', 'Version to deprecate')
  .action(async (options) => {
    // Confirm deprecation
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Are you sure you want to deprecate version ${options.version} of ${options.module}?`,
        default: false
      }
    ]);
    
    if (!confirmed) {
      console.log(chalk.yellow('Deprecation cancelled'));
      return;
    }
    
    const spinner = ora('Deprecating documentation version...').start();
    
    try {
      const result = await moduleDocumentationService.deprecateDocumentationVersion(
        options.module,
        options.version
      );
      
      if (result) {
        spinner.succeed('Documentation version deprecated successfully!');
        console.log(chalk.green(`\nVersion ${options.version} of ${options.module} has been deprecated`));
      } else {
        spinner.fail('Failed to deprecate documentation version');
        console.log(chalk.red('Version not found or already deprecated'));
      }
      
    } catch (error) {
      spinner.fail('Deprecation failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Interactive mode command
program
  .command('interactive')
  .alias('i')
  .description('Interactive documentation management')
  .action(async () => {
    console.log(chalk.blue('\n🔧 Module Documentation Manager\n'));
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '📤 Upload new documentation', value: 'upload' },
          { name: '📥 Download documentation', value: 'download' },
          { name: '✅ Validate documentation CID', value: 'validate' },
          { name: '📋 List module versions', value: 'versions' },
          { name: '🔍 Search documentation', value: 'search' },
          { name: '🔄 Update documentation', value: 'update' },
          { name: '⚠️  Deprecate version', value: 'deprecate' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);
    
    if (action === 'exit') {
      console.log(chalk.blue('Goodbye! 👋'));
      return;
    }
    
    // Handle each action with prompts
    switch (action) {
      case 'upload':
        await handleInteractiveUpload();
        break;
      case 'download':
        await handleInteractiveDownload();
        break;
      case 'validate':
        await handleInteractiveValidate();
        break;
      case 'versions':
        await handleInteractiveVersions();
        break;
      case 'search':
        await handleInteractiveSearch();
        break;
      case 'update':
        await handleInteractiveUpdate();
        break;
      case 'deprecate':
        await handleInteractiveDeprecate();
        break;
    }
  });

// Interactive handlers
async function handleInteractiveUpload() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'moduleId', message: 'Module ID:', validate: input => input.length > 0 },
    { type: 'input', name: 'version', message: 'Version:', validate: input => input.length > 0 },
    { type: 'input', name: 'filePath', message: 'Documentation file path:', validate: input => input.length > 0 },
    { type: 'list', name: 'format', message: 'Format:', choices: ['markdown', 'html', 'pdf'], default: 'markdown' },
    { type: 'input', name: 'language', message: 'Language:', default: 'en' },
    { type: 'input', name: 'author', message: 'Author (optional):' },
    { type: 'input', name: 'tags', message: 'Tags (comma-separated, optional):' }
  ]);
  
  // Execute upload command
  await program.parseAsync(['node', 'module-docs', 'upload', 
    '-m', answers.moduleId,
    '-v', answers.version,
    '-f', answers.filePath,
    '-t', answers.format,
    '-l', answers.language,
    ...(answers.author ? ['-a', answers.author] : []),
    ...(answers.tags ? ['--tags', answers.tags] : [])
  ]);
}

async function handleInteractiveDownload() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'cid', message: 'Documentation CID:', validate: input => input.length > 0 },
    { type: 'input', name: 'output', message: 'Output file path (optional):' },
    { type: 'list', name: 'format', message: 'Output format:', choices: ['raw', 'parsed', 'metadata-only'], default: 'raw' }
  ]);
  
  await program.parseAsync(['node', 'module-docs', 'download',
    '-c', answers.cid,
    ...(answers.output ? ['-o', answers.output] : []),
    '-f', answers.format
  ]);
}

async function handleInteractiveValidate() {
  const { cid } = await inquirer.prompt([
    { type: 'input', name: 'cid', message: 'Documentation CID to validate:', validate: input => input.length > 0 }
  ]);
  
  await program.parseAsync(['node', 'module-docs', 'validate', '-c', cid]);
}

async function handleInteractiveVersions() {
  const { moduleId } = await inquirer.prompt([
    { type: 'input', name: 'moduleId', message: 'Module ID:', validate: input => input.length > 0 }
  ]);
  
  await program.parseAsync(['node', 'module-docs', 'versions', '-m', moduleId]);
}

async function handleInteractiveSearch() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'query', message: 'Search query:', validate: input => input.length > 0 },
    { type: 'input', name: 'modules', message: 'Module IDs (comma-separated, optional):' },
    { type: 'input', name: 'version', message: 'Specific version (optional):' },
    { type: 'input', name: 'language', message: 'Language (optional):' },
    { type: 'input', name: 'tags', message: 'Tags (comma-separated, optional):' },
    { type: 'number', name: 'limit', message: 'Maximum results:', default: 10 }
  ]);
  
  await program.parseAsync(['node', 'module-docs', 'search',
    '-q', answers.query,
    ...(answers.modules ? ['-m', answers.modules] : []),
    ...(answers.version ? ['-v', answers.version] : []),
    ...(answers.language ? ['-l', answers.language] : []),
    ...(answers.tags ? ['--tags', answers.tags] : []),
    '--limit', answers.limit.toString()
  ]);
}

async function handleInteractiveUpdate() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'moduleId', message: 'Module ID:', validate: input => input.length > 0 },
    { type: 'input', name: 'version', message: 'New version:', validate: input => input.length > 0 },
    { type: 'input', name: 'filePath', message: 'Updated documentation file path:', validate: input => input.length > 0 },
    { type: 'list', name: 'format', message: 'Format:', choices: ['markdown', 'html', 'pdf'], default: 'markdown' },
    { type: 'input', name: 'language', message: 'Language:', default: 'en' },
    { type: 'input', name: 'author', message: 'Author (optional):' },
    { type: 'input', name: 'tags', message: 'Tags (comma-separated, optional):' }
  ]);
  
  await program.parseAsync(['node', 'module-docs', 'update',
    '-m', answers.moduleId,
    '-v', answers.version,
    '-f', answers.filePath,
    '-t', answers.format,
    '-l', answers.language,
    ...(answers.author ? ['-a', answers.author] : []),
    ...(answers.tags ? ['--tags', answers.tags] : [])
  ]);
}

async function handleInteractiveDeprecate() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'moduleId', message: 'Module ID:', validate: input => input.length > 0 },
    { type: 'input', name: 'version', message: 'Version to deprecate:', validate: input => input.length > 0 }
  ]);
  
  await program.parseAsync(['node', 'module-docs', 'deprecate',
    '-m', answers.moduleId,
    '-v', answers.version
  ]);
}

// Error handling
program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s\nSee --help for a list of available commands.'), program.args.join(' '));
  process.exit(1);
});

// Parse command line arguments
program.parse();