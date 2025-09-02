#!/usr/bin/env node

/**
 * Centralization Sentinel
 * 
 * CI rule to detect and fail on central dependencies (RDBMS, Kafka, Redis as broker)
 * Ensures Qflow remains truly serverless and distributed
 */

const fs = require('fs');
const path = require('path');

// Centralized dependencies to detect and block
const FORBIDDEN_DEPENDENCIES = [
  // Relational Databases
  'mysql', 'mysql2', 'pg', 'postgres', 'sqlite3', 'better-sqlite3',
  'mariadb', 'oracledb', 'mssql', 'tedious',
  
  // Message Brokers (when used as central brokers)
  'kafkajs', 'node-rdkafka', 'kafka-node',
  'amqplib', 'rabbitmq', 'bull', 'bee-queue',
  
  // Redis as central broker/queue (not cache)
  'redis', 'ioredis', 'node-redis',
  
  // Centralized orchestrators
  'n8n', 'temporal-client', 'zeebe-node',
  
  // Centralized state stores
  'mongodb', 'mongoose', 'cassandra-driver',
  'elasticsearch', '@elastic/elasticsearch',
  
  // Centralized coordination services
  'zookeeper', 'consul', 'etcd3'
];

// Allowed distributed alternatives
const ALLOWED_DISTRIBUTED = [
  'ipfs-http-client', 'ipfs-core', 'helia',
  'libp2p', '@libp2p/pubsub',
  'orbit-db', 'gun', 'hypercore',
  'webtorrent', 'bittorrent-dht'
];

// Patterns in code that indicate centralization
const CENTRALIZATION_PATTERNS = [
  /new\s+Pool\s*\(/g,                    // Database connection pools
  /createConnection\s*\(/g,              // Database connections
  /\.connect\s*\(\s*['"`].*:\/\//g,      // Connection strings
  /mongodb:\/\//g,                       // MongoDB connection strings
  /mysql:\/\//g,                         // MySQL connection strings
  /postgresql:\/\//g,                    // PostgreSQL connection strings
  /redis:\/\//g,                         // Redis connection strings
  /kafka:\/\//g,                         // Kafka connection strings
  /amqp:\/\//g,                          // AMQP connection strings
  /\.createProducer\s*\(/g,              // Kafka producers
  /\.createConsumer\s*\(/g,              // Kafka consumers
  /\.createQueue\s*\(/g,                 // Queue creation
  /\.createTopic\s*\(/g,                 // Topic creation
];

function checkPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies || {},
    ...packageJson.devDependencies || {},
    ...packageJson.peerDependencies || {}
  };

  const violations = [];

  // Check for forbidden dependencies
  for (const dep of Object.keys(allDeps)) {
    if (FORBIDDEN_DEPENDENCIES.includes(dep)) {
      violations.push(`Forbidden centralized dependency: ${dep}`);
    }
  }

  // Check for required distributed dependencies
  const hasIPFS = Object.keys(allDeps).some(dep => 
    dep.includes('ipfs') || dep.includes('helia')
  );
  const hasLibp2p = Object.keys(allDeps).some(dep => 
    dep.includes('libp2p')
  );

  if (!hasIPFS) {
    violations.push('Missing required IPFS dependency for distributed storage');
  }

  if (!hasLibp2p) {
    violations.push('Missing required Libp2p dependency for P2P communication');
  }

  return violations;
}

function checkSourceCode() {
  const violations = [];
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    return violations;
  }

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        for (const pattern of CENTRALIZATION_PATTERNS) {
          const matches = content.match(pattern);
          if (matches) {
            violations.push(`Centralization pattern found in ${filePath}: ${matches[0]}`);
          }
        }
      }
    }
  }

  scanDirectory(srcDir);
  return violations;
}

function main() {
  console.log('🔍 Running Centralization Sentinel...');
  
  const packageViolations = checkPackageJson();
  const codeViolations = checkSourceCode();
  
  const allViolations = [...packageViolations, ...codeViolations];
  
  if (allViolations.length === 0) {
    console.log('✅ No centralization violations detected');
    console.log('✅ Qflow remains truly serverless and distributed');
    process.exit(0);
  } else {
    console.error('❌ Centralization violations detected:');
    allViolations.forEach(violation => {
      console.error(`   ${violation}`);
    });
    console.error('');
    console.error('Qflow must remain serverless and distributed.');
    console.error('Remove centralized dependencies and use distributed alternatives:');
    console.error('- Use IPFS instead of centralized databases');
    console.error('- Use Libp2p Pubsub instead of centralized message brokers');
    console.error('- Use distributed state management instead of centralized stores');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkPackageJson, checkSourceCode, FORBIDDEN_DEPENDENCIES, ALLOWED_DISTRIBUTED };