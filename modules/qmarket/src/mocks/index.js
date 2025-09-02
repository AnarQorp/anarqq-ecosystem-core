/**
 * Mock Services Index
 * 
 * Exports all mock services for standalone development.
 */

export { MockSquidService } from './MockSquidService.js';
export { MockQwalletService } from './MockQwalletService.js';
export { MockQonsentService } from './MockQonsentService.js';
export { MockQerberosService } from './MockQerberosService.js';

// Simple mock services for remaining modules
export class MockQlockService {
  async encryptText(text, encryptionLevel, context) {
    await this.simulateDelay(100, 300);
    
    const encryptedText = Buffer.from(text).toString('base64');
    
    return {
      success: true,
      encryptedText,
      encryptionMetadata: {
        level: encryptionLevel,
        algorithm: 'AES-256-GCM',
        keyId: `key_${context.squidId}_${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    };
  }

  async decryptText(encryptedText, encryptionMetadata, context) {
    await this.simulateDelay(100, 300);
    
    const decryptedText = Buffer.from(encryptedText, 'base64').toString();
    
    return {
      success: true,
      decryptedText
    };
  }

  async sign(data, keyId, context) {
    await this.simulateDelay(50, 150);
    
    const signature = `sig_${Buffer.from(JSON.stringify(data)).toString('base64').substring(0, 32)}`;
    
    return {
      success: true,
      signature,
      keyId,
      algorithm: 'ECDSA-P256',
      timestamp: new Date().toISOString()
    };
  }

  async healthCheck() {
    return { status: 'healthy', service: 'mock-qlock' };
  }

  async simulateDelay(min = 50, max = 200) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export class MockQindexService {
  constructor() {
    this.indexes = new Map();
  }

  async registerFile({ cid, squidId, visibility, contentType, timestamp, qonsentProfile, storjUrl, fileSize, originalName, encryptionMetadata, metadata, correlationId }) {
    await this.simulateDelay(100, 250);
    
    const indexId = `idx_${cid.substring(0, 16)}`;
    
    const indexRecord = {
      indexId,
      cid,
      squidId,
      visibility,
      contentType,
      timestamp,
      storjUrl,
      fileSize,
      originalName,
      encryptionMetadata,
      metadata,
      searchable: visibility === 'public',
      createdAt: new Date().toISOString(),
      correlationId
    };

    this.indexes.set(indexId, indexRecord);

    return {
      success: true,
      indexId,
      searchable: indexRecord.searchable
    };
  }

  async search({ query, filters, limit = 20, offset = 0 }) {
    await this.simulateDelay(150, 400);
    
    let results = Array.from(this.indexes.values());
    
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(record => 
        record.originalName?.toLowerCase().includes(queryLower) ||
        record.metadata?.title?.toLowerCase().includes(queryLower) ||
        record.metadata?.description?.toLowerCase().includes(queryLower)
      );
    }

    if (filters?.contentType) {
      results = results.filter(record => record.contentType === filters.contentType);
    }

    if (filters?.visibility) {
      results = results.filter(record => record.visibility === filters.visibility);
    }

    const paginatedResults = results.slice(offset, offset + limit);

    return {
      success: true,
      results: paginatedResults,
      pagination: {
        total: results.length,
        limit,
        offset,
        hasMore: results.length > offset + limit
      }
    };
  }

  async healthCheck() {
    return { 
      status: 'healthy', 
      service: 'mock-qindex',
      indexes: this.indexes.size
    };
  }

  async simulateDelay(min = 50, max = 200) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export class MockQmaskService {
  async applyProfile({ data, profileType, squidId, correlationId }) {
    await this.simulateDelay(100, 200);
    
    const maskedData = { ...data };
    const maskedFields = [];
    
    // Apply masking based on profile type
    if (profileType === 'maximum') {
      // Maximum privacy - mask most fields
      if (maskedData.title) {
        maskedData.title = maskedData.title.substring(0, 10) + '...';
        maskedFields.push('title');
      }
      if (maskedData.description) {
        maskedData.description = maskedData.description.substring(0, 50) + '...';
        maskedFields.push('description');
      }
    } else if (profileType === 'enhanced') {
      // Enhanced privacy - mask some fields
      if (maskedData.fileMetadata?.originalName) {
        maskedData.fileMetadata.originalName = '[REDACTED]';
        maskedFields.push('fileMetadata.originalName');
      }
    }
    // Minimal and standard profiles don't mask much

    return {
      success: true,
      maskedData,
      maskedFields,
      profileApplied: profileType,
      privacyLevel: profileType
    };
  }

  async healthCheck() {
    return { status: 'healthy', service: 'mock-qmask' };
  }

  async simulateDelay(min = 50, max = 200) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export class MockQnetService {
  constructor() {
    this.routes = new Map();
    this.gateways = [
      { id: 'gateway_us_east', url: 'https://ipfs-us-east.example.com', region: 'us-east' },
      { id: 'gateway_eu_west', url: 'https://ipfs-eu-west.example.com', region: 'eu-west' },
      { id: 'gateway_asia', url: 'https://ipfs-asia.example.com', region: 'asia-pacific' }
    ];
  }

  async routeFile({ cid, storjUrl, accessLevel, squidId, daoId, requestorId, qualityOfService, correlationId }) {
    await this.simulateDelay(150, 300);
    
    const routingId = `route_${cid.substring(0, 12)}`;
    
    // Select optimal gateway (mock selection)
    const gateway = this.gateways[Math.floor(Math.random() * this.gateways.length)];
    
    // Generate access token
    const accessToken = `token_${Buffer.from(`${cid}:${requestorId}:${Date.now()}`).toString('base64').substring(0, 32)}`;
    
    // Generate routed URL
    const routedUrl = `${gateway.url}/ipfs/${cid}?token=${accessToken}`;
    
    const route = {
      routingId,
      cid,
      storjUrl,
      accessLevel,
      squidId,
      daoId,
      requestorId,
      qualityOfService,
      gateway,
      accessToken,
      routedUrl,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      correlationId
    };

    this.routes.set(routingId, route);

    return {
      success: true,
      routingId,
      routedUrl,
      accessToken,
      gateway,
      expiresAt: route.expiresAt
    };
  }

  async healthCheck() {
    return { 
      status: 'healthy', 
      service: 'mock-qnet',
      routes: this.routes.size,
      gateways: this.gateways.length
    };
  }

  async simulateDelay(min = 50, max = 200) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}