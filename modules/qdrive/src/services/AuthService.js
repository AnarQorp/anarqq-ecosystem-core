import { logger } from '../utils/logger.js';
import { AuthenticationError, PermissionError } from '../utils/errors.js';

export class AuthService {
  constructor(squidService, qonsentService, config) {
    this.squid = squidService;
    this.qonsent = qonsentService;
    this.config = config;
  }

  async verifyIdentity(actor) {
    try {
      logger.debug(`Verifying identity: ${actor.squidId}`);
      
      const result = await this.squid.verifyIdentity(actor.squidId, actor.token);
      
      if (!result.verified) {
        throw new AuthenticationError(`Identity verification failed: ${result.error}`);
      }
      
      return result.identity;
    } catch (error) {
      logger.error('Identity verification failed:', error);
      throw error instanceof AuthenticationError ? error : new AuthenticationError(error.message);
    }
  }

  async checkPermission(actor, resource, action = 'read') {
    try {
      logger.debug(`Checking permission: ${resource} for ${actor.squidId}`);
      
      const result = await this.qonsent.checkPermission(actor, resource, action);
      
      if (!result.allowed) {
        throw new PermissionError(`Permission denied: ${result.reason}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Permission check failed:', error);
      throw error instanceof PermissionError ? error : new PermissionError(error.message);
    }
  }

  async checkFileAccess(actor, fileMetadata) {
    try {
      // Check if user is the owner
      if (fileMetadata.owner === actor.squidId) {
        return { allowed: true, reason: 'owner' };
      }
      
      // Check privacy level
      if (fileMetadata.privacy === 'public') {
        return { allowed: true, reason: 'public_file' };
      }
      
      // Check if file is shared with the user
      if (fileMetadata.shares) {
        const userShare = fileMetadata.shares.find(share => 
          share.recipient === actor.squidId &&
          (!share.expiresAt || new Date(share.expiresAt) > new Date())
        );
        
        if (userShare) {
          return { allowed: true, reason: 'shared_access', permissions: userShare.permissions };
        }
      }
      
      // Check DAO access for dao-only files
      if (fileMetadata.privacy === 'dao-only' && actor.daoId) {
        // In a real implementation, this would check DAO membership
        return { allowed: true, reason: 'dao_member' };
      }
      
      throw new PermissionError('Access denied to file');
    } catch (error) {
      logger.error('File access check failed:', error);
      throw error instanceof PermissionError ? error : new PermissionError(error.message);
    }
  }

  async grantFileAccess(actor, fileMetadata, recipient, permissions = ['read']) {
    try {
      // Check if user is the owner
      if (fileMetadata.owner !== actor.squidId) {
        throw new PermissionError('Only file owner can grant access');
      }
      
      const resource = `qdrive:file:${fileMetadata.cid}`;
      const result = await this.qonsent.grantPermission(actor, recipient, resource, permissions);
      
      return result;
    } catch (error) {
      logger.error('Grant access failed:', error);
      throw error instanceof PermissionError ? error : new PermissionError(error.message);
    }
  }

  async revokeFileAccess(actor, fileMetadata, recipient, permissions = ['read']) {
    try {
      // Check if user is the owner
      if (fileMetadata.owner !== actor.squidId) {
        throw new PermissionError('Only file owner can revoke access');
      }
      
      const resource = `qdrive:file:${fileMetadata.cid}`;
      const result = await this.qonsent.revokePermission(actor, recipient, resource, permissions);
      
      return result;
    } catch (error) {
      logger.error('Revoke access failed:', error);
      throw error instanceof PermissionError ? error : new PermissionError(error.message);
    }
  }
}