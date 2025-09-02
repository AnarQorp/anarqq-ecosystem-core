
/**
 * Mock data for the AnarQ & Q ecosystem
 * This provides test data for development
 */

import { 
  Identity, 
  IdentityVerificationLevel, 
  Message,
  MessagePriority,
  MessageStatus,
  PrivacyLevel,
  User
} from '@/types';

/**
 * Generate a mock user with identities
 */
export function generateMockUser(): User {
  // Primary identity - root level
  const primaryIdentity: Identity = {
    id: 'id-001-root',
    name: 'Primary Identity',
    publicKey: 'pub-key-001-qcrypt',
    verificationLevel: IdentityVerificationLevel.ROOT,
    created: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    kycStatus: {
      submitted: true,
      approved: true,
      timestamp: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000) // 58 days ago
    },
    metadata: {
      deviceFingerprint: 'dev-fingerprint-001',
      verification: {
        level: 'full',
        documentIdentifier: '1234'
      }
    }
  };

  // Sub-identities
  const subIdentities: Identity[] = [
    {
      id: 'id-002-sub',
      name: 'Work Identity',
      publicKey: 'pub-key-002-qcrypt',
      verificationLevel: IdentityVerificationLevel.VERIFIED,
      created: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
      parentId: primaryIdentity.id,
      kycStatus: {
        submitted: true,
        approved: true,
        timestamp: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000) // 38 days ago
      },
      metadata: {
        purpose: 'professional',
        parentIdentity: primaryIdentity.id
      }
    },
    {
      id: 'id-003-sub',
      name: 'Anonymous Identity',
      publicKey: 'pub-key-003-qcrypt',
      verificationLevel: IdentityVerificationLevel.UNVERIFIED,
      created: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      parentId: primaryIdentity.id,
      kycStatus: {
        submitted: false,
        approved: false
      },
      metadata: {
        purpose: 'anonymous browsing',
        parentIdentity: primaryIdentity.id
      }
    }
  ];

  // Complete user object
  return {
    primaryIdentity,
    subIdentities,
    privacySettings: {
      level: PrivacyLevel.MEDIUM,
      dataRetention: 90, // days
      encryptionStrength: 'quantum',
      thirdPartySharing: false,
      metadataCollection: true
    },
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    activeModules: ['qmail', 'qlock', 'qindex', 'squid', 'qonsent']
  };
}

/**
 * Generate mock inbox messages
 */
export function generateMockMessages(): Message[] {
  const recipientId = 'id-001-root';
  
  return [
    {
      id: 'msg-001',
      senderId: 'external-id-001',
      senderIdentityId: 'external-identity-001',
      recipientId,
      recipientIdentityId: recipientId,
      subject: 'Welcome to AnarQ & Q Ecosystem',
      content: 'QUANTUM:WVhKMGFXWnBZMmxoYkNCRGIyNTBaVzUwSUZOcGJYVnNZWFJsWkNC',
      encryptionLevel: 'QUANTUM',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: MessageStatus.READ,
      priority: MessagePriority.HIGH,
      attachments: [],
      metadata: {
        signature: 'QUANTUM.a1b2c3d4.1618412930000.8af9b2',
        size: 1240,
        routingPath: ['node1', 'node2', 'node3']
      },
      visibilityThreshold: PrivacyLevel.LOW
    },
    {
      id: 'msg-002',
      senderId: 'external-id-002',
      senderIdentityId: 'external-identity-002',
      recipientId,
      recipientIdentityId: recipientId,
      subject: 'Your Quantum Key Has Been Generated',
      content: 'ENHANCED:V2UgaGF2ZSBnZW5lcmF0ZWQgeW91ciBxdWFudHVtIGtleSB',
      encryptionLevel: 'ENHANCED',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      status: MessageStatus.READ,
      priority: MessagePriority.NORMAL,
      attachments: [
        {
          id: 'att-001',
          name: 'quantum_key.txt',
          mimeType: 'text/plain',
          size: 2048,
          hash: 'a1b2c3d4e5f6g7h8i9j0',
          encryptionKey: 'enc-key-001'
        }
      ],
      metadata: {
        ipfsHash: 'QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o',
        signature: 'ENHANCED.f7e6d5c4.1618585730000.9bg8h7',
        size: 3580,
        routingPath: ['node5', 'node2', 'node7']
      },
      visibilityThreshold: PrivacyLevel.MEDIUM
    },
    {
      id: 'msg-003',
      senderId: 'external-id-003',
      senderIdentityId: 'external-identity-003',
      recipientId,
      recipientIdentityId: recipientId,
      subject: 'Confidential: Security Protocol Update',
      content: 'QUANTUM:U2VjdXJpdHkgUHJvdG9jb2wgVXBkYXRlIENCdWFudHVtC',
      encryptionLevel: 'QUANTUM',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      status: MessageStatus.UNREAD,
      priority: MessagePriority.URGENT,
      attachments: [],
      metadata: {
        signature: 'QUANTUM.k9j8h7g6.1618758530000.5de4f3',
        size: 4290,
        routingPath: ['node4', 'node9', 'node1']
      },
      visibilityThreshold: PrivacyLevel.HIGH
    },
    {
      id: 'msg-004',
      senderId: 'external-id-004',
      senderIdentityId: 'external-identity-004',
      recipientId,
      recipientIdentityId: 'id-002-sub', // Sent to a sub-identity
      subject: 'Project Update: Decentralized Storage',
      content: 'STANDARD:UHJvamVjdCBVcGRhdGU6IERlY2VudHJhbGl6ZWQgU3RvcmFnZQ==',
      encryptionLevel: 'STANDARD',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      status: MessageStatus.UNREAD,
      priority: MessagePriority.NORMAL,
      attachments: [
        {
          id: 'att-002',
          name: 'project_timeline.pdf',
          mimeType: 'application/pdf',
          size: 1458200,
          hash: 'h9i8j7k6l5m4n3o2p1',
          ipfsReference: 'QmVcSqVEsvm5RR9mBLjwpb2xjxbMSn8QP6LM4frSCTLuqK'
        }
      ],
      metadata: {
        ipfsHash: 'QmVcSqVEsvm5RR9mBLjwpb2xjxbMSn8QP6LM4frSCTLuqK',
        signature: 'STANDARD.o2p1q0r9.1618844930000.3cd2b1',
        size: 1462000,
        routingPath: ['node3', 'node6']
      },
      visibilityThreshold: PrivacyLevel.LOW
    },
    {
      id: 'msg-005',
      senderId: 'external-id-005',
      senderIdentityId: 'external-identity-005',
      recipientId,
      recipientIdentityId: recipientId,
      subject: 'Your Privacy Settings Review',
      content: 'QUANTUM:WW91ciBQcml2YWN5IFNldHRpbmdzIFJldmlldw==',
      encryptionLevel: 'QUANTUM',
      timestamp: new Date(), // Just now
      status: MessageStatus.UNREAD,
      priority: MessagePriority.HIGH,
      attachments: [],
      metadata: {
        signature: 'QUANTUM.t8s7r6q5.1618931330000.1za9y8',
        size: 2890,
        routingPath: ['node2', 'node8']
      },
      visibilityThreshold: PrivacyLevel.MEDIUM
    }
  ];
}

/**
 * Module information for the ecosystem
 */
export const moduleInfo = {
  qmail: {
    id: 'qmail',
    name: 'QMail',
    description: 'Secure, encrypted messaging with IPFS storage',
    version: '0.9.0',
    active: true,
    dependencies: ['qlock', 'qindex'],
    color: 'var(--qmail)'
  },
  qlock: {
    id: 'qlock',
    name: 'QLock',
    description: 'Quantum-resistant encryption engine',
    version: '0.9.0',
    active: true,
    dependencies: [],
    color: 'var(--qlock)'
  },
  qindex: {
    id: 'qindex',
    name: 'QIndex',
    description: 'Permissions and routing internal service',
    version: '0.9.0',
    active: true,
    dependencies: [],
    color: 'var(--qindex)'
  },
  squid: {
    id: 'squid',
    name: 'sQuid',
    description: 'Identity and subidentity management system',
    version: '0.9.0',
    active: true,
    dependencies: ['qlock'],
    color: 'var(--squid)'
  },
  qonsent: {
    id: 'qonsent',
    name: 'QOnsent',
    description: 'User privacy management system',
    version: '0.9.0',
    active: true,
    dependencies: ['qindex'],
    color: 'var(--qonsent)'
  },
  qpic: {
    id: 'qpic',
    name: 'QpiC',
    description: 'Distributed multimedia management',
    version: '0.5.0',
    active: false,
    dependencies: ['qlock', 'qindex'],
    color: 'var(--qpic)'
  },
  qmarket: {
    id: 'qmarket',
    name: 'QMarket',
    description: 'Decentralized marketplace for digital content',
    version: '0.3.0',
    active: false,
    dependencies: ['qlock', 'qindex', 'squid'],
    color: 'var(--qmarket)'
  },
  anarq_social: {
    id: 'anarq_social',
    name: 'AnarQ Social',
    description: 'Decentralized social network',
    version: '0.2.0',
    active: false,
    dependencies: ['qlock', 'qindex', 'squid', 'qpic'],
    color: 'var(--anarq-social)'
  }
};
