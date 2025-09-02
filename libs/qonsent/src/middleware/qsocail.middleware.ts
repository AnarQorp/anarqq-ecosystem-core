import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { ConsentService } from '../services/consent.service';

interface QsocialPostCheck {
  canView: boolean;
  reason: string;
  visibility: string;
  requiredPermissions?: string[];
}

export class QsocialMiddleware {
  private consentService: ConsentService;

  constructor(fastify?: FastifyInstance) {
    this.consentService = new ConsentService();
    
    // Register the middleware if Fastify instance is provided
    if (fastify) {
      this.registerMiddleware(fastify);
    }
  }

  /**
   * Register the middleware with Fastify
   */
  private registerMiddleware(fastify: FastifyInstance) {
    fastify.decorate('checkPostVisibility', this.checkPostVisibility.bind(this));
  }

  /**
   * Middleware to check post visibility
   */
  async checkPostVisibility(
    req: FastifyRequest<{
      Params: { postId: string },
      Querystring: { viewerDid?: string },
      Headers: { 'x-viewer-did'?: string }
    }>,
    reply: FastifyReply
  ): Promise<QsocialPostCheck> {
    const postId = req.params.postId;
    const viewerDid = req.query.viewerDid || req.headers['x-viewer-did'];
    
    if (!viewerDid) {
      // For public access, check if the post is public
      const { hasAccess, reason, level } = await this.consentService.checkAccess({
        resourceId: postId,
        targetDid: 'public',
      });
      
      if (!hasAccess) {
        reply.status(403).send({
          error: 'Forbidden',
          message: 'This content is not publicly accessible',
          reason,
        });
        return { canView: false, reason, visibility: level };
      }
      
      return { canView: true, reason: 'Public content', visibility: 'public' };
    }
    
    // For authenticated users, check their specific access
    const { hasAccess, reason, level, requiredPermissions } = await this.consentService.checkAccess({
      resourceId: postId,
      targetDid: viewerDid,
      returnRequiredPermissions: true,
    });
    
    if (!hasAccess) {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to view this content',
        reason,
        requiredPermissions,
      });
      return { canView: false, reason, visibility: level, requiredPermissions };
    }
    
    return { canView: true, reason, visibility: level };
  }

  /**
   * Utility function for Qsocial to check post visibility
   */
  async checkPostVisibilityForUser(postId: string, viewerDid: string): Promise<QsocialPostCheck> {
    const { hasAccess, reason, level, requiredPermissions } = await this.consentService.checkAccess({
      resourceId: postId,
      targetDid: viewerDid,
      returnRequiredPermissions: true,
    });

    return {
      canView: hasAccess,
      reason: hasAccess ? reason : `Access denied: ${reason}`,
      visibility: level,
      ...(requiredPermissions ? { requiredPermissions } : {}),
    };
  }
}

// Export a singleton instance
export const qsocialMiddleware = new QsocialMiddleware();

export default QsocialMiddleware;
