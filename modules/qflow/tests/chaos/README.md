# Qflow Chaos Engineering and Failure Testing Suite

This directory contains comprehensive chaos engineering and failure testing for the Qflow serverless automation engine.

## Overview

Chaos engineering is the discipline of experimenting on a system to build confidence in the system's capability to withstand turbulent conditions in production. This test suite validates Qflow's resilience through controlled failure injection and recovery testing.

## Test Categories

### 1. Random Node Failure Testing
- Simulates unexpected node failures during execution
- Tests automatic failover and recovery mechanisms
- Validates execution continuity across node failures
- Measures recovery time and data consistency

### 2. Network Partition and Byzantine Failure Testing
- Simulates network partitions and split-brain scenarios
- Tests Byzantine fault tolerance mechanisms
- Validates consensus under network failures
- Tests recovery from network healing

### 3. Resource Exhaustion and Recovery Testing
- Simulates memory, CPU, and storage exhaustion
- Tests graceful degradation under resource pressure
- Validates resource cleanup and recovery
- Tests system behavior at resource limits

### 4. Distributed System Chaos Testing
- Tests distributed state consistency under failures
- Validates CRDT conflict resolution
- Tests libp2p network resilience
- Validates IPFS storage reliability

### 5. Byzantine and Malicious Node Chaos Testing
- Tests forged message injection and detection
- Validates incorrect results propagation handling
- Tests stalling behavior detection and mitigation
- Validates threshold signature validation under Byzantine conditions
- Tests malicious node containment and isolation

## Running Chaos Tests

```bash
# Run all chaos tests
npm run test:chaos

# Run specific chaos test categories
npm run test:chaos:nodes
npm run test:chaos:network
npm run test:chaos:resources
npm run test:chaos:distributed
npm run test:chaos:byzantine

# Run chaos tests with specific failure rates
npm run test:chaos -- --failure-rate=0.1
npm run test:chaos -- --duration=300
```

## Test Environment Requirements

- Multiple QNET node simulation
- Network simulation capabilities
- Resource monitoring and control
- Distributed system coordination
- Failure injection mechanisms

## Chaos Engineering Principles

1. **Build a Hypothesis**: Define expected system behavior under failure
2. **Vary Real-world Events**: Simulate realistic failure scenarios
3. **Run Experiments in Production**: Test in production-like environments
4. **Automate Experiments**: Continuous chaos testing
5. **Minimize Blast Radius**: Controlled failure injection

## Metrics and Observability

- **Mean Time to Recovery (MTTR)**: Time to recover from failures
- **Mean Time Between Failures (MTBF)**: System reliability metrics
- **Availability**: System uptime under chaos conditions
- **Data Consistency**: State consistency across failures
- **Performance Impact**: Performance degradation during failures

## Safety Measures

- **Circuit Breakers**: Automatic failure containment
- **Rollback Mechanisms**: Quick recovery from experiments
- **Monitoring**: Real-time system health monitoring
- **Alerting**: Immediate notification of critical failures
- **Blast Radius Control**: Limited scope of failure injection