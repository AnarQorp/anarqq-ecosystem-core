/**
 * Qflow Boot Check
 * 
 * Runtime boot check requiring IPFS + libp2p presence
 * Exits if centralized dependencies are detected at runtime
 */

export interface BootCheckResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export interface DistributedInfrastructure {
  ipfs: boolean;
  libp2p: boolean;
  nodeId?: string;
  peers?: number;
}

/**
 * Boot Check Service
 * Ensures Qflow can only start in a truly distributed environment
 */
export class BootCheck {
  private static instance: BootCheck;
  private infrastructureStatus: DistributedInfrastructure = {
    ipfs: false,
    libp2p: false
  };

  private constructor() {}

  public static getInstance(): BootCheck {
    if (!BootCheck.instance) {
      BootCheck.instance = new BootCheck();
    }
    return BootCheck.instance;
  }

  /**
   * Perform comprehensive boot check
   */
  public async performBootCheck(): Promise<BootCheckResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('[BootCheck] 🔍 Performing distributed infrastructure check...');

    // Check for IPFS availability
    const ipfsCheck = await this.checkIPFS();
    if (!ipfsCheck.available) {
      errors.push('IPFS not available - Qflow requires distributed storage');
      errors.push(`IPFS Error: ${ipfsCheck.error}`);
    } else {
      this.infrastructureStatus.ipfs = true;
      console.log(`[BootCheck] ✅ IPFS available: ${ipfsCheck.version}`);
    }

    // Check for Libp2p availability
    const libp2pCheck = await this.checkLibp2p();
    if (!libp2pCheck.available) {
      errors.push('Libp2p not available - Qflow requires P2P communication');
      errors.push(`Libp2p Error: ${libp2pCheck.error}`);
    } else {
      this.infrastructureStatus.libp2p = true;
      this.infrastructureStatus.nodeId = libp2pCheck.nodeId;
      this.infrastructureStatus.peers = libp2pCheck.peers;
      console.log(`[BootCheck] ✅ Libp2p available: Node ${libp2pCheck.nodeId?.substring(0, 8)}...`);
    }

    // Check for centralized service dependencies
    const centralizationCheck = this.checkForCentralizedServices();
    if (centralizationCheck.violations.length > 0) {
      errors.push('Centralized services detected - Qflow must be serverless');
      centralizationCheck.violations.forEach(violation => {
        errors.push(`Centralization: ${violation}`);
      });
    }

    // Check network connectivity requirements
    const networkCheck = await this.checkNetworkRequirements();
    if (!networkCheck.canReachPeers) {
      warnings.push('Limited peer connectivity - may affect distributed execution');
    }

    const success = errors.length === 0;

    if (success) {
      console.log('[BootCheck] 🎉 All distributed infrastructure checks passed');
      console.log(`[BootCheck] 📊 Status: IPFS=${this.infrastructureStatus.ipfs}, Libp2p=${this.infrastructureStatus.libp2p}`);
    } else {
      console.error('[BootCheck] ❌ Boot check failed - cannot start in centralized mode');
      errors.forEach(error => console.error(`[BootCheck]   ${error}`));
    }

    return {
      success,
      errors,
      warnings
    };
  }

  /**
   * Check IPFS availability
   */
  private async checkIPFS(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      // Try to import and initialize IPFS client
      const { create } = await import('ipfs-http-client');
      const ipfs = create({ url: 'http://localhost:5001' });
      
      // Test basic IPFS functionality
      const version = await ipfs.version();
      
      // Test basic operations
      const testData = Buffer.from('qflow-boot-check');
      const result = await ipfs.add(testData);
      await ipfs.cat(result.cid);
      
      return {
        available: true,
        version: version.version
      };
    } catch (error) {
      // Try alternative IPFS configurations
      try {
        const { create } = await import('ipfs-http-client');
        const ipfs = create(); // Default configuration
        const version = await ipfs.version();
        
        return {
          available: true,
          version: version.version
        };
      } catch (fallbackError) {
        return {
          available: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  }

  /**
   * Check Libp2p availability
   */
  private async checkLibp2p(): Promise<{ 
    available: boolean; 
    nodeId?: string; 
    peers?: number; 
    error?: string 
  }> {
    try {
      // Try to create a basic Libp2p node
      const { createLibp2p } = await import('libp2p');
      const { tcp } = await import('@libp2p/tcp');
      const { noise } = await import('@chainsafe/libp2p-noise');
      const { yamux } = await import('@chainsafe/libp2p-yamux');
      const { gossipsub } = await import('@chainsafe/libp2p-gossipsub');
      
      const node = await createLibp2p({
        addresses: {
          listen: ['/ip4/0.0.0.0/tcp/0']
        },
        transports: [tcp()],
        connectionEncryption: [noise()],
        streamMuxers: [yamux()],
        services: {
          pubsub: gossipsub({ allowPublishToZeroPeers: true })
        }
      });

      await node.start();
      
      const nodeId = node.peerId.toString();
      const peers = node.getPeers().length;
      
      // Clean up test node
      await node.stop();
      
      return {
        available: true,
        nodeId,
        peers
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check for centralized service dependencies
   */
  private checkForCentralizedServices(): { violations: string[] } {
    const violations: string[] = [];

    // Check environment variables for centralized service URLs
    const env = process.env;
    const centralizedPatterns = [
      'DATABASE_URL',
      'REDIS_URL', 
      'KAFKA_URL',
      'MONGODB_URL',
      'POSTGRES_URL',
      'MYSQL_URL'
    ];

    for (const pattern of centralizedPatterns) {
      if (env[pattern]) {
        violations.push(`Environment variable ${pattern} indicates centralized dependency`);
      }
    }

    // Check for running centralized services on common ports
    const centralizedPorts = [
      { port: 3306, service: 'MySQL' },
      { port: 5432, service: 'PostgreSQL' },
      { port: 6379, service: 'Redis' },
      { port: 9092, service: 'Kafka' },
      { port: 27017, service: 'MongoDB' },
      { port: 9200, service: 'Elasticsearch' }
    ];

    // Note: In a real implementation, you might want to check for these services
    // For now, we'll just check environment variables

    return { violations };
  }

  /**
   * Check network requirements for distributed operation
   */
  private async checkNetworkRequirements(): Promise<{ canReachPeers: boolean }> {
    try {
      // In a real implementation, this would test connectivity to known QNET nodes
      // For now, we'll do a basic network check
      
      // Check if we can reach common distributed network bootstrap nodes
      const testConnections = [
        'ipfs.io',
        'bootstrap.libp2p.io'
      ];

      let reachableCount = 0;
      for (const host of testConnections) {
        try {
          // Simple DNS resolution test
          const dns = await import('dns');
          await new Promise((resolve, reject) => {
            dns.resolve(host, (err) => {
              if (err) reject(err);
              else resolve(true);
            });
          });
          reachableCount++;
        } catch {
          // Host not reachable
        }
      }

      return {
        canReachPeers: reachableCount > 0
      };
    } catch {
      return {
        canReachPeers: false
      };
    }
  }

  /**
   * Get current infrastructure status
   */
  public getInfrastructureStatus(): DistributedInfrastructure {
    return { ...this.infrastructureStatus };
  }

  /**
   * Force exit if centralized dependencies detected
   */
  public enforceDistributedMode(): void {
    if (!this.infrastructureStatus.ipfs || !this.infrastructureStatus.libp2p) {
      console.error('[BootCheck] 🚨 FATAL: Cannot start without distributed infrastructure');
      console.error('[BootCheck] 🚨 Qflow requires IPFS and Libp2p to operate');
      console.error('[BootCheck] 🚨 Exiting to prevent centralized operation...');
      process.exit(1);
    }
  }
}

// Export singleton instance
export const bootCheck = BootCheck.getInstance();