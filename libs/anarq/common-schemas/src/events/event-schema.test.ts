import { describe, it, expect } from 'vitest';
import { parseEventTopic, createEventTopic, isValidEventSchema } from './event-schema';

describe('Event Schema', () => {
  describe('parseEventTopic', () => {
    it('should parse valid topic correctly', () => {
      const result = parseEventTopic('q.qmail.sent.v1');
      expect(result).toEqual({
        module: 'qmail',
        action: 'sent',
        version: '1'
      });
    });

    it('should return null for invalid topic', () => {
      expect(parseEventTopic('invalid-topic')).toBeNull();
      expect(parseEventTopic('q.qmail.sent')).toBeNull();
      expect(parseEventTopic('qmail.sent.v1')).toBeNull();
    });
  });

  describe('createEventTopic', () => {
    it('should create valid topic', () => {
      const topic = createEventTopic('qwallet', 'payment', 1);
      expect(topic).toBe('q.qwallet.payment.v1');
    });
  });

  describe('isValidEventSchema', () => {
    it('should validate correct schema', () => {
      const schema = {
        topic: 'q.qmail.sent.v1',
        version: 'v1',
        schema: { type: 'object' },
        compatibility: 'BACKWARD' as const,
        deprecated: false
      };
      
      expect(isValidEventSchema(schema)).toBe(true);
    });

    it('should reject invalid schema', () => {
      const schema = {
        topic: 'invalid-topic',
        version: 'v1',
        schema: { type: 'object' },
        compatibility: 'BACKWARD' as const,
        deprecated: false
      };
      
      expect(isValidEventSchema(schema)).toBe(false);
    });
  });
});