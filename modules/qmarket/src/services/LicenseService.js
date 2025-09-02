/**
 * License Service
 * 
 * Manages digital licenses for purchased marketplace content.
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export class LicenseService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.qmarketService = options.qmarketService;
    this.licenses = new Map();
    
    console.log('[LicenseService] Initialized');
  }

  async getUserLicenses(squidId, options = {}) {
    try {
      const { limit = 50, offset = 0, status = 'active' } = options;

      let licenses = Array.from(this.licenses.values())
        .filter(license => license.holderId === squidId);

      if (status) {
        licenses = licenses.filter(license => license.status === status);
      }

      // Sort by creation date (newest first)
      licenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const paginatedLicenses = licenses.slice(offset, offset + limit);

      return {
        success: true,
        licenses: paginatedLicenses.map(license => this.formatLicenseForResponse(license)),
        pagination: {
          total: licenses.length,
          limit,
          offset,
          hasMore: licenses.length > offset + limit
        }
      };

    } catch (error) {
      console.error('[LicenseService] Get user licenses error:', error);
      return {
        success: false,
        error: error.message,
        code: 'GET_LICENSES_ERROR'
      };
    }
  }

  async getLicense(licenseId, requestorId) {
    try {
      const license = this.licenses.get(licenseId);
      if (!license) {
        return {
          success: false,
          error: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        };
      }

      // Check access permissions
      if (license.holderId !== requestorId) {
        return {
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        };
      }

      return {
        success: true,
        license: this.formatLicenseForResponse(license)
      };

    } catch (error) {
      console.error('[LicenseService] Get license error:', error);
      return {
        success: false,
        error: error.message,
        code: 'GET_LICENSE_ERROR'
      };
    }
  }

  async transferLicense({ licenseId, fromId, toId, price, currency }) {
    try {
      const license = this.licenses.get(licenseId);
      if (!license) {
        return {
          success: false,
          error: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        };
      }

      if (license.holderId !== fromId) {
        return {
          success: false,
          error: 'Not license holder',
          code: 'ACCESS_DENIED'
        };
      }

      if (license.status !== 'active') {
        return {
          success: false,
          error: 'License is not transferable',
          code: 'LICENSE_NOT_TRANSFERABLE'
        };
      }

      // Update license ownership
      license.holderId = toId;
      license.transferHistory = license.transferHistory || [];
      license.transferHistory.push({
        from: fromId,
        to: toId,
        price: price || 0,
        currency: currency || 'QToken',
        transferredAt: new Date().toISOString()
      });

      // Emit transfer event
      this.emit('license.transferred', {
        licenseId,
        fromId,
        toId,
        price,
        currency
      });

      return {
        success: true,
        licenseId,
        from: fromId,
        to: toId,
        price: price || 0,
        currency: currency || 'QToken',
        transferredAt: license.transferHistory[license.transferHistory.length - 1].transferredAt
      };

    } catch (error) {
      console.error('[LicenseService] Transfer license error:', error);
      return {
        success: false,
        error: error.message,
        code: 'TRANSFER_LICENSE_ERROR'
      };
    }
  }

  formatLicenseForResponse(license) {
    return {
      licenseId: license.licenseId,
      purchaseId: license.purchaseId,
      listingId: license.listingId,
      holderId: license.holderId,
      licenseType: license.licenseType,
      permissions: license.permissions,
      restrictions: license.restrictions,
      status: license.status,
      createdAt: license.createdAt,
      expiresAt: license.expiresAt,
      transferHistory: license.transferHistory || []
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'license-service',
      timestamp: new Date().toISOString(),
      licenses: this.licenses.size
    };
  }
}

export default LicenseService;