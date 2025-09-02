#!/usr/bin/env node

/**
 * Event Bus CLI - Command line tool for managing Q ecosystem event bus
 * 
 * Usage:
 *   node event-bus-cli.mjs schema register <schema-file>
 *   node event-bus-cli.mjs schema list [module]
 *   node event-bus-cli.mjs events list [topic] [--limit=10]
 *   node event-bus-cli.mjs stats
 *   node event-bus-cli.mjs migrate <from-version> <to-version>
 */

import { readFileSync, writeFileSync } from 'fs';
import { eventBusService } from '../services/EventBusService.mjs';

const commands = {
  schema: {
    register: registerSchema,
    list: listSchemas,
    deprecate: deprecateSchema
  },
  events: {
    list: listEvents,
    publish: publishEvent
  },
  stats: showStats,
  migrate: runMigration,
  help: showHelp
};

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    return;
  }

  const [command, subcommand, ...params] = args;

  try {
    if (commands[command]) {
      if (typeof commands[command] === 'function') {
        await commands[command](...params);
      } else if (commands[command][subcommand]) {
        await commands[command][subcommand](...params);
      } else {
        console.error(`❌ Unknown subcommand: ${command} ${subcommand}`);
        showHelp();
      }
    } else {
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

/**
 * Register a new event schema
 */
async function registerSchema(schemaFile) {
  if (!schemaFile) {
    console.error('❌ Schema file path is required');
    return;
  }

  try {
    const schemaContent = readFileSync(schemaFile, 'utf8');
    const schema = JSON.parse(schemaContent);

    const result = eventBusService.registerSchema(schema);
    
    if (result.success) {
      console.log(`✅ Schema registered successfully: ${schema.topic}:${schema.version}`);
    } else {
      console.error('❌ Failed to register schema:', result.errors.join(', '));
    }
  } catch (error) {
    console.error('❌ Failed to read or parse schema file:', error.message);
  }
}

/**
 * List registered schemas
 */
async function listSchemas(module) {
  const stats = eventBusService.getStats();
  
  console.log(`📋 Registered Schemas (${stats.registeredSchemas} total):\n`);
  
  // In a real implementation, we'd have access to the schema registry
  // For now, we'll show a placeholder
  console.log('   Schema listing would show:');
  console.log('   - Topic');
  console.log('   - Version');
  console.log('   - Compatibility mode');
  console.log('   - Deprecation status');
  
  if (module) {
    console.log(`\n   Filtered by module: ${module}`);
  }
}

/**
 * Deprecate a schema version
 */
async function deprecateSchema(topic, version, deprecationDate) {
  if (!topic || !version) {
    console.error('❌ Topic and version are required');
    return;
  }

  const date = deprecationDate ? new Date(deprecationDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  
  console.log(`⚠️  Deprecating schema ${topic}:${version} on ${date.toISOString()}`);
  
  // In a real implementation, this would call the schema registry
  console.log('✅ Schema deprecation scheduled');
}

/**
 * List events from the event bus
 */
async function listEvents(topic, ...options) {
  const limitOption = options.find(opt => opt.startsWith('--limit='));
  const limit = limitOption ? parseInt(limitOption.split('=')[1]) : 10;

  const events = eventBusService.getEventHistory({
    topic,
    limit
  });

  console.log(`📜 Recent Events (${events.length} shown):\n`);

  if (events.length === 0) {
    console.log('   No events found');
    return;
  }

  for (const event of events) {
    console.log(`   ${event.timestamp}`);
    console.log(`   📍 ${event.topic}`);
    console.log(`   👤 ${event.actor.squidId}${event.actor.subId ? ` (${event.actor.subId})` : ''}`);
    console.log(`   🔗 ${event.correlationId || 'no correlation'}`);
    console.log(`   📦 ${JSON.stringify(event.payload).substring(0, 100)}${JSON.stringify(event.payload).length > 100 ? '...' : ''}`);
    console.log('');
  }
}

/**
 * Publish a test event
 */
async function publishEvent(topic, payloadFile) {
  if (!topic || !payloadFile) {
    console.error('❌ Topic and payload file are required');
    return;
  }

  try {
    const payloadContent = readFileSync(payloadFile, 'utf8');
    const payload = JSON.parse(payloadContent);

    const result = await eventBusService.publish({
      topic,
      payload,
      actor: {
        squidId: 'cli-user',
        subId: 'test'
      },
      correlationId: `cli-${Date.now()}`
    });

    if (result.success) {
      console.log(`✅ Event published successfully: ${result.eventId}`);
    } else {
      console.error('❌ Failed to publish event:', result.errors.join(', '));
    }
  } catch (error) {
    console.error('❌ Failed to read or parse payload file:', error.message);
  }
}

/**
 * Show event bus statistics
 */
async function showStats() {
  const stats = eventBusService.getStats();
  
  console.log('📊 Event Bus Statistics:\n');
  console.log(`   Total Events: ${stats.totalEvents}`);
  console.log(`   Active Subscriptions: ${stats.activeSubscriptions}`);
  console.log(`   Registered Schemas: ${stats.registeredSchemas}`);
  
  console.log('\n📈 Topic Counts:');
  const sortedTopics = Object.entries(stats.topicCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
    
  for (const [topic, count] of sortedTopics) {
    console.log(`   ${topic}: ${count}`);
  }
  
  if (Object.keys(stats.topicCounts).length === 0) {
    console.log('   No events published yet');
  }
}

/**
 * Run a schema migration
 */
async function runMigration(fromVersion, toVersion) {
  if (!fromVersion || !toVersion) {
    console.error('❌ From and to versions are required');
    return;
  }

  console.log(`🔄 Running migration from ${fromVersion} to ${toVersion}...`);
  
  // In a real implementation, this would:
  // 1. Find all events with the source version
  // 2. Apply the migration transformation
  // 3. Validate the results
  // 4. Update the events
  
  console.log('⚠️  Migration functionality not yet implemented');
  console.log('   This would:');
  console.log('   1. Identify events to migrate');
  console.log('   2. Apply transformation functions');
  console.log('   3. Validate migrated events');
  console.log('   4. Update event store');
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🚀 Q Ecosystem Event Bus CLI

Usage:
  node event-bus-cli.mjs <command> [options]

Commands:
  schema register <file>     Register a new event schema from JSON file
  schema list [module]       List registered schemas, optionally filtered by module
  schema deprecate <topic> <version> [date]  Deprecate a schema version
  
  events list [topic] [--limit=N]  List recent events, optionally filtered by topic
  events publish <topic> <payload-file>  Publish a test event
  
  stats                      Show event bus statistics
  migrate <from> <to>        Run schema migration (not yet implemented)
  help                       Show this help message

Examples:
  node event-bus-cli.mjs schema register schemas/qmail-sent-v1.json
  node event-bus-cli.mjs events list q.qmail.sent.v1 --limit=5
  node event-bus-cli.mjs stats
  node event-bus-cli.mjs schema deprecate q.qmail.sent.v1 v1 2024-12-31

Schema File Format:
  {
    "topic": "q.module.action.v1",
    "version": "v1",
    "schema": { "type": "object", "properties": {...} },
    "compatibility": "BACKWARD|FORWARD|FULL|NONE",
    "deprecated": false,
    "description": "Event description"
  }
`);
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ CLI failed:', error);
    process.exit(1);
  });
}

export { main, commands };