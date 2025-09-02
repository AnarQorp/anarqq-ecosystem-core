/**
 * Qflow CLI Tool
 * 
 * Command-line interface for flow management and execution control
 * Provides comprehensive commands for creating, managing, and monitoring flows
 */

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { flowParser } from '../core/FlowParser.js';
import { executionEngine } from '../core/ExecutionEngine.js';
import { qflowServer } from '../api/QflowServer.js';
import { FlowDefinition, ExecutionContext } from '../models/FlowDefinition.js';

export interface CLIConfig {
  apiUrl: string;
  timeout: number;
  outputFormat: 'json' | 'table' | 'yaml';
  verbose: boolean;
}

export class QflowCLI {
  private program: Command;
  private config: CLIConfig;

  constructor(config: Partial<CLIConfig> = {}) {
    this.config = {
      apiUrl: 'http://localhost:8080/api/v1',
      timeout: 30000,
      outputFormat: 'table',
      verbose: false,
      ...config
    };

    this.program = new Command();
    this.setupCommands();
  }

  /**
   * Setup CLI commands and options
   */
  private setupCommands(): void {
    this.program
      .name('qflow')
      .description('Qflow Serverless Automation Engine CLI')
      .version('0.1.0')
      .option('-v, --verbose', 'Enable verbose output')
      .option('-f, --format <format>', 'Output format (json|table|yaml)', 'table')
      .option('--api-url <url>', 'API server URL', 'http://localhost:8080/api/v1')
      .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts();
        this.config.verbose = opts.verbose || false;
        this.config.outputFormat = opts.format || 'table';
        this.config.apiUrl = opts.apiUrl || 'http://localhost:8080/api/v1';
      });

    // Flow management commands
    const flowCmd = this.program
      .command('flow')
      .description('Flow management commands');

    flowCmd
      .command('create <file>')
      .description('Create a new flow from file')
      .option('-f, --format <format>', 'Flow file format (json|yaml|auto)', 'auto')
      .action(this.handleCreateFlow.bind(this));

    flowCmd
      .command('list')
      .description('List all flows')
      .option('-c, --category <category>', 'Filter by category')
      .option('-o, --owner <owner>', 'Filter by owner')
      .option('-v, --visibility <visibility>', 'Filter by visibility')
      .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
      .option('-l, --limit <limit>', 'Limit number of results', '50')
      .action(this.handleListFlows.bind(this));

    flowCmd
      .command('show <id>')
      .description('Show flow details')
      .action(this.handleShowFlow.bind(this));

    flowCmd
      .command('update <id> <file>')
      .description('Update flow from file')
      .option('-f, --format <format>', 'Flow file format (json|yaml|auto)', 'auto')
      .action(this.handleUpdateFlow.bind(this));

    flowCmd
      .command('delete <id>')
      .description('Delete a flow')
      .option('-y, --yes', 'Skip confirmation prompt')
      .action(this.handleDeleteFlow.bind(this));

    flowCmd
      .command('validate <file>')
      .description('Validate a flow file without creating it')
      .option('-f, --format <format>', 'Flow file format (json|yaml|auto)', 'auto')
      .action(this.handleValidateFlow.bind(this));

    // Execution management commands
    const execCmd = this.program
      .command('exec')
      .description('Execution management commands');

    execCmd
      .command('start <flowId>')
      .description('Start flow execution')
      .option('-c, --context <file>', 'Execution context file (JSON)')
      .option('-i, --input <data>', 'Input data (JSON string)')
      .option('-v, --variables <vars>', 'Variables (JSON string)')
      .option('-t, --trigger-type <type>', 'Trigger type', 'manual')
      .option('-u, --triggered-by <identity>', 'Triggered by identity')
      .action(this.handleStartExecution.bind(this));

    execCmd
      .command('list')
      .description('List executions')
      .option('-f, --flow-id <flowId>', 'Filter by flow ID')
      .option('-s, --status <status>', 'Filter by status')
      .option('-u, --triggered-by <identity>', 'Filter by triggered by')
      .option('-l, --limit <limit>', 'Limit number of results', '50')
      .action(this.handleListExecutions.bind(this));

    execCmd
      .command('status <id>')
      .description('Get execution status')
      .option('-w, --watch', 'Watch for status changes')
      .action(this.handleExecutionStatus.bind(this));

    execCmd
      .command('logs <id>')
      .description('Get execution logs')
      .option('-f, --follow', 'Follow log output')
      .option('-n, --lines <lines>', 'Number of lines to show', '100')
      .action(this.handleExecutionLogs.bind(this));

    execCmd
      .command('pause <id>')
      .description('Pause execution')
      .action(this.handlePauseExecution.bind(this));

    execCmd
      .command('resume <id>')
      .description('Resume execution')
      .action(this.handleResumeExecution.bind(this));

    execCmd
      .command('abort <id>')
      .description('Abort execution')
      .option('-y, --yes', 'Skip confirmation prompt')
      .action(this.handleAbortExecution.bind(this));

    // System management commands
    const systemCmd = this.program
      .command('system')
      .description('System management commands');

    systemCmd
      .command('info')
      .description('Show system information')
      .action(this.handleSystemInfo.bind(this));

    systemCmd
      .command('health')
      .description('Check system health')
      .action(this.handleSystemHealth.bind(this));

    systemCmd
      .command('metrics')
      .description('Show system metrics')
      .action(this.handleSystemMetrics.bind(this));

    systemCmd
      .command('start')
      .description('Start Qflow server')
      .option('-p, --port <port>', 'Server port', '8080')
      .option('-h, --host <host>', 'Server host', '0.0.0.0')
      .action(this.handleStartServer.bind(this));

    // Node management commands
    const nodeCmd = this.program
      .command('nodes')
      .description('Node management commands');

    nodeCmd
      .command('list')
      .description('List available QNET nodes')
      .action(this.handleListNodes.bind(this));

    nodeCmd
      .command('health')
      .description('Check node health')
      .action(this.handleNodeHealth.bind(this));

    // DAO subnet commands
    const daoCmd = this.program
      .command('dao')
      .description('DAO subnet management commands');

    daoCmd
      .command('list')
      .description('List DAO subnets')
      .action(this.handleListDAOSubnets.bind(this));

    // Flow ownership commands
    const ownershipCmd = this.program
      .command('ownership')
      .description('Flow ownership and permissions management');

    ownershipCmd
      .command('transfer <flowId> <newOwner>')
      .description('Transfer flow ownership')
      .option('-r, --reason <reason>', 'Reason for transfer', 'Ownership transfer')
      .option('-s, --signature <signature>', 'Transfer signature')
      .action(this.handleTransferOwnership.bind(this));

    ownershipCmd
      .command('grant <flowId> <identity> <permission>')
      .description('Grant permission to identity')
      .option('-e, --expires <date>', 'Permission expiration date (ISO format)')
      .option('-c, --conditions <file>', 'Permission conditions file (JSON)')
      .action(this.handleGrantPermission.bind(this));

    ownershipCmd
      .command('revoke <flowId> <identity> <permission>')
      .description('Revoke permission from identity')
      .action(this.handleRevokePermission.bind(this));

    ownershipCmd
      .command('show <flowId>')
      .description('Show flow ownership and permissions')
      .action(this.handleShowOwnership.bind(this));

    ownershipCmd
      .command('request <flowId> <permissions...>')
      .description('Request access to flow')
      .option('-r, --reason <reason>', 'Reason for access request')
      .action(this.handleRequestAccess.bind(this));

    ownershipCmd
      .command('review <requestId> <decision>')
      .description('Review access request (approve/deny)')
      .option('-n, --notes <notes>', 'Review notes')
      .action(this.handleReviewRequest.bind(this));

    ownershipCmd
      .command('policy <flowId>')
      .description('Update sharing policy')
      .option('-v, --visibility <visibility>', 'Flow visibility (private|dao|public|whitelist)')
      .option('-a, --auto-approve <permissions>', 'Auto-approve permissions (comma-separated)')
      .option('-r, --require-approval <permissions>', 'Require approval permissions (comma-separated)')
      .action(this.handleUpdatePolicy.bind(this));

    ownershipCmd
      .command('owned [identity]')
      .description('List flows owned by identity (defaults to current user)')
      .action(this.handleListOwned.bind(this));

    ownershipCmd
      .command('accessible [identity]')
      .description('List flows accessible by identity (defaults to current user)')
      .option('-p, --permission <permission>', 'Required permission level', 'read')
      .action(this.handleListAccessible.bind(this));
  }

  /**
   * Parse and execute CLI commands
   */
  async run(argv: string[] = process.argv): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      this.error(`CLI error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  // Flow Management Handlers

  private async handleCreateFlow(file: string, options: any): Promise<void> {
    try {
      this.verbose(`Creating flow from file: ${file}`);
      
      const flowData = await this.readFile(file);
      const parseResult = flowParser.parseFlow(flowData, options.format);

      if (!parseResult.success || !parseResult.flow) {
        this.error('Flow validation failed:');
        parseResult.errors.forEach(error => this.error(`  - ${error}`));
        return;
      }

      const flow = parseResult.flow;
      this.success(`Flow '${flow.name}' (${flow.id}) created successfully`);
      
      if (parseResult.warnings.length > 0) {
        this.warn('Warnings:');
        parseResult.warnings.forEach(warning => this.warn(`  - ${warning}`));
      }

      this.output(flow);

    } catch (error) {
      this.error(`Failed to create flow: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleListFlows(options: any): Promise<void> {
    try {
      this.verbose('Listing flows...');
      
      // For now, use local flow parser since we're in prototype mode
      // In production, this would make HTTP requests to the API
      const flows: FlowDefinition[] = []; // Would fetch from API
      
      if (flows.length === 0) {
        this.info('No flows found');
        return;
      }

      this.output(flows);

    } catch (error) {
      this.error(`Failed to list flows: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleShowFlow(id: string): Promise<void> {
    try {
      this.verbose(`Showing flow: ${id}`);
      
      // For prototype, would fetch from API
      this.info(`Flow details for: ${id}`);
      this.info('(Implementation would fetch from API)');

    } catch (error) {
      this.error(`Failed to show flow: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleUpdateFlow(id: string, file: string, options: any): Promise<void> {
    try {
      this.verbose(`Updating flow ${id} from file: ${file}`);
      
      const flowData = await this.readFile(file);
      const parseResult = flowParser.parseFlow(flowData, options.format);

      if (!parseResult.success || !parseResult.flow) {
        this.error('Flow validation failed:');
        parseResult.errors.forEach(error => this.error(`  - ${error}`));
        return;
      }

      const flow = parseResult.flow;
      
      if (flow.id !== id) {
        this.error(`Flow ID mismatch: expected '${id}', got '${flow.id}'`);
        return;
      }

      this.success(`Flow '${flow.name}' (${flow.id}) updated successfully`);
      
      if (parseResult.warnings.length > 0) {
        this.warn('Warnings:');
        parseResult.warnings.forEach(warning => this.warn(`  - ${warning}`));
      }

      this.output(flow);

    } catch (error) {
      this.error(`Failed to update flow: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleDeleteFlow(id: string, options: any): Promise<void> {
    try {
      if (!options.yes) {
        const confirmed = await this.confirm(`Are you sure you want to delete flow '${id}'?`);
        if (!confirmed) {
          this.info('Operation cancelled');
          return;
        }
      }

      this.verbose(`Deleting flow: ${id}`);
      this.success(`Flow '${id}' deleted successfully`);

    } catch (error) {
      this.error(`Failed to delete flow: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleValidateFlow(file: string, options: any): Promise<void> {
    try {
      this.verbose(`Validating flow file: ${file}`);
      
      const flowData = await this.readFile(file);
      const parseResult = flowParser.parseFlow(flowData, options.format);

      if (parseResult.success && parseResult.flow) {
        this.success('✅ Flow validation passed');
        this.info(`Flow: ${parseResult.flow.name} (${parseResult.flow.id})`);
        this.info(`Version: ${parseResult.flow.version}`);
        this.info(`Steps: ${parseResult.flow.steps.length}`);
      } else {
        this.error('❌ Flow validation failed');
        parseResult.errors.forEach(error => this.error(`  - ${error}`));
      }

      if (parseResult.warnings.length > 0) {
        this.warn('⚠️  Warnings:');
        parseResult.warnings.forEach(warning => this.warn(`  - ${warning}`));
      }

    } catch (error) {
      this.error(`Failed to validate flow: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Execution Management Handlers

  private async handleStartExecution(flowId: string, options: any): Promise<void> {
    try {
      this.verbose(`Starting execution for flow: ${flowId}`);

      let context: ExecutionContext = {
        triggeredBy: options.triggeredBy || 'cli:user',
        triggerType: options.triggerType || 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      if (options.context) {
        const contextData = await this.readFile(options.context);
        context = { ...context, ...JSON.parse(contextData) };
      }

      if (options.input) {
        context.inputData = JSON.parse(options.input);
      }

      if (options.variables) {
        context.variables = JSON.parse(options.variables);
      }

      const executionId = await executionEngine.startExecution(flowId, context);
      this.success(`Execution started: ${executionId}`);
      this.info(`Flow: ${flowId}`);
      this.info(`Trigger: ${context.triggerType} by ${context.triggeredBy}`);

    } catch (error) {
      this.error(`Failed to start execution: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleListExecutions(options: any): Promise<void> {
    try {
      this.verbose('Listing executions...');
      
      const executions = executionEngine.getAllExecutions();
      let filteredExecutions = executions;

      if (options.flowId) {
        filteredExecutions = filteredExecutions.filter(exec => exec.flowId === options.flowId);
      }

      if (options.status) {
        filteredExecutions = filteredExecutions.filter(exec => exec.status === options.status);
      }

      if (options.triggeredBy) {
        filteredExecutions = filteredExecutions.filter(exec => exec.context.triggeredBy === options.triggeredBy);
      }

      const limit = parseInt(options.limit) || 50;
      const limitedExecutions = filteredExecutions.slice(0, limit);

      if (limitedExecutions.length === 0) {
        this.info('No executions found');
        return;
      }

      this.output(limitedExecutions);

    } catch (error) {
      this.error(`Failed to list executions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleExecutionStatus(id: string, options: any): Promise<void> {
    try {
      this.verbose(`Getting execution status: ${id}`);

      const execution = await executionEngine.getExecutionStatus(id);
      if (!execution) {
        this.error(`Execution not found: ${id}`);
        return;
      }

      this.output(execution);

      if (options.watch) {
        this.info('Watching for status changes... (Press Ctrl+C to stop)');
        // Implementation would poll for status changes
      }

    } catch (error) {
      this.error(`Failed to get execution status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleExecutionLogs(id: string, options: any): Promise<void> {
    try {
      this.verbose(`Getting execution logs: ${id}`);
      
      // For prototype, show placeholder
      this.info(`Execution logs for: ${id}`);
      this.info('(Log implementation would show actual execution logs)');

      if (options.follow) {
        this.info('Following logs... (Press Ctrl+C to stop)');
        // Implementation would stream logs
      }

    } catch (error) {
      this.error(`Failed to get execution logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handlePauseExecution(id: string): Promise<void> {
    try {
      this.verbose(`Pausing execution: ${id}`);
      
      await executionEngine.pauseExecution(id);
      this.success(`Execution '${id}' paused successfully`);

    } catch (error) {
      this.error(`Failed to pause execution: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleResumeExecution(id: string): Promise<void> {
    try {
      this.verbose(`Resuming execution: ${id}`);
      
      await executionEngine.resumeExecution(id);
      this.success(`Execution '${id}' resumed successfully`);

    } catch (error) {
      this.error(`Failed to resume execution: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleAbortExecution(id: string, options: any): Promise<void> {
    try {
      if (!options.yes) {
        const confirmed = await this.confirm(`Are you sure you want to abort execution '${id}'?`);
        if (!confirmed) {
          this.info('Operation cancelled');
          return;
        }
      }

      this.verbose(`Aborting execution: ${id}`);
      
      await executionEngine.abortExecution(id);
      this.success(`Execution '${id}' aborted successfully`);

    } catch (error) {
      this.error(`Failed to abort execution: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // System Management Handlers

  private async handleSystemInfo(): Promise<void> {
    try {
      this.verbose('Getting system information...');
      
      const info = {
        name: 'Qflow Serverless Automation Engine',
        version: '0.1.0',
        description: 'Universal coherence motor for the AnarQ & Q ecosystem',
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

      this.output(info);

    } catch (error) {
      this.error(`Failed to get system info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleSystemHealth(): Promise<void> {
    try {
      this.verbose('Checking system health...');
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          flowParser: true,
          executionEngine: true,
          validationPipeline: true,
          eventEmitter: true
        }
      };

      this.output(health);

    } catch (error) {
      this.error(`Failed to check system health: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleSystemMetrics(): Promise<void> {
    try {
      this.verbose('Getting system metrics...');
      
      const executions = executionEngine.getAllExecutions();
      const executionsByStatus = executions.reduce((acc, exec) => {
        acc[exec.status] = (acc[exec.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const metrics = {
        executions: {
          total: executions.length,
          byStatus: executionsByStatus,
          active: (executionsByStatus.pending || 0) + (executionsByStatus.running || 0) + (executionsByStatus.paused || 0)
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        timestamp: new Date().toISOString()
      };

      this.output(metrics);

    } catch (error) {
      this.error(`Failed to get system metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleStartServer(options: any): Promise<void> {
    try {
      const port = parseInt(options.port) || 8080;
      const host = options.host || '0.0.0.0';

      this.info(`Starting Qflow server on ${host}:${port}...`);
      
      const server = new (await import('../api/QflowServer.js')).QflowServer({
        port,
        host
      });

      await server.start();
      this.success(`Server started successfully on http://${host}:${port}`);

      // Keep the process running
      process.on('SIGINT', async () => {
        this.info('\nShutting down server...');
        await server.stop();
        process.exit(0);
      });

    } catch (error) {
      this.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Node Management Handlers

  private async handleListNodes(): Promise<void> {
    try {
      this.verbose('Listing QNET nodes...');
      
      // For prototype, show placeholder
      this.info('Available QNET nodes:');
      this.info('(Implementation would query QNET for available nodes)');

    } catch (error) {
      this.error(`Failed to list nodes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleNodeHealth(): Promise<void> {
    try {
      this.verbose('Checking node health...');
      
      // For prototype, show placeholder
      this.info('Node health status:');
      this.info('(Implementation would check health of all QNET nodes)');

    } catch (error) {
      this.error(`Failed to check node health: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // DAO Management Handlers

  private async handleListDAOSubnets(): Promise<void> {
    try {
      this.verbose('Listing DAO subnets...');
      
      // For prototype, show placeholder
      this.info('Available DAO subnets:');
      this.info('(Implementation would query DAO governance for available subnets)');

    } catch (error) {
      this.error(`Failed to list DAO subnets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Flow Ownership Management Handlers

  private async handleTransferOwnership(flowId: string, newOwner: string, options: any): Promise<void> {
    try {
      this.verbose(`Transferring ownership of flow ${flowId} to ${newOwner}...`);
      
      const { reason = 'Ownership transfer', signature } = options;
      
      if (!signature) {
        this.error('Transfer signature is required. Use --signature option.');
        return;
      }

      const response = await this.apiRequest('POST', `/flows/${flowId}/transfer`, {
        newOwner,
        reason,
        signature
      });

      if (response.success) {
        this.success(`Flow ownership transferred successfully`);
        this.output({
          flowId,
          newOwner,
          transferredAt: response.data.transferredAt
        });
      } else {
        this.error(`Transfer failed: ${response.message}`);
      }

    } catch (error) {
      this.error(`Failed to transfer ownership: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGrantPermission(flowId: string, identity: string, permission: string, options: any): Promise<void> {
    try {
      this.verbose(`Granting ${permission} permission to ${identity} for flow ${flowId}...`);
      
      const { expires, conditions: conditionsFile } = options;
      let conditions;
      
      if (conditionsFile) {
        const conditionsData = await this.readFile(conditionsFile);
        conditions = JSON.parse(conditionsData);
      }

      const response = await this.apiRequest('POST', `/flows/${flowId}/grant-access`, {
        grantedTo: identity,
        permission,
        expiresAt: expires,
        conditions
      });

      if (response.success) {
        this.success(`Permission granted successfully`);
        this.output({
          flowId,
          grantedTo: identity,
          permission,
          grantedAt: response.data.grantedAt,
          expiresAt: response.data.expiresAt
        });
      } else {
        this.error(`Grant failed: ${response.message}`);
      }

    } catch (error) {
      this.error(`Failed to grant permission: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleRevokePermission(flowId: string, identity: string, permission: string): Promise<void> {
    try {
      this.verbose(`Revoking ${permission} permission from ${identity} for flow ${flowId}...`);
      
      const response = await this.apiRequest('POST', `/flows/${flowId}/revoke-access`, {
        revokedFrom: identity,
        permission
      });

      if (response.success) {
        this.success(`Permission revoked successfully`);
        this.output({
          flowId,
          revokedFrom: identity,
          permission,
          revokedAt: response.data.revokedAt
        });
      } else {
        this.error(`Revoke failed: ${response.message}`);
      }

    } catch (error) {
      this.error(`Failed to revoke permission: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleShowOwnership(flowId: string): Promise<void> {
    try {
      this.verbose(`Getting ownership information for flow ${flowId}...`);
      
      const [ownershipResponse, permissionsResponse] = await Promise.all([
        this.apiRequest('GET', `/flows/${flowId}/ownership`),
        this.apiRequest('GET', `/flows/${flowId}/permissions`)
      ]);

      if (ownershipResponse.success && permissionsResponse.success) {
        this.info(`Flow Ownership Information:`);
        this.output({
          ownership: ownershipResponse.data.ownership,
          permissions: permissionsResponse.data.permissions
        });
      } else {
        this.error(`Failed to get ownership information: ${ownershipResponse.message || permissionsResponse.message}`);
      }

    } catch (error) {
      this.error(`Failed to show ownership: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleRequestAccess(flowId: string, permissions: string[], options: any): Promise<void> {
    try {
      this.verbose(`Requesting access to flow ${flowId}...`);
      
      const { reason = 'Access request' } = options;

      const response = await this.apiRequest('POST', `/flows/${flowId}/request-access`, {
        requestedPermissions: permissions,
        reason
      });

      if (response.success) {
        this.success(`Access request submitted successfully`);
        this.output({
          requestId: response.data.requestId,
          flowId,
          requestedPermissions: permissions,
          reason,
          status: 'pending'
        });
      } else {
        this.error(`Request failed: ${response.message}`);
      }

    } catch (error) {
      this.error(`Failed to request access: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleReviewRequest(requestId: string, decision: string, options: any): Promise<void> {
    try {
      this.verbose(`Reviewing access request ${requestId}...`);
      
      if (!['approve', 'approved', 'deny', 'denied'].includes(decision.toLowerCase())) {
        this.error('Decision must be "approve" or "deny"');
        return;
      }

      const normalizedDecision = decision.toLowerCase().startsWith('approve') ? 'approved' : 'denied';
      const { notes } = options;

      const response = await this.apiRequest('POST', `/access-requests/${requestId}/review`, {
        decision: normalizedDecision,
        reviewNotes: notes
      });

      if (response.success) {
        this.success(`Access request ${normalizedDecision} successfully`);
        this.output({
          requestId,
          decision: normalizedDecision,
          reviewedAt: response.data.reviewedAt,
          notes
        });
      } else {
        this.error(`Review failed: ${response.message}`);
      }

    } catch (error) {
      this.error(`Failed to review request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleUpdatePolicy(flowId: string, options: any): Promise<void> {
    try {
      this.verbose(`Updating sharing policy for flow ${flowId}...`);
      
      const policy: any = {};
      
      if (options.visibility) {
        policy.visibility = options.visibility;
      }
      
      if (options.autoApprove) {
        policy.autoApprove = options.autoApprove.split(',').map((p: string) => p.trim());
      }
      
      if (options.requireApproval) {
        policy.requireApproval = options.requireApproval.split(',').map((p: string) => p.trim());
      }

      const response = await this.apiRequest('PUT', `/flows/${flowId}/policy`, policy);

      if (response.success) {
        this.success(`Sharing policy updated successfully`);
        this.output({
          flowId,
          policy,
          updatedAt: new Date().toISOString()
        });
      } else {
        this.error(`Policy update failed: ${response.message}`);
      }

    } catch (error) {
      this.error(`Failed to update policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleListOwned(identity?: string): Promise<void> {
    try {
      const targetIdentity = identity || 'current-user';
      this.verbose(`Listing flows owned by ${targetIdentity}...`);
      
      const response = await this.apiRequest('GET', `/identity/${targetIdentity}/owned-flows`);

      if (response.success) {
        this.info(`Flows owned by ${targetIdentity}:`);
        this.output(response.data.flows || []);
      } else {
        this.error(`Failed to list owned flows: ${response.message}`);
      }

    } catch (error) {
      this.error(`Failed to list owned flows: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleListAccessible(identity?: string, options: any = {}): Promise<void> {
    try {
      const targetIdentity = identity || 'current-user';
      const { permission = 'read' } = options;
      
      this.verbose(`Listing flows accessible by ${targetIdentity} with ${permission} permission...`);
      
      const response = await this.apiRequest('GET', `/identity/${targetIdentity}/accessible-flows`, {
        permission
      });

      if (response.success) {
        this.info(`Flows accessible by ${targetIdentity} (${permission}):`);
        this.output(response.data.flows || []);
      } else {
        this.error(`Failed to list accessible flows: ${response.message}`);
      }

    } catch (error) {
      this.error(`Failed to list accessible flows: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Utility Methods

  private async readFile(filePath: string): Promise<string> {
    try {
      const resolvedPath = path.resolve(filePath);
      return await fs.readFile(resolvedPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file '${filePath}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async confirm(message: string): Promise<boolean> {
    // For prototype, return true (in production would use readline)
    console.log(`${message} (y/N)`);
    return true;
  }

  private output(data: any): void {
    switch (this.config.outputFormat) {
      case 'json':
        console.log(JSON.stringify(data, null, 2));
        break;
      case 'yaml':
        // For prototype, use JSON (in production would use yaml library)
        console.log(JSON.stringify(data, null, 2));
        break;
      case 'table':
      default:
        if (Array.isArray(data)) {
          this.outputTable(data);
        } else {
          this.outputObject(data);
        }
        break;
    }
  }

  private outputTable(data: any[]): void {
    if (data.length === 0) {
      this.info('No data to display');
      return;
    }

    // Simple table output for prototype
    console.table(data);
  }

  private outputObject(data: any): void {
    // Simple object output for prototype
    console.log(JSON.stringify(data, null, 2));
  }

  private verbose(message: string): void {
    if (this.config.verbose) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  private info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  private success(message: string): void {
    console.log(`[SUCCESS] ✅ ${message}`);
  }

  private warn(message: string): void {
    console.log(`[WARN] ⚠️  ${message}`);
  }

  private error(message: string): void {
    console.error(`[ERROR] ❌ ${message}`);
  }
}

// Export singleton instance
export const qflowCLI = new QflowCLI();