#!/usr/bin/env node

/**
 * Module Template Generator CLI
 * 
 * Creates new Q ecosystem modules from the standardized template
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Validate module name
 */
function validateModuleName(name) {
  if (!name) {
    throw new Error('Module name is required');
  }

  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name)) {
    throw new Error('Module name must be kebab-case (lowercase letters, numbers, and hyphens only)');
  }

  if (name.length < 2 || name.length > 50) {
    throw new Error('Module name must be between 2 and 50 characters');
  }

  return true;
}

/**
 * Get user input with prompt
 */
async function prompt(question, defaultValue = '') {
  const { createInterface } = await import('readline');
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const promptText = defaultValue 
      ? `${question} (${defaultValue}): `
      : `${question}: `;
    
    readline.question(promptText, (answer) => {
      readline.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Copy directory recursively
 */
function copyDirectory(src, dest, replacements = {}) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, replacements);
    } else {
      copyFile(srcPath, destPath, replacements);
    }
  }
}

/**
 * Copy file with template replacements
 */
function copyFile(src, dest, replacements = {}) {
  let content = fs.readFileSync(src, 'utf8');

  // Apply replacements
  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(placeholder, 'g');
    content = content.replace(regex, value);
  }

  fs.writeFileSync(dest, content);
}

/**
 * Create .gitignore file
 */
function createGitignore(modulePath) {
  const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Build outputs
dist/
build/

# Test outputs
test-results/
coverage/

# Development keys (keep in template for development)
# security/keys/*.pem
# security/keys/*.txt

# Docker
.dockerignore

# Temporary files
tmp/
temp/
`;

  fs.writeFileSync(path.join(modulePath, '.gitignore'), gitignoreContent);
}

/**
 * Initialize git repository
 */
function initializeGit(modulePath, moduleName) {
  try {
    process.chdir(modulePath);
    execSync('git init', { stdio: 'pipe' });
    execSync('git add .', { stdio: 'pipe' });
    execSync(`git commit -m "Initial commit: ${moduleName} module from template"`, { stdio: 'pipe' });
    success('Git repository initialized');
  } catch (error) {
    warning('Failed to initialize git repository');
  }
}

/**
 * Install dependencies
 */
function installDependencies(modulePath) {
  try {
    process.chdir(modulePath);
    info('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    success('Dependencies installed');
  } catch (error) {
    warning('Failed to install dependencies. Run "npm install" manually.');
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('🚀 Q Ecosystem Module Generator', 'cyan');
    log('=====================================', 'cyan');

    // Get module information
    const moduleName = process.argv[2] || await prompt('Module name (kebab-case)');
    validateModuleName(moduleName);

    const moduleDescription = process.argv[3] || await prompt(
      'Module description', 
      `${moduleName} module for Q ecosystem`
    );

    const targetDir = process.argv[4] || await prompt(
      'Target directory', 
      `./${moduleName}`
    );

    // Check if target directory exists
    if (fs.existsSync(targetDir)) {
      const overwrite = await prompt(
        `Directory ${targetDir} already exists. Overwrite? (y/N)`, 
        'N'
      );
      
      if (overwrite.toLowerCase() !== 'y') {
        info('Operation cancelled');
        process.exit(0);
      }
      
      // Remove existing directory
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    info(`Creating module: ${moduleName}`);
    info(`Description: ${moduleDescription}`);
    info(`Target directory: ${targetDir}`);

    // Template replacements
    const replacements = {
      '{{MODULE_NAME}}': moduleName,
      '{{MODULE_DESCRIPTION}}': moduleDescription
    };

    // Copy template
    const templatePath = path.join(__dirname, '..', 'templates', 'module-template');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found at ${templatePath}`);
    }

    info('Copying template files...');
    copyDirectory(templatePath, targetDir, replacements);

    // Create .gitignore
    info('Creating .gitignore...');
    createGitignore(targetDir);

    success(`Module ${moduleName} created successfully!`);

    // Ask about additional setup
    const setupGit = await prompt('Initialize git repository? (Y/n)', 'Y');
    if (setupGit.toLowerCase() !== 'n') {
      initializeGit(targetDir, moduleName);
    }

    const installDeps = await prompt('Install dependencies? (Y/n)', 'Y');
    if (installDeps.toLowerCase() !== 'n') {
      installDependencies(targetDir);
    }

    // Show next steps
    log('\n🎉 Module created successfully!', 'green');
    log('\nNext steps:', 'cyan');
    log(`1. cd ${targetDir}`, 'yellow');
    log('2. Review and customize the generated files', 'yellow');
    log('3. Update the module-specific logic in src/services/ExampleService.js', 'yellow');
    log('4. Add your API endpoints in src/handlers/api.js', 'yellow');
    log('5. Update the OpenAPI specification in openapi.yaml', 'yellow');
    log('6. Configure MCP tools in mcp.json', 'yellow');
    log('7. Run tests: npm test', 'yellow');
    log('8. Start development server: npm run dev:standalone', 'yellow');

    log('\nDocumentation:', 'cyan');
    log('- README.md - Module overview and setup instructions', 'yellow');
    log('- contracts/ - API contracts and schemas', 'yellow');
    log('- events/ - Event definitions and catalog', 'yellow');
    log('- security/ - Security policies and middleware', 'yellow');
    log('- storage/ - IPFS storage mapping and policies', 'yellow');
    log('- observability/ - Audit and metrics specifications', 'yellow');
    log('- compat/ - Compatibility matrix with other modules', 'yellow');

  } catch (err) {
    error(err.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, validateModuleName, copyDirectory, copyFile };