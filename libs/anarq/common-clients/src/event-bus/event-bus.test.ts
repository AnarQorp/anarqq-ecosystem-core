import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from './event-bus';
import { EventPublicationRequest, IdentityRef } from '@anarq/common-schemas';

describe('EventBus', () => {
  let eventBus: EventBus;
  let testActor: IdentityRef;

  beforeEach(() => {
    eventBus = new EventBus();
    testActor = {
      squidId: 'test-user-123',
      subId: 'test-sub-456'
    };
  });

  describe('publish', () => {
    it('should publish event successfully', async () => {
      const request: EventPublicationRequest = {
        topic: 'q.qmail.sent.v1',
        payload: { messageId: 'msg-123', recipient: 'user@example.com' },
        actor: testActor
      };

      const result = await eventBus.publish(request);
      
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should validate event topic format', async () => {
      const request: EventPublicationRequest = {
        topic: 'invalid-topic',
        payload: { test: 'data' },
        actor: testActor
      };

      const result = await eventBus.publish(request);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('subscribe', () => {
    it('should subscribe to events and receive them', async () => {
      const receivedEvents: any[] = [];
      
      const subscriptionId = eventBus.subscribe(
        'q.qmail.sent.v1',
        testActor,
        (event) => {
          receivedEvents.push(event);
        }
      );

      expect(subscriptionId).toBeDefined();

      // Publish an event
      await eventBus.publish({
        topic: 'q.qmail.sent.v1',
        payload: { messageId: 'msg-123' },
        actor: testActor
      });

      // Give some time for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].payload.messageId).toBe('msg-123');
    });

    it('should support wildcard subscriptions', async () => {
      const receivedEvents: any[] = [];
      
      eventBus.subscribe(
        'q.qmail.*',
        testActor,
        (event) => {
          receivedEvents.push(event);
        }
      );

      // Publish multiple events
      await eventBus.publish({
        topic: 'q.qmail.sent.v1',
        payload: { messageId: 'msg-1' },
        actor: testActor
      });

      await eventBus.publish({
        topic: 'q.qmail.received.v1',
        payload: { messageId: 'msg-2' },
        actor: testActor
      });

      // Give some time for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedEvents).toHaveLength(2);
    });
  });

  describe('getEventHistory', () => {
    it('should return event history', async () => {
      await eventBus.publish({
        topic: 'q.qmail.sent.v1',
        payload: { messageId: 'msg-123' },
        actor: testActor
      });

      const history = eventBus.getEventHistory();
      expect(history).toHaveLength(1);
      expect(history[0].payload.messageId).toBe('msg-123');
    });

    it('should filter history by topic', async () => {
      await eventBus.publish({
        topic: 'q.qmail.sent.v1',
        payload: { messageId: 'msg-1' },
        actor: testActor
      });

      await eventBus.publish({
        topic: 'q.qwallet.payment.v1',
        payload: { amount: 100 },
        actor: testActor
      });

      const history = eventBus.getEventHistory({ topic: 'q.qmail.sent.v1' });
      expect(history).toHaveLength(1);
      expect(history[0].payload.messageId).toBe('msg-1');
    });
  });

  describe('getStats', () => {
    it('should return bus statistics', async () => {
      await eventBus.publish({
        topic: 'q.qmail.sent.v1',
        payload: { messageId: 'msg-123' },
        actor: testActor
      });

      const stats = eventBus.getStats();
      expect(stats.totalEvents).toBe(1);
      expect(stats.topicCounts['q.qmail.sent.v1']).toBe(1);
    });
  });
});