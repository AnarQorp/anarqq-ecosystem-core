import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ProfileService } from '../services/ProfileService';
import { logger } from '../utils/logger';

const profileService = new ProfileService();

// Request schemas
const createProfileSchema = z.object({
  name: z.string().min(1).max(100),
  rules: z.array(z.object({
    field: z.string().min(1),
    strategy: z.enum(['REDACT', 'HASH', 'ENCRYPT', 'ANONYMIZE', 'REMOVE']),
    params: z.record(z.any()).optional()
  })).min(1),
  defaults: z.record(z.any()).default({}),
  version: z.string().default('1.0.0'),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
  complianceFlags: z.array(z.enum(['GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI_DSS'])).default([])
});

const updateProfileSchema = z.object({
  rules: z.array(z.object({
    field: z.string().min(1),
    strategy: z.enum(['REDACT', 'HASH', 'ENCRYPT', 'ANONYMIZE', 'REMOVE']),
    params: z.record(z.any()).optional()
  })).optional(),
  defaults: z.record(z.any()).optional(),
  version: z.string().optional()
});

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // Create a new privacy profile
  fastify.post('/', {
    schema: {
      description: 'Create a new privacy profile',
      tags: ['Profiles'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          rules: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', minLength: 1 },
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
          version: { type: 'string' },
          description: { type: 'string', maxLength: 500 },
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          complianceFlags: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI_DSS']
            }
          }
        },
        required: ['name', 'rules']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            code: { type: 'string' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                version: { type: 'string' },
                ruleCount: { type: 'number' },
                createdAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const profileData = createProfileSchema.parse(request.body);
    const identity = request.identity!;

    logger.info(`Creating privacy profile '${profileData.name}' for identity: ${identity.squidId}`);

    try {
      const profile = await profileService.createProfile(
        {
          name: profileData.name,
          rules: profileData.rules,
          defaults: profileData.defaults,
          version: profileData.version
        },
        identity.squidId,
        {
          description: profileData.description,
          tags: profileData.tags,
          complianceFlags: profileData.complianceFlags
        }
      );

      return reply.code(201).send({
        status: 'ok',
        code: 'PROFILE_CREATED',
        message: 'Privacy profile created successfully',
        data: {
          id: profile._id,
          name: profile.name,
          version: profile.version,
          ruleCount: profile.ruleCount,
          createdAt: profile.createdAt
        }
      });
    } catch (error) {
      logger.error('Failed to create profile:', error);
      throw error;
    }
  });

  // Get a privacy profile by name
  fastify.get('/:name', {
    schema: {
      description: 'Get a privacy profile by name',
      tags: ['Profiles'],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            code: { type: 'string' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                rules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      strategy: { type: 'string' },
                      params: { type: 'object' }
                    }
                  }
                },
                defaults: { type: 'object' },
                version: { type: 'string' },
                description: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                complianceFlags: { type: 'array', items: { type: 'string' } },
                createdBy: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { name } = request.params as { name: string };

    try {
      const profile = await profileService.getProfile(name);
      if (!profile) {
        return reply.code(404).send({
          status: 'error',
          code: 'PROFILE_NOT_FOUND',
          message: `Privacy profile '${name}' not found`
        });
      }

      return reply.send({
        status: 'ok',
        code: 'PROFILE_RETRIEVED',
        message: 'Privacy profile retrieved successfully',
        data: {
          name: profile.name,
          rules: profile.rules,
          defaults: profile.defaults,
          version: profile.version,
          description: profile.description,
          tags: profile.tags,
          complianceFlags: profile.complianceFlags,
          createdBy: profile.createdBy,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt
        }
      });
    } catch (error) {
      logger.error('Failed to get profile:', error);
      throw error;
    }
  });

  // Update a privacy profile
  fastify.put('/:name', {
    schema: {
      description: 'Update a privacy profile',
      tags: ['Profiles'],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      },
      body: {
        type: 'object',
        properties: {
          rules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', minLength: 1 },
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
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            code: { type: 'string' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                version: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { name } = request.params as { name: string };
    const updates = updateProfileSchema.parse(request.body);
    const identity = request.identity!;

    logger.info(`Updating privacy profile '${name}' for identity: ${identity.squidId}`);

    try {
      const profile = await profileService.updateProfile(name, updates, identity.squidId);
      if (!profile) {
        return reply.code(404).send({
          status: 'error',
          code: 'PROFILE_NOT_FOUND',
          message: `Privacy profile '${name}' not found`
        });
      }

      return reply.send({
        status: 'ok',
        code: 'PROFILE_UPDATED',
        message: 'Privacy profile updated successfully',
        data: {
          name: profile.name,
          version: profile.version,
          updatedAt: profile.updatedAt
        }
      });
    } catch (error) {
      logger.error('Failed to update profile:', error);
      throw error;
    }
  });

  // Delete a privacy profile
  fastify.delete('/:name', {
    schema: {
      description: 'Delete a privacy profile',
      tags: ['Profiles'],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            code: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { name } = request.params as { name: string };
    const identity = request.identity!;

    logger.info(`Deleting privacy profile '${name}' for identity: ${identity.squidId}`);

    try {
      const deleted = await profileService.deleteProfile(name, identity.squidId);
      if (!deleted) {
        return reply.code(404).send({
          status: 'error',
          code: 'PROFILE_NOT_FOUND',
          message: `Privacy profile '${name}' not found`
        });
      }

      return reply.send({
        status: 'ok',
        code: 'PROFILE_DELETED',
        message: 'Privacy profile deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete profile:', error);
      throw error;
    }
  });

  // List privacy profiles
  fastify.get('/', {
    schema: {
      description: 'List privacy profiles',
      tags: ['Profiles'],
      querystring: {
        type: 'object',
        properties: {
          tags: { type: 'string' },
          complianceFlags: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            code: { type: 'string' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                profiles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      version: { type: 'string' },
                      description: { type: 'string' },
                      tags: { type: 'array', items: { type: 'string' } },
                      complianceFlags: { type: 'array', items: { type: 'string' } },
                      ruleCount: { type: 'number' },
                      createdAt: { type: 'string' }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    total: { type: 'number' },
                    totalPages: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const query = request.query as {
      tags?: string;
      complianceFlags?: string;
      page?: number;
      limit?: number;
    };

    const identity = request.identity!;

    try {
      const filters: any = {
        createdBy: identity.squidId
      };

      if (query.tags) {
        filters.tags = query.tags.split(',');
      }

      if (query.complianceFlags) {
        filters.complianceFlags = query.complianceFlags.split(',');
      }

      const result = await profileService.listProfiles(filters, {
        page: query.page || 1,
        limit: query.limit || 20
      });

      return reply.send({
        status: 'ok',
        code: 'PROFILES_LISTED',
        message: 'Privacy profiles retrieved successfully',
        data: {
          profiles: result.profiles.map(profile => ({
            name: profile.name,
            version: profile.version,
            description: profile.description,
            tags: profile.tags,
            complianceFlags: profile.complianceFlags,
            ruleCount: profile.ruleCount,
            createdAt: profile.createdAt
          })),
          pagination: {
            page: result.page,
            limit: query.limit || 20,
            total: result.total,
            totalPages: result.totalPages
          }
        }
      });
    } catch (error) {
      logger.error('Failed to list profiles:', error);
      throw error;
    }
  });

  // Clone a privacy profile
  fastify.post('/:name/clone', {
    schema: {
      description: 'Clone a privacy profile with a new name',
      tags: ['Profiles'],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      },
      body: {
        type: 'object',
        properties: {
          newName: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['newName']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            code: { type: 'string' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                clonedFrom: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { name } = request.params as { name: string };
    const { newName, description, tags } = request.body as {
      newName: string;
      description?: string;
      tags?: string[];
    };
    const identity = request.identity!;

    logger.info(`Cloning privacy profile '${name}' to '${newName}' for identity: ${identity.squidId}`);

    try {
      const clonedProfile = await profileService.cloneProfile(
        name,
        newName,
        identity.squidId,
        { description, tags }
      );

      return reply.code(201).send({
        status: 'ok',
        code: 'PROFILE_CLONED',
        message: 'Privacy profile cloned successfully',
        data: {
          name: clonedProfile.name,
          clonedFrom: name,
          createdAt: clonedProfile.createdAt
        }
      });
    } catch (error) {
      logger.error('Failed to clone profile:', error);
      throw error;
    }
  });

  // Get profile statistics
  fastify.get('/:name/stats', {
    schema: {
      description: 'Get statistics for a privacy profile',
      tags: ['Profiles'],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            code: { type: 'string' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                usageCount: { type: 'number' },
                lastUsed: { type: 'string' },
                averageRiskScore: { type: 'number' },
                complianceFlags: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { name } = request.params as { name: string };

    try {
      const stats = await profileService.getProfileStats(name);

      return reply.send({
        status: 'ok',
        code: 'PROFILE_STATS_RETRIEVED',
        message: 'Profile statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get profile stats:', error);
      throw error;
    }
  });
};