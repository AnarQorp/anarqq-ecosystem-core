import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { GDPRComplianceService } from '../services/GDPRComplianceService';
import { PolicyEnforcementService } from '../services/PolicyEnforcementService';
import { logger } from '../utils/logger';

const gdprService = new GDPRComplianceService();
const policyService = new PolicyEnforcementService();

// Data Subject Request types
interface DataSubjectRequest {
  requestId: string;
  type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION' | 'OBJECTION';
  dataSubject: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  requestedAt: Date;
  completedAt?: Date;
  response?: string;
}

// In-memory store for demo purposes (use database in production)
const dsrStore: Map<string, DataSubjectRequest> = new Map();

// Request schemas
const createDSRSchema = z.object({
  type: z.enum(['ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION', 'OBJECTION']),
  dataSubject: z.string().min(1),
  description: z.string().min(1).max(1000)
});

const updateDSRSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']),
  response: z.string().optional()
});

export const complianceRoutes: FastifyPluginAsync = async (fastify) => {
  // Create Data Subject Request (DSR)
  fastify.post('/dsr', {
    schema: {
      description: 'Create a Data Subject Request (GDPR Article 15-22)',
      tags: ['Compliance'],
      body: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION', 'OBJECTION']
          },
          dataSubject: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1, maxLength: 1000 }
        },
        required: ['type', 'dataSubject', 'description']
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
                requestId: { type: 'string' },
                type: { type: 'string' },
                status: { type: 'string' },
                requestedAt: { type: 'string' },
                estimatedCompletion: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { type, dataSubject, description } = createDSRSchema.parse(request.body);
    const identity = request.identity!;

    logger.info(`Creating DSR of type '${type}' for data subject '${dataSubject}' by identity: ${identity.squidId}`);

    try {
      const requestId = `dsr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      const estimatedCompletion = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Process DSR using GDPR service
      const processingResult = await gdprService.processDataSubjectRequest({
        type,
        dataSubject,
        description
      });

      const dsrRequest: DataSubjectRequest = {
        requestId: processingResult.requestId,
        type,
        dataSubject,
        description,
        status: processingResult.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        requestedAt: now,
        completedAt: processingResult.status === 'COMPLETED' ? processingResult.completedAt : undefined,
        response: processingResult.processedData ? JSON.stringify(processingResult.processedData) : undefined
      };

      dsrStore.set(processingResult.requestId, dsrRequest);

      // TODO: Integrate with Qerberos for audit logging
      logger.info(`DSR processed with ID: ${processingResult.requestId}`);

      return reply.code(201).send({
        status: 'ok',
        code: 'DSR_CREATED',
        message: 'Data Subject Request created successfully',
        data: {
          requestId: processingResult.requestId,
          type,
          status: dsrRequest.status,
          requestedAt: now.toISOString(),
          estimatedCompletion: estimatedCompletion.toISOString(),
          processingResult: {
            status: processingResult.status,
            errors: processingResult.errors
          }
        }
      });
    } catch (error) {
      logger.error('Failed to create DSR:', error);
      throw error;
    }
  });

  // Get DSR by ID
  fastify.get('/dsr/:requestId', {
    schema: {
      description: 'Get a Data Subject Request by ID',
      tags: ['Compliance'],
      params: {
        type: 'object',
        properties: {
          requestId: { type: 'string' }
        },
        required: ['requestId']
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
                requestId: { type: 'string' },
                type: { type: 'string' },
                dataSubject: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string' },
                requestedAt: { type: 'string' },
                completedAt: { type: 'string' },
                response: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { requestId } = request.params as { requestId: string };

    try {
      const dsrRequest = dsrStore.get(requestId);
      if (!dsrRequest) {
        return reply.code(404).send({
          status: 'error',
          code: 'DSR_NOT_FOUND',
          message: `Data Subject Request '${requestId}' not found`
        });
      }

      return reply.send({
        status: 'ok',
        code: 'DSR_RETRIEVED',
        message: 'Data Subject Request retrieved successfully',
        data: {
          requestId: dsrRequest.requestId,
          type: dsrRequest.type,
          dataSubject: dsrRequest.dataSubject,
          description: dsrRequest.description,
          status: dsrRequest.status,
          requestedAt: dsrRequest.requestedAt.toISOString(),
          completedAt: dsrRequest.completedAt?.toISOString(),
          response: dsrRequest.response
        }
      });
    } catch (error) {
      logger.error('Failed to get DSR:', error);
      throw error;
    }
  });

  // Update DSR status
  fastify.patch('/dsr/:requestId', {
    schema: {
      description: 'Update Data Subject Request status',
      tags: ['Compliance'],
      params: {
        type: 'object',
        properties: {
          requestId: { type: 'string' }
        },
        required: ['requestId']
      },
      body: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']
          },
          response: { type: 'string' }
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
                requestId: { type: 'string' },
                status: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const { status, response } = updateDSRSchema.parse(request.body);

    try {
      const dsrRequest = dsrStore.get(requestId);
      if (!dsrRequest) {
        return reply.code(404).send({
          status: 'error',
          code: 'DSR_NOT_FOUND',
          message: `Data Subject Request '${requestId}' not found`
        });
      }

      dsrRequest.status = status;
      if (response) {
        dsrRequest.response = response;
      }
      if (status === 'COMPLETED' || status === 'REJECTED') {
        dsrRequest.completedAt = new Date();
      }

      dsrStore.set(requestId, dsrRequest);

      logger.info(`DSR ${requestId} status updated to: ${status}`);

      return reply.send({
        status: 'ok',
        code: 'DSR_UPDATED',
        message: 'Data Subject Request updated successfully',
        data: {
          requestId,
          status,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to update DSR:', error);
      throw error;
    }
  });

  // List DSRs
  fastify.get('/dsr', {
    schema: {
      description: 'List Data Subject Requests',
      tags: ['Compliance'],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']
          },
          type: {
            type: 'string',
            enum: ['ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION', 'OBJECTION']
          },
          dataSubject: { type: 'string' }
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
                requests: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      requestId: { type: 'string' },
                      type: { type: 'string' },
                      dataSubject: { type: 'string' },
                      status: { type: 'string' },
                      requestedAt: { type: 'string' },
                      completedAt: { type: 'string' }
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
      status?: string;
      type?: string;
      dataSubject?: string;
    };

    try {
      let requests = Array.from(dsrStore.values());

      // Apply filters
      if (query.status) {
        requests = requests.filter(req => req.status === query.status);
      }
      if (query.type) {
        requests = requests.filter(req => req.type === query.type);
      }
      if (query.dataSubject) {
        requests = requests.filter(req => req.dataSubject.includes(query.dataSubject!));
      }

      // Sort by request date (newest first)
      requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

      return reply.send({
        status: 'ok',
        code: 'DSR_LIST_RETRIEVED',
        message: 'Data Subject Requests retrieved successfully',
        data: {
          requests: requests.map(req => ({
            requestId: req.requestId,
            type: req.type,
            dataSubject: req.dataSubject,
            status: req.status,
            requestedAt: req.requestedAt.toISOString(),
            completedAt: req.completedAt?.toISOString()
          }))
        }
      });
    } catch (error) {
      logger.error('Failed to list DSRs:', error);
      throw error;
    }
  });

  // Validate GDPR compliance for operation
  fastify.post('/validate-gdpr', {
    schema: {
      description: 'Validate GDPR compliance for a data processing operation',
      tags: ['Compliance'],
      body: {
        type: 'object',
        properties: {
          purpose: { type: 'string' },
          dataTypes: {
            type: 'array',
            items: { type: 'string' }
          },
          lawfulBasis: { type: 'string' },
          dataSubjectConsent: { type: 'boolean' },
          retentionPeriod: { type: 'string' },
          recipients: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['purpose', 'dataTypes', 'lawfulBasis', 'retentionPeriod', 'recipients']
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
                compliant: { type: 'boolean' },
                violations: {
                  type: 'array',
                  items: { type: 'string' }
                },
                recommendations: {
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
    const operation = request.body as {
      purpose: string;
      dataTypes: string[];
      lawfulBasis: string;
      dataSubjectConsent?: boolean;
      retentionPeriod: string;
      recipients: string[];
    };

    try {
      const validation = await gdprService.validateGDPRCompliance(operation);

      return reply.send({
        status: 'ok',
        code: 'GDPR_VALIDATION_COMPLETE',
        message: 'GDPR compliance validation completed',
        data: validation
      });
    } catch (error) {
      logger.error('Failed to validate GDPR compliance:', error);
      throw error;
    }
  });

  // Assess breach notification requirement
  fastify.post('/assess-breach', {
    schema: {
      description: 'Assess if a data breach requires notification under GDPR',
      tags: ['Compliance'],
      body: {
        type: 'object',
        properties: {
          dataTypes: {
            type: 'array',
            items: { type: 'string' }
          },
          affectedSubjects: { type: 'number', minimum: 1 },
          riskLevel: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
          },
          containmentTime: { type: 'number', minimum: 0 },
          description: { type: 'string' }
        },
        required: ['dataTypes', 'affectedSubjects', 'riskLevel', 'containmentTime', 'description']
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
                notificationRequired: { type: 'boolean' },
                timeframe: { type: 'string' },
                recipients: {
                  type: 'array',
                  items: { type: 'string' }
                },
                template: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const incident = request.body as {
      dataTypes: string[];
      affectedSubjects: number;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      containmentTime: number;
      description: string;
    };

    try {
      const assessment = await gdprService.assessBreachNotificationRequirement(incident);

      return reply.send({
        status: 'ok',
        code: 'BREACH_ASSESSMENT_COMPLETE',
        message: 'Breach notification assessment completed',
        data: assessment
      });
    } catch (error) {
      logger.error('Failed to assess breach notification:', error);
      throw error;
    }
  });

  // Generate enhanced GDPR compliance report
  fastify.get('/gdpr-report', {
    schema: {
      description: 'Generate comprehensive GDPR compliance report',
      tags: ['Compliance'],
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
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
                reportId: { type: 'string' },
                period: {
                  type: 'object',
                  properties: {
                    start: { type: 'string' },
                    end: { type: 'string' }
                  }
                },
                dataProcessingActivities: { type: 'number' },
                dsrRequests: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    byType: { type: 'object' },
                    byStatus: { type: 'object' }
                  }
                },
                breachNotifications: { type: 'number' },
                complianceScore: { type: 'number' },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' }
                },
                generatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const query = request.query as {
      startDate?: string;
      endDate?: string;
    };

    try {
      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      const report = await gdprService.generateComplianceReport(startDate, endDate);

      return reply.send({
        status: 'ok',
        code: 'GDPR_REPORT_GENERATED',
        message: 'GDPR compliance report generated successfully',
        data: report
      });
    } catch (error) {
      logger.error('Failed to generate GDPR report:', error);
      throw error;
    }
  });

  // Manage privacy policies
  fastify.post('/policies', {
    schema: {
      description: 'Create a new privacy policy',
      tags: ['Compliance'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          regulation: {
            type: 'string',
            enum: ['GDPR', 'CCPA', 'HIPAA', 'PCI_DSS', 'SOX', 'CUSTOM']
          },
          jurisdiction: {
            type: 'array',
            items: { type: 'string' }
          },
          dataTypes: {
            type: 'array',
            items: { type: 'string' }
          },
          mandatory: { type: 'boolean' },
          version: { type: 'string' },
          rules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'number' },
                enabled: { type: 'boolean' }
              }
            }
          }
        },
        required: ['name', 'regulation', 'jurisdiction', 'version', 'rules']
      }
    }
  }, async (request, reply) => {
    const policyData = request.body as any;

    try {
      const policy = await policyService.createCompliancePolicy(policyData);

      return reply.code(201).send({
        status: 'ok',
        code: 'POLICY_CREATED',
        message: 'Privacy policy created successfully',
        data: { policyId: policy.id }
      });
    } catch (error) {
      logger.error('Failed to create policy:', error);
      throw error;
    }
  });

  // List privacy policies
  fastify.get('/policies', {
    schema: {
      description: 'List privacy policies',
      tags: ['Compliance'],
      querystring: {
        type: 'object',
        properties: {
          regulation: { type: 'string' },
          jurisdiction: { type: 'string' },
          mandatory: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const filters = request.query as {
      regulation?: string;
      jurisdiction?: string;
      mandatory?: boolean;
    };

    try {
      const policies = policyService.listCompliancePolicies(filters);

      return reply.send({
        status: 'ok',
        code: 'POLICIES_RETRIEVED',
        message: 'Privacy policies retrieved successfully',
        data: { policies }
      });
    } catch (error) {
      logger.error('Failed to list policies:', error);
      throw error;
    }
  });

  // Generate compliance report
  fastify.get('/report/:type', {
    schema: {
      description: 'Generate compliance report',
      tags: ['Compliance'],
      params: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI_DSS']
          }
        },
        required: ['type']
      },
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
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
                reportType: { type: 'string' },
                period: {
                  type: 'object',
                  properties: {
                    startDate: { type: 'string' },
                    endDate: { type: 'string' }
                  }
                },
                summary: {
                  type: 'object',
                  properties: {
                    totalRequests: { type: 'number' },
                    completedRequests: { type: 'number' },
                    pendingRequests: { type: 'number' },
                    averageResponseTime: { type: 'number' }
                  }
                },
                breakdown: {
                  type: 'object',
                  additionalProperties: { type: 'number' }
                },
                recommendations: {
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
    const { type } = request.params as { type: string };
    const query = request.query as {
      startDate?: string;
      endDate?: string;
    };

    try {
      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      // Filter requests by date range
      const requests = Array.from(dsrStore.values()).filter(req => 
        req.requestedAt >= startDate && req.requestedAt <= endDate
      );

      // Calculate statistics
      const totalRequests = requests.length;
      const completedRequests = requests.filter(req => req.status === 'COMPLETED').length;
      const pendingRequests = requests.filter(req => req.status === 'PENDING' || req.status === 'IN_PROGRESS').length;

      // Calculate average response time for completed requests
      const completedWithTime = requests.filter(req => req.status === 'COMPLETED' && req.completedAt);
      const averageResponseTime = completedWithTime.length > 0 
        ? completedWithTime.reduce((sum, req) => {
            const responseTime = req.completedAt!.getTime() - req.requestedAt.getTime();
            return sum + responseTime;
          }, 0) / completedWithTime.length / (24 * 60 * 60 * 1000) // Convert to days
        : 0;

      // Request type breakdown
      const breakdown: Record<string, number> = {};
      requests.forEach(req => {
        breakdown[req.type] = (breakdown[req.type] || 0) + 1;
      });

      // Generate recommendations based on compliance type
      const recommendations = generateComplianceRecommendations(type, {
        totalRequests,
        completedRequests,
        pendingRequests,
        averageResponseTime
      });

      return reply.send({
        status: 'ok',
        code: 'COMPLIANCE_REPORT_GENERATED',
        message: 'Compliance report generated successfully',
        data: {
          reportType: type,
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          },
          summary: {
            totalRequests,
            completedRequests,
            pendingRequests,
            averageResponseTime: Math.round(averageResponseTime * 100) / 100
          },
          breakdown,
          recommendations
        }
      });
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  });
};

function generateComplianceRecommendations(
  complianceType: string,
  stats: {
    totalRequests: number;
    completedRequests: number;
    pendingRequests: number;
    averageResponseTime: number;
  }
): string[] {
  const recommendations: string[] = [];

  // General recommendations
  if (stats.averageResponseTime > 30) {
    recommendations.push('Consider improving response time - current average exceeds 30 days');
  }

  if (stats.pendingRequests > stats.completedRequests) {
    recommendations.push('High number of pending requests - consider increasing processing capacity');
  }

  // Compliance-specific recommendations
  switch (complianceType) {
    case 'GDPR':
      recommendations.push('Ensure all data processing has lawful basis documented');
      recommendations.push('Implement privacy by design in all new systems');
      if (stats.averageResponseTime > 30) {
        recommendations.push('GDPR requires response within 1 month - current average exceeds this');
      }
      break;

    case 'CCPA':
      recommendations.push('Implement clear opt-out mechanisms for data sales');
      recommendations.push('Provide transparent privacy notices to consumers');
      break;

    case 'HIPAA':
      recommendations.push('Ensure all PHI access is logged and monitored');
      recommendations.push('Implement business associate agreements with third parties');
      break;

    case 'SOX':
      recommendations.push('Maintain audit trails for all financial data access');
      recommendations.push('Implement segregation of duties for financial processes');
      break;

    case 'PCI_DSS':
      recommendations.push('Encrypt all cardholder data at rest and in transit');
      recommendations.push('Implement regular security testing and monitoring');
      break;
  }

  return recommendations;
}