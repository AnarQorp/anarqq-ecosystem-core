/**
 * Lock Handlers
 * 
 * HTTP request handlers for distributed lock operations.
 */

import crypto from 'crypto';

export function createLockHandlers(services) {
  const { lock, audit, event } = services;

  /**
   * Handle lock acquisition requests
   */
  const acquireLock = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { squidId } = req.identity;
    
    try {
      const { 
        lockId, 
        ttl, 
        waitTimeout, 
        metadata, 
        exclusive 
      } = req.body;
      
      if (!lockId) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_MISSING_LOCK_ID',
          message: 'Lock ID is required',
          requestId
        });
      }

      // Attempt to acquire lock
      const result = await lock.acquireLock(lockId, squidId, {
        ttl,
        waitTimeout,
        metadata,
        exclusive
      });

      // Log audit event
      await audit.logLock('acquire', squidId, {
        lockId,
        resource: metadata?.resource || lockId,
        ttl: result.ttl,
        success: result.acquired,
        requestId
      });

      // Publish event
      if (result.acquired) {
        await event.publishLockAcquired({
          lockId: result.lockId,
          owner: result.owner,
          acquiredAt: result.metadata.acquiredAt,
          expiresAt: result.expiresAt,
          ttl: result.ttl,
          metadata: result.metadata
        });
      } else {
        await event.publishLockFailed({
          lockId,
          requestor: squidId,
          reason: 'Lock already held',
          currentOwner: result.currentOwner
        });
      }

      const statusCode = result.acquired ? 200 : 409;
      
      res.status(statusCode).json({
        status: result.acquired ? 'ok' : 'error',
        code: result.acquired ? 'LOCK_ACQUIRED' : 'LOCK_UNAVAILABLE',
        message: result.acquired ? 'Lock acquired successfully' : 'Lock is not available',
        data: result,
        requestId
      });

    } catch (error) {
      console.error('[LockHandler] Lock acquisition failed:', error);

      // Log audit event for failure
      await audit.logLock('acquire', squidId, {
        lockId: req.body.lockId,
        error: error.message,
        success: false,
        requestId
      });

      // Publish failure event
      await event.publishLockFailed({
        lockId: req.body.lockId,
        requestor: squidId,
        reason: error.message,
        failedAt: new Date().toISOString()
      });

      res.status(500).json({
        status: 'error',
        code: 'LOCK_ACQUISITION_FAILED',
        message: error.message,
        requestId
      });
    }
  };

  /**
   * Handle lock release requests
   */
  const releaseLock = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { squidId } = req.identity;
    const { lockId } = req.params;
    
    try {
      if (!lockId) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_MISSING_LOCK_ID',
          message: 'Lock ID is required',
          requestId
        });
      }

      // Release the lock
      const result = await lock.releaseLock(lockId, squidId);

      // Log audit event
      await audit.logLock('release', squidId, {
        lockId,
        duration: result.duration,
        reason: result.reason,
        success: result.released,
        requestId
      });

      // Publish event
      await event.publishLockReleased({
        lockId: result.lockId,
        owner: result.owner,
        releasedAt: result.releasedAt,
        duration: result.duration,
        reason: result.reason
      });

      res.json({
        status: 'ok',
        code: 'LOCK_RELEASED',
        message: 'Lock released successfully',
        data: result,
        requestId
      });

    } catch (error) {
      console.error('[LockHandler] Lock release failed:', error);

      // Log audit event for failure
      await audit.logLock('release', squidId, {
        lockId,
        error: error.message,
        success: false,
        requestId
      });

      res.status(500).json({
        status: 'error',
        code: 'LOCK_RELEASE_FAILED',
        message: error.message,
        requestId
      });
    }
  };

  /**
   * Handle lock extension requests
   */
  const extendLock = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { squidId } = req.identity;
    const { lockId } = req.params;
    const { ttl } = req.body;
    
    try {
      if (!lockId) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_MISSING_LOCK_ID',
          message: 'Lock ID is required',
          requestId
        });
      }

      // Extend the lock
      const result = await lock.extendLock(lockId, squidId, { ttl });

      // Log audit event
      await audit.logLock('extend', squidId, {
        lockId,
        ttl: result.extension,
        success: result.extended,
        requestId
      });

      // Publish event
      await event.publishLockExtended({
        lockId: result.lockId,
        owner: result.owner,
        previousExpiry: result.previousExpiry,
        newExpiry: result.newExpiry,
        extension: result.extension,
        extendedAt: result.extendedAt
      });

      res.json({
        status: 'ok',
        code: 'LOCK_EXTENDED',
        message: 'Lock extended successfully',
        data: result,
        requestId
      });

    } catch (error) {
      console.error('[LockHandler] Lock extension failed:', error);

      // Log audit event for failure
      await audit.logLock('extend', squidId, {
        lockId,
        error: error.message,
        success: false,
        requestId
      });

      res.status(500).json({
        status: 'error',
        code: 'LOCK_EXTENSION_FAILED',
        message: error.message,
        requestId
      });
    }
  };

  /**
   * Handle lock status requests
   */
  const getLockStatus = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { lockId } = req.params;
    
    try {
      if (!lockId) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_MISSING_LOCK_ID',
          message: 'Lock ID is required',
          requestId
        });
      }

      // Get lock status
      const result = await lock.getLockStatus(lockId);

      res.json({
        status: 'ok',
        code: 'LOCK_STATUS_RETRIEVED',
        message: 'Lock status retrieved successfully',
        data: result,
        requestId
      });

    } catch (error) {
      console.error('[LockHandler] Lock status retrieval failed:', error);

      res.status(500).json({
        status: 'error',
        code: 'LOCK_STATUS_FAILED',
        message: error.message,
        requestId
      });
    }
  };

  /**
   * Handle list locks requests (admin operation)
   */
  const listLocks = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { squidId } = req.identity;
    
    try {
      // Only allow listing own locks unless admin
      const identityFilter = req.query.all === 'true' ? null : squidId;
      
      const locks = await lock.listLocks(identityFilter);

      res.json({
        status: 'ok',
        code: 'LOCKS_LISTED',
        message: 'Locks retrieved successfully',
        data: {
          locks,
          count: locks.length
        },
        requestId
      });

    } catch (error) {
      console.error('[LockHandler] Lock listing failed:', error);

      res.status(500).json({
        status: 'error',
        code: 'LOCK_LISTING_FAILED',
        message: error.message,
        requestId
      });
    }
  };

  /**
   * Handle force release requests (admin operation)
   */
  const forceReleaseLock = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { squidId } = req.identity;
    const { lockId } = req.params;
    const { reason } = req.body;
    
    try {
      if (!lockId) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_MISSING_LOCK_ID',
          message: 'Lock ID is required',
          requestId
        });
      }

      // Force release the lock
      const result = await lock.forceReleaseLock(lockId, reason || 'admin_forced');

      // Log audit event
      await audit.logLock('force_release', squidId, {
        lockId,
        originalOwner: result.owner,
        reason: result.reason,
        success: result.released,
        requestId
      });

      // Publish event
      await event.publishLockReleased({
        lockId: result.lockId,
        owner: result.owner,
        releasedAt: result.releasedAt,
        duration: result.duration,
        reason: result.reason
      });

      res.json({
        status: 'ok',
        code: 'LOCK_FORCE_RELEASED',
        message: 'Lock force released successfully',
        data: result,
        requestId
      });

    } catch (error) {
      console.error('[LockHandler] Force lock release failed:', error);

      // Log audit event for failure
      await audit.logLock('force_release', squidId, {
        lockId,
        error: error.message,
        success: false,
        requestId
      });

      res.status(500).json({
        status: 'error',
        code: 'LOCK_FORCE_RELEASE_FAILED',
        message: error.message,
        requestId
      });
    }
  };

  return {
    acquireLock,
    releaseLock,
    extendLock,
    getLockStatus,
    listLocks,
    forceReleaseLock
  };
}