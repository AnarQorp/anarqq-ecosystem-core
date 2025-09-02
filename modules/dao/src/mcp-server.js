#!/usr/bin/env node

/**
 * MCP Server for DAO module
 * Provides MCP tools for DAO governance operations
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { DAOService } from './services/DAOService.js';
import { ProposalService } from './services/ProposalService.js';
import { VotingService } from './services/VotingService.js';
import { DatabaseManager } from './storage/database.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

class DAOMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'dao',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.daoService = new DAOService();
    this.proposalService = new ProposalService();
    this.votingService = new VotingService();
    
    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'dao.vote',
            description: 'Cast a vote on a DAO proposal',
            inputSchema: {
              type: 'object',
              properties: {
                daoId: {
                  type: 'string',
                  description: 'DAO identifier'
                },
                proposalId: {
                  type: 'string',
                  description: 'Proposal identifier'
                },
                voterId: {
                  type: 'string',
                  description: 'Voter\'s sQuid identity'
                },
                option: {
                  type: 'string',
                  description: 'Voting option (e.g., \'Yes\', \'No\', \'Abstain\')'
                },
                signature: {
                  type: 'string',
                  description: 'Cryptographic signature of the vote'
                }
              },
              required: ['daoId', 'proposalId', 'voterId', 'option', 'signature']
            }
          },
          {
            name: 'dao.propose',
            description: 'Create a new proposal in a DAO',
            inputSchema: {
              type: 'object',
              properties: {
                daoId: {
                  type: 'string',
                  description: 'DAO identifier'
                },
                title: {
                  type: 'string',
                  description: 'Proposal title'
                },
                description: {
                  type: 'string',
                  description: 'Detailed proposal description'
                },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Voting options',
                  default: ['Yes', 'No']
                },
                duration: {
                  type: 'integer',
                  description: 'Voting duration in milliseconds (optional)'
                },
                creatorId: {
                  type: 'string',
                  description: 'Creator\'s sQuid identity'
                },
                signature: {
                  type: 'string',
                  description: 'Cryptographic signature of the proposal'
                }
              },
              required: ['daoId', 'title', 'description', 'creatorId', 'signature']
            }
          },
          {
            name: 'dao.execute',
            description: 'Execute an approved DAO proposal',
            inputSchema: {
              type: 'object',
              properties: {
                daoId: {
                  type: 'string',
                  description: 'DAO identifier'
                },
                proposalId: {
                  type: 'string',
                  description: 'Proposal identifier'
                },
                executorId: {
                  type: 'string',
                  description: 'Executor\'s sQuid identity'
                },
                signature: {
                  type: 'string',
                  description: 'Cryptographic signature of the execution request'
                }
              },
              required: ['daoId', 'proposalId', 'executorId', 'signature']
            }
          },
          {
            name: 'dao.getProposal',
            description: 'Get detailed information about a specific proposal',
            inputSchema: {
              type: 'object',
              properties: {
                daoId: {
                  type: 'string',
                  description: 'DAO identifier'
                },
                proposalId: {
                  type: 'string',
                  description: 'Proposal identifier'
                }
              },
              required: ['daoId', 'proposalId']
            }
          },
          {
            name: 'dao.getDAOInfo',
            description: 'Get information about a DAO',
            inputSchema: {
              type: 'object',
              properties: {
                daoId: {
                  type: 'string',
                  description: 'DAO identifier'
                }
              },
              required: ['daoId']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'dao.vote':
            return await this.handleVote(args);
          case 'dao.propose':
            return await this.handlePropose(args);
          case 'dao.execute':
            return await this.handleExecute(args);
          case 'dao.getProposal':
            return await this.handleGetProposal(args);
          case 'dao.getDAOInfo':
            return await this.handleGetDAOInfo(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Error handling MCP tool ${name}`, { error: error.message, args });
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async handleVote(args) {
    const { daoId, proposalId, voterId, option, signature } = args;

    const result = await this.votingService.voteOnProposal(daoId, proposalId, {
      voterId,
      option,
      signature
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            voteId: result.vote.id,
            weight: result.vote.weight,
            timestamp: result.vote.timestamp,
            proposalStatus: result.proposalStatus
          }, null, 2)
        }
      ]
    };
  }

  async handlePropose(args) {
    const { daoId, title, description, options, duration, creatorId, signature } = args;

    const metadata = {
      title,
      description,
      options: options || ['Yes', 'No'],
      duration
    };

    const result = await this.proposalService.createProposal(daoId, metadata, creatorId, signature);

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            proposalId: result.proposal.id,
            title: result.proposal.title,
            expiresAt: result.proposal.expiresAt,
            quorum: result.proposal.quorum,
            status: result.proposal.status
          }, null, 2)
        }
      ]
    };
  }

  async handleExecute(args) {
    const { daoId, proposalId, executorId, signature } = args;

    const result = await this.proposalService.executeProposal(daoId, proposalId, executorId, signature);

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            proposalId: result.proposalId,
            executedAt: result.executedAt,
            executionResult: result.executionResult,
            transactionHash: result.executionResult?.transactionHash
          }, null, 2)
        }
      ]
    };
  }

  async handleGetProposal(args) {
    const { daoId, proposalId } = args;

    const result = await this.proposalService.getProposal(daoId, proposalId);

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            proposal: {
              id: result.proposal.id,
              title: result.proposal.title,
              description: result.proposal.description,
              options: result.proposal.options,
              status: result.proposal.status,
              voteCount: result.proposal.voteCount,
              results: result.proposal.results,
              quorumReached: result.proposal.quorumReached,
              timeRemaining: result.proposal.timeRemaining
            }
          }, null, 2)
        }
      ]
    };
  }

  async handleGetDAOInfo(args) {
    const { daoId } = args;

    const result = await this.daoService.getDAO(daoId);

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            dao: {
              id: result.dao.id,
              name: result.dao.name,
              description: result.dao.description,
              memberCount: result.dao.memberCount,
              proposalCount: result.dao.proposalCount,
              activeProposals: result.dao.activeProposals,
              governanceRules: result.dao.governanceRules
            }
          }, null, 2)
        }
      ]
    };
  }

  async start() {
    // Initialize database
    const db = new DatabaseManager();
    await db.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('DAO MCP Server started', {
      version: '1.0.0',
      mode: config.USE_MOCKS ? 'standalone' : 'integrated'
    });
  }
}

// Start the MCP server
async function main() {
  try {
    const server = new DAOMCPServer();
    await server.start();
  } catch (error) {
    logger.error('Failed to start DAO MCP Server', { error: error.message });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down MCP server');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down MCP server');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}