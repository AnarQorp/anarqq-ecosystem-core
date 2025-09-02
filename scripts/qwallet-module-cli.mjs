#!/usr/bin/env node

/**
 * Qwallet Module Registration CLI Tool
 * Command-line interface for module registration operations
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_VERSION = '1.0.0';
const CONFIG_FILE_NAME = '.qwallet-module-cli.json';

// Colors
const colors = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m', reset: '\x1b[0m'
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

let cliConfig = {
  defaultIdentity: null,
  apiEndpoint: 'http://localhost:3001',
  verbose: false,
  outputFormat: 'table'
};

async function loadConfig() {
  try {
    const configPath = join(process.cwd(), CONFIG_FILE_NAME);
    const configData = await readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    cliConfig = { ...cliConfig, ...config };
  } catch (error) {
    // Use defaults
  }
}

function createMockIdentity(identityId = 'did:example:root-identity') {
  return {
    did: identityId,
    type: 'ROOT',
    publicKey: 'mock-public-key',
    privateKey: 'mock-private-key',
    metadata: { name: 'CLI Root Identity', created: new Date().toISOString() }
  };
}

function formatOutput(data, format = cliConfig.outputFormat) {
  switch (format) {
    case 'json': return JSON.stringify(data, null, 2);
    case 'yaml': return Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n');
    default: return Object.entries(data).map(([k, v]) => `${colorize('cyan', k)}: ${v}`).join('\n');
  }
}

function handleError(error, operation = 'operation') {
  console.error(colorize('red', `\n❌ ${operation} failed: ${error.message}`));
  if (cliConfig.verbose && error.stack) {
    console.error(colorize('gray', error.stack));
  }
  process.exit(1);
}

function prompt(question, defaultValue = '') {
  return new Promise((resolve) => {
    process.stdout.write(`${question} ${defaultValue ? `(${defaultValue})` : ''}: `);
    process.stdin.once('data', (data) => {
      const input = data.toString().trim();
      resolve(input || defaultValue);
    });
  });
}

async function confirm(question, defaultValue = false) {
  const answer = await prompt(`${question} (y/N)`, defaultValue ? 'y' : 'n');
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

class MockRegistrationService {
  constructor() {
    this.modules = new Map();
  }
  
  async registerModule(request, identity) {
    console.log(colorize('gray', '  • Validating module information...'));
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(colorize('gray', '  • Generating metadata...'));
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(colorize('gray', '  • Signing with identity...'));
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(colorize('gray', '  • Registering with Qindex...'));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const moduleData = {
      moduleId: request.moduleInfo.name,
      metadata: {
        module: request.moduleInfo.name,
        version: request.moduleInfo.version,
        description: request.moduleInfo.description,
        status: request.testMode ? 'TESTING' : 'PRODUCTION_READY'
      },
      registrationInfo: {
        registeredAt: new Date().toISOString(),
        testMode: request.testMode || false,
        verificationStatus: 'VERIFIED'
      }
    };
    
    this.modules.set(request.moduleInfo.name, moduleData);
    
    return {
      success: true,
      moduleId: request.moduleInfo.name,
      cid: 'QmMockCID1234567890123456789012345678901234567890',
      indexId: `idx_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }
  
  async verifyModule(moduleId) {
    console.log(colorize('gray', '  • Checking module metadata...'));
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log(colorize('gray', '  • Verifying signatures...'));
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(colorize('gray', '  • Checking dependencies...'));
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const module = this.modules.get(moduleId);
    if (!module) {
      return {
        moduleId, status: 'invalid',
        verificationChecks: { metadataValid: false, signatureValid: false, dependenciesResolved: false, complianceVerified: false, auditPassed: false },
        issues: [{ severity: 'ERROR', code: 'MODULE_NOT_FOUND', message: `Module not found: ${moduleId}` }],
        lastVerified: new Date().toISOString(), verifiedBy: 'system'
      };
    }
    
    return {
      moduleId, status: 'production_ready',
      verificationChecks: { metadataValid: true, signatureValid: true, dependenciesResolved: true, complianceVerified: true, auditPassed: true },
      issues: [], lastVerified: new Date().toISOString(), verifiedBy: 'system'
    };
  }
  
  async listModules(options = {}) {
    const modules = Array.from(this.modules.values());
    return { modules, totalCount: modules.length, hasMore: false };
  }
}

const registrationService = new MockRegistrationService();

function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

async function registerCommand(args) {
  try {
    await loadConfig();
    const options = parseOptions(args);
    let moduleInfo;
    
    if (options.file) {
      // Load from file
      const filePath = resolve(options.file);
      const fileData = await readFile(filePath, 'utf8');
      moduleInfo = JSON.parse(fileData);
      console.log(colorize('blue', `📁 Loaded module info from ${filePath}`));
    } else if (!options.name || !options.version || !options.description || !options.repository) {
      console.error(colorize('red', '❌ Required: --name, --version, --description, --repository (or use --file)'));
      process.exit(1);
    } else {
      moduleInfo = {
        name: options.name,
        version: options.version,
        description: options.description,
        repositoryUrl: options.repository,
        identitiesSupported: ['ROOT'],
        integrations: ['Qindex', 'Qlock']
      };
    }
    
    const request = { moduleInfo, testMode: options['test-mode'] || false };
    const identity = createMockIdentity(options.identity || cliConfig.defaultIdentity);
    
    console.log(colorize('blue', '\n📋 Registration Summary:'));
    console.log(formatOutput({
      'Module Name': moduleInfo.name,
      'Version': moduleInfo.version,
      'Test Mode': request.testMode,
      'Identity': identity.did
    }));
    
    const proceed = await confirm('Proceed with registration?', true);
    if (!proceed) {
      console.log(colorize('yellow', 'Registration cancelled'));
      return;
    }
    
    console.log(colorize('blue', '\n🚀 Registering module...'));
    const result = await registrationService.registerModule(request, identity);
    
    if (result.success) {
      console.log(colorize('green', '\n✅ Module registered successfully!'));
      console.log(formatOutput({
        'Module ID': result.moduleId,
        'CID': result.cid,
        'Index ID': result.indexId,
        'Timestamp': result.timestamp
      }));
    }
  } catch (error) {
    handleError(error, 'Registration');
  }
}

async function verifyCommand(args) {
  try {
    await loadConfig();
    const moduleId = args[0];
    if (!moduleId) {
      console.error(colorize('red', '❌ Module ID required'));
      process.exit(1);
    }
    
    console.log(colorize('blue', `\n🔍 Verifying module: ${moduleId}`));
    const result = await registrationService.verifyModule(moduleId);
    
    console.log(colorize('blue', `\n🔍 Verification Results for ${moduleId}:`));
    const statusColor = result.status === 'production_ready' ? 'green' : result.status === 'testing' ? 'yellow' : 'red';
    
    console.log(formatOutput({
      'Status': colorize(statusColor, result.status.toUpperCase()),
      'Metadata Valid': result.verificationChecks.metadataValid ? '✅' : '❌',
      'Signature Valid': result.verificationChecks.signatureValid ? '✅' : '❌',
      'Dependencies Resolved': result.verificationChecks.dependenciesResolved ? '✅' : '❌',
      'Compliance Verified': result.verificationChecks.complianceVerified ? '✅' : '❌',
      'Audit Passed': result.verificationChecks.auditPassed ? '✅' : '❌'
    }));
    
    if (result.issues && result.issues.length > 0) {
      console.log(colorize('yellow', '\n⚠️  Issues Found:'));
      result.issues.forEach(issue => {
        const severityColor = issue.severity === 'ERROR' ? 'red' : issue.severity === 'WARNING' ? 'yellow' : 'blue';
        console.log(colorize(severityColor, `   ${issue.severity}: ${issue.message}`));
      });
    }
  } catch (error) {
    handleError(error, 'Verification');
  }
}

async function listCommand(args) {
  try {
    await loadConfig();
    console.log(colorize('blue', '\n📋 Loading modules...'));
    
    const result = await registrationService.listModules();
    
    if (result.modules.length === 0) {
      console.log(colorize('yellow', 'No modules found'));
      return;
    }
    
    console.log(colorize('blue', `\n📋 Found ${result.totalCount} modules:`));
    const moduleList = result.modules.map(module => ({
      'Module ID': module.moduleId,
      'Version': module.metadata.version,
      'Status': module.metadata.status,
      'Registered': module.registrationInfo.registeredAt,
      'Test Mode': module.registrationInfo.testMode ? 'Yes' : 'No'
    }));
    
    console.log(formatOutput(moduleList));
  } catch (error) {
    handleError(error, 'List modules');
  }
}

function showHelp() {
  console.log(colorize('blue', `
Qwallet Module Registration CLI Tool v${CLI_VERSION}

USAGE:
  node qwallet-module-cli.mjs <command> [options]

COMMANDS:
  register                    Register a new module
  verify <moduleId>           Verify a module registration
  list                        List registered modules
  help                        Show this help message

REGISTER OPTIONS:
  --name <name>               Module name (required if not using --file)
  --version <version>         Module version (required if not using --file)
  --description <desc>        Module description (required if not using --file)
  --repository <url>          Repository URL (required if not using --file)
  --file <path>               Load module info from JSON file
  --test-mode                 Register in sandbox/test mode
  --identity <did>            Identity DID to use for signing

EXAMPLES:
  # Register a module with command line options
  node qwallet-module-cli.mjs register --name "my-module" --version "1.0.0" --description "My test module" --repository "https://github.com/example/my-module"

  # Register from JSON file
  node qwallet-module-cli.mjs register --file sample-module.json

  # Register in test mode
  node qwallet-module-cli.mjs register --name "test-module" --version "0.1.0" --description "Test module" --repository "https://github.com/example/test" --test-mode

  # Verify a module
  node qwallet-module-cli.mjs verify my-module

  # List all modules
  node qwallet-module-cli.mjs list
`));
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    return;
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  try {
    switch (command) {
      case 'register':
        await registerCommand(commandArgs);
        break;
      case 'verify':
        await verifyCommand(commandArgs);
        break;
      case 'list':
        await listCommand(commandArgs);
        break;
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
      case 'version':
      case '--version':
        console.log(`Qwallet Module Registration CLI v${CLI_VERSION}`);
        break;
      default:
        console.error(colorize('red', `❌ Unknown command: ${command}`));
        console.log(colorize('gray', 'Run "node qwallet-module-cli.mjs help" for usage information'));
        process.exit(1);
    }
  } catch (error) {
    handleError(error, `Command '${command}'`);
  }
}

// Make stdin readable for prompts
if (process.stdin.isTTY) {
  process.stdin.setRawMode(false);
}

main().catch(error => {
  handleError(error, 'CLI');
});