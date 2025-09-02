import { FastifyPluginAsync } from 'fastify';
import { MaskingService } from '../services/MaskingService';
import { ProfileService } from '../services/ProfileService';
import { PrivacyAssessmentService } from '../services/PrivacyAssessmentService';
import { logger } from '../utils/logger';

const maskingService = new MaskingService();
const profileService = new ProfileService();
const assessmentService = new PrivacyAssessmentService();

export const registerMcpRoutes: FastifyPluginAsync = async (fastify) => {
  // MCP tool: qmask.apply
  fastify.post('/tools/qmask.apply', {
    schema: {
      description: 'MCP tool: Apply privacy masking to data using a specified profile',
      tags: ['MCP Tools'],
      body: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            description: 'Data object to apply masking to',
            additionalProperties: true
          },
          profileName: {
            type: 'string',
            description: 'Name of the privacy profile to apply'
          },
          context: {
            type: 'object',
            description: 'Additional context for masking decisions',
            properties: {
              purpose: { type: 'string' },
              jurisdiction: { type: 'string' },
              dataSubject: { type: 'string' }
            },
            additionalProperties: true
          }
        },
        required: ['data', 'profileName']
      }
    }
  }, async (request, reply) => {
    const { data, profileName, context } = request.body as {
      data: Record<string, any>;
      profileName: string;
      context?: Record<string, any>;
    };

    const identity = request.identity!;

    try {
      // Get the privacy profile
      const profile = await profileService.getProfile(profileName);
      if (!profile) {
        return reply.code(404).send({
          error: 'PROFILE_NOT_FOUND',
          message: `Privacy profile '${profileName}' not found`
        });
      }

      // Apply masking
      const result = await maskingService.applyMasking(
        data,
        profile.toMaskProfile(),
        context
      );

      logger.info(`MCP: Applied masking profile '${profileName}' for identity: ${identity.squidId}`);

      return reply.send({
        maskedData: result.maskedData,
        appliedRules: result.appliedRules,
        riskScore: result.riskScore,
        complianceFlags: result.complianceFlags
      });
    } catch (error) {
      logger.error('MCP qmask.apply failed:', error);
      return reply.code(500).send({
        error: 'MASKING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MCP tool: qmask.profile
  fastify.post('/tools/qmask.profile', {
    schema: {
      description: 'MCP tool: Manage privacy profiles - create, update, retrieve, or delete',
      tags: ['MCP Tools'],
      body: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'update', 'get', 'delete', 'list']
          },
          profileName: { type: 'string' },
          profile: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              rules: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    strategy: {
                      type: 'string',
                      enum: ['REDACT', 'HASH', 'ENCRYPT', 'ANONYMIZE', 'REMOVE']
                    },
                    params: {
                      type: 'object',
                      additionalProperties: true
                    }
                  },
                  required: ['field', 'strategy']
                }
              },
              defaults: {
                type: 'object',
                additionalProperties: true
              },
              version: { type: 'string' }
            }
          }
        },
        required: ['action']
      }
    }
  }, async (request, reply) => {
    const { action, profileName, profile } = request.body as {
      action: 'create' | 'update' | 'get' | 'delete' | 'list';
      profileName?: string;
      profile?: any;
    };

    const identity = request.identity!;

    try {
      switch (action) {
        case 'create':
          if (!profile) {
            return reply.code(400).send({
              error: 'PROFILE_REQUIRED',
              message: 'Profile data is required for create action'
            });
          }

          const createdProfile = await profileService.createProfile(
            profile,
            identity.squidId
          );

          return reply.send({
            success: true,
            profile: {
              name: createdProfile.name,
              version: createdProfile.version,
              createdAt: createdProfile.createdAt
            },
            message: 'Profile created successfully'
          });

        case 'update':
          if (!profileName || !profile) {
            return reply.code(400).send({
              error: 'PROFILE_NAME_AND_DATA_REQUIRED',
              message: 'Profile name and data are required for update action'
            });
          }

          const updatedProfile = await profileService.updateProfile(
            profileName,
            profile,
            identity.squidId
          );

          if (!updatedProfile) {
            return reply.code(404).send({
              error: 'PROFILE_NOT_FOUND',
              message: `Profile '${profileName}' not found`
            });
          }

          return reply.send({
            success: true,
            profile: {
              name: updatedProfile.name,
              version: updatedProfile.version,
              updatedAt: updatedProfile.updatedAt
            },
            message: 'Profile updated successfully'
          });

        case 'get':
          if (!profileName) {
            return reply.code(400).send({
              error: 'PROFILE_NAME_REQUIRED',
              message: 'Profile name is required for get action'
            });
          }

          const retrievedProfile = await profileService.getProfile(profileName);
          if (!retrievedProfile) {
            return reply.code(404).send({
              error: 'PROFILE_NOT_FOUND',
              message: `Profile '${profileName}' not found`
            });
          }

          return reply.send({
            success: true,
            profile: retrievedProfile.toMaskProfile(),
            message: 'Profile retrieved successfully'
          });

        case 'delete':
          if (!profileName) {
            return reply.code(400).send({
              error: 'PROFILE_NAME_REQUIRED',
              message: 'Profile name is required for delete action'
            });
          }

          const deleted = await profileService.deleteProfile(profileName, identity.squidId);
          if (!deleted) {
            return reply.code(404).send({
              error: 'PROFILE_NOT_FOUND',
              message: `Profile '${profileName}' not found`
            });
          }

          return reply.send({
            success: true,
            message: 'Profile deleted successfully'
          });

        case 'list':
          const result = await profileService.listProfiles({
            createdBy: identity.squidId
          });

          return reply.send({
            success: true,
            profiles: result.profiles.map(p => ({
              name: p.name,
              version: p.version,
              description: p.description,
              tags: p.tags,
              ruleCount: p.ruleCount,
              createdAt: p.createdAt
            })),
            message: 'Profiles listed successfully'
          });

        default:
          return reply.code(400).send({
            error: 'INVALID_ACTION',
            message: `Invalid action: ${action}`
          });
      }
    } catch (error) {
      logger.error('MCP qmask.profile failed:', error);
      return reply.code(500).send({
        error: 'PROFILE_OPERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MCP tool: qmask.assess
  fastify.post('/tools/qmask.assess', {
    schema: {
      description: 'MCP tool: Perform privacy impact assessment on data processing operations',
      tags: ['MCP Tools'],
      body: {
        type: 'object',
        properties: {
          operation: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['COLLECTION', 'PROCESSING', 'STORAGE', 'SHARING', 'DELETION', 'ANALYSIS']
              },
              dataTypes: {
                type: 'array',
                items: { type: 'string' }
              },
              purpose: { type: 'string' },
              recipients: {
                type: 'array',
                items: { type: 'string' }
              },
              retention: { type: 'string' },
              jurisdiction: { type: 'string' }
            },
            required: ['type', 'dataTypes', 'purpose']
          }
        },
        required: ['operation']
      }
    }
  }, async (request, reply) => {
    const { operation } = request.body as {
      operation: {
        type: 'COLLECTION' | 'PROCESSING' | 'STORAGE' | 'SHARING' | 'DELETION' | 'ANALYSIS';
        dataTypes: string[];
        purpose: string;
        recipients?: string[];
        retention?: string;
        jurisdiction?: string;
      };
    };

    const identity = request.identity!;

    try {
      // Set defaults for optional fields
      const fullOperation = {
        ...operation,
        recipients: operation.recipients || [],
        retention: operation.retention || '1 year',
        jurisdiction: operation.jurisdiction || 'US'
      };

      const assessment = await assessmentService.performAssessment(
        fullOperation,
        identity.squidId
      );

      logger.info(`MCP: Performed privacy assessment for ${operation.type} operation by identity: ${identity.squidId}`);

      return reply.send({
        riskLevel: assessment.riskLevel,
        riskScore: assessment.riskScore,
        risks: assessment.risks,
        recommendations: assessment.recommendations,
        complianceRequirements: assessment.complianceRequirements
      });
    } catch (error) {
      logger.error('MCP qmask.assess failed:', error);
      return reply.code(500).send({
        error: 'ASSESSMENT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MCP tool discovery endpoint
  fastify.get('/tools', {
    schema: {
      description: 'List available MCP tools',
      tags: ['MCP Tools']
    }
  }, async (request, reply) => {
    return reply.send({
      tools: [
        {
          name: 'qmask.apply',
          description: 'Apply privacy masking to data using a specified profile',
          parameters: ['data', 'profileName', 'context?']
        },
        {
          name: 'qmask.profile',
          description: 'Manage privacy profiles - create, update, retrieve, or delete',
          parameters: ['action', 'profileName?', 'profile?']
        },
        {
          name: 'qmask.assess',
          description: 'Perform privacy impact assessment on data processing operations',
          parameters: ['operation']
        }
      ]
    });
  });
};