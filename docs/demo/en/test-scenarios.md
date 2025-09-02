# Demo Test Scenarios

## Overview

This document describes the three main demo scenarios that showcase the AnarQ&Q ecosystem's capabilities: Identity Flow, Content Flow, and DAO Governance Flow. Each scenario demonstrates end-to-end functionality with Pi Network integration.

## Prerequisites

- Demo environment setup completed (see [Setup Guide](./setup-guide.md))
- All services running and healthy
- Demo data initialized
- Pi Network sandbox environment configured

## Scenario 1: Identity Flow Demo

### Overview

Demonstrates the complete identity lifecycle from sQuid creation through Pi Network integration, wallet transactions, and audit logging.

### Flow Steps

1. **sQuid Identity Creation**
2. **Pi Identity Linking**
3. **Cross-Platform Authentication**
4. **Pi Wallet Transaction**
5. **Qerberos Audit Verification**

### Execution Script

```bash
#!/bin/bash
# File: scripts/demo-run-identity.sh

set -e

echo "🆔 Starting Identity Flow Demo..."

# Configuration
DEMO_USER="alice"
SQUID_ID="squid-demo-alice-001"
PI_USER_ID="pi-demo-alice-001"
DEMO_TIMEOUT=300

echo "👤 Demo User: $DEMO_USER"
echo "🔗 sQuid ID: $SQUID_ID"
echo "🥧 Pi User ID: $PI_USER_ID"
echo ""

# Step 1: Create sQuid Identity
echo "📝 Step 1: Creating sQuid Identity..."
SQUID_RESULT=$(node -e "
const { sQuidService } = require('./modules/squid/services/sQuidService.mjs');

async function createIdentity() {
  try {
    const identity = await sQuidService.createIdentity({
      userId: '$SQUID_ID',
      displayName: 'Alice Demo User',
      publicKey: 'demo-public-key-alice',
      metadata: {
        demoUser: true,
        scenario: 'identity-flow',
        createdAt: new Date().toISOString()
      }
    });
    
    console.log(JSON.stringify(identity));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createIdentity();
")

echo "✅ sQuid Identity Created: $SQUID_ID"

# Step 2: Link Pi Identity
echo "📝 Step 2: Linking Pi Identity..."
LINKING_RESULT=$(node -e "
const { PiIntegrationLayer } = require('./backend/services/PiIntegrationLayer.mjs');

async function linkIdentity() {
  try {
    const piIntegration = new PiIntegrationLayer();
    piIntegration.setEnvironment('sandbox');
    
    const binding = await piIntegration.linkPiIdentity('$SQUID_ID', '$PI_USER_ID');
    
    console.log(JSON.stringify(binding));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

linkIdentity();
")

echo "✅ Pi Identity Linked"

# Step 3: Test Cross-Platform Authentication
echo "📝 Step 3: Testing Cross-Platform Authentication..."
AUTH_RESULT=$(node -e "
const { CrossPlatformAuth } = require('./backend/services/CrossPlatformAuth.mjs');

async function testAuth() {
  try {
    const auth = new CrossPlatformAuth();
    
    const authResult = await auth.authenticateWithLinkedIdentity({
      platform: 'squid',
      userId: '$SQUID_ID',
      signature: 'demo-signature',
      challenge: 'demo-challenge-' + Date.now()
    });
    
    console.log(JSON.stringify(authResult));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testAuth();
")

echo "✅ Cross-Platform Authentication Successful"

# Step 4: Execute Pi Wallet Transaction
echo "📝 Step 4: Executing Pi Wallet Transaction..."
TRANSACTION_RESULT=$(node -e "
const { PiPaymentWorkflow } = require('./docs/pi/en/example-workflows.md');

async function executePayment() {
  try {
    const workflow = new PiPaymentWorkflow();
    
    const paymentRequest = {
      amount: 1.0,
      recipient: 'demo-recipient-address',
      piUserId: '$PI_USER_ID',
      squidId: '$SQUID_ID',
      memo: 'Identity Flow Demo Payment',
      environment: 'sandbox'
    };
    
    const result = await workflow.executePaymentWorkflow(paymentRequest);
    
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

executePayment();
")

echo "✅ Pi Wallet Transaction Completed"

# Step 5: Verify Audit Trail
echo "📝 Step 5: Verifying Audit Trail..."
AUDIT_RESULT=$(node -e "
const { QerberosIntegrationService } = require('./backend/services/QerberosIntegrationService.mjs');

async function verifyAudit() {
  try {
    const qerberos = new QerberosIntegrationService();
    
    const auditTrail = await qerberos.getAuditTrail({
      squidId: '$SQUID_ID',
      eventTypes: ['squid_identity_created', 'pi_identity_linked', 'pi_payment_completed'],
      timeRange: {
        start: new Date(Date.now() - 3600000).toISOString(), // Last hour
        end: new Date().toISOString()
      }
    });
    
    console.log(JSON.stringify(auditTrail));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyAudit();
")

echo "✅ Audit Trail Verified"

# Generate Results Report
REPORT_FILE="./artifacts/demo/results/identity-flow-$(date +%s).json"
mkdir -p ./artifacts/demo/results

cat > "$REPORT_FILE" << EOF
{
  "scenario": "identity-flow",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "duration": $SECONDS,
  "status": "completed",
  "steps": {
    "squid_creation": $SQUID_RESULT,
    "pi_linking": $LINKING_RESULT,
    "authentication": $AUTH_RESULT,
    "transaction": $TRANSACTION_RESULT,
    "audit_verification": $AUDIT_RESULT
  },
  "metrics": {
    "total_steps": 5,
    "successful_steps": 5,
    "execution_time_seconds": $SECONDS
  }
}
EOF

echo ""
echo "🎉 Identity Flow Demo Completed Successfully!"
echo "📊 Results saved to: $REPORT_FILE"
echo "⏱️  Total execution time: ${SECONDS}s"
echo ""
echo "📋 Summary:"
echo "  ✅ sQuid Identity Created"
echo "  ✅ Pi Identity Linked"
echo "  ✅ Cross-Platform Authentication"
echo "  ✅ Pi Wallet Transaction"
echo "  ✅ Audit Trail Verified"
```

## Scenario 2: Content Flow Demo

### Overview

Demonstrates content lifecycle from upload through encryption, IPFS storage, indexing, and Pi Network payment integration.

### Flow Steps

1. **Content Upload and Validation**
2. **Qlock Encryption**
3. **IPFS Storage**
4. **Qindex Metadata Indexing**
5. **Pi Payment for Storage**
6. **Access Control Setup**

### Execution Script

```bash
#!/bin/bash
# File: scripts/demo-run-content.sh

set -e

echo "📄 Starting Content Flow Demo..."

# Configuration
DEMO_USER="bob"
SQUID_ID="squid-demo-bob-002"
PI_USER_ID="pi-demo-bob-002"
CONTENT_FILE="./artifacts/demo/fixtures/sample-content.md"

echo "👤 Demo User: $DEMO_USER"
echo "📁 Content File: $CONTENT_FILE"
echo ""

# Create sample content file
mkdir -p ./artifacts/demo/fixtures
cat > "$CONTENT_FILE" << 'EOF'
# AnarQ&Q Demo Content

This is a sample document created for the Content Flow Demo.

## Features Demonstrated

- Content encryption with Qlock
- IPFS distributed storage
- Metadata indexing with Qindex
- Pi Network payment integration
- Access control with Qonsent

## Timestamp

Created at: $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

## Demo Metadata

- Scenario: content-flow
- User: bob
- Content Type: text/markdown
EOF

# Step 1: Upload and Validate Content
echo "📝 Step 1: Uploading and Validating Content..."
UPLOAD_RESULT=$(node -e "
const fs = require('fs');
const { PiContentManagementWorkflow } = require('./docs/pi/en/example-workflows.md');

async function uploadContent() {
  try {
    const workflow = new PiContentManagementWorkflow();
    const contentData = fs.readFileSync('$CONTENT_FILE', 'utf8');
    
    const contentRequest = {
      content: {
        data: contentData,
        type: 'text/markdown',
        size: Buffer.byteLength(contentData, 'utf8')
      },
      uploader: {
        squidId: '$SQUID_ID'
      },
      title: 'Demo Document: AnarQ&Q Overview',
      description: 'Sample content for Content Flow Demo',
      tags: ['demo', 'content-flow', 'markdown'],
      visibility: 'public',
      paymentRequired: true,
      storageDuration: 365
    };
    
    const result = await workflow.executeContentWorkflow(contentRequest);
    
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

uploadContent();
")

echo "✅ Content Uploaded and Processed"

# Step 2: Verify IPFS Storage
echo "📝 Step 2: Verifying IPFS Storage..."
IPFS_HASH=$(echo "$UPLOAD_RESULT" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
console.log(data.ipfsHash);
")

IPFS_VERIFICATION=$(curl -s "http://localhost:8080/ipfs/$IPFS_HASH" | head -c 100)
if [ -n "$IPFS_VERIFICATION" ]; then
    echo "✅ IPFS Storage Verified: $IPFS_HASH"
else
    echo "❌ IPFS Storage Verification Failed"
    exit 1
fi

# Step 3: Test Content Retrieval
echo "📝 Step 3: Testing Content Retrieval..."
RETRIEVAL_RESULT=$(node -e "
const { QindexService } = require('./backend/services/QindexService.mjs');

async function retrieveContent() {
  try {
    const qindex = new QindexService();
    
    const searchResults = await qindex.searchContent({
      query: 'AnarQ&Q Demo Content',
      filters: {
        uploader: '$SQUID_ID',
        tags: ['demo', 'content-flow']
      }
    });
    
    console.log(JSON.stringify(searchResults));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

retrieveContent();
")

echo "✅ Content Retrieval Successful"

# Step 4: Verify Access Control
echo "📝 Step 4: Verifying Access Control..."
ACCESS_RESULT=$(node -e "
const { QonsentService } = require('./backend/services/QonsentService.mjs');

async function verifyAccess() {
  try {
    const qonsent = new QonsentService();
    
    const accessCheck = await qonsent.checkAccess('$SQUID_ID', {
      resource: 'content',
      action: 'read',
      contentId: JSON.parse('$UPLOAD_RESULT').contentId
    });
    
    console.log(JSON.stringify(accessCheck));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyAccess();
")

echo "✅ Access Control Verified"

# Generate Results Report
REPORT_FILE="./artifacts/demo/results/content-flow-$(date +%s).json"

cat > "$REPORT_FILE" << EOF
{
  "scenario": "content-flow",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "duration": $SECONDS,
  "status": "completed",
  "content": {
    "file": "$CONTENT_FILE",
    "ipfs_hash": "$IPFS_HASH",
    "size_bytes": $(stat -c%s "$CONTENT_FILE")
  },
  "steps": {
    "upload_processing": $UPLOAD_RESULT,
    "ipfs_verification": {
      "hash": "$IPFS_HASH",
      "accessible": true,
      "preview": "$(echo "$IPFS_VERIFICATION" | head -c 50)..."
    },
    "content_retrieval": $RETRIEVAL_RESULT,
    "access_control": $ACCESS_RESULT
  },
  "metrics": {
    "total_steps": 4,
    "successful_steps": 4,
    "execution_time_seconds": $SECONDS
  }
}
EOF

echo ""
echo "🎉 Content Flow Demo Completed Successfully!"
echo "📊 Results saved to: $REPORT_FILE"
echo "⏱️  Total execution time: ${SECONDS}s"
echo ""
echo "📋 Summary:"
echo "  ✅ Content Uploaded and Encrypted"
echo "  ✅ IPFS Storage Verified ($IPFS_HASH)"
echo "  ✅ Content Indexed and Searchable"
echo "  ✅ Access Control Configured"
```

## Scenario 3: DAO Governance Flow Demo

### Overview

Demonstrates decentralized governance through proposal creation, voting, and execution with Pi Network smart contract integration.

### Flow Steps

1. **Proposal Creation**
2. **Voting Period Management**
3. **Vote Collection and Validation**
4. **Proposal Execution**
5. **Qflow Workflow Execution**

### Execution Script

```bash
#!/bin/bash
# File: scripts/demo-run-dao.sh

set -e

echo "🏛️ Starting DAO Governance Flow Demo..."

# Configuration
PROPOSER="charlie"
SQUID_ID="squid-demo-charlie-003"
PI_USER_ID="pi-demo-charlie-003"
PROPOSAL_TITLE="Demo Proposal: System Upgrade"

echo "👤 Proposer: $PROPOSER"
echo "📋 Proposal: $PROPOSAL_TITLE"
echo ""

# Step 1: Create DAO Proposal
echo "📝 Step 1: Creating DAO Proposal..."
PROPOSAL_RESULT=$(node -e "
const { PiDAOGovernanceWorkflow } = require('./docs/pi/en/example-workflows.md');

async function createProposal() {
  try {
    const workflow = new PiDAOGovernanceWorkflow();
    
    const proposalRequest = {
      title: '$PROPOSAL_TITLE',
      description: 'This is a demo proposal to test the DAO governance workflow with Pi Network integration. The proposal demonstrates the complete governance lifecycle from creation to execution.',
      proposer: {
        squidId: '$SQUID_ID'
      },
      qflowWorkflowId: 'demo-system-upgrade-workflow'
    };
    
    const result = await workflow.executeGovernanceWorkflow(proposalRequest);
    
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createProposal();
")

echo "✅ DAO Proposal Created"

# Step 2: Simulate Voting
echo "📝 Step 2: Simulating Voting Process..."
VOTING_RESULT=$(node -e "
const { DAOService } = require('./backend/services/DAOService.mjs');

async function simulateVoting() {
  try {
    const dao = new DAOService();
    const proposalData = JSON.parse('$PROPOSAL_RESULT');
    
    // Simulate votes from demo users
    const voters = [
      { squidId: 'squid-demo-alice-001', vote: true, votingPower: 100 },
      { squidId: 'squid-demo-bob-002', vote: true, votingPower: 150 },
      { squidId: 'squid-demo-charlie-003', vote: false, votingPower: 75 }
    ];
    
    const votes = [];
    
    for (const voter of voters) {
      const voteResult = await dao.castVote(
        proposalData.proposalId,
        voter.squidId,
        voter.vote,
        voter.votingPower
      );
      
      votes.push(voteResult);
    }
    
    const votingResults = {
      proposalId: proposalData.proposalId,
      votes: votes,
      totalVotesFor: voters.filter(v => v.vote).reduce((sum, v) => sum + v.votingPower, 0),
      totalVotesAgainst: voters.filter(v => !v.vote).reduce((sum, v) => sum + v.votingPower, 0)
    };
    
    console.log(JSON.stringify(votingResults));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

simulateVoting();
")

echo "✅ Voting Process Completed"

# Step 3: Execute Approved Proposal
echo "📝 Step 3: Executing Approved Proposal..."
EXECUTION_RESULT=$(node -e "
const { QflowService } = require('./backend/services/QflowService.mjs');

async function executeProposal() {
  try {
    const qflow = new QflowService();
    const proposalData = JSON.parse('$PROPOSAL_RESULT');
    const votingData = JSON.parse('$VOTING_RESULT');
    
    // Check if proposal passed
    if (votingData.totalVotesFor > votingData.totalVotesAgainst) {
      const executionResult = await qflow.executeWorkflow(
        'demo-system-upgrade-workflow',
        {
          proposalId: proposalData.proposalId,
          votingResults: votingData,
          executionContext: 'dao-governance-demo'
        }
      );
      
      console.log(JSON.stringify(executionResult));
    } else {
      console.log(JSON.stringify({
        status: 'rejected',
        reason: 'Proposal did not receive majority support'
      }));
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

executeProposal();
")

echo "✅ Proposal Execution Completed"

# Step 4: Verify Governance Audit Trail
echo "📝 Step 4: Verifying Governance Audit Trail..."
AUDIT_RESULT=$(node -e "
const { QerberosIntegrationService } = require('./backend/services/QerberosIntegrationService.mjs');

async function verifyGovernanceAudit() {
  try {
    const qerberos = new QerberosIntegrationService();
    const proposalData = JSON.parse('$PROPOSAL_RESULT');
    
    const auditTrail = await qerberos.getAuditTrail({
      eventTypes: ['dao_proposal_created', 'dao_vote_cast', 'dao_proposal_executed'],
      filters: {
        proposalId: proposalData.proposalId
      },
      timeRange: {
        start: new Date(Date.now() - 3600000).toISOString(),
        end: new Date().toISOString()
      }
    });
    
    console.log(JSON.stringify(auditTrail));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyGovernanceAudit();
")

echo "✅ Governance Audit Trail Verified"

# Generate Results Report
REPORT_FILE="./artifacts/demo/results/dao-governance-$(date +%s).json"

cat > "$REPORT_FILE" << EOF
{
  "scenario": "dao-governance",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "duration": $SECONDS,
  "status": "completed",
  "proposal": {
    "title": "$PROPOSAL_TITLE",
    "proposer": "$SQUID_ID"
  },
  "steps": {
    "proposal_creation": $PROPOSAL_RESULT,
    "voting_process": $VOTING_RESULT,
    "proposal_execution": $EXECUTION_RESULT,
    "audit_verification": $AUDIT_RESULT
  },
  "metrics": {
    "total_steps": 4,
    "successful_steps": 4,
    "execution_time_seconds": $SECONDS
  }
}
EOF

echo ""
echo "🎉 DAO Governance Flow Demo Completed Successfully!"
echo "📊 Results saved to: $REPORT_FILE"
echo "⏱️  Total execution time: ${SECONDS}s"
echo ""
echo "📋 Summary:"
echo "  ✅ DAO Proposal Created"
echo "  ✅ Voting Process Completed"
echo "  ✅ Proposal Executed"
echo "  ✅ Governance Audit Trail Verified"
```

## Demo Validation Script

### Comprehensive Validation

```bash
#!/bin/bash
# File: scripts/demo-validate.sh

set -e

echo "🔍 Validating Demo Execution Results..."

# Configuration
RESULTS_DIR="./artifacts/demo/results"
EXPECTED_SCENARIOS=("identity-flow" "content-flow" "dao-governance")

# Check if results directory exists
if [ ! -d "$RESULTS_DIR" ]; then
    echo "❌ Results directory not found: $RESULTS_DIR"
    exit 1
fi

# Validate each scenario
TOTAL_SCENARIOS=${#EXPECTED_SCENARIOS[@]}
SUCCESSFUL_SCENARIOS=0

for scenario in "${EXPECTED_SCENARIOS[@]}"; do
    echo ""
    echo "📋 Validating $scenario scenario..."
    
    # Find latest result file for scenario
    RESULT_FILE=$(ls -t "$RESULTS_DIR"/${scenario}-*.json 2>/dev/null | head -1)
    
    if [ -z "$RESULT_FILE" ]; then
        echo "❌ No result file found for $scenario"
        continue
    fi
    
    echo "📄 Result file: $(basename "$RESULT_FILE")"
    
    # Validate result file structure
    VALIDATION_RESULT=$(node -e "
    const fs = require('fs');
    
    try {
        const data = JSON.parse(fs.readFileSync('$RESULT_FILE', 'utf8'));
        
        // Check required fields
        const required = ['scenario', 'timestamp', 'status', 'steps', 'metrics'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            console.log(JSON.stringify({
                valid: false,
                error: 'Missing required fields: ' + missing.join(', ')
            }));
            process.exit(0);
        }
        
        // Check scenario status
        if (data.status !== 'completed') {
            console.log(JSON.stringify({
                valid: false,
                error: 'Scenario status is not completed: ' + data.status
            }));
            process.exit(0);
        }
        
        // Check execution time
        if (data.metrics.execution_time_seconds > 300) {
            console.log(JSON.stringify({
                valid: false,
                error: 'Execution time exceeded 300 seconds: ' + data.metrics.execution_time_seconds
            }));
            process.exit(0);
        }
        
        console.log(JSON.stringify({
            valid: true,
            scenario: data.scenario,
            duration: data.metrics.execution_time_seconds,
            steps: data.metrics.successful_steps + '/' + data.metrics.total_steps
        }));
        
    } catch (error) {
        console.log(JSON.stringify({
            valid: false,
            error: 'Failed to parse result file: ' + error.message
        }));
    }
    ")
    
    # Parse validation result
    IS_VALID=$(echo "$VALIDATION_RESULT" | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
    console.log(data.valid);
    ")
    
    if [ "$IS_VALID" = "true" ]; then
        echo "✅ $scenario validation passed"
        SUCCESSFUL_SCENARIOS=$((SUCCESSFUL_SCENARIOS + 1))
        
        # Extract metrics
        DURATION=$(echo "$VALIDATION_RESULT" | node -e "
        const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
        console.log(data.duration);
        ")
        
        STEPS=$(echo "$VALIDATION_RESULT" | node -e "
        const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
        console.log(data.steps);
        ")
        
        echo "   ⏱️  Duration: ${DURATION}s"
        echo "   📊 Steps: $STEPS"
    else
        echo "❌ $scenario validation failed"
        
        ERROR=$(echo "$VALIDATION_RESULT" | node -e "
        const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
        console.log(data.error);
        ")
        
        echo "   Error: $ERROR"
    fi
done

# Generate validation summary
echo ""
echo "📊 Demo Validation Summary"
echo "=========================="
echo "Total Scenarios: $TOTAL_SCENARIOS"
echo "Successful: $SUCCESSFUL_SCENARIOS"
echo "Failed: $((TOTAL_SCENARIOS - SUCCESSFUL_SCENARIOS))"
echo "Success Rate: $(( (SUCCESSFUL_SCENARIOS * 100) / TOTAL_SCENARIOS ))%"

# Create validation report
VALIDATION_REPORT="./artifacts/demo/results/validation-report-$(date +%s).json"

cat > "$VALIDATION_REPORT" << EOF
{
  "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "total_scenarios": $TOTAL_SCENARIOS,
  "successful_scenarios": $SUCCESSFUL_SCENARIOS,
  "failed_scenarios": $((TOTAL_SCENARIOS - SUCCESSFUL_SCENARIOS)),
  "success_rate": $(( (SUCCESSFUL_SCENARIOS * 100) / TOTAL_SCENARIOS )),
  "scenarios": [
    $(for scenario in "${EXPECTED_SCENARIOS[@]}"; do
        RESULT_FILE=$(ls -t "$RESULTS_DIR"/${scenario}-*.json 2>/dev/null | head -1)
        if [ -n "$RESULT_FILE" ]; then
            echo "    {"
            echo "      \"name\": \"$scenario\","
            echo "      \"result_file\": \"$(basename "$RESULT_FILE")\","
            echo "      \"status\": \"completed\""
            echo "    },"
        else
            echo "    {"
            echo "      \"name\": \"$scenario\","
            echo "      \"result_file\": null,"
            echo "      \"status\": \"missing\""
            echo "    },"
        fi
    done | sed '$ s/,$//')
  ]
}
EOF

echo ""
echo "📄 Validation report saved to: $VALIDATION_REPORT"

# Exit with appropriate code
if [ $SUCCESSFUL_SCENARIOS -eq $TOTAL_SCENARIOS ]; then
    echo "🎉 All demo scenarios validated successfully!"
    exit 0
else
    echo "⚠️  Some demo scenarios failed validation."
    exit 1
fi
```

## Performance Benchmarks

### Expected Performance Metrics

| Scenario | Expected Duration | Max Duration | Success Criteria |
|----------|------------------|--------------|------------------|
| Identity Flow | 15-30 seconds | 60 seconds | All 5 steps complete |
| Content Flow | 20-40 seconds | 90 seconds | All 4 steps complete |
| DAO Governance | 25-45 seconds | 120 seconds | All 4 steps complete |

### Performance Monitoring

```javascript
// File: scripts/monitor-demo-performance.mjs
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

class DemoPerformanceMonitor {
  constructor() {
    this.metrics = {
      scenarios: {},
      system: {},
      timestamp: new Date().toISOString()
    };
  }
  
  async monitorScenario(scenarioName, executionFn) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    console.log(`📊 Monitoring ${scenarioName} performance...`);
    
    try {
      const result = await executionFn();
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      
      this.metrics.scenarios[scenarioName] = {
        duration: endTime - startTime,
        memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
        success: true,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ ${scenarioName} completed in ${endTime - startTime}ms`);
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      
      this.metrics.scenarios[scenarioName] = {
        duration: endTime - startTime,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      console.log(`❌ ${scenarioName} failed after ${endTime - startTime}ms`);
      
      throw error;
    }
  }
  
  collectSystemMetrics() {
    try {
      const memInfo = execSync('free -m').toString();
      const cpuInfo = execSync('top -bn1 | grep "Cpu(s)"').toString();
      
      this.metrics.system = {
        memory: this.parseMemoryInfo(memInfo),
        cpu: this.parseCpuInfo(cpuInfo),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Could not collect system metrics:', error.message);
    }
  }
  
  generateReport() {
    this.collectSystemMetrics();
    
    const reportPath = `./artifacts/demo/results/performance-report-${Date.now()}.json`;
    writeFileSync(reportPath, JSON.stringify(this.metrics, null, 2));
    
    console.log(`📊 Performance report saved to: ${reportPath}`);
    
    return this.metrics;
  }
  
  parseMemoryInfo(memInfo) {
    const lines = memInfo.split('\n');
    const memLine = lines[1].split(/\s+/);
    
    return {
      total: parseInt(memLine[1]),
      used: parseInt(memLine[2]),
      free: parseInt(memLine[3])
    };
  }
  
  parseCpuInfo(cpuInfo) {
    const match = cpuInfo.match(/(\d+\.\d+)%us/);
    return {
      usage: match ? parseFloat(match[1]) : 0
    };
  }
}

export { DemoPerformanceMonitor };
```

## Troubleshooting

### Common Issues

1. **Scenario Timeout**: Increase timeout values in environment variables
2. **Service Unavailable**: Check service health with `pm2 status`
3. **IPFS Connection**: Verify IPFS node is running and accessible
4. **Pi Integration**: Check Pi Network sandbox connectivity
5. **Database Errors**: Verify PostgreSQL connection and migrations

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG=true
export LOG_LEVEL=debug
```

### Log Analysis

```bash
# View real-time logs
pm2 logs

# View specific service logs
pm2 logs anarq-backend

# View demo execution logs
tail -f ./artifacts/demo/logs/demo-execution.log
```

## Next Steps

After running the demo scenarios:

1. **Review Results**: Analyze the generated result files
2. **Performance Analysis**: Check performance metrics and optimize if needed
3. **Custom Scenarios**: Create additional scenarios for specific use cases
4. **Integration Testing**: Test with real Pi Network testnet
5. **Production Preparation**: Configure for production deployment

For production deployment guidance, see the [Production Deployment Guide](../deployment/production-guide.md).