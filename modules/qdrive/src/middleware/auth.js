import { AuthenticationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const authMiddleware = async (req, res, next) => {
  try {
    // Extract headers
    const squidId = req.headers['x-squid-id'];
    const subId = req.headers['x-subid'];
    const signature = req.headers['x-sig'];
    const timestamp = req.headers['x-ts'];
    const authHeader = req.headers.authorization;

    // Basic validation
    if (!squidId) {
      throw new AuthenticationError('Missing x-squid-id header');
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid Authorization header');
    }

    // For now, create a basic actor object
    // In integrated mode, this would verify with sQuid service
    req.actor = {
      squidId,
      subId,
      signature,
      timestamp,
      token: authHeader.substring(7)
    };

    logger.debug('Authentication successful', { squidId, subId });
    next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    next(error);
  }
};