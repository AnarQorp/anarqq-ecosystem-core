# Qflow Serverless Automation Engine - Implementation Plan

## Phase 1: Core Local Execution Foundation

### 0. Event Catalog and Schema Registry (Immediate Priority)

- [x] 0.1 Define and publish Qflow event schemas

  - Create versioned event schemas for all Qflow operations
  - Register schemas: q.qflow.flow.created.v1, q.qflow.exec.started.v1, q.qflow.exec.step.dispatched.v1, etc.
  - Implement schema validation and backward compatibility
  - _Requirements: Event-driven architecture, ecosystem integration_

- [x] 0.2 Implement MCP Tool Discovery Integration

  - Auto-register Qflow MCP tools with MCPToolDiscoveryService
  - Create tools: qflow.evaluate, qflow.flow.create/get/update/list, qflow.exec.start/pause/resume/abort
  - Emit q.tools.registry.updated.v1 events on tool registration
  - _Requirements: 14.1, 14.2_

- [x] 0.3 Add Deprecation Management Integration
  - Wire DeprecationManagementService to flows and templates
  - Implement sunset paths and telemetry for deprecated features
  - Create migration notifications and compatibility warnings
  - _Requirements: Ecosystem integration, backward compatibility_

### 1. Project Structure and Core Infrastructure

- [x] 1.1 Create Qflow module directory structure and package configuration

  - Set up TypeScript project with proper module structure
  - Configure build tools, linting, and testing frameworks
  - Create package.json with ecosystem dependencies
  - _Requirements: 1.1, 1.3, 13.1_

- [x] 1.2 Implement basic Flow Definition models and validation

  - Create TypeScript interfaces for FlowDefinition, FlowStep, and FlowMetadata
  - Implement JSON/YAML parser for flow definitions
  - Add flow structure validation with comprehensive error reporting
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 1.3 Create core Execution Engine with sequential step processing

  - Implement ExecutionEngine class with start, pause, resume, abort methods
  - Add basic step execution logic for sequential flows
  - Create ExecutionState management with in-memory storage
  - _Requirements: 3.4, 11.1, 11.3_

- [x] 1.4 Implement Centralization Sentinel (CI + runtime enforcement)

  - Create CI rule to detect and fail on central dependencies (RDBMS, Kafka, Redis as broker)
  - Add runtime boot check requiring IPFS + libp2p presence, exit otherwise
  - Implement chaos test to kill "first launcher" node and prove execution continues elsewhere
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.5 Create Deterministic Execution Ledger (local prototype)
  - Implement append-only log format with signed entries and vector clocks
  - Add deterministic replay harness for sequential flows
  - Create record format: {execId, stepId, prevHash, payloadCID, actor, nodeId, ts, vectorClock, signature}
  - _Requirements: 11.2, 11.3, 11.4_

### 2. Universal Validation Pipeline Implementation

- [x] 2.1 Design and implement Universal Validation Pipeline as decoupled component

  - Create ValidationPipeline interface and base implementation
  - Design pipeline as reusable component for ecosystem-wide use
  - Implement validation coordinator with layer orchestration
  - _Requirements: 2.1, 2.3, 2.5_

- [x] 2.2 Implement Qlock integration for encryption validation

  - Integrate with existing QlockService for encryption/decryption
  - Add validation for encrypted flow data and step payloads
  - Implement key management integration for flow security
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2.3 Implement Qonsent integration for permission validation

  - Integrate with existing QonsentService for dynamic permissions
  - Add real-time permission checking before step execution
  - Implement consent expiration handling and renewal
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2.4 Implement Qindex integration for metadata validation

  - Integrate with existing QindexService for flow indexing
  - Add flow metadata registration and searchability
  - Implement flow discovery and categorization
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2.5 Implement Qerberos integration for security validation

  - Integrate with existing QerberosService for integrity checks
  - Add anomaly detection for flow execution patterns
  - Implement security violation detection and containment
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 2.6 Create Signed Validation Cache for performance optimization
  - Implement signed+TTL'd cache keyed by (layer, inputHash, policyVersion)
  - Add cache eviction policies and integrity verification
  - Create streaming validation pipeline with short-circuit on failure
  - _Requirements: Performance optimization, 2.1, 2.3_

### 3. Basic API and CLI Implementation

- [x] 3.1 Create REST API server with core flow management endpoints

  - Implement Express.js server with TypeScript
  - Add endpoints for flow CRUD operations (POST /flows, GET /flows/:id, etc.)
  - Implement request validation and error handling middleware
  - _Requirements: 13.1, 13.4_

- [x] 3.2 Implement execution management API endpoints

  - Add endpoints for execution control (start, pause, resume, abort)
  - Implement execution status and monitoring endpoints
  - Add real-time execution updates via WebSocket
  - _Requirements: 13.1, 13.4_

- [x] 3.3 Create basic CLI tool for flow management

  - Implement CLI using Commander.js with TypeScript
  - Add commands for flow creation, listing, and execution
  - Implement status monitoring and log viewing commands
  - _Requirements: 13.2, 13.3_

- [x] 3.4 Add comprehensive unit tests for core components
  - Write unit tests for Flow Parser, Execution Engine, and Validation Pipeline
  - Add tests for API endpoints and CLI commands
  - Implement test coverage reporting and CI integration
  - _Requirements: All Phase 1 requirements_

## Phase 2: Ecosystem Integration and Multi-Tenant Support

### 4. sQuid Identity Integration

- [x] 4.1 Implement sQuid identity authentication for all operations

  - Integrate with existing sQuid service for identity verification
  - Add identity-based access control for flow operations
  - Implement sub-identity signature validation for step execution
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.2 Add identity-based flow ownership and permissions
  - Implement flow ownership validation and transfer
  - Add identity-based access controls for flow sharing
  - Create audit trails for all identity-based operations
  - _Requirements: 4.4, 4.5_

### 5. DAO Governance and Multi-Tenant Architecture

- [x] 5.1 Implement DAO subnet isolation and governance

  - Create DAO subnet management with complete isolation
  - Implement DAO-specific execution policies and validation
  - Add DAO governance integration for policy enforcement
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 5.2 Add multi-tenant resource management and billing boundaries

  - Implement per-tenant resource limits and monitoring
  - Add tenant isolation for data and execution contexts
  - Create billing and usage tracking per DAO subnet
  - _Requirements: 16.1, 16.3, 16.4_

- [x] 5.3 Implement DAO-based code template whitelisting

  - Add DAO approval system for executable code templates
  - Implement code template validation and security scanning
  - Create DAO governance workflow for template approval
  - _Requirements: 9.3, 10.2, 10.3_

- [x] 5.4 Create DAO Validator Sets and Threshold Signatures
  - Manage DAO-approved validator keys using Qlock BLS/Dilithium
  - Implement threshold signing for critical step commits
  - Add Byzantine-aware commit for steps that mutate scarce state (payments, governance)
  - _Requirements: 9.1, 9.2, 8.3_

### 6. External Event Processing and Integration

- [x] 6.1 Implement webhook endpoints for external event processing

  - Create secure webhook endpoints with authentication
  - Add external event validation through universal pipeline
  - Implement event schema validation and transformation
  - _Requirements: 15.1, 15.2, 15.3_

- [x] 6.2 Add external system integration capabilities

  - Implement standard webhook format support
  - Add custom event schema processing
  - Create external API integration templates
  - _Requirements: 15.4, 15.5_

- [x] 6.3 Implement multi-module ecosystem integration

  - Add integration with Qmail, QpiC, and other ecosystem modules
  - Implement cross-module event handling and coordination
  - Create module discovery and capability negotiation
  - _Requirements: 14.1, 14.2, 14.5_

- [x] 6.4 Add External Ingress Hardening and Security
  - Implement Qlock-verified webhook signatures for external events
  - Add Qonsent scopes for external principals and rate limiting
  - Integrate Qerberos risk scoring before admitting external events
  - _Requirements: 15.1, 15.2, 8.1_

### 7. Enhanced State Management and Persistence

- [x] 7.1 Implement IPFS integration for distributed state storage

  - Integrate with IPFS for persistent state storage
  - Add cryptographic signing for all state records
  - Implement state encryption using Qlock integration
  - _Requirements: 11.1, 11.2, 11.4_

- [x] 7.2 Create auditable historical persistence system

  - Implement immutable execution history with signatures
  - Add comprehensive audit trail generation
  - Create searchable historical data through Qindex
  - _Requirements: 11.2, 11.4, 11.5_

- [x] 7.3 Add checkpoint and recovery mechanisms

  - Implement execution checkpointing at configurable intervals
  - Add automatic recovery from interruptions with state verification
  - Create manual checkpoint creation and restoration
  - _Requirements: 11.3, 11.5_

- [x] 7.4 Implement CRDT State Management with IPFS Blocks
  - Add CRDT (Automerge/Yjs) support for concurrent state operations
  - Implement state deltas as CRDT ops with background compaction
  - Create conflict resolution telemetry and causal ordering via vector clocks
  - _Requirements: 11.4, 1.5_

## Phase 3: Distributed Serverless Execution

### 8. QNET Integration and Node Management

- [x] 8.1 Implement QNET node discovery and management

  - Integrate with QNET for node discovery and registration
  - Add node capability assessment and performance monitoring
  - Implement node health checking and availability tracking
  - _Requirements: 1.2, 17.1, 17.2_

- [x] 8.2 Create intelligent node selection algorithm

  - Implement multi-criteria node selection (latency, load, reputation, performance)
  - Add DAO subnet-aware node filtering
  - Create predictive node selection based on historical performance
  - _Requirements: 17.1, 17.3, 17.5_

- [x] 8.3 Add node failure detection and automatic failover

  - Implement node health monitoring and failure detection
  - Add automatic execution migration to alternative nodes
  - Create graceful degradation strategies for node failures
  - _Requirements: 1.2, 11.3, 17.4_

- [x] 8.4 Implement Node Capability Provenance and Verification
  - Create nodes publishing signed capability manifests (WASM, memory, network sandbox)
  - Add Qerberos verification of anomalies vs declared capabilities
  - Implement capability-based node selection and validation
  - _Requirements: 8.2, 8.3, 17.1_

### 9. Libp2p Pubsub Coordination

- [x] 9.1 Implement Libp2p Pubsub for peer-to-peer coordination

  - Set up Libp2p node with Pubsub capabilities
  - Implement message routing and delivery confirmation
  - Add encryption for all peer-to-peer communications
  - _Requirements: 1.4, 1.5_

- [x] 9.2 Create distributed execution coordination protocol

  - Implement execution step dispatch via Pubsub
  - Add result collection and aggregation mechanisms
  - Create consensus protocols for critical operations
  - _Requirements: 1.4, 17.2_

- [x] 9.3 Add network partition handling and recovery

  - Implement partition detection and isolation handling
  - Add automatic reconnection and state synchronization
  - Create conflict resolution for concurrent operations
  - _Requirements: 11.4, 1.5_

- [x] 9.4 Create Gossipsub Backpressure and Fair Work Distribution

  - Implement token-bucket per node with fair scheduling and priority lanes
  - Add reannounce policy for unclaimed jobs with exponential backoff and jitter
  - Replace central queues with gossipsub topics + IPFS job manifests
  - _Requirements: 1.4, 17.2_

- [x] 9.5 Implement Consensus for Critical Operations
  - Add 2-phase commit over libp2p with timeouts for critical steps
  - Implement fallback to quadratic voting among validator set if tie
  - Create Byzantine-fault-tolerant consensus for scarce resource mutations
  - _Requirements: 8.3, 9.2_

### 10. WebAssembly Sandbox Implementation

- [x] 10.1 Implement WASM runtime for secure code execution

  - Set up WebAssembly runtime with security isolation
  - Add support for multiple WASM module formats
  - Implement module loading and validation
  - _Requirements: 10.1, 10.4_

- [x] 10.2 Create resource limiting and monitoring system

  - Implement CPU, memory, and execution time limits
  - Add real-time resource usage monitoring
  - Create automatic termination for resource violations
  - _Requirements: 10.2, 10.4_

- [x] 10.3 Add DAO-approved code template system

  - Implement code template validation and whitelisting
  - Add DAO governance integration for template approval
  - Create template versioning and update mechanisms
  - _Requirements: 10.2, 10.3_

- [x] 10.4 Implement sandbox security and isolation

  - Add network access restrictions for sandboxes
  - Implement file system isolation and access controls
  - Create sandbox escape detection and prevention
  - _Requirements: 10.4, 10.5_

- [x] 10.5 Create WASM Egress Controls and Capability Tokens
  - Implement host shims for Q-module calls with deny-by-default raw sockets/filesystem
  - Add per-step capability tokens (expiring, DAO-approved) for external access
  - Create argument-bounded capability tokens signed by DAO policy
  - _Requirements: 10.2, 10.3, 9.3_

### 11. Distributed Load Balancing and Scaling

- [x] 11.1 Implement intelligent load distribution across nodes

  - Create load balancing algorithms for execution distribution
  - Add real-time load monitoring and adjustment
  - Implement predictive scaling based on demand patterns
  - _Requirements: 17.2, 17.4, 17.5_

- [x] 11.2 Add automatic scaling and resource optimization

  - Implement horizontal scaling with new node integration
  - Add vertical scaling optimization per node
  - Create capacity planning and resource forecasting
  - _Requirements: 17.3, 17.4_

- [x] 11.3 Create performance-based node selection optimization
  - Implement machine learning for node selection optimization
  - Add historical performance analysis and prediction
  - Create adaptive algorithms based on execution patterns
  - _Requirements: 17.5_

## Phase 4: Observability and Performance Integration

### 12. Task 36 Metrics Integration

- [x] 12.1 Integrate with Task 36 performance monitoring system

  - Connect to existing performance metrics infrastructure
  - Add Qflow-specific metrics to ecosystem monitoring
  - Implement performance gate integration for execution control
  - _Requirements: 12.1, 12.5_

- [x] 12.2 Implement adaptive performance response system

  - Create automatic scaling triggers based on performance metrics
  - Add load redirection and flow pausing capabilities
  - Implement proactive performance optimization
  - _Requirements: 12.2, 12.4_

- [x] 12.3 Add ecosystem-wide performance correlation

  - Implement cross-module performance impact analysis
  - Add ecosystem health correlation with Qflow performance
  - Create predictive performance modeling
  - _Requirements: 12.3, 12.5_

- [x] 12.4 Implement Flow-level Burn-rate Actions and Cost Control
  - Add auto-pause for low-priority flows under performance burn
  - Implement deferral of heavy steps and rerouting to cold nodes
  - Create integration with Task 34 Graceful Degradation ladder
  - _Requirements: 12.2, 12.4_

### 13. Real-time Monitoring and Alerting

- [x] 13.1 Create comprehensive metrics collection system

  - Implement p99 latency, error budget burn, cache hit ratio, and RPS tracking
  - Add custom metrics for flow execution and validation pipeline
  - Create metrics aggregation and historical storage
  - _Requirements: 12.1, 12.3_

- [x] 13.2 Implement real-time WebSocket dashboard

  - Create WebSocket-based real-time metrics streaming
  - Add interactive dashboard for system monitoring
  - Implement customizable alerting and notification system
  - _Requirements: 12.3, 12.4_

- [x] 13.3 Add comprehensive alerting system

  - Implement alerts for execution failures and coherence validation errors
  - Add DAO policy violation detection and alerting
  - Create escalation procedures for critical issues
  - _Requirements: 12.4, 12.5_

- [x] 13.4 Create DAO-aware Alerting and RBAC
  - Route alerts to DAO-specific channels and communication systems
  - Implement RBAC on who can resume/abort flows per DAO subnet
  - Add DAO governance integration for alert escalation procedures
  - _Requirements: 9.1, 9.2, 12.4_

### 14. Performance Optimization and Caching

- [x] 14.1 Implement intelligent caching system

  - Add flow definition caching with invalidation strategies
  - Implement validation result caching for performance
  - Create predictive caching based on usage patterns
  - _Requirements: Performance optimization requirements_

- [x] 14.2 Add execution optimization features

  - Implement parallel execution for independent steps
  - Add lazy loading for flow components
  - Create resource pooling for WASM runtimes and connections
  - _Requirements: Performance optimization requirements_

- [x] 14.3 Create performance profiling and optimization tools

  - Implement execution profiling and bottleneck identification
  - Add performance regression detection
  - Create automated optimization recommendations
  - _Requirements: Performance optimization requirements_

- [x] 14.4 Implement Validation Heatmap and Pre-warming
  - Track hot validation pipeline combinations and usage patterns
  - Add pre-warming for validation caches and WASM runtime pools
  - Create predictive optimization based on flow execution patterns
  - _Requirements: Performance optimization, 2.6_

## Phase 5: Production Readiness and Advanced Features

### 15. Comprehensive Testing and Quality Assurance

- [x] 15.1 Implement comprehensive integration test suite

  - Create end-to-end flow execution tests across multiple nodes
  - Add ecosystem integration tests with all services
  - Implement multi-tenant isolation validation tests
  - _Requirements: All integration requirements_

- [x] 15.2 Add performance and load testing

  - Implement load testing for high-volume flow execution
  - Add stress testing for resource limit validation
  - Create scalability testing with dynamic node addition
  - _Requirements: Performance and scalability requirements_

- [x] 15.3 Create security and penetration testing

  - Implement sandbox escape testing and validation
  - Add permission bypass and access control testing
  - Create data leakage and isolation testing
  - _Requirements: Security requirements_

- [x] 15.4 Add chaos engineering and failure testing

  - Implement random node failure testing
  - Add network partition and Byzantine failure testing
  - Create resource exhaustion and recovery testing
  - _Requirements: Reliability and recovery requirements_

- [x] 15.5 Create Byzantine and Malicious Node Chaos Testing
  - Inject forged messages, incorrect results, and stalling behavior
  - Assert proper containment and isolation of malicious nodes
  - Test threshold signature validation under Byzantine conditions
  - _Requirements: 8.3, 9.5, 5.4_

### 16. Documentation and Migration Tools

- [x] 16.1 Create comprehensive API documentation

  - Generate OpenAPI specifications for all endpoints
  - Add interactive API documentation and examples
  - Create SDK documentation for ecosystem integration
  - _Requirements: Documentation requirements_

- [x] 16.2 Implement migration tools for n8n replacement

  - Create n8n workflow import and conversion tools
  - Add compatibility layer for existing automation workflows
  - Implement migration validation and testing tools
  - _Requirements: 16.5_

- [x] 16.3 Add operational runbooks and troubleshooting guides

  - Create deployment and configuration guides
  - Add troubleshooting procedures for common issues
  - Implement monitoring and alerting setup guides
  - _Requirements: Operational requirements_

- [x] 16.4 Create n8n Converter and Visual Designer MVP
  - Implement CLI to import n8n JSON workflows → Qflow specifications
  - Add minimal web designer (client-only) to author flows and save to IPFS
  - Create compatibility templates and migration validation tools
  - _Requirements: 16.5_

### 17. Final Integration and Deployment

- [x] 17.1 Complete ecosystem integration validation

  - Validate integration with all AnarQ & Q modules
  - Test cross-module event handling and coordination
  - Verify universal validation pipeline compatibility
  - _Requirements: All ecosystem integration requirements_

- [x] 17.2 Implement production deployment configuration

  - Create Docker containers and Kubernetes manifests
  - Add production configuration management
  - Implement health checks and monitoring integration
  - _Requirements: Deployment requirements_

- [x] 17.3 Create final performance validation and optimization

  - Conduct final performance testing and optimization
  - Validate SLA compliance and performance targets
  - Implement final security hardening and validation
  - _Requirements: All performance and security requirements_

- [x] 17.4 Complete documentation and training materials

  - Finalize all technical documentation
  - Create user guides and training materials
  - Add video tutorials and example workflows
  - _Requirements: Documentation and training requirements_

- [x] 17.5 Create "No Central Server" Certification and Attestation
  - Run scripted checks for code, runtime, and traffic patterns
  - Verify no central DB/queue/broker dependencies exist
  - Publish signed attestation artifact (CID) proving decentralized operation
  - _Requirements: 1.1, 1.2, 1.4_

## Success Criteria and Quality Gates

Each task must meet the following criteria before being marked complete:

### Functional Requirements

1. **Functionality**: All specified functionality implemented and working correctly
2. **Testing**: Comprehensive unit and integration tests with >90% coverage on business logic
3. **Documentation**: Complete technical documentation, code comments, README, runbook snippets, and troubleshooting guides
4. **Integration**: Successfully integrates with all required ecosystem components

### Performance Gates (Tasks 35/36 Integration)

5. **Performance**: Meets or exceeds specified performance targets
   - p95 latency regression < 10%, p99 regression < 15%
   - SLO compliance for execution latency and throughput
   - Performance gate validation before deployment

### Security Gates (Task 29 Integration)

6. **Security**: Passes comprehensive security validation
   - SAST/DAST critical vulnerabilities = 0
   - Sandbox escape testing passed
   - Permission bypass testing passed
   - Cryptographic validation integrity verified

### Compliance Gates (Task 30 Integration)

7. **Compliance**: GDPR/SOC2 evidence present for audit trails
   - Audit CIDs generated and verifiable
   - Data protection compliance validated
   - Privacy controls operational

### Operational Gates

8. **Centralization Sentinel**: No central dependencies detected

   - CI rule passes (no RDBMS, Kafka, Redis as broker)
   - Runtime boot check requires IPFS + libp2p
   - Chaos test passes (launcher node kill, execution continues)

9. **Cost Control**: Task 34 Graceful Degradation integration

   - Cost ceiling enforcement operational
   - Graceful degradation ladder functional
   - Resource limit compliance verified

10. **Code Quality**: Passes all linting, type checking, and code review requirements

### Deliverables Per Task

Every task must ship:

- **Code**: Implementation with unit/integration tests (≥90% on business logic)
- **API Updates**: OpenAPI/MCP updates + JSON Schemas registered in Schema Registry
- **Documentation**: README, runbook snippet, troubleshooting guide
- **Observability**: Metrics/events/alerts added and functional
- **Gate Validation**: All quality gates pass before task completion

## Dependencies and Prerequisites

- **Ecosystem Services**: All referenced ecosystem services (sQuid, Qlock, Qonsent, Qindex, Qerberos, QNET) must be available and functional
- **Infrastructure**: IPFS nodes and Libp2p infrastructure must be operational
- **Development Environment**: TypeScript, Node.js, and all development tools properly configured
- **Testing Infrastructure**: Test environments with mock ecosystem services available

## Execution Ledger Specification (Phase 1.5)

### Record Format

```typescript
interface ExecutionRecord {
  execId: string;
  stepId: string;
  prevHash: string;
  payloadCID: string;
  actor: string; // sQuid identity
  nodeId: string;
  timestamp: string;
  vectorClock: VectorClock;
  signature: string;
}
```

### Hash Chain

- `recordHash = H(prevHash || payloadCID || meta)`
- Chain integrity verified on resume
- Qerberos stamps outcome via `q.qflow.exec.step.completed.v1`

### CRDT Support

- Operations appended with causal order via vectorClock
- Conflict resolution policy: highest validator quorum wins, else retry
- Background compaction with conflict telemetry

## MCP Tools Registration (Task 32 Integration)

### Qflow MCP Tools

- `qflow.evaluate` - Universal coherence pipeline validation only
- `qflow.flow.create/get/update/list/version.publish` - Flow management
- `qflow.exec.start/pause/resume/abort/status` - Execution control
- `qflow.exec.logs/metrics` - Monitoring and observability
- `qflow.webhook.verify` - External event validation (Qlock + Qonsent)
- `qflow.policy.update` - DAO-signed policy management

## Risk Mitigation Strategies

### Top 6 Risks and Mitigations

1. **Hidden Centralization**: Centralization Sentinel, runtime guard, chaos "launcher kill" test
2. **State Divergence**: CRDT log + validator quorum for critical commits
3. **Sandbox Escape**: No-egress default, host-shim allowlist, fuzz/escape tests
4. **Performance Regressions**: Pipeline caching + pre-warming, perf gates, burn-rate automation
5. **Cost Blow-ups**: Task 34 degradation ladder + batch/deferral for heavy steps
6. **DAO Policy Drift**: Signed policy versions in records, enforce on replay, emit policy update events

## Immediate Next Steps (Priority Order)

1. **Scaffold Repository** (Tasks 0.1, 1.1, 1.4)

   - Set up project structure with Centralization Sentinel
   - Define and register event schemas
   - Implement MCP tool discovery integration

2. **Core Engine** (Tasks 1.5, 1.3)

   - Implement Execution Ledger with deterministic replay
   - Create sequential execution engine with state management

3. **Validation Pipeline** (Tasks 2.1, 2.6)

   - Build decoupled Universal Validation Pipeline
   - Add signed validation cache for performance

4. **API Foundation** (Task 3.x)

   - Create basic REST/WebSocket APIs and CLI
   - Implement comprehensive unit tests

5. **Distributed State** (Tasks 7.1, 7.4)

   - Add IPFS state persistence
   - Implement CRDT deltas for concurrent operations

6. **P2P Coordination** (Tasks 9.1, 9.4)
   - Set up libp2p gossipsub orchestration
   - Add backpressure and fair work distribution

This implementation plan provides a systematic approach to building Qflow as the universal automation engine for the AnarQ & Q ecosystem, ensuring true serverless operation, Byzantine fault tolerance, and production-grade quality throughout the development process.
