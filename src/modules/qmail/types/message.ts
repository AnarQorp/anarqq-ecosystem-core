import { SignedTransaction } from '../../../../libs/qwallet/core/types';

export interface QmailMessageContent {
  subject: string;
  body: string;
  from: string;
  timestamp: string;
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
  }>;
}

export interface QmailMessage extends SignedTransaction<QmailMessageContent> {
  id: string;
  isRead: boolean;
  isEncrypted: boolean;
  decryptionError?: string;
}

// Mock data for the inbox
export const MOCK_INBOX: QmailMessage[] = [
  {
    id: 'msg-1',
    isRead: false,
    isEncrypted: true,
    signedBy: '0x1234...5678',
    signature: 'mock-signature-1',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    payload: {
      subject: 'Encrypted: Project Update',
      body: 'This is a test message with encrypted content.',
      from: 'alice@example.com',
      timestamp: new Date().toISOString(),
      attachments: [
        { name: 'project-update.pdf', type: 'application/pdf', size: 2457600 }
      ]
    },
    encryptedPayload: 'qlock:eyJzdWJqZWN0IjoiRW5jcnlwdGVkOiBQcm9qZWN0IFVwZGF0ZSIsImJvZHkiOiJUaGlzIGlzIGEgdGVzdCBtZXNzYWdlIHdpdGggZW5jcnlwdGVkIGNvbnRlbnQuIiwidGltZXN0YW1wIjoiMjAyMy0wNy0xNVQyMTozMDowMFoifQ==',
  },
  {
    id: 'msg-2',
    isRead: true,
    isEncrypted: true,
    signedBy: '0xabcd...ef01',
    signature: 'mock-signature-2',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    payload: {
      subject: 'Encrypted: Meeting Notes',
      body: 'Here are the notes from our last meeting.',
      from: 'bob@example.com',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    encryptedPayload: 'qlock:eyJzdWJqZWN0IjoiRW5jcnlwdGVkOiBNZWV0aW5nIE5vdGVzIiwiYm9keSI6IkhlcmUgYXJlIHRoZSBub3RlcyBmcm9tIG91ciBsYXN0IG1lZXRpbmcuIiwidGltZXN0YW1wIjoiMjAyMy0wNy0xNFQyMTozMDowMFoifQ==',
  },
];
