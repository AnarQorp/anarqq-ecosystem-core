import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { QonsentService } from '../services/qonsent.service';
import { ProfileService } from '../services/ProfileService';

export const publicQonsentRoutes: FastifyPluginAsync = async (fastify) => {
  const qonsentService = new QonsentService();
  const profileService = new ProfileService();

  // Initialize default profiles on startup
  await profileService.initializeDefaultProfiles();

  // Get active permissions for a CID (qonsent_in)
  fastify.get('/qonsent-in/:cid', {
    schema: {
      params: z.object({
        cid: z.string(),
      }),
      querystring: z.object({
        requester_did: z.string().optional(),
        cid_profile: z.string().optional(),
      }),
      response: {
        200: z.object({
          cid: z.string(),
          permissions: z.array(z.object({
            targetDid: z.string(),
            permissions: z.array(z.string()),
            source: z.enum(['direct', 'dao', 'delegation']),
            expiresAt: z.string().datetime().optional(),
          })),
        }),
      },
    },
  }, async (request) => {
    const { cid } = request.params;
    const { requester_did, cid_profile } = request.query;

    // In a real implementation, this would check:
    // 1. Direct permissions
    // 2. DAO memberships if cid_profile is provided
    // 3. Delegated permissions
    // This is a simplified example
    
    const permissions = await qonsentService.getPermissionsForResource({
      resourceId: cid,
      targetDid: requester_did,
      daoScope: cid_profile,
    });

    return {
      cid,
      permissions: permissions.map(p => ({
        targetDid: p.targetDid,
        permissions: p.permissions,
        source: p.source,
        expiresAt: p.expiresAt?.toISOString(),
      })),
    };
  });

  // Get visibility settings for a CID (qonsent_out)
  fastify.get('/qonsent-out/:cid', {
    schema: {
      params: z.object({
        cid: z.string(),
      }),
      response: {
        200: z.object({
          cid: z.string(),
          visibility: z.enum(['public', 'private', 'dao_only', 'delegated', 'time_limited']),
          rules: z.array(z.any()),
        }),
      },
    },
  }, async (request) => {
    const { cid } = request.params;
    
    // In a real implementation, this would check the visibility settings for the CID
    // This is a simplified example
    const visibility = await qonsentService.getResourceVisibility(cid);
    
    return {
      cid,
      visibility,
      rules: [], // Would contain the actual rules in a real implementation
    };
  });

  // Check if a DID has access to a resource
  fastify.get('/check-access', {
    schema: {
      querystring: z.object({
        cid: z.string(),
        did: z.string(),
        cid_profile: z.string().optional(),
      }),
      response: {
        200: z.object({
          access: z.boolean(),
          reason: z.string(),
          level: z.string(),
        }),
      },
    },
  }, async (request) => {
    const { cid, did, cid_profile } = request.query;
    
    // Check access using the consent service
    const { hasAccess, reason, level } = await qonsentService.checkAccess({
      resourceId: cid,
      targetDid: did,
      daoScope: cid_profile,
    });
    
    return {
      access: hasAccess,
      reason,
      level,
    };
  });

  // Get available privacy profiles
  fastify.get('/profiles', {
    schema: {
      response: {
        200: z.array(z.object({
          name: z.string(),
          description: z.string().optional(),
          visibility: z.string(),
          isDefault: z.boolean(),
        })),
      },
    },
  }, async () => {
    const profiles = await profileService.listProfiles();
    return profiles.map(p => ({
      name: p.name,
      description: p.description,
      visibility: p.visibility,
      isDefault: p.isDefault,
    }));
  });

  // Apply a privacy profile to a resource
  fastify.post('/profiles/apply', {
    schema: {
      body: z.object({
        cid: z.string(),
        owner_did: z.string(),
        profile_name: z.string(),
        custom_overrides: z.any().optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          rulesApplied: z.number(),
          profile: z.any(),
        }),
      },
    },
  }, async (request) => {
    const { cid, owner_did, profile_name, custom_overrides } = request.body;
    
    const result = await profileService.applyProfile({
      cid,
      ownerDid: owner_did,
      profileName: profile_name,
      customOverrides: custom_overrides,
    });
    
    return result;
  });
};

export default publicQonsentRoutes;
