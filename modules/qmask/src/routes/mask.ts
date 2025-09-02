import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { MaskingService } from '../services/MaskingService';
import { ProfileService } from '../services/ProfileService';
import { PolicyEnforcementService } from '../services/PolicyEnforcementService';
import { ReIdentificationService } from '../services/ReIdentificationService';
import { logger } from '../utils/logger';

const maskingService = new MaskingService();
const profileService = new ProfileService();
const policyService = new PolicyEnforcementService();
const reIdentificationService = new ReIdentificationService();

// Request schemas
const applyMaskingSchema = z.object({
  data: z.record(z.any()).describe('Data object to apply masking to'),
  profileName: z.string().min(1).describe('Name of the privacy profile to apply'),
  context: z.object({
    purpose: z.string().optional().describe('Purpose of data processing'),
    jurisdiction: z.string().optional().describe('Legal jurisdiction'),
    dataSubject: z.string().optional().describe('Data subject identifier'),
    processingBasis: z.string().optional().describe('Legal basis for processing'),
    retentionPeriod: z.string().optional().describe('Data retention period')
  }).optional().describe('Additional context for masking decisions')
});

export const maskRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply privacy masking
  fastify.post('/apply', {
    schema: {
      description: 'Apply privacy masking to data using a specified profile',
      tags: ['Masking'],
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
              dataSubject: { type: 'string' },
              processingBasis: { type: 'string' },
              retentionPeriod: { type: 'string' }
            },
            additionalProperties: true
          }
        },
        required: ['data', 'profileName']
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
                maskedData: {
                  type: 'object',
                  additionalProperties: true
                },
                appliedRules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      strategy: { type: 'string' },
                      applied: { type: 'boolean' },
                      reason: { type: 'string' }
                    }
                  }
                },
                riskScore: { type: 'number' },
                complianceFlags: {
                  type: 'array',
                  items: { type: 'string' }
                },
                warnings: {
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
    const { data, profileName, context } = applyMaskingSchema.parse(request.body);
    const identity = request.identity!;

    logger.info(`Applying masking profile '${profileName}' for identity: ${identity.squidId}`);

    try {
      // Get the privacy profile
      const profile = await profileService.getProfile(profileName);
      if (!profile) {
        return reply.code(404).send({
          status: 'error',
          code: 'PROFILE_NOT_FOUND',
          message: `Privacy profile '${profileName}' not found`
        });
      }

      // Enforce privacy policies
      const policyResult = await policyService.enforcePrivacyPolicies(
        data,
        profileName,
        context || {}
      );

      if (!policyResult.allowed) {
        return reply.code(403).send({
          status: 'error',
          code: 'POLICY_VIOLATION',
          message: 'Operation blocked by privacy policies',
          data: {
            violations: policyResult.violations,
            auditLog: policyResult.auditLog
          }
        });
      }

      // Use enforced profile if policy requires it
      const finalProfileName = policyResult.enforcedProfile || profileName;
      const finalProfile = finalProfileName !== profileName ? 
        await profileService.getProfile(finalProfileName) : profile;

      if (!finalProfile) {
        return reply.code(404).send({
          status: 'error',
          code: 'ENFORCED_PROFILE_NOT_FOUND',
          message: `Enforced privacy profile '${finalProfileName}' not found`
        });
      }

      // Apply masking
      const result = await maskingService.applyMasking(
        data,
        finalProfile.toMaskProfile(),
        context
      );

      // Add policy enforcement information to result
      const enhancedResult = {
        ...result,
        policyEnforcement: {
          profileChanged: policyResult.enforcedProfile ? true : false,
          originalProfile: profileName,
          enforcedProfile: finalProfileName,
          auditLog: policyResult.auditLog
        }
      };

      // TODO: Log audit event to Qerberos
      logger.info(`Masking applied successfully. Risk score: ${result.riskScore}`);

      return reply.send({
        status: 'ok',
        code: 'MASKING_APPLIED',
        message: 'Privacy masking applied successfully',
        data: enhancedResult
      });
    } catch (error) {
      logger.error('Failed to apply masking:', error);
      throw error;
    }
  });

  // Validate masking configuration
  fastify.post('/validate', {
    schema: {
      description: 'Validate a masking configuration without applying it',
      tags: ['Masking'],
      body: {
        type: 'object',
        properties: {
          profileName: {
            type: 'string',
            description: 'Name of the privacy profile to validate'
          },
          sampleData: {
            type: 'object',
            description: 'Sample data to test the profile against',
            additionalProperties: true
          }
        },
        required: ['profileName']
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
                valid: { type: 'boolean' },
                issues: {
                  type: 'array',
                  items: { type: 'string' }
                },
                estimatedRiskScore: { type: 'number' },
                applicableRules: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { profileName, sampleData } = request.body as {
      profileName: string;
      sampleData?: Record<string, any>;
    };

    try {
      // Get the privacy profile
      const profile = await profileService.getProfile(profileName);
      if (!profile) {
        return reply.code(404).send({
          status: 'error',
          code: 'PROFILE_NOT_FOUND',
          message: `Privacy profile '${profileName}' not found`
        });
      }

      const issues: string[] = [];
      let estimatedRiskScore = 0;
      let applicableRules = 0;

      // Validate profile rules
      for (const rule of profile.rules) {
        if (!rule.field || rule.field.trim().length === 0) {
          issues.push(`Rule has empty field name`);
        }

        if (!['REDACT', 'HASH', 'ENCRYPT', 'ANONYMIZE', 'REMOVE'].includes(rule.strategy)) {
          issues.push(`Invalid strategy '${rule.strategy}' for field '${rule.field}'`);
        }

        // Check if rule applies to sample data
        if (sampleData) {
          const fieldValue = sampleData[rule.field];
          if (fieldValue !== undefined && fieldValue !== null) {
            applicableRules++;
          }
        }
      }

      // Estimate risk score if sample data provided
      if (sampleData) {
        const result = await maskingService.applyMasking(
          sampleData,
          profile.toMaskProfile()
        );
        estimatedRiskScore = result.riskScore;
      }

      return reply.send({
        status: 'ok',
        code: 'VALIDATION_COMPLETE',
        message: 'Profile validation completed',
        data: {
          valid: issues.length === 0,
          issues,
          estimatedRiskScore,
          applicableRules
        }
      });
    } catch (error) {
      logger.error('Failed to validate profile:', error);
      throw error;
    }
  });

  // Assess re-identification risk
  fastify.post('/assess-reidentification', {
    schema: {
      description: 'Assess re-identification risk for a dataset',
      tags: ['Masking'],
      body: {
        type: 'object',
        properties: {
          dataset: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true
            },
            description: 'Dataset to assess for re-identification risk'
          },
          config: {
            type: 'object',
            properties: {
              kAnonymity: { type: 'number', minimum: 1 },
              lDiversity: { type: 'number', minimum: 1 },
              tCloseness: { type: 'number', minimum: 0, maximum: 1 },
              sensitiveAttributes: {
                type: 'array',
                items: { type: 'string' }
              },
              quasiIdentifiers: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            description: 'Assessment configuration parameters'
          }
        },
        required: ['dataset']
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
                riskScore: { type: 'number' },
                vulnerabilities: {
                  type: 'array',
                  items: { type: 'string' }
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' }
                },
                confidence: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { dataset, config } = request.body as {
      dataset: Record<string, any>[];
      config?: any;
    };

    try {
      const assessment = await reIdentificationService.assessReIdentificationRisk(
        dataset,
        config
      );

      return reply.send({
        status: 'ok',
        code: 'ASSESSMENT_COMPLETE',
        message: 'Re-identification risk assessment completed',
        data: assessment
      });
    } catch (error) {
      logger.error('Failed to assess re-identification risk:', error);
      throw error;
    }
  });

  // Apply k-anonymity
  fastify.post('/apply-kanonymity', {
    schema: {
      description: 'Apply k-anonymity to a dataset',
      tags: ['Masking'],
      body: {
        type: 'object',
        properties: {
          dataset: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true
            },
            description: 'Dataset to anonymize'
          },
          quasiIdentifiers: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of quasi-identifier fields'
          },
          k: {
            type: 'number',
            minimum: 2,
            default: 3,
            description: 'K-anonymity parameter'
          }
        },
        required: ['dataset', 'quasiIdentifiers']
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
                anonymizedDataset: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: true
                  }
                },
                suppressedRecords: { type: 'number' },
                generalizedFields: {
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
    const { dataset, quasiIdentifiers, k = 3 } = request.body as {
      dataset: Record<string, any>[];
      quasiIdentifiers: string[];
      k?: number;
    };

    try {
      const result = await reIdentificationService.applyKAnonymity(
        dataset,
        quasiIdentifiers,
        k
      );

      return reply.send({
        status: 'ok',
        code: 'KANONYMITY_APPLIED',
        message: 'K-anonymity applied successfully',
        data: result
      });
    } catch (error) {
      logger.error('Failed to apply k-anonymity:', error);
      throw error;
    }
  });

  // Get masking statistics
  fastify.get('/stats', {
    schema: {
      description: 'Get masking operation statistics',
      tags: ['Masking'],
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
                totalOperations: { type: 'number' },
                averageRiskScore: { type: 'number' },
                mostUsedProfiles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      profileName: { type: 'string' },
                      usageCount: { type: 'number' }
                    }
                  }
                },
                complianceBreakdown: {
                  type: 'object',
                  additionalProperties: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const identity = request.identity!;

    // TODO: Implement actual statistics tracking
    // For now, return mock data
    return reply.send({
      status: 'ok',
      code: 'STATS_RETRIEVED',
      message: 'Masking statistics retrieved',
      data: {
        totalOperations: 0,
        averageRiskScore: 0.3,
        mostUsedProfiles: [],
        complianceBreakdown: {
          'GDPR': 0,
          'CCPA': 0,
          'HIPAA': 0,
          'PCI_DSS': 0
        }
      }
    });
  });
};