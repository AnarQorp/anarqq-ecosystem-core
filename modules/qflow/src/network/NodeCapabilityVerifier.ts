/**
 * Node Capability Provenance and Verification Service
 * 
 * Handles signed capability manifests, verification of node capabilities,
 * and anomaly detection against declared capabilities
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { ecosystemIntegration } from '../services/EcosystemIntegration.js';
import { QNETNode, NodeCapability, NodeResources } from './QNETNodeManager.js';

export interface CapabilityManifest {
  manifestId: string;
  nodeId: string;
  peerId: string;
  timestamp: string;
  version: string;
  capabilities: DeclaredCapability[];
  resources: DeclaredResources;
  signature: string;
  issuer: string; // sQuid identity that signed the manifest
  validUntil: string;
  metadata: {
    region?: string;
    provider?: string;
    certifications?: string[];
    complianceLevel?: 'basic' | 'enhanced' | 'enterprise';
  };
}

export interface DeclaredCapability {
  name: string;
  version: string;
  type: 'wasm-runtime' | 'storage' | 'network' | 'compute' | 'security';
  specifications: {
    wasmRuntime?: {
      engine: 'wasmtime' | 'wasmer' | 'v8' | 'spidermonkey';
      version: string;
      maxMemoryMB: number;
      maxExecutionTimeMs: number;
      supportedModules: string[];
      securityFeatures: string[];
    };
    storage?: {
      type: 'ipfs' | 'local' | 'distributed';
      capacity: number; // bytes
      throughput: number; // bytes/sec
      durability: number; // 0-1 (probability of data retention)
      encryption: boolean;
    };
    network?: {
      bandwidth: number; // bytes/sec
      latency: number; // ms
      protocols: string[];
      maxConnections: number;
      firewallRules?: string[];
    };
    compute?: {
      architecture: 'x86_64' | 'arm64' | 'riscv';
      cores: number;
      frequency: number; // MHz
      cache: number; // bytes
      virtualization: boolean;
    };
    security?: {
      teeSupport: boolean; // Trusted Execution Environment
      attestation: boolean;
      keyManagement: string[];
      encryptionAlgorithms: string[];
    };
  };
  benchmarks?: {
    [testName: string]: {
      score: number;
      unit: string;
      timestamp: string;
    };
  };
}

export interface DeclaredResources {
  cpu: {
    cores: number;
    architecture: string;
    frequency: number;
    cache: number;
  };
  memory: {
    total: number;
    type: 'DDR4' | 'DDR5' | 'LPDDR4' | 'LPDDR5';
    speed: number; // MHz
    ecc: boolean;
  };
  storage: {
    total: number;
    type: 'SSD' | 'NVMe' | 'HDD' | 'Distributed';
    iops: number;
    throughput: number;
  };
  network: {
    bandwidth: number;
    latency: number;
    reliability: number; // 0-1
  };
}

export interface CapabilityVerification {
  verificationId: string;
  nodeId: string;
  manifestId: string;
  timestamp: string;
  verificationResults: CapabilityVerificationResult[];
  overallStatus: 'verified' | 'partial' | 'failed' | 'anomaly';
  anomalies: CapabilityAnomaly[];
  qerberosRiskScore: number;
  nextVerification: string;
}

export interface CapabilityVerificationResult {
  capabilityName: string;
  status: 'verified' | 'failed' | 'degraded' | 'unavailable';
  actualPerformance?: any;
  declaredPerformance?: any;
  variance: number; // percentage difference
  testResults: {
    [testName: string]: {
      passed: boolean;
      actualValue: any;
      expectedValue: any;
      tolerance: number;
    };
  };
}

export interface CapabilityAnomaly {
  anomalyId: string;
  type: 'performance-degradation' | 'capability-mismatch' | 'resource-exhaustion' | 'security-violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
  affectedCapabilities: string[];
  evidence: any;
  recommendedAction: string;
}

export interface NodeSelectionCriteria {
  requiredCapabilities: string[];
  minimumPerformance?: Record<string, number>;
  securityRequirements?: {
    teeRequired?: boolean;
    attestationRequired?: boolean;
    encryptionAlgorithms?: string[];
  };
  resourceRequirements?: {
    minCpu?: number;
    minMemory?: number;
    minStorage?: number;
    minBandwidth?: number;
  };
  complianceLevel?: 'basic' | 'enhanced' | 'enterprise';
  maxRiskScore?: number;
}

/**
 * Node Capability Verifier for provenance and verification
 */
export class NodeCapabilityVerifier extends EventEmitter {
  private capabilityManifests = new Map<string, CapabilityManifest>();
  private verificationHistory = new Map<string, CapabilityVerification[]>();
  private anomalies = new Map<string, CapabilityAnomaly[]>();
  private verificationInterval: NodeJS.Timeout | null = null;
  private benchmarkTests = new Map<string, Function>();

  constructor() {
    super();
    this.setupBenchmarkTests();
    this.startPeriodicVerification();
  }

  /**
   * Register capability manifest for a node
   */
  async registerCapabilityManifest(manifest: Omit<CapabilityManifest, 'manifestId' | 'timestamp' | 'signature'>): Promise<string> {
    try {
      const manifestId = `manifest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const timestamp = new Date().toISOString();

      const fullManifest: CapabilityManifest = {
        ...manifest,
        manifestId,
        timestamp,
        signature: ''
      };

      // Sign the manifest
      fullManifest.signature = await this.signManifest(fullManifest);

      // Verify the manifest signature
      const signatureValid = await this.verifyManifestSignature(fullManifest);
      if (!signatureValid) {
        throw new Error('Invalid manifest signature');
      }

      // Store the manifest
      this.capabilityManifests.set(manifestId, fullManifest);

      // Emit manifest registered event
      await qflowEventEmitter.emit('q.qflow.capability.manifest.registered.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-capability-verifier',
        actor: manifest.issuer,
        data: {
          manifestId,
          nodeId: manifest.nodeId,
          capabilityCount: manifest.capabilities.length,
          issuer: manifest.issuer
        }
      });

      console.log(`[NodeCapabilityVerifier] Registered capability manifest ${manifestId} for node ${manifest.nodeId}`);
      return manifestId;

    } catch (error) {
      console.error(`[NodeCapabilityVerifier] Failed to register capability manifest: ${error}`);
      throw error;
    }
  }

  /**
   * Verify node capabilities against manifest
   */
  async verifyNodeCapabilities(nodeId: string): Promise<CapabilityVerification> {
    try {
      const manifest = this.getLatestManifest(nodeId);
      if (!manifest) {
        throw new Error(`No capability manifest found for node: ${nodeId}`);
      }

      const verificationId = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const timestamp = new Date().toISOString();

      const verificationResults: CapabilityVerificationResult[] = [];
      const anomalies: CapabilityAnomaly[] = [];

      // Verify each declared capability
      for (const capability of manifest.capabilities) {
        const result = await this.verifyCapability(nodeId, capability);
        verificationResults.push(result);

        // Check for anomalies
        if (result.variance > 20) { // More than 20% variance
          anomalies.push({
            anomalyId: `anomaly_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            type: 'performance-degradation',
            severity: result.variance > 50 ? 'high' : 'medium',
            description: `Performance variance of ${result.variance}% detected for ${capability.name}`,
            detectedAt: timestamp,
            affectedCapabilities: [capability.name],
            evidence: {
              declared: result.declaredPerformance,
              actual: result.actualPerformance,
              variance: result.variance
            },
            recommendedAction: 'Investigate node performance and update manifest if necessary'
          });
        }
      }

      // Calculate overall status
      const failedCount = verificationResults.filter(r => r.status === 'failed').length;
      const degradedCount = verificationResults.filter(r => r.status === 'degraded').length;
      
      let overallStatus: CapabilityVerification['overallStatus'];
      if (failedCount > 0 || anomalies.length > 0) {
        overallStatus = 'anomaly';
      } else if (degradedCount > 0) {
        overallStatus = 'partial';
      } else {
        overallStatus = 'verified';
      }

      // Get Qerberos risk score
      const qerberosRiskScore = await this.getQerberosRiskScore(nodeId, anomalies);

      const verification: CapabilityVerification = {
        verificationId,
        nodeId,
        manifestId: manifest.manifestId,
        timestamp,
        verificationResults,
        overallStatus,
        anomalies,
        qerberosRiskScore,
        nextVerification: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      // Store verification history
      if (!this.verificationHistory.has(nodeId)) {
        this.verificationHistory.set(nodeId, []);
      }
      this.verificationHistory.get(nodeId)!.push(verification);

      // Store anomalies
      if (anomalies.length > 0) {
        if (!this.anomalies.has(nodeId)) {
          this.anomalies.set(nodeId, []);
        }
        this.anomalies.get(nodeId)!.push(...anomalies);
      }

      // Emit verification completed event
      await qflowEventEmitter.emit('q.qflow.capability.verification.completed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-capability-verifier',
        actor: 'system',
        data: {
          verificationId,
          nodeId,
          overallStatus,
          anomaliesCount: anomalies.length,
          qerberosRiskScore
        }
      });

      console.log(`[NodeCapabilityVerifier] Verified capabilities for node ${nodeId}: ${overallStatus}`);
      return verification;

    } catch (error) {
      console.error(`[NodeCapabilityVerifier] Failed to verify node capabilities: ${error}`);
      throw error;
    }
  }

  /**
   * Select nodes based on verified capabilities
   */
  async selectVerifiedNodes(criteria: NodeSelectionCriteria): Promise<string[]> {
    try {
      const eligibleNodes: string[] = [];

      for (const [nodeId, manifest] of this.capabilityManifests.entries()) {
        // Check if manifest is still valid
        if (new Date(manifest.validUntil) < new Date()) {
          continue;
        }

        // Get latest verification
        const verifications = this.verificationHistory.get(nodeId) || [];
        const latestVerification = verifications[verifications.length - 1];

        if (!latestVerification || latestVerification.overallStatus === 'failed') {
          continue;
        }

        // Check required capabilities
        const hasRequiredCapabilities = criteria.requiredCapabilities.every(reqCap =>
          manifest.capabilities.some(cap => cap.name === reqCap)
        );

        if (!hasRequiredCapabilities) {
          continue;
        }

        // Check security requirements
        if (criteria.securityRequirements) {
          const securityCaps = manifest.capabilities.filter(cap => cap.type === 'security');
          
          if (criteria.securityRequirements.teeRequired) {
            const hasTee = securityCaps.some(cap => cap.specifications.security?.teeSupport);
            if (!hasTee) continue;
          }

          if (criteria.securityRequirements.attestationRequired) {
            const hasAttestation = securityCaps.some(cap => cap.specifications.security?.attestation);
            if (!hasAttestation) continue;
          }
        }

        // Check compliance level
        if (criteria.complianceLevel && manifest.metadata.complianceLevel) {
          const levels = ['basic', 'enhanced', 'enterprise'];
          const requiredLevel = levels.indexOf(criteria.complianceLevel);
          const nodeLevel = levels.indexOf(manifest.metadata.complianceLevel);
          
          if (nodeLevel < requiredLevel) {
            continue;
          }
        }

        // Check risk score
        if (criteria.maxRiskScore && latestVerification.qerberosRiskScore > criteria.maxRiskScore) {
          continue;
        }

        eligibleNodes.push(nodeId);
      }

      // Sort by verification quality and risk score
      eligibleNodes.sort((a, b) => {
        const verificationA = this.verificationHistory.get(a)?.[0];
        const verificationB = this.verificationHistory.get(b)?.[0];
        
        if (!verificationA || !verificationB) return 0;
        
        // Lower risk score is better
        return verificationA.qerberosRiskScore - verificationB.qerberosRiskScore;
      });

      return eligibleNodes;

    } catch (error) {
      console.error(`[NodeCapabilityVerifier] Failed to select verified nodes: ${error}`);
      return [];
    }
  }

  /**
   * Get capability manifest for node
   */
  getCapabilityManifest(nodeId: string): CapabilityManifest | undefined {
    return this.getLatestManifest(nodeId);
  }

  /**
   * Get verification history for node
   */
  getVerificationHistory(nodeId: string): CapabilityVerification[] {
    return this.verificationHistory.get(nodeId) || [];
  }

  /**
   * Get anomalies for node
   */
  getNodeAnomalies(nodeId: string): CapabilityAnomaly[] {
    return this.anomalies.get(nodeId) || [];
  }

  /**
   * Get all registered manifests
   */
  getAllManifests(): CapabilityManifest[] {
    return Array.from(this.capabilityManifests.values());
  }

  // Private helper methods

  private getLatestManifest(nodeId: string): CapabilityManifest | undefined {
    const manifests = Array.from(this.capabilityManifests.values())
      .filter(m => m.nodeId === nodeId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return manifests[0];
  }

  private async verifyCapability(nodeId: string, capability: DeclaredCapability): Promise<CapabilityVerificationResult> {
    try {
      const testResults: Record<string, any> = {};
      let actualPerformance: any = {};
      let variance = 0;

      // Run capability-specific tests
      switch (capability.type) {
        case 'wasm-runtime':
          actualPerformance = await this.testWasmCapability(nodeId, capability);
          break;
        case 'storage':
          actualPerformance = await this.testStorageCapability(nodeId, capability);
          break;
        case 'network':
          actualPerformance = await this.testNetworkCapability(nodeId, capability);
          break;
        case 'compute':
          actualPerformance = await this.testComputeCapability(nodeId, capability);
          break;
        case 'security':
          actualPerformance = await this.testSecurityCapability(nodeId, capability);
          break;
      }

      // Calculate variance
      if (capability.benchmarks) {
        const benchmarkScores = Object.values(capability.benchmarks).map(b => b.score);
        const actualScores = Object.values(actualPerformance).filter(v => typeof v === 'number');
        
        if (benchmarkScores.length > 0 && actualScores.length > 0) {
          const avgDeclared = benchmarkScores.reduce((a, b) => a + b, 0) / benchmarkScores.length;
          const avgActual = actualScores.reduce((a, b) => a + b, 0) / actualScores.length;
          variance = Math.abs((avgActual - avgDeclared) / avgDeclared) * 100;
        }
      }

      // Determine status
      let status: CapabilityVerificationResult['status'];
      if (variance > 50) {
        status = 'failed';
      } else if (variance > 20) {
        status = 'degraded';
      } else {
        status = 'verified';
      }

      return {
        capabilityName: capability.name,
        status,
        actualPerformance,
        declaredPerformance: capability.benchmarks,
        variance,
        testResults
      };

    } catch (error) {
      console.error(`[NodeCapabilityVerifier] Failed to verify capability ${capability.name}: ${error}`);
      return {
        capabilityName: capability.name,
        status: 'failed',
        variance: 100,
        testResults: {
          error: {
            passed: false,
            actualValue: error.message,
            expectedValue: 'successful verification',
            tolerance: 0
          }
        }
      };
    }
  }

  private async testWasmCapability(nodeId: string, capability: DeclaredCapability): Promise<any> {
    // Simulate WASM capability testing
    const specs = capability.specifications.wasmRuntime;
    if (!specs) return {};

    return {
      maxMemoryMB: specs.maxMemoryMB * 0.95, // Simulate 95% of declared
      maxExecutionTimeMs: specs.maxExecutionTimeMs * 1.05, // Simulate 5% slower
      supportedModules: specs.supportedModules.length,
      securityFeatures: specs.securityFeatures.length
    };
  }

  private async testStorageCapability(nodeId: string, capability: DeclaredCapability): Promise<any> {
    // Simulate storage capability testing
    const specs = capability.specifications.storage;
    if (!specs) return {};

    return {
      capacity: specs.capacity * 0.9, // Simulate 90% available
      throughput: specs.throughput * 0.95, // Simulate 95% of declared
      durability: specs.durability,
      encryption: specs.encryption
    };
  }

  private async testNetworkCapability(nodeId: string, capability: DeclaredCapability): Promise<any> {
    // Simulate network capability testing
    const specs = capability.specifications.network;
    if (!specs) return {};

    return {
      bandwidth: specs.bandwidth * 0.85, // Simulate 85% of declared
      latency: specs.latency * 1.1, // Simulate 10% higher latency
      protocols: specs.protocols.length,
      maxConnections: specs.maxConnections
    };
  }

  private async testComputeCapability(nodeId: string, capability: DeclaredCapability): Promise<any> {
    // Simulate compute capability testing
    const specs = capability.specifications.compute;
    if (!specs) return {};

    return {
      cores: specs.cores,
      frequency: specs.frequency * 0.98, // Simulate 98% of declared
      cache: specs.cache,
      virtualization: specs.virtualization
    };
  }

  private async testSecurityCapability(nodeId: string, capability: DeclaredCapability): Promise<any> {
    // Simulate security capability testing
    const specs = capability.specifications.security;
    if (!specs) return {};

    return {
      teeSupport: specs.teeSupport,
      attestation: specs.attestation,
      keyManagement: specs.keyManagement.length,
      encryptionAlgorithms: specs.encryptionAlgorithms.length
    };
  }

  private async getQerberosRiskScore(nodeId: string, anomalies: CapabilityAnomaly[]): Promise<number> {
    try {
      const qerberosService = ecosystemIntegration.getService('qerberos');
      if (!qerberosService) {
        // Fallback risk calculation
        return anomalies.length * 10; // 10 points per anomaly
      }

      const riskAssessment = await qerberosService.assessRisk({
        eventType: 'capability-verification',
        nodeId,
        payload: {
          anomaliesCount: anomalies.length,
          anomalies: anomalies.map(a => ({
            type: a.type,
            severity: a.severity
          }))
        }
      });

      return riskAssessment.score || 0;

    } catch (error) {
      console.error(`[NodeCapabilityVerifier] Failed to get Qerberos risk score: ${error}`);
      return anomalies.length * 10; // Fallback
    }
  }

  private async signManifest(manifest: CapabilityManifest): Promise<string> {
    try {
      const qlockService = ecosystemIntegration.getService('qlock');
      if (!qlockService) {
        console.warn('[NodeCapabilityVerifier] Qlock service not available, using fallback signing');
        return `fallback_sig_${Date.now()}`;
      }

      const dataToSign = JSON.stringify({
        nodeId: manifest.nodeId,
        capabilities: manifest.capabilities,
        resources: manifest.resources,
        timestamp: manifest.timestamp,
        validUntil: manifest.validUntil
      });

      const signResult = await qlockService.sign({
        data: dataToSign,
        algorithm: 'ed25519'
      });

      return signResult.signature;

    } catch (error) {
      console.error(`[NodeCapabilityVerifier] Failed to sign manifest: ${error}`);
      return `error_sig_${Date.now()}`;
    }
  }

  private async verifyManifestSignature(manifest: CapabilityManifest): Promise<boolean> {
    try {
      const qlockService = ecosystemIntegration.getService('qlock');
      if (!qlockService) {
        return true; // Allow if service not available
      }

      const dataToVerify = JSON.stringify({
        nodeId: manifest.nodeId,
        capabilities: manifest.capabilities,
        resources: manifest.resources,
        timestamp: manifest.timestamp,
        validUntil: manifest.validUntil
      });

      const verifyResult = await qlockService.verify({
        data: dataToVerify,
        signature: manifest.signature,
        algorithm: 'ed25519'
      });

      return verifyResult.valid;

    } catch (error) {
      console.error(`[NodeCapabilityVerifier] Failed to verify manifest signature: ${error}`);
      return false;
    }
  }

  private setupBenchmarkTests(): void {
    // Setup various benchmark tests for different capability types
    this.benchmarkTests.set('wasm-fibonacci', async (nodeId: string) => {
      // Simulate WASM Fibonacci benchmark
      return { score: 1000, unit: 'ops/sec' };
    });

    this.benchmarkTests.set('storage-throughput', async (nodeId: string) => {
      // Simulate storage throughput benchmark
      return { score: 500, unit: 'MB/sec' };
    });

    this.benchmarkTests.set('network-latency', async (nodeId: string) => {
      // Simulate network latency benchmark
      return { score: 50, unit: 'ms' };
    });
  }

  private startPeriodicVerification(): void {
    // Run verification every 6 hours
    this.verificationInterval = setInterval(async () => {
      try {
        const nodeIds = Array.from(new Set(
          Array.from(this.capabilityManifests.values()).map(m => m.nodeId)
        ));

        for (const nodeId of nodeIds) {
          try {
            await this.verifyNodeCapabilities(nodeId);
          } catch (error) {
            console.error(`[NodeCapabilityVerifier] Periodic verification failed for ${nodeId}: ${error}`);
          }
        }

      } catch (error) {
        console.error(`[NodeCapabilityVerifier] Periodic verification failed: ${error}`);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.verificationInterval) {
      clearInterval(this.verificationInterval);
      this.verificationInterval = null;
    }

    this.capabilityManifests.clear();
    this.verificationHistory.clear();
    this.anomalies.clear();
    this.benchmarkTests.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const nodeCapabilityVerifier = new NodeCapabilityVerifier();