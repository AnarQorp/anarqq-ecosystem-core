/**
 * QMail API
 * Simulated backend for the QMail module with improved metadata handling
 */

import { Message, MessagePriority, MessageStatus, PrivacyLevel } from '@/types';
import { generateMockMessages } from '@/utils/mockData';
import { getActiveDID } from '@/state/identity';

// Simulate a database with localStorage persistence
const STORAGE_KEY = 'qmail_messages';

let messages: Message[] = [];

// Load messages from localStorage on module initialization
function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        expires: msg.expires ? new Date(msg.expires) : undefined
      }));
    }
  } catch (error) {
    console.error('[QMail API] Error loading stored messages:', error);
  }
  
  // Fallback to mock data
  return generateMockMessages();
}

// Save messages to localStorage
function saveMessages(msgs: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch (error) {
    console.error('[QMail API] Error saving messages:', error);
  }
}

// Initialize messages
messages = loadMessages();

/**
 * Get all messages for a recipient
 */
export async function getMessages(recipientId: string): Promise<Message[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Include both received and sent messages for the identity
  const userMessages = messages.filter(message => 
    message.recipientId === recipientId || message.senderId === recipientId
  );
  
  console.log(`[QMail API] Retrieved ${userMessages.length} messages for ${recipientId.slice(0, 16)}...`);
  
  return userMessages;
}

/**
 * Send a message with enhanced metadata
 */
export async function sendMessage(message: Partial<Message>): Promise<{ success: boolean; id: string }> {
  // Simulate network delay and processing
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const activeDID = getActiveDID();
  
  // Create a new message with enhanced metadata
  const newMessage: Message = {
    id: message.id || crypto.randomUUID(),
    senderId: message.senderId || activeDID || '',
    senderIdentityId: message.senderIdentityId || activeDID || '',
    recipientId: message.recipientId || '',
    recipientIdentityId: message.recipientIdentityId || '',
    subject: message.subject || '',
    content: message.content || '',
    encryptionLevel: message.encryptionLevel || 'STANDARD',
    timestamp: message.timestamp || new Date(),
    expires: message.expires,
    status: MessageStatus.SENT,
    priority: message.priority || MessagePriority.NORMAL,
    attachments: message.attachments || [],
    metadata: {
      signature: message.metadata?.signature || '',
      size: message.metadata?.size || message.content?.length || 0,
      routingPath: message.metadata?.routingPath || [activeDID || 'unknown'],
      ipfsHash: message.metadata?.ipfsHash || ''
    },
    visibilityThreshold: message.visibilityThreshold || PrivacyLevel.LOW
  };
  
  // Add to messages collection
  messages = [...messages, newMessage];
  saveMessages(messages);
  
  console.log(`[QMail API] Message sent: ${newMessage.id} from ${newMessage.senderIdentityId.slice(0, 16)}... to ${newMessage.recipientId.slice(0, 16)}...`);
  console.log(`[QMail API] IPFS Hash: ${newMessage.metadata.ipfsHash || 'None'}`);
  
  return { success: true, id: newMessage.id };
}

/**
 * Get a message by ID
 */
export async function getMessage(messageId: string): Promise<Message | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const message = messages.find(m => m.id === messageId);
  
  if (message) {
    console.log(`[QMail API] Retrieved message: ${messageId}`);
  }
  
  return message || null;
}

/**
 * Update a message status
 */
export async function updateMessageStatus(
  messageId: string, 
  status: MessageStatus
): Promise<{ success: boolean }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const messageIndex = messages.findIndex(m => m.id === messageId);
  
  if (messageIndex === -1) {
    return { success: false };
  }
  
  // Update the message
  messages = [
    ...messages.slice(0, messageIndex),
    { ...messages[messageIndex], status },
    ...messages.slice(messageIndex + 1)
  ];
  
  saveMessages(messages);
  
  console.log(`[QMail API] Message ${messageId} status updated to ${status}`);
  
  return { success: true };
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<{ success: boolean }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const initialCount = messages.length;
  messages = messages.filter(m => m.id !== messageId);
  
  const success = messages.length < initialCount;
  
  if (success) {
    saveMessages(messages);
    console.log(`[QMail API] Message ${messageId} deleted`);
  }
  
  return { success };
}

/**
 * Search messages
 */
export async function searchMessages(
  recipientId: string, 
  query: string
): Promise<Message[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const lowerQuery = query.toLowerCase();
  
  const results = messages.filter(
    message => 
      (message.recipientId === recipientId || message.senderId === recipientId) &&
      (
        message.subject.toLowerCase().includes(lowerQuery) ||
        message.senderIdentityId.toLowerCase().includes(lowerQuery) ||
        message.recipientIdentityId.toLowerCase().includes(lowerQuery)
      )
  );
  
  console.log(`[QMail API] Search for "${query}" returned ${results.length} results`);
  
  return results;
}

/**
 * Get message statistics for a user
 */
export async function getMessageStats(userId: string): Promise<{
  total: number;
  unread: number;
  sent: number;
  received: number;
}> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const userMessages = messages.filter(m => m.recipientId === userId || m.senderId === userId);
  const received = userMessages.filter(m => m.recipientId === userId);
  const sent = userMessages.filter(m => m.senderId === userId);
  const unread = received.filter(m => m.status === MessageStatus.UNREAD);
  
  return {
    total: userMessages.length,
    unread: unread.length,
    sent: sent.length,
    received: received.length
  };
}

/**
 * Clear all messages (for testing)
 */
export async function clearAllMessages(): Promise<{ success: boolean }> {
  messages = [];
  saveMessages(messages);
  console.log('[QMail API] All messages cleared');
  return { success: true };
}
