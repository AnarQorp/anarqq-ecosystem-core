/**
 * Event Bus Usage Example
 * 
 * This example demonstrates how Q ecosystem modules can use the centralized
 * event bus for communication and coordination.
 */

import { eventBusService } from '../services/EventBusService.mjs';

// Example schemas for different modules
const QMAIL_SCHEMAS = {
  sent: {
    topic: 'q.qmail.sent.v1',
    version: 'v1',
    schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'array', items: { type: 'string' } },
        subject: { type: 'string' },
        timestamp: { type: 'string' }
      },
      required: ['messageId', 'from', 'to', 'subject']
    },
    compatibility: 'BACKWARD',
    deprecated: false,
    description: 'Event published when a message is sent via Qmail'
  },
  received: {
    topic: 'q.qmail.received.v1',
    version: 'v1',
    schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string' },
        recipient: { type: 'string' },
        deliveryStatus: { type: 'string', enum: ['delivered', 'failed', 'pending'] },
        timestamp: { type: 'string' }
      },
      required: ['messageId', 'recipient', 'deliveryStatus']
    },
    compatibility: 'BACKWARD',
    deprecated: false,
    description: 'Event published when a message is received/delivered'
  }
};

const QWALLET_SCHEMAS = {
  payment: {
    topic: 'q.qwallet.payment.created.v1',
    version: 'v1',
    schema: {
      type: 'object',
      properties: {
        paymentId: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
        purpose: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'completed', 'failed'] }
      },
      required: ['paymentId', 'amount', 'currency', 'from', 'to']
    },
    compatibility: 'BACKWARD',
    deprecated: false,
    description: 'Event published when a payment is created'
  },
  settled: {
    topic: 'q.qwallet.payment.settled.v1',
    version: 'v1',
    schema: {
      type: 'object',
      properties: {
        paymentId: { type: 'string' },
        transactionHash: { type: 'string' },
        blockNumber: { type: 'number' },
        gasUsed: { type: 'number' },
        finalAmount: { type: 'number' },
        timestamp: { type: 'string' }
      },
      required: ['paymentId', 'transactionHash', 'finalAmount']
    },
    compatibility: 'BACKWARD',
    deprecated: false,
    description: 'Event published when a payment is settled on blockchain'
  }
};

const QERBEROS_SCHEMAS = {
  audit: {
    topic: 'q.qerberos.audit.logged.v1',
    version: 'v1',
    schema: {
      type: 'object',
      properties: {
        auditId: { type: 'string' },
        eventType: { type: 'string' },
        resource: { type: 'string' },
        actor: { type: 'object' },
        verdict: { type: 'string', enum: ['ALLOW', 'DENY', 'WARN'] },
        riskScore: { type: 'number', minimum: 0, maximum: 100 },
        details: { type: 'object' }
      },
      required: ['auditId', 'eventType', 'resource', 'actor', 'verdict']
    },
    compatibility: 'BACKWARD',
    deprecated: false,
    description: 'Event published when an audit event is logged'
  }
};

/**
 * Example: Setting up the event bus with schemas
 */
async function setupEventBus() {
  console.log('🚀 Setting up Q Ecosystem Event Bus...\n');

  // Register schemas for all modules
  const allSchemas = [
    ...Object.values(QMAIL_SCHEMAS),
    ...Object.values(QWALLET_SCHEMAS),
    ...Object.values(QERBEROS_SCHEMAS)
  ];

  for (const schema of allSchemas) {
    const result = eventBusService.registerSchema(schema);
    if (!result.success) {
      console.error(`❌ Failed to register schema ${schema.topic}:`, result.errors);
    }
  }

  console.log(`✅ Registered ${allSchemas.length} event schemas\n`);
}

/**
 * Example: Qmail module publishing events
 */
async function simulateQmailEvents() {
  console.log('📧 Simulating Qmail events...\n');

  const qmailActor = {
    squidId: 'qmail-service-001',
    subId: 'main-instance'
  };

  // Simulate sending a message
  const messageId = 'msg_' + Date.now();
  
  await eventBusService.publish({
    topic: 'q.qmail.sent.v1',
    payload: {
      messageId,
      from: 'alice@q.network',
      to: ['bob@q.network'],
      subject: 'Hello from Q Ecosystem!',
      timestamp: new Date().toISOString()
    },
    actor: qmailActor,
    correlationId: 'qmail-flow-' + Date.now()
  });

  // Simulate message delivery
  setTimeout(async () => {
    await eventBusService.publish({
      topic: 'q.qmail.received.v1',
      payload: {
        messageId,
        recipient: 'bob@q.network',
        deliveryStatus: 'delivered',
        timestamp: new Date().toISOString()
      },
      actor: qmailActor
    });
  }, 1000);
}

/**
 * Example: Qwallet module publishing events
 */
async function simulateQwalletEvents() {
  console.log('💰 Simulating Qwallet events...\n');

  const qwalletActor = {
    squidId: 'qwallet-service-001',
    subId: 'payment-processor'
  };

  // Simulate payment creation
  const paymentId = 'pay_' + Date.now();
  
  await eventBusService.publish({
    topic: 'q.qwallet.payment.created.v1',
    payload: {
      paymentId,
      amount: 100.50,
      currency: 'PI',
      from: 'alice@q.network',
      to: 'bob@q.network',
      purpose: 'Message delivery fee',
      status: 'pending'
    },
    actor: qwalletActor,
    correlationId: 'payment-flow-' + Date.now()
  });

  // Simulate payment settlement
  setTimeout(async () => {
    await eventBusService.publish({
      topic: 'q.qwallet.payment.settled.v1',
      payload: {
        paymentId,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        blockNumber: 12345678,
        gasUsed: 21000,
        finalAmount: 100.50,
        timestamp: new Date().toISOString()
      },
      actor: qwalletActor
    });
  }, 2000);
}

/**
 * Example: Qerberos module subscribing to all events for audit
 */
function setupQerberosAuditing() {
  console.log('🛡️  Setting up Qerberos auditing...\n');

  const qerberosActor = {
    squidId: 'qerberos-service-001',
    subId: 'audit-monitor'
  };

  // Subscribe to all events for auditing
  eventBusService.subscribe(
    '*', // Listen to all events
    qerberosActor,
    async (event) => {
      // Calculate risk score based on event
      const riskScore = calculateRiskScore(event);
      
      // Log audit event
      await eventBusService.publish({
        topic: 'q.qerberos.audit.logged.v1',
        payload: {
          auditId: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          eventType: event.topic,
          resource: event.payload.messageId || event.payload.paymentId || 'unknown',
          actor: event.actor,
          verdict: riskScore > 70 ? 'WARN' : 'ALLOW',
          riskScore,
          details: {
            originalEvent: event.topic,
            timestamp: event.timestamp,
            correlationId: event.correlationId
          }
        },
        actor: qerberosActor,
        correlationId: event.correlationId
      });

      console.log(`🔍 Audited event: ${event.topic} (Risk: ${riskScore})`);
    }
  );
}

/**
 * Example: Cross-module integration - Qmail subscribing to payment events
 */
function setupCrossModuleIntegration() {
  console.log('🔗 Setting up cross-module integration...\n');

  const qmailActor = {
    squidId: 'qmail-service-001',
    subId: 'payment-monitor'
  };

  // Qmail subscribes to payment settlements to enable premium features
  eventBusService.subscribe(
    'q.qwallet.payment.settled.v1',
    qmailActor,
    async (event) => {
      console.log(`📧 Qmail: Payment settled for ${event.payload.paymentId}, enabling premium delivery`);
      
      // Could trigger premium message delivery features
      // This demonstrates how modules can react to events from other modules
    }
  );

  // Subscribe to audit warnings to implement security measures
  eventBusService.subscribe(
    'q.qerberos.audit.logged.v1',
    qmailActor,
    async (event) => {
      if (event.payload.verdict === 'WARN' && event.payload.riskScore > 80) {
        console.log(`⚠️  Qmail: High risk activity detected, implementing additional security measures`);
        // Could implement rate limiting, additional verification, etc.
      }
    },
    {
      filters: {
        payload: { verdict: 'WARN' }
      }
    }
  );
}

/**
 * Simple risk scoring algorithm for demonstration
 */
function calculateRiskScore(event) {
  let score = 0;
  
  // Base score by event type
  if (event.topic.includes('payment')) {
    score += 30; // Financial events have higher base risk
  } else if (event.topic.includes('audit')) {
    score += 10; // Audit events have low base risk
  } else {
    score += 20; // Other events have medium base risk
  }
  
  // Increase score for high-value payments
  if (event.payload.amount && event.payload.amount > 1000) {
    score += 40;
  }
  
  // Random factor to simulate ML-based risk assessment
  score += Math.random() * 20;
  
  return Math.min(Math.round(score), 100);
}

/**
 * Display event bus statistics
 */
function displayStats() {
  const stats = eventBusService.getStats();
  
  console.log('\n📊 Event Bus Statistics:');
  console.log(`   Total Events: ${stats.totalEvents}`);
  console.log(`   Active Subscriptions: ${stats.activeSubscriptions}`);
  console.log(`   Registered Schemas: ${stats.registeredSchemas}`);
  console.log('\n📈 Topic Counts:');
  
  for (const [topic, count] of Object.entries(stats.topicCounts)) {
    console.log(`   ${topic}: ${count}`);
  }
  
  console.log('\n📜 Recent Events:');
  const recentEvents = eventBusService.getEventHistory({ limit: 5 });
  for (const event of recentEvents) {
    console.log(`   ${event.timestamp} - ${event.topic} (${event.actor.squidId})`);
  }
}

/**
 * Main example execution
 */
async function runExample() {
  try {
    // Setup
    await setupEventBus();
    setupQerberosAuditing();
    setupCrossModuleIntegration();

    // Simulate module activities
    await simulateQmailEvents();
    await simulateQwalletEvents();

    // Wait for events to process
    setTimeout(() => {
      displayStats();
      console.log('\n✅ Event Bus example completed successfully!');
    }, 3000);

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample();
}

export {
  setupEventBus,
  simulateQmailEvents,
  simulateQwalletEvents,
  setupQerberosAuditing,
  setupCrossModuleIntegration,
  displayStats
};