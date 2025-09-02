/**
 * Cross-Module Event Flow Integration Tests
 * 
 * Tests event flow patterns across module boundaries to ensure proper
 * event propagation, ordering, correlation, and handling throughout the ecosystem.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { EventBusService } from '../services/EventBusService.mjs';
import { QwalletIntegrationService } from '../services/QwalletIntegrationService.mjs';
import { QmailPaymentService } from '../services/QmailPaymentService.mjs';
import { QmarketService } from '../services/QmarketService.mjs';

describe('Cross-Module Event Flow Integration', () => {
  let eventBus;
  let qwalletService;
  let qmailService;
  let qmarketService;
  let testIdentities;
  let eventCollector;
  let eventSequences;

  beforeAll(async () => {
    // Initialize services
    eventBus = new EventBusService();
    qwalletService = new QwalletIntegrationService({ sandboxMode: true, eventBus });
    qmailService = new QmailPaymentService({ qwalletIntegration: qwalletService, sandboxMode: true });
    qmarketService = new QmarketService({ 
      qwalletIntegration: qwalletService, 
      sandboxMode: true,
      eventBus 
    });

    await qwalletService.initialize();
    await qmailService.initialize();
    await qmarketService.initialize();

    // Setup test identities
    testIdentities = {
      alice: 'did:squid:alice_event_flow_test',
      bob: 'did:squid:bob_event_flow_test',
      charlie: 'did:squid:charlie_event_flow_test',
      system: 'did:squid:system_event_flow'
    };

    // Initialize test wallets
    for (const identity of Object.values(testIdentities)) {
      await qwalletService.getSandboxBalance(identity);
    }
  });

  afterAll(async () => {
    await qmailService.shutdown();
    await qmarketService.shutdown();
    await qwalletService.shutdown();
  });

  beforeEach(() => {
    eventSequences = new Map();
    eventCollector = {
      events: [],
      eventsByCorrelation: new Map(),
      eventsByTopic: new Map(),
      eventsByActor: new Map()
    };

    // Comprehensive event collector
    eventBus.subscribe('*', { squidId: 'event-flow-collector', subId: 'test' }, (event) => {
      const eventRecord = {
        timestamp: new Date().toISOString(),
        topic: event.topic,
        actor: event.actor.squidId,
        payload: event.payload,
        correlationId: event.correlationId,
        sequenceNumber: eventCollector.events.length
      };

      eventCollector.events.push(eventRecord);

      // Index by correlation ID
      if (event.correlationId) {
        if (!eventCollector.eventsByCorrelation.has(event.correlationId)) {
          eventCollector.eventsByCorrelation.set(event.correlationId, []);
        }
        eventCollector.eventsByCorrelation.get(event.correlationId).push(eventRecord);
      }

      // Index by topic
      if (!eventCollector.eventsByTopic.has(event.topic)) {
        eventCollector.eventsByTopic.set(event.topic, []);
      }
      eventCollector.eventsByTopic.get(event.topic).push(eventRecord);

      // Index by actor
      if (!eventCollector.eventsByActor.has(event.actor.squidId)) {
        eventCollector.eventsByActor.set(event.actor.squidId, []);
      }
      eventCollector.eventsByActor.get(event.actor.squidId).push(eventRecord);
    });
  });

  describe('Payment Flow Event Sequences', () => {
    it('should maintain proper event ordering in payment flows', async () => {
      const correlationId = `payment-flow-${Date.now()}`;

      // Execute payment flow
      const paymentIntent = await qwalletService.createPaymentIntent({
        squidId: testIdentities.alice,
        amount: 25.0,
        currency: 'QToken',
        purpose: 'test_payment_flow',
        metadata: { correlationId }
      });

      const paymentResult = await qwalletService.processSandboxPayment(paymentIntent);

      // Wait for all events to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Analyze event sequence
      const paymentEvents = eventCollector.eventsByCorrelation.get(correlationId) || [];
      expect(paymentEvents.length).toBeGreaterThan(0);

      // Verify event ordering
      const eventTopics = paymentEvents.map(e => e.topic);
      
      // Payment intent creation should come before processing
      const intentIndex = eventTopics.findIndex(t => t.includes('intent.created'));
      const processedIndex = eventTopics.findIndex(t => t.includes('payment.processed'));
      
      if (intentIndex !== -1 && processedIndex !== -1) {
        expect(intentIndex).toBeLessThan(processedIndex);
      }

      // Verify all events have proper correlation ID
      paymentEvents.forEach(event => {
        expect(event.correlationId).toBe(correlationId);
      });

      // Verify event timestamps are in order
      for (let i = 1; i < paymentEvents.length; i++) {
        const prevTime = new Date(paymentEvents[i - 1].timestamp);
        const currTime = new Date(paymentEvents[i].timestamp);
        expect(currTime.getTime()).toBeGreaterThanOrEqual(prevTime.getTime());
      }
    });

    it('should handle concurrent payment flows with proper isolation', async () => {
      const correlationIds = Array(5).fill(null).map((_, i) => `concurrent-payment-${i}-${Date.now()}`);

      // Execute concurrent payment flows
      const paymentPromises = correlationIds.map(async (correlationId, index) => {
        const paymentIntent = await qwalletService.createPaymentIntent({
          squidId: testIdentities.alice,
          amount: 10.0 + index,
          currency: 'QToken',
          purpose: `concurrent_payment_${index}`,
          metadata: { correlationId }
        });

        return qwalletService.processSandboxPayment(paymentIntent);
      });

      const results = await Promise.all(paymentPromises);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify each flow has isolated events
      correlationIds.forEach((correlationId, index) => {
        const flowEvents = eventCollector.eventsByCorrelation.get(correlationId) || [];
        expect(flowEvents.length).toBeGreaterThan(0);

        // Verify no cross-contamination
        flowEvents.forEach(event => {
          expect(event.correlationId).toBe(correlationId);
        });

        // Verify expected amount in events
        const paymentEvents = flowEvents.filter(e => e.payload.amount);
        if (paymentEvents.length > 0) {
          expect(paymentEvents[0].payload.amount).toBe(10.0 + index);
        }
      });
    });
  });

  describe('Cross-Module Communication Patterns', () => {
    it('should handle Qmail → Qwallet → Qerberos event chain', async () => {
      const correlationId = `qmail-payment-audit-${Date.now()}`;

      // Send premium message (triggers payment and audit)
      const messageResult = await qmailService.processPremiumMessage({
        squidId: testIdentities.alice,
        messageId: `msg_chain_${Date.now()}`,
        serviceType: 'certified',
        recipients: [testIdentities.bob],
        correlationId
      });

      expect(messageResult.success).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      // Analyze event chain
      const chainEvents = eventCollector.eventsByCorrelation.get(correlationId) || [];
      expect(chainEvents.length).toBeGreaterThan(0);

      // Verify module participation
      const moduleEvents = {
        qmail: chainEvents.filter(e => e.topic.startsWith('q.qmail')),
        qwallet: chainEvents.filter(e => e.topic.startsWith('q.qwallet')),
        qerberos: chainEvents.filter(e => e.topic.startsWith('q.qerberos'))
      };

      expect(moduleEvents.qmail.length).toBeGreaterThan(0);
      expect(moduleEvents.qwallet.length).toBeGreaterThan(0);
      // Note: Qerberos events might be mocked in this test environment

      // Verify event causality (payment before message completion)
      const paymentEvents = moduleEvents.qwallet;
      const messageEvents = moduleEvents.qmail;

      if (paymentEvents.length > 0 && messageEvents.length > 0) {
        const firstPayment = paymentEvents[0];
        const lastMessage = messageEvents[messageEvents.length - 1];
        
        expect(new Date(firstPayment.timestamp).getTime())
          .toBeLessThanOrEqual(new Date(lastMessage.timestamp).getTime());
      }
    });

    it('should handle Qmarket → Qwallet → Qindex event propagation', async () => {
      const correlationId = `qmarket-purchase-index-${Date.now()}`;

      // List content on marketplace
      const listingResult = await qmarketService.listContent({
        squidId: testIdentities.alice,
        contentId: `content_${Date.now()}`,
        title: 'Test Content for Event Flow',
        description: 'Testing event propagation',
        price: 30.0,
        currency: 'QToken',
        correlationId
      });

      // Purchase content
      const purchaseResult = await simulateContentPurchase(
        listingResult.listingId,
        testIdentities.bob,
        30.0,
        correlationId
      );

      expect(purchaseResult.success).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Analyze event propagation
      const propagationEvents = eventCollector.eventsByCorrelation.get(correlationId) || [];
      expect(propagationEvents.length).toBeGreaterThan(0);

      // Verify event flow stages
      const stageEvents = {
        listing: propagationEvents.filter(e => e.topic.includes('listed') || e.topic.includes('content.created')),
        payment: propagationEvents.filter(e => e.topic.includes('payment') || e.topic.includes('intent')),
        purchase: propagationEvents.filter(e => e.topic.includes('purchased') || e.topic.includes('sold')),
        indexing: propagationEvents.filter(e => e.topic.includes('indexed') || e.topic.includes('record'))
      };

      expect(stageEvents.listing.length).toBeGreaterThan(0);
      expect(stageEvents.payment.length).toBeGreaterThan(0);
      expect(stageEvents.purchase.length).toBeGreaterThan(0);

      // Verify temporal ordering of stages
      if (stageEvents.listing.length > 0 && stageEvents.payment.length > 0) {
        const listingTime = new Date(stageEvents.listing[0].timestamp).getTime();
        const paymentTime = new Date(stageEvents.payment[0].timestamp).getTime();
        expect(listingTime).toBeLessThanOrEqual(paymentTime);
      }
    });
  });

  describe('Event Error Handling and Recovery', () => {
    it('should handle event processing failures gracefully', async () => {
      const correlationId = `event-failure-recovery-${Date.now()}`;

      // Mock event processing failure
      const originalSubscribe = eventBus.subscribe;
      let failureInjected = false;

      eventBus.subscribe = function(pattern, actor, handler) {
        const wrappedHandler = (event) => {
          if (event.correlationId === correlationId && !failureInjected) {
            failureInjected = true;
            throw new Error('Simulated event processing failure');
          }
          return handler(event);
        };
        return originalSubscribe.call(this, pattern, actor, wrappedHandler);
      };

      // Subscribe a test handler that will fail
      eventBus.subscribe('q.qwallet.*', { squidId: 'failing-handler', subId: 'test' }, (event) => {
        // This handler will throw an error
      });

      // Execute operation that generates events
      const paymentIntent = await qwalletService.createPaymentIntent({
        squidId: testIdentities.alice,
        amount: 15.0,
        currency: 'QToken',
        purpose: 'failure_recovery_test',
        metadata: { correlationId }
      });

      const paymentResult = await qwalletService.processSandboxPayment(paymentIntent);

      // Restore original subscribe method
      eventBus.subscribe = originalSubscribe;

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify operation succeeded despite event handler failure
      expect(paymentResult.success).toBe(true);

      // Verify events were still collected by our main collector
      const recoveryEvents = eventCollector.eventsByCorrelation.get(correlationId) || [];
      expect(recoveryEvents.length).toBeGreaterThan(0);
    });

    it('should handle event ordering with delayed processing', async () => {
      const correlationId = `delayed-processing-${Date.now()}`;
      const delayedEvents = [];

      // Subscribe handler with artificial delay
      eventBus.subscribe('q.qwallet.*', { squidId: 'delayed-handler', subId: 'test' }, async (event) => {
        if (event.correlationId === correlationId) {
          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, 50));
          delayedEvents.push({
            ...event,
            processedAt: new Date().toISOString()
          });
        }
      });

      // Execute rapid sequence of operations
      const operations = [];
      for (let i = 0; i < 3; i++) {
        const operation = qwalletService.createPaymentIntent({
          squidId: testIdentities.alice,
          amount: 5.0 + i,
          currency: 'QToken',
          purpose: `delayed_test_${i}`,
          metadata: { correlationId, sequence: i }
        });
        operations.push(operation);
      }

      const results = await Promise.all(operations);
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for delayed processing

      // Verify all operations succeeded
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify delayed events were processed in order
      expect(delayedEvents.length).toBeGreaterThan(0);
      
      for (let i = 1; i < delayedEvents.length; i++) {
        const prevEvent = delayedEvents[i - 1];
        const currEvent = delayedEvents[i];
        
        if (prevEvent.payload.metadata?.sequence !== undefined && 
            currEvent.payload.metadata?.sequence !== undefined) {
          expect(currEvent.payload.metadata.sequence)
            .toBeGreaterThanOrEqual(prevEvent.payload.metadata.sequence);
        }
      }
    });
  });

  describe('Event Correlation and Tracing', () => {
    it('should maintain correlation across complex multi-module workflows', async () => {
      const correlationId = `complex-workflow-${Date.now()}`;

      // Execute complex workflow: Message → Payment → Marketplace → Audit
      
      // Step 1: Send premium message
      const messageResult = await qmailService.processPremiumMessage({
        squidId: testIdentities.alice,
        messageId: `complex_msg_${Date.now()}`,
        serviceType: 'premium',
        recipients: [testIdentities.bob],
        correlationId
      });

      // Step 2: List content on marketplace
      const listingResult = await qmarketService.listContent({
        squidId: testIdentities.alice,
        contentId: `complex_content_${Date.now()}`,
        title: 'Complex Workflow Content',
        price: 40.0,
        currency: 'QToken',
        correlationId
      });

      // Step 3: Purchase content
      const purchaseResult = await simulateContentPurchase(
        listingResult.listingId,
        testIdentities.charlie,
        40.0,
        correlationId
      );

      await new Promise(resolve => setTimeout(resolve, 250));

      // Analyze correlation integrity
      const workflowEvents = eventCollector.eventsByCorrelation.get(correlationId) || [];
      expect(workflowEvents.length).toBeGreaterThan(0);

      // Verify all events have the same correlation ID
      workflowEvents.forEach(event => {
        expect(event.correlationId).toBe(correlationId);
      });

      // Verify multiple modules participated
      const participatingModules = new Set(
        workflowEvents.map(e => e.topic.split('.')[1]) // Extract module name from topic
      );
      expect(participatingModules.size).toBeGreaterThan(1);

      // Verify event distribution across actors
      const participatingActors = new Set(workflowEvents.map(e => e.actor));
      expect(participatingActors.has(testIdentities.alice)).toBe(true);
      expect(participatingActors.has(testIdentities.charlie)).toBe(true);

      // Create correlation trace
      const correlationTrace = {
        correlationId,
        totalEvents: workflowEvents.length,
        duration: new Date(workflowEvents[workflowEvents.length - 1].timestamp).getTime() - 
                 new Date(workflowEvents[0].timestamp).getTime(),
        modules: Array.from(participatingModules),
        actors: Array.from(participatingActors),
        eventFlow: workflowEvents.map(e => ({
          sequence: e.sequenceNumber,
          timestamp: e.timestamp,
          module: e.topic.split('.')[1],
          action: e.topic.split('.')[2],
          actor: e.actor
        }))
      };

      expect(correlationTrace.duration).toBeGreaterThan(0);
      expect(correlationTrace.modules.length).toBeGreaterThan(1);
    });

    it('should handle correlation ID inheritance in nested operations', async () => {
      const parentCorrelationId = `parent-${Date.now()}`;
      const childCorrelationId = `child-${parentCorrelationId}`;

      // Parent operation
      const parentPayment = await qwalletService.createPaymentIntent({
        squidId: testIdentities.alice,
        amount: 20.0,
        currency: 'QToken',
        purpose: 'parent_operation',
        metadata: { correlationId: parentCorrelationId }
      });

      // Child operation (inherits context)
      const childPayment = await qwalletService.createPaymentIntent({
        squidId: testIdentities.bob,
        amount: 10.0,
        currency: 'QToken',
        purpose: 'child_operation',
        metadata: { 
          correlationId: childCorrelationId,
          parentCorrelationId: parentCorrelationId
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify parent events
      const parentEvents = eventCollector.eventsByCorrelation.get(parentCorrelationId) || [];
      expect(parentEvents.length).toBeGreaterThan(0);

      // Verify child events
      const childEvents = eventCollector.eventsByCorrelation.get(childCorrelationId) || [];
      expect(childEvents.length).toBeGreaterThan(0);

      // Verify child events reference parent
      childEvents.forEach(event => {
        if (event.payload.metadata?.parentCorrelationId) {
          expect(event.payload.metadata.parentCorrelationId).toBe(parentCorrelationId);
        }
      });
    });
  });

  describe('Event Performance and Scalability', () => {
    it('should handle high-volume event processing', async () => {
      const correlationId = `high-volume-${Date.now()}`;
      const eventCount = 50;

      const startTime = Date.now();

      // Generate high volume of events
      const operations = Array(eventCount).fill(null).map((_, index) =>
        qwalletService.createPaymentIntent({
          squidId: testIdentities.alice,
          amount: 1.0 + (index * 0.1),
          currency: 'QToken',
          purpose: `high_volume_${index}`,
          metadata: { correlationId, index }
        })
      );

      const results = await Promise.all(operations);
      await new Promise(resolve => setTimeout(resolve, 300));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify all operations succeeded
      const successfulOperations = results.filter(r => r.success);
      expect(successfulOperations.length).toBe(eventCount);

      // Verify event processing performance
      const volumeEvents = eventCollector.eventsByCorrelation.get(correlationId) || [];
      expect(volumeEvents.length).toBeGreaterThan(0);

      // Calculate events per second
      const eventsPerSecond = volumeEvents.length / (processingTime / 1000);
      expect(eventsPerSecond).toBeGreaterThan(10); // Minimum performance threshold

      // Verify event ordering is maintained
      const indexedEvents = volumeEvents
        .filter(e => e.payload.metadata?.index !== undefined)
        .sort((a, b) => a.payload.metadata.index - b.payload.metadata.index);

      for (let i = 1; i < indexedEvents.length; i++) {
        expect(indexedEvents[i].payload.metadata.index)
          .toBeGreaterThan(indexedEvents[i - 1].payload.metadata.index);
      }
    });

    it('should maintain event integrity under concurrent load', async () => {
      const correlationIds = Array(10).fill(null).map((_, i) => `concurrent-load-${i}-${Date.now()}`);

      // Execute concurrent workflows
      const concurrentWorkflows = correlationIds.map(async (correlationId, index) => {
        // Each workflow has multiple operations
        const payment = await qwalletService.createPaymentIntent({
          squidId: testIdentities.alice,
          amount: 5.0 + index,
          currency: 'QToken',
          purpose: `concurrent_workflow_${index}`,
          metadata: { correlationId, workflowIndex: index }
        });

        const listing = await qmarketService.listContent({
          squidId: testIdentities.alice,
          contentId: `concurrent_content_${index}_${Date.now()}`,
          title: `Concurrent Content ${index}`,
          price: 15.0 + index,
          currency: 'QToken',
          correlationId
        });

        return { payment, listing, workflowIndex: index };
      });

      const workflowResults = await Promise.all(concurrentWorkflows);
      await new Promise(resolve => setTimeout(resolve, 400));

      // Verify each workflow maintained integrity
      correlationIds.forEach((correlationId, index) => {
        const workflowEvents = eventCollector.eventsByCorrelation.get(correlationId) || [];
        expect(workflowEvents.length).toBeGreaterThan(0);

        // Verify no cross-contamination
        workflowEvents.forEach(event => {
          expect(event.correlationId).toBe(correlationId);
          
          if (event.payload.metadata?.workflowIndex !== undefined) {
            expect(event.payload.metadata.workflowIndex).toBe(index);
          }
        });

        // Verify expected operations are present
        const paymentEvents = workflowEvents.filter(e => e.topic.includes('payment') || e.topic.includes('intent'));
        const listingEvents = workflowEvents.filter(e => e.topic.includes('listed') || e.topic.includes('content'));
        
        expect(paymentEvents.length).toBeGreaterThan(0);
        expect(listingEvents.length).toBeGreaterThan(0);
      });

      // Verify overall system stability
      const totalEvents = eventCollector.events.length;
      expect(totalEvents).toBeGreaterThan(correlationIds.length * 2); // At least 2 events per workflow
    });
  });

  describe('Event Schema Validation and Evolution', () => {
    it('should validate event schemas across module boundaries', async () => {
      const correlationId = `schema-validation-${Date.now()}`;

      // Execute operations that generate events with different schemas
      const paymentIntent = await qwalletService.createPaymentIntent({
        squidId: testIdentities.alice,
        amount: 12.0,
        currency: 'QToken',
        purpose: 'schema_validation_test',
        metadata: { correlationId }
      });

      const messageResult = await qmailService.processPremiumMessage({
        squidId: testIdentities.alice,
        messageId: `schema_msg_${Date.now()}`,
        serviceType: 'premium',
        recipients: [testIdentities.bob],
        correlationId
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Analyze event schemas
      const schemaEvents = eventCollector.eventsByCorrelation.get(correlationId) || [];
      expect(schemaEvents.length).toBeGreaterThan(0);

      // Verify event structure compliance
      schemaEvents.forEach(event => {
        // Basic event structure
        expect(event.timestamp).toBeDefined();
        expect(event.topic).toBeDefined();
        expect(event.actor).toBeDefined();
        expect(event.correlationId).toBe(correlationId);

        // Topic naming convention: q.<module>.<action>.<version>
        const topicParts = event.topic.split('.');
        expect(topicParts.length).toBeGreaterThanOrEqual(3);
        expect(topicParts[0]).toBe('q');

        // Payload structure
        expect(event.payload).toBeDefined();
        expect(typeof event.payload).toBe('object');
      });

      // Verify module-specific schema compliance
      const qwalletEvents = schemaEvents.filter(e => e.topic.startsWith('q.qwallet'));
      const qmailEvents = schemaEvents.filter(e => e.topic.startsWith('q.qmail'));

      qwalletEvents.forEach(event => {
        if (event.payload.amount !== undefined) {
          expect(typeof event.payload.amount).toBe('number');
          expect(event.payload.amount).toBeGreaterThan(0);
        }
        if (event.payload.currency !== undefined) {
          expect(typeof event.payload.currency).toBe('string');
        }
      });

      qmailEvents.forEach(event => {
        if (event.payload.messageId !== undefined) {
          expect(typeof event.payload.messageId).toBe('string');
          expect(event.payload.messageId.length).toBeGreaterThan(0);
        }
      });
    });
  });
});

// Helper functions

async function simulateContentPurchase(listingId, buyerId, amount, correlationId) {
  const paymentIntent = await qwalletService.createPaymentIntent({
    squidId: buyerId,
    amount,
    currency: 'QToken',
    purpose: 'qmarket_content_purchase',
    metadata: { listingId, correlationId }
  });

  const paymentResult = await qwalletService.processSandboxPayment(paymentIntent);
  
  if (!paymentResult.success) {
    return { success: false, error: 'Payment failed' };
  }

  const purchaseResult = await qmarketService.processPurchase({
    squidId: buyerId,
    listingId,
    paymentIntentId: paymentIntent.intentId,
    correlationId
  });

  return {
    success: purchaseResult.success,
    purchaseId: purchaseResult.purchaseId,
    paymentIntent,
    paymentResult,
    purchaseResult
  };
}