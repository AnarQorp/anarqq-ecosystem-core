import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PrivacyAssessmentService } from '../services/PrivacyAssessmentService';
import { logger } from '../utils/logger';

const assessmentService = new PrivacyAssessmentService();

// Request schemas
const createAssessmentSchema = z.object({
  operation: z.object({
    type: z.enum(['COLLECTION', 'PROCESSING', 'STORAGE', 'SHARING', 'DELETION', 'ANALYSIS']),
    dataTypes: z.array(z.string()).min(1),
    purpose: z.string().min(1),
    recipients: z.array(z.string()).default([]),
    retention: z.string().min(1),
    jurisdiction: z.string().min(1)
  })
});

export const assessmentRoutes: FastifyPluginAsync = async (fastify) => {
  // Perform privacy impact assessment
  fastify.post('/', {
    schema: {
      description: 'Perform a privacy impact assessment',
      tags: ['Assessments'],
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
                items: { type: 'string' },
                minItems: 1
              },
              purpose: { type: 'string', minLength: 1 },
              recipients: {
                type: 'array',
                items: { type: 'string' }
              },
              retention: { type: 'string', minLength: 1 },
              jurisdiction: { type: 'string', minLength: 1 }
            },
            required: ['type', 'dataTypes', 'purpose', 'retention', 'jurisdiction']
          }
        },
        required: ['operation']
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
                assessmentId: { type: 'string' },
                riskLevel: {
                  type: 'string',
                  enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
                },
                riskScore: { type: 'number' },
                risks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      description: { type: 'string' },
                      severity: { type: 'string' },
                      mitigation: { type: 'string' }
                    }
                  }
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' }
                },
                complianceRequirements: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { operation } = createAssessmentSchema.parse(request.body);
    const identity = request.identity!;

    logger.info(`Performing privacy assessment for ${operation.type} operation by identity: ${identity.squidId}`);

    try {
      const assessment = await assessmentService.performAssessment(operation, identity.squidId);

      // Get the saved assessment to return the ID
      const savedAssessments = await assessmentService.listAssessments(identity.squidId, {
        operationType: operation.type
      });
      const latestAssessment = savedAssessments[0];

      return reply.code(201).send({
        status: 'ok',
        code: 'ASSESSMENT_COMPLETED',
        message: 'Privacy impact assessment completed successfully',
        data: {
          assessmentId: latestAssessment?.assessmentId,
          ...assessment
        }
      });
    } catch (error) {
      logger.error('Failed to perform assessment:', error);
      throw error;
    }
  });

  // Get assessment by ID
  fastify.get('/:assessmentId', {
    schema: {
      description: 'Get a privacy assessment by ID',
      tags: ['Assessments'],
      params: {
        type: 'object',
        properties: {
          assessmentId: { type: 'string' }
        },
        required: ['assessmentId']
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
                assessmentId: { type: 'string' },
                operation: { type: 'object' },
                riskLevel: { type: 'string' },
                riskScore: { type: 'number' },
                risks: { type: 'array' },
                recommendations: { type: 'array' },
                complianceRequirements: { type: 'array' },
                status: { type: 'string' },
                assessedAt: { type: 'string' },
                validUntil: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { assessmentId } = request.params as { assessmentId: string };

    try {
      const assessment = await assessmentService.getAssessment(assessmentId);
      if (!assessment) {
        return reply.code(404).send({
          status: 'error',
          code: 'ASSESSMENT_NOT_FOUND',
          message: `Assessment '${assessmentId}' not found`
        });
      }

      return reply.send({
        status: 'ok',
        code: 'ASSESSMENT_RETRIEVED',
        message: 'Privacy assessment retrieved successfully',
        data: {
          assessmentId: assessment.assessmentId,
          operation: assessment.operation,
          riskLevel: assessment.riskLevel,
          riskScore: assessment.riskScore,
          risks: assessment.risks,
          recommendations: assessment.recommendations,
          complianceRequirements: assessment.complianceRequirements,
          status: assessment.status,
          assessedAt: assessment.createdAt,
          validUntil: assessment.validUntil
        }
      });
    } catch (error) {
      logger.error('Failed to get assessment:', error);
      throw error;
    }
  });

  // List assessments
  fastify.get('/', {
    schema: {
      description: 'List privacy assessments',
      tags: ['Assessments'],
      querystring: {
        type: 'object',
        properties: {
          riskLevel: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
          },
          status: {
            type: 'string',
            enum: ['DRAFT', 'APPROVED', 'REJECTED', 'EXPIRED']
          },
          operationType: {
            type: 'string',
            enum: ['COLLECTION', 'PROCESSING', 'STORAGE', 'SHARING', 'DELETION', 'ANALYSIS']
          }
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
                assessments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      assessmentId: { type: 'string' },
                      operationType: { type: 'string' },
                      riskLevel: { type: 'string' },
                      riskScore: { type: 'number' },
                      status: { type: 'string' },
                      assessedAt: { type: 'string' },
                      validUntil: { type: 'string' }
                    }
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
      riskLevel?: string;
      status?: string;
      operationType?: string;
    };
    const identity = request.identity!;

    try {
      const assessments = await assessmentService.listAssessments(identity.squidId, query);

      return reply.send({
        status: 'ok',
        code: 'ASSESSMENTS_LISTED',
        message: 'Privacy assessments retrieved successfully',
        data: {
          assessments: assessments.map(assessment => ({
            assessmentId: assessment.assessmentId,
            operationType: assessment.operation.type,
            riskLevel: assessment.riskLevel,
            riskScore: assessment.riskScore,
            status: assessment.status,
            assessedAt: assessment.createdAt,
            validUntil: assessment.validUntil
          }))
        }
      });
    } catch (error) {
      logger.error('Failed to list assessments:', error);
      throw error;
    }
  });

  // Update assessment status
  fastify.patch('/:assessmentId/status', {
    schema: {
      description: 'Update assessment status',
      tags: ['Assessments'],
      params: {
        type: 'object',
        properties: {
          assessmentId: { type: 'string' }
        },
        required: ['assessmentId']
      },
      body: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['DRAFT', 'APPROVED', 'REJECTED', 'EXPIRED']
          }
        },
        required: ['status']
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
                assessmentId: { type: 'string' },
                status: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { assessmentId } = request.params as { assessmentId: string };
    const { status } = request.body as { status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' };

    try {
      const assessment = await assessmentService.updateAssessmentStatus(assessmentId, status);
      if (!assessment) {
        return reply.code(404).send({
          status: 'error',
          code: 'ASSESSMENT_NOT_FOUND',
          message: `Assessment '${assessmentId}' not found`
        });
      }

      return reply.send({
        status: 'ok',
        code: 'ASSESSMENT_STATUS_UPDATED',
        message: 'Assessment status updated successfully',
        data: {
          assessmentId: assessment.assessmentId,
          status: assessment.status,
          updatedAt: assessment.updatedAt
        }
      });
    } catch (error) {
      logger.error('Failed to update assessment status:', error);
      throw error;
    }
  });
};