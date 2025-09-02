/**
 * Event Bus Integration Test
 * 
 * This test demonstrates the complete event bus and schema registry functionality
 * including schema registration, event publishing, subscriptions, and validation.
 */

import { eventBusService } from '../services/EventBusService.mjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test suite for event bus integration
 */
async function runIntegrationTests() {
  console.log('🧪 Starting Event Bus Integration Tests...\n');

  try {
    await testSchemaRegistration();
    await testEventPublishing();
    await testEventSubscriptions();
    await testCrossModuleIntegration();
    await testEventHistory();
    await testStatistics();
    
    console.log('✅ All integration tests passed!\n');
  } catch (error) {
    console.error('❌ Integration tests failed:', error);
    process.exit(1);
  }
}

/**
 * Test schema registration functionality
 */
async function testSchemaRegistration() {
  console.log('📋 Testing schema registration...');

  // Load and register Qmail schema
  const qmailSchemaPath = join(__dirname, '../schemas/qmail-sent-v1.json');
  const qmailSchema = JSON.parse(readFileSync(qmailSchemaPath, 'utf8'));
  
  const qmailResult = eventBusService.registerSchema(qmailSchema);
  if (!qmailResult.success) {
    throw new Error(`Failed to register Qmail schema: ${qmailResult.errors.join(', ')}`);
  }

  // Load and register Qwallet schema
  const qwalletSchemaPath = join(__dirname, '../schemas/qwallet-payment-v1.json');
  const qwalletSchema = JSON.parse(readFileSync(qwalletSchemaPath, 'utf8'));
  
  const qwalletResult = eventBusService.registerSchema(qwalletSchema);
  if (!qwalletResult.success) {
    throw new Error(`Failed to register Qwallet schema: ${qwalletResult.errors.join(', ')}`);
  }

  console.log('   ✅ Schema registration successful\n');
}

/**
 * Test event publishing with schema validation
 */
async function testEventPublishing() {
  console.log('📤 Testing event publishing...');

  const testActor = {
    squidId: 'test-user-123',
    subId: 'integration-test'
  };

  // Test valid Qmail event
  const qmailEvent = {
    topic: 'q.qmail.sent.v1',
    payload: {
      messageId: 'msg_test_123',
      from: 'alice@q.network',
      to: ['bob@q.network'],
      subject: 'Integration Test Message',
      timestamp: new Date().toISOString(),
      encrypted: true,
      priority: 'normal'
    },
    actor: testActor,
    correlationId: 'test-correlation-1'
  };

  const qmailResult = await eventBusService.publish(qmailEvent);
  if (!qmailResult.success) {
    throw new Error(`Failed to publish Qmail event: ${qmailResult.errors.join(', ')}`);
  }

  // Test valid Qwallet event
  const qwalletEvent = {
    topic: 'q.qwallet.payment.created.v1',
    payload: {
      paymentId: 'pay_test_456',
      amount: 50.25,
      currency: 'PI',
      from: 'alice@q.network',
      to: 'bob@q.network',
      purpose: 'Test payment',
      status: 'pending'
    },
    actor: testActor,
    correlationId: 'test-correlation-2'
  };

  const qwalletResult = await eventBusService.publish(qwalletEvent);
  if (!qwalletResult.success) {
    throw new Error(`Failed to publish Qwallet event: ${qwalletResult.errors.join(', ')}`);
  }

  // Test invalid event (should fail validation)
  const invalidEvent = {
    topic: 'invalid-topic-format',
    payload: { test: 'data' },
    actor: testActor
  };

  const invalidResult = await eventBusService.publish(invalidEvent);
  if (invalidResult.success) {
    throw new Error('Invalid event should have failed validation');
  }

  console.log('   ✅ Event publishing and validation successful\n');
}

/**
 * Test event subscriptions and delivery
 */
async function testEventSubscriptions() {
  console.log('📡 Testing event subscriptions...');

  const testActor = {
    squidId: 'test-subscriber-456',
    subId: 'integration-test'
  };

  const receivedEvents = [];

  // Subscribe to Qmail events
  const qmailSubscription = eventBusService.subscribe(
    'q.qmail.*',
    testActor,
    (event) => {
      receivedEvents.push({ type: 'qmail', event });
    }
  );

  // Subscribe to all events
  const allEventsSubscription = eventBusService.subscribe(
    '*',
    testActor,
    (event) => {
      receivedEvents.push({ type: 'all', event });
    }
  );

  // Publish a test event
  await eventBusService.publish({
    topic: 'q.qmail.sent.v1',
    payload: {
      messageId: 'msg_subscription_test',
      from: 'test@q.network',
      to: ['subscriber@q.network'],
      subject: 'Subscription Test',
      timestamp: new Date().toISOString(),
      encrypted: false,
      priority: 'normal'
    },
    actor: testActor
  });

  // Wait for event processing
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verify events were received
  const qmailEvents = receivedEvents.filter(r => r.type === 'qmail');
  const allEvents = receivedEvents.filter(r => r.type === 'all');

  if (qmailEvents.length === 0) {
    throw new Error('Qmail subscription did not receive events');
  }

  if (allEvents.length === 0) {
    throw new Error('Wildcard subscription did not receive events');
  }

  // Unsubscribe
  eventBusService.unsubscribe(qmailSubscription);
  eventBusService.unsubscribe(allEventsSubscription);

  console.log('   ✅ Event subscriptions successful\n');
}

/**
 * Test cross-module integration patterns
 */
async function testCrossModuleIntegration() {
  console.log('🔗 Testing cross-module integration...');

  const qmailActor = { squidId: 'qmail-service', subId: 'test' };
  const qwalletActor = { squidId: 'qwallet-service', subId: 'test' };
  const qerberosActor = { squidId: 'qerberos-service', subId: 'test' };

  const integrationEvents = [];

  // Qerberos subscribes to all events for auditing
  eventBusService.subscribe('*', qerberosActor, (event) => {
    integrationEvents.push({
      type: 'audit',
      originalEvent: event.topic,
      actor: event.actor.squidId
    });
  });

  // Qmail subscribes to payment events
  eventBusService.subscribe('q.qwallet.*', qmailActor, (event) => {
    integrationEvents.push({
      type: 'payment_notification',
      paymentId: event.payload.paymentId,
      status: event.payload.status
    });
  });

  // Simulate a workflow: Message -> Payment -> Audit
  const correlationId = 'integration-workflow-' + Date.now();

  // 1. Send message
  await eventBusService.publish({
    topic: 'q.qmail.sent.v1',
    payload: {
      messageId: 'msg_integration_test',
      from: 'sender@q.network',
      to: ['recipient@q.network'],
      subject: 'Integration Workflow Test',
      timestamp: new Date().toISOString(),
      encrypted: true,
      priority: 'high'
    },
    actor: qmailActor,
    correlationId
  });

  // 2. Create payment
  await eventBusService.publish({
    topic: 'q.qwallet.payment.created.v1',
    payload: {
      paymentId: 'pay_integration_test',
      amount: 25.00,
      currency: 'PI',
      from: 'sender@q.network',
      to: 'recipient@q.network',
      purpose: 'Message delivery fee',
      status: 'pending'
    },
    actor: qwalletActor,
    correlationId
  });

  // Wait for event processing
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verify cross-module events were processed
  const auditEvents = integrationEvents.filter(e => e.type === 'audit');
  const paymentNotifications = integrationEvents.filter(e => e.type === 'payment_notification');

  if (auditEvents.length < 2) {
    throw new Error('Audit events not properly captured');
  }

  if (paymentNotifications.length === 0) {
    throw new Error('Payment notifications not received');
  }

  console.log('   ✅ Cross-module integration successful\n');
}

/**
 * Test event history and filtering
 */
async function testEventHistory() {
  console.log('📜 Testing event history...');

  const testActor = { squidId: 'history-test-user', subId: 'test' };

  // Publish several events
  for (let i = 0; i < 5; i++) {
    await eventBusService.publish({
      topic: 'q.qmail.sent.v1',
      payload: {
        messageId: `msg_history_${i}`,
        from: 'history@q.network',
        to: ['test@q.network'],
        subject: `History Test ${i}`,
        timestamp: new Date().toISOString(),
        encrypted: false,
        priority: 'normal'
      },
      actor: testActor
    });
  }

  // Test getting all history
  const allHistory = eventBusService.getEventHistory();
  if (allHistory.length < 5) {
    throw new Error('Event history not properly stored');
  }

  // Test filtering by topic
  const qmailHistory = eventBusService.getEventHistory({ topic: 'q.qmail.sent.v1' });
  if (qmailHistory.length < 5) {
    throw new Error('Topic filtering not working');
  }

  // Test filtering by actor
  const actorHistory = eventBusService.getEventHistory({ actor: testActor });
  if (actorHistory.length < 5) {
    throw new Error('Actor filtering not working');
  }

  // Test limit
  const limitedHistory = eventBusService.getEventHistory({ limit: 3 });
  if (limitedHistory.length !== 3) {
    throw new Error('Limit filtering not working');
  }

  console.log('   ✅ Event history and filtering successful\n');
}

/**
 * Test statistics and monitoring
 */
async function testStatistics() {
  console.log('📊 Testing statistics...');

  const stats = eventBusService.getStats();

  // Verify statistics structure
  if (typeof stats.totalEvents !== 'number') {
    throw new Error('Total events statistic missing');
  }

  if (typeof stats.activeSubscriptions !== 'number') {
    throw new Error('Active subscriptions statistic missing');
  }

  if (typeof stats.registeredSchemas !== 'number') {
    throw new Error('Registered schemas statistic missing');
  }

  if (typeof stats.topicCounts !== 'object') {
    throw new Error('Topic counts statistic missing');
  }

  // Verify we have events and schemas
  if (stats.totalEvents === 0) {
    throw new Error('No events recorded in statistics');
  }

  if (stats.registeredSchemas === 0) {
    throw new Error('No schemas recorded in statistics');
  }

  console.log('   ✅ Statistics successful\n');
  console.log('📊 Final Statistics:');
  console.log(`   Total Events: ${stats.totalEvents}`);
  console.log(`   Active Subscriptions: ${stats.activeSubscriptions}`);
  console.log(`   Registered Schemas: ${stats.registeredSchemas}`);
  console.log(`   Unique Topics: ${Object.keys(stats.topicCounts).length}`);
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests();
}

export { runIntegrationTests };