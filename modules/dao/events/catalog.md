# DAO Events Catalog

This document describes all events published by the DAO/Communities governance module.

## Event Naming Convention

All events follow the pattern: `q.dao.<action>.<version>`

## Event Categories

### DAO Lifecycle Events
- `q.dao.created.v1` - DAO created
- `q.dao.updated.v1` - DAO configuration updated

### Membership Events
- `q.dao.member.joined.v1` - Member joined DAO
- `q.dao.member.left.v1` - Member left DAO

### Proposal Events
- `q.dao.proposal.created.v1` - Proposal created
- `q.dao.proposal.closed.v1` - Proposal voting ended
- `q.dao.proposal.executed.v1` - Proposal executed

### Voting Events
- `q.dao.vote.cast.v1` - Vote cast on proposal

### Governance Events
- `q.dao.rule.changed.v1` - Governance rules changed
- `q.dao.reputation.updated.v1` - Member reputation updated

## Event Processing

All events are published to the Q ecosystem event bus for real-time notifications and integration with other services.