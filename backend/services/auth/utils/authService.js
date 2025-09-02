/**
 * Auth service business logic
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../../utils/config.js';
import { createErrorResponse } from '../../../utils/errorResponse.js';
import { ERROR_CODES } from '../../../utils/errorResponse.js';

/**
 * Service class for authentication operations
 */
export class AuthService {
  /**
   * Generate a JWT token for a user
   * @param {string} userDID - User's DID
   * @returns {string} JWT token
   * @throws {Error} If JWT secret is not configured
   */
  static generateToken(userDID) {
    if (!config.JWT_SECRET) {
      throw createErrorResponse(
        500,
        ERROR_CODES.INTERNAL_ERROR,
        'JWT secret not configured'
      );
    }

    return jwt.sign(
      { userDID },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );
  }

  /**
   * Verify a JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      throw createErrorResponse(
        401,
        error.name === 'TokenExpiredError' 
          ? ERROR_CODES.AUTH_TOKEN_EXPIRED 
          : ERROR_CODES.AUTH_INVALID_TOKEN,
        error.name === 'TokenExpiredError' 
          ? 'Token has expired' 
          : 'Invalid token'
      );
    }
  }

  /**
   * Hash a password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compare a password with its hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches hash
   */
  static async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a pseudo-random DID for a user's personal space
   * @param {string} userDID - User's DID
   * @returns {Promise<string>} Space DID
   */
  static async createSpaceDID(userDID) {
    // This is a simplified version, replace with actual implementation
    return `did:key:z6Mk${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate a pseudo-random DID for the user's agent
   * @returns {Promise<string>} Agent DID
   */
  static async createAgentDID() {
    // This is a simplified version, replace with actual implementation
    return `did:key:z6Mk${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Authorize an agent for a given space
   * @param {string} agentDID - Agent's DID
   * @param {string} spaceDID - Space's DID
   * @returns {Promise<boolean>} True if authorization is successful
   */
  static async authorizeAgent(agentDID, spaceDID) {
    // This is a mocked implementation, replace with actual authorization logic
    console.log(`[Auth] Authorizing ${agentDID} on ${spaceDID}`);
    return true;
  }
}
