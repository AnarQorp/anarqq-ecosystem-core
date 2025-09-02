#!/usr/bin/env node

/**
 * MCP Tool Discovery CLI
 * 
 * Command-line interface for managing MCP tool discovery,
 * capability negotiation, and deprecation workflows.
 */

import { program } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { getMCPToolDiscoveryService } from '../services/MCPToolDiscoveryService.mjs';

const service = getMCPToolDiscoveryService();

// Helper function to format output
function formatOutput(data, format = 'json') {
  if (format === 'table' && Array.isArray(data)) {
    console.table(data);
  } else if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

// Helper function to read JSON file
function readJsonFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Register tools command
program
  .command('register')
  .description('Register MCP tools for a module')
  .option('-f, --file <file>', 'JSON file containing tool registration data')
  .option('-m, --module-id <id>', 'Module ID')
  .option('-n, --module-name <name>', 'Module name')
  .option('-v, --version <version>', 'Module version')
  .action(async (options) => {
    try {
      let registration;

      if (options.file) {
        registration = readJsonFile(options.file);
      } else if (options.moduleId && options.moduleName && options.version) {
        // Interactive mode - minimal registration
        registration = {
          moduleId: options.moduleId,
          moduleName: options.moduleName,
          version: options.version,
          tools: [],
          capabilities: {},
          compatibility: {}
        };
        
        console.log('Interactive registration mode not fully implemented.');
        console.log('Please use --file option with a complete registration JSON.');
        process.exit(1);
      } else {
        console.error('Either --file or --module-id, --module-name, and --version are required');
        process.exit(1);
      }

      const result = await service.registerTools(registration);

      if (result.success) {
        console.log('✅ Tools registered successfully');
        formatOutput({
          registrationId: result.registrationId,
          toolCount: result.toolCount,
          capabilityCount: result.capabilityCount
        });
      } else {
        console.error('❌ Registration failed');
        formatOutput(result.errors);
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Registration error:', error.message);
      process.exit(1);
    }
  });

// Discover tools command
program
  .command('discover')
  .description('Discover available MCP tools')
  .option('-m, --module-id <id>', 'Filter by module ID')
  .option('-t, --tool-name <name>', 'Filter by tool name')
  .option('-c, --capabilities <caps>', 'Filter by capabilities (comma-separated)')
  .option('-v, --version <version>', 'Filter by version compatibility')
  .option('--include-deprecated', 'Include deprecated tools')
  .option('--include-usage-stats', 'Include usage statistics')
  .option('--include-alternatives', 'Include alternative tools')
  .option('-l, --limit <limit>', 'Limit number of results', '50')
  .option('-o, --offset <offset>', 'Offset for pagination', '0')
  .option('--format <format>', 'Output format (json|table)', 'json')
  .action(async (options) => {
    try {
      const criteria = {
        moduleId: options.moduleId,
        toolName: options.toolName,
        capabilities: options.capabilities ? options.capabilities.split(',') : [],
        version: options.version,
        includeDeprecated: options.includeDeprecated || false,
        includeUsageStats: options.includeUsageStats || false,
        includeAlternatives: options.includeAlternatives !== false,
        limit: parseInt(options.limit),
        offset: parseInt(options.offset)
      };

      const result = await service.discoverTools(criteria);

      console.log(`Found ${result.totalCount} tools`);
      if (result.hasMore) {
        console.log(`Showing ${result.tools.length} tools (use --offset ${result.nextOffset} for more)`);
      }

      if (options.format === 'table') {
        const tableData = result.tools.map(tool => ({
          moduleId: tool.moduleId,
          moduleName: tool.moduleName,
          version: tool.version,
          toolCount: tool.tools.length,
          capabilities: Object.keys(tool.capabilities).join(', '),
          deprecated: tool.deprecationInfo?.deprecated || false
        }));
        formatOutput(tableData, 'table');
      } else {
        formatOutput(result, 'json');
      }

    } catch (error) {
      console.error('❌ Discovery error:', error.message);
      process.exit(1);
    }
  });

// Negotiate capabilities command
program
  .command('negotiate')
  .description('Negotiate capabilities with available tools')
  .option('-f, --file <file>', 'JSON file containing negotiation request')
  .option('-r, --required <caps>', 'Required capabilities (comma-separated)')
  .option('-p, --preferred <caps>', 'Preferred capabilities (comma-separated)')
  .option('-v, --client-version <version>', 'Client version')
  .option('-a, --max-alternatives <max>', 'Maximum alternatives to return', '5')
  .action(async (options) => {
    try {
      let negotiation;

      if (options.file) {
        negotiation = readJsonFile(options.file);
      } else {
        negotiation = {
          requiredCapabilities: options.required ? options.required.split(',') : [],
          preferredCapabilities: options.preferred ? options.preferred.split(',') : [],
          clientVersion: options.clientVersion,
          maxAlternatives: parseInt(options.maxAlternatives)
        };
      }

      const result = await service.negotiateCapabilities(negotiation);

      console.log(result.compatible ? '✅ Compatible tools found' : '⚠️ No fully compatible tools found');
      console.log(`Negotiation ID: ${result.negotiationId}`);
      console.log(`Recommended tools: ${result.recommendedTools.length}`);

      formatOutput(result);

    } catch (error) {
      console.error('❌ Negotiation error:', error.message);
      process.exit(1);
    }
  });

// Check compatibility command
program
  .command('compatibility')
  .description('Check tool compatibility')
  .requiredOption('-m, --module-id <id>', 'Module ID')
  .requiredOption('-t, --tool-name <name>', 'Tool name')
  .option('-c, --client-version <version>', 'Client version')
  .option('-T, --target-version <version>', 'Target version')
  .option('--include-breaking-changes', 'Include breaking changes analysis')
  .option('--include-migration-path', 'Include migration path')
  .action(async (options) => {
    try {
      const compatibilityCheck = {
        moduleId: options.moduleId,
        toolName: options.toolName,
        clientVersion: options.clientVersion,
        targetVersion: options.targetVersion,
        includeBreakingChanges: options.includeBreakingChanges || false,
        includeMigrationPath: options.includeMigrationPath || false
      };

      const result = await service.checkToolCompatibility(compatibilityCheck);

      console.log(result.compatible ? '✅ Tool is compatible' : '❌ Compatibility issues found');
      
      if (result.migrationRequired) {
        console.log('⚠️ Migration required');
      }

      formatOutput(result);

    } catch (error) {
      console.error('❌ Compatibility check error:', error.message);
      process.exit(1);
    }
  });

// Deprecation management command
program
  .command('deprecation')
  .description('Manage tool deprecation')
  .requiredOption('-a, --action <action>', 'Action: schedule, update, cancel, execute')
  .requiredOption('-m, --module-id <id>', 'Module ID')
  .option('-t, --tool-name <name>', 'Tool name')
  .option('-d, --deprecation-date <date>', 'Deprecation date (YYYY-MM-DD)')
  .option('-s, --sunset-date <date>', 'Sunset date (YYYY-MM-DD)')
  .option('-r, --reason <reason>', 'Deprecation reason')
  .option('-g, --migration-guide <guide>', 'Migration guide')
  .option('-R, --replacement-tool <tool>', 'Replacement tool')
  .action(async (options) => {
    try {
      const deprecation = {
        action: options.action,
        moduleId: options.moduleId,
        toolName: options.toolName,
        deprecationDate: options.deprecationDate,
        sunsetDate: options.sunsetDate,
        reason: options.reason,
        migrationGuide: options.migrationGuide,
        replacementTool: options.replacementTool
      };

      const result = await service.manageDeprecation(deprecation);

      console.log(`✅ Deprecation ${options.action} completed successfully`);
      formatOutput(result);

    } catch (error) {
      console.error(`❌ Deprecation ${options.action} error:`, error.message);
      process.exit(1);
    }
  });

// Analytics command
program
  .command('analytics')
  .description('Get tool usage analytics and recommendations')
  .option('-m, --module-id <id>', 'Filter by module ID')
  .option('-t, --tool-name <name>', 'Filter by tool name')
  .option('-p, --period <period>', 'Analysis period', '30d')
  .option('--no-recommendations', 'Exclude recommendations')
  .option('--no-optimizations', 'Exclude optimizations')
  .option('--no-trends', 'Exclude trend analysis')
  .option('--format <format>', 'Output format (json|summary)', 'json')
  .action(async (options) => {
    try {
      const analyticsRequest = {
        moduleId: options.moduleId,
        toolName: options.toolName,
        period: options.period,
        includeRecommendations: options.recommendations !== false,
        includeOptimizations: options.optimizations !== false,
        includeTrends: options.trends !== false
      };

      const result = await service.getToolAnalytics(analyticsRequest);

      if (options.format === 'summary') {
        console.log('📊 Tool Analytics Summary');
        console.log(`Period: ${result.period}`);
        console.log(`Popular tools: ${result.popularTools.length}`);
        console.log(`Capabilities tracked: ${Object.keys(result.capabilityUsage).length}`);
        console.log(`Compatibility issues: ${result.compatibilityIssues.length}`);
        console.log(`Deprecation impact: ${result.deprecationImpact.length}`);
        
        if (result.recommendations?.length > 0) {
          console.log('\n💡 Recommendations:');
          result.recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
          });
        }

        if (result.optimizations?.length > 0) {
          console.log('\n⚡ Optimizations:');
          result.optimizations.forEach((opt, i) => {
            console.log(`${i + 1}. [${opt.priority.toUpperCase()}] ${opt.description}`);
          });
        }
      } else {
        formatOutput(result);
      }

    } catch (error) {
      console.error('❌ Analytics error:', error.message);
      process.exit(1);
    }
  });

// Capabilities command
program
  .command('capabilities')
  .description('List available capabilities')
  .option('--format <format>', 'Output format (json|table)', 'table')
  .action(async (options) => {
    try {
      const capabilities = {};

      for (const [capability, info] of service.capabilityMatrix.entries()) {
        capabilities[capability] = {
          description: info.description,
          totalProviders: info.providers?.length || 0,
          activeProviders: info.providers?.filter(p => p.supported).length || 0,
          providers: info.providers?.map(p => p.moduleName).join(', ') || 'None'
        };
      }

      console.log(`Found ${Object.keys(capabilities).length} capabilities`);

      if (options.format === 'table') {
        const tableData = Object.entries(capabilities).map(([name, info]) => ({
          capability: name,
          description: info.description,
          providers: info.totalProviders,
          active: info.activeProviders,
          modules: info.providers
        }));
        formatOutput(tableData, 'table');
      } else {
        formatOutput(capabilities);
      }

    } catch (error) {
      console.error('❌ Capabilities error:', error.message);
      process.exit(1);
    }
  });

// Deprecations command
program
  .command('deprecations')
  .description('List deprecation schedules')
  .option('--format <format>', 'Output format (json|table)', 'table')
  .action(async (options) => {
    try {
      const deprecations = [];

      for (const [moduleId, schedule] of service.deprecationSchedule.entries()) {
        const toolEntry = service.toolRegistry.get(moduleId);
        const daysUntilDeprecation = Math.ceil(
          (new Date(schedule.deprecationDate) - new Date()) / (1000 * 60 * 60 * 24)
        );

        deprecations.push({
          moduleId,
          moduleName: toolEntry?.moduleName || 'Unknown',
          toolName: schedule.toolName,
          deprecationDate: schedule.deprecationDate,
          sunsetDate: schedule.sunsetDate,
          status: schedule.status,
          daysUntil: daysUntilDeprecation,
          reason: schedule.reason,
          replacement: schedule.replacementTool
        });
      }

      deprecations.sort((a, b) => new Date(a.deprecationDate) - new Date(b.deprecationDate));

      console.log(`Found ${deprecations.length} deprecation schedules`);

      if (options.format === 'table') {
        const tableData = deprecations.map(d => ({
          module: d.moduleName,
          tool: d.toolName,
          deprecation: d.deprecationDate,
          sunset: d.sunsetDate,
          status: d.status,
          daysUntil: d.daysUntil,
          replacement: d.replacement || 'None'
        }));
        formatOutput(tableData, 'table');
      } else {
        formatOutput(deprecations);
      }

    } catch (error) {
      console.error('❌ Deprecations error:', error.message);
      process.exit(1);
    }
  });

// Health command
program
  .command('health')
  .description('Check service health')
  .action(async () => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        statistics: {
          registeredModules: service.toolRegistry.size,
          totalCapabilities: service.capabilityMatrix.size,
          deprecationSchedules: service.deprecationSchedule.size,
          cacheSize: {
            compatibility: service.compatibilityCache.size,
            usage: service.toolUsageStats.size
          }
        }
      };

      console.log('✅ MCP Tool Discovery service is healthy');
      formatOutput(health);

    } catch (error) {
      console.error('❌ Health check error:', error.message);
      process.exit(1);
    }
  });

// Generate example registration command
program
  .command('generate-example')
  .description('Generate example tool registration file')
  .option('-o, --output <file>', 'Output file path', 'example-registration.json')
  .action((options) => {
    const example = {
      moduleId: 'example-module',
      moduleName: 'Example Module',
      version: '1.0.0',
      tools: [
        {
          name: 'example.hello',
          description: 'Say hello to a user',
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the user'
              }
            },
            required: ['name']
          },
          returns: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Greeting message'
              }
            }
          },
          examples: [
            'example.hello({ name: "Alice" })'
          ]
        }
      ],
      capabilities: {
        'example-capability': {
          supported: true,
          version: '1.0.0',
          features: ['basic-greeting', 'personalization']
        }
      },
      compatibility: {
        minVersion: '1.0.0',
        maxVersion: '2.0.0',
        supportedVersions: ['1.0.0', '1.1.0'],
        breakingChanges: [],
        deprecatedFeatures: []
      },
      metadata: {
        author: 'Example Developer',
        license: 'MIT',
        repository: 'https://github.com/example/example-module'
      }
    };

    try {
      writeFileSync(options.output, JSON.stringify(example, null, 2));
      console.log(`✅ Example registration file generated: ${options.output}`);
    } catch (error) {
      console.error('❌ Failed to generate example file:', error.message);
      process.exit(1);
    }
  });

// Set up program
program
  .name('mcp-tool-discovery')
  .description('MCP Tool Discovery CLI')
  .version('1.0.0');

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}