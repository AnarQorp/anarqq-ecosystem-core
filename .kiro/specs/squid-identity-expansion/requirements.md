# Requirements Document

## Introduction

This specification extends sQuid to support comprehensive identity management within the ecosystem. The feature enables users to manage multiple identity types (root identity, subidentities for DAO, Enterprise, Consentida, AID) with seamless switching, dynamic Qonsent policies, secure audit logging through Qerberos, and persistent encryption via Qlock. This creates a unified identity framework that allows users to operate in different contexts while maintaining security and privacy controls.

## Requirements

### Requirement 1: Subidentity Visualization & Switching

**User Story:** As a user, I want to view and switch between my subidentities without logging out, so I can operate in different contexts within the ecosystem.

#### Acceptance Criteria

1. WHEN a user accesses the identity dashboard THEN the system SHALL display a list/grid of all subidentities associated with the root identity
2. WHEN displaying subidentities THEN the system SHALL show identity type (DAO, Enterprise, Consentida, AID), icon, and status for each
3. WHEN a user selects a different identity THEN the system SHALL allow dynamic switching via setActiveIdentity() function
4. WHEN an identity switch occurs THEN the system SHALL persist the active identity locally using sessionStorage or IndexedDB
5. WHEN displaying the identity list THEN the system SHALL highlight the currently active identity in the UI
6. WHEN an identity change occurs THEN the system SHALL trigger identity change events for other modules (Qonsent, Qwallet, etc.)

### Requirement 2: Subidentity Creation Flow

**User Story:** As a verified root identity, I want to create subidentities of different types (Consentida, Enterprise, DAO, AID), so I can segment roles and control access within the ecosystem.

#### Acceptance Criteria

1. WHEN a user initiates subidentity creation THEN the system SHALL provide a step-by-step creation wizard
2. WHEN in the creation wizard THEN the system SHALL include an identity type selector with options for Consentida, Enterprise, DAO, and AID
3. WHEN selecting identity details THEN the system SHALL require name, description, and tags input
4. WHEN creating certain identity types THEN the system SHALL allow file upload for avatar/ID proof if required
5. WHEN KYC is required for the identity type THEN the system SHALL provide optional KYC validation (mocked for development)
6. WHEN creating governed identities THEN the system SHALL require linked DAO or parental signature if applicable
7. WHEN profile data is entered THEN the system SHALL store encrypted profile using Qlock
8. WHEN identity is created THEN the system SHALL upload metadata to IPFS
9. WHEN identity is finalized THEN the system SHALL register identity in Qindex with proper classification
10. WHEN creation is complete THEN the system SHALL update the identity tree under the root identity
11. IF identity type is Consentida THEN the system SHALL NOT require KYC and SHALL NOT allow creation of sub-identities
12. IF identity type is Enterprise THEN the system SHALL require DAO governance and SHALL be publicly visible
13. IF identity type is DAO THEN the system SHALL require KYC and SHALL optionally allow sub-identity creation
14. IF identity type is AID THEN the system SHALL require root KYC and SHALL be completely private

### Requirement 3: Dynamic Qonsent Profile per Identity

**User Story:** As a user, I want each identity to apply its own Qonsent configuration, so I can control privacy and permissions independently.

#### Acceptance Criteria

1. WHEN an identity is created THEN the system SHALL store its own unique Qonsent hash
2. WHEN a user switches identities THEN the system SHALL update Qonsent policies in real-time
3. WHEN displaying identity information THEN the system SHALL provide visual feedback on current privacy profile (public/DAO/private)
4. WHEN a user wants to modify privacy settings THEN the system SHALL allow updating Qonsent profile via QonsentEditor component
5. WHEN Qonsent profile is updated THEN the system SHALL sync changes with Qindex and Qerberos

### Requirement 4: Identity Switching System

**User Story:** As a user, I want to switch between my identities easily, so I can act with the right permissions and context.

#### Acceptance Criteria

1. WHEN using the identity system THEN the useIdentity() hook SHALL return current identity and list of available identities
2. WHEN switching identities THEN the setActiveIdentity(id: string) hook SHALL update all subscribed modules
3. WHEN an identity switch occurs THEN the system SHALL automatically update Qonsent context
4. WHEN an identity switch occurs THEN the system SHALL automatically update Qwallet context
5. WHEN an identity switch occurs THEN the system SHALL automatically update user signature in Qlock
6. WHEN an identity switch occurs THEN the system SHALL automatically update DAO membership display
7. WHEN identity switching is complete THEN the system SHALL provide visual confirmation with toast notification and updated UI

### Requirement 5: Qerberos Identity Audit & Security

**User Story:** As a system administrator, I want all identity-related actions logged securely, so I can ensure traceability and prevent misuse.

#### Acceptance Criteria

1. WHEN any identity creation, switch, or deletion occurs THEN the system SHALL log the action through Qerberos
2. WHEN logging identity actions THEN the system SHALL include metadata: user DID, timestamp, device fingerprint, and IP (if privacy settings allow)
3. WHEN audit logs are created THEN the system SHALL store them encrypted with Qlock and route through Qindex
4. WHEN DAO moderators request access THEN the system SHALL allow viewing logs of identities under their governance
5. WHEN suspicious patterns are detected THEN the system SHALL raise alerts for repeated switching, excessive AID creation, or other anomalous behavior

🧩 Recomendaciones menores de mejora (opcional):
Requirement 2 – punto 6 (DAO o firma parental):

Podrías añadir que si es tipo "Enterprise", el sistema validará automáticamente si la DAO empresarial tiene habilitada la creación de subIDs, como parte del Qonsent_out.

Requirement 5 – punto 5 (detección de anomalías):

Quizá podríamos detallar un poco más el tipo de alertas generadas por Qerberos:

ALERT_TYPE.SWITCH_FREQUENCY_EXCEEDED

ALERT_TYPE.AID_GENERATION_THRESHOLD

ALERT_TYPE.UNAUTHORIZED_CREATION_ATTEMPT
Esto nos ayudará en la implementación de logs inteligentes.

General – persistencia offline (opcional):

Si hay intención de mantener funcionalidad parcial en modo offline o intermitente, podríamos añadir una nota para que las identidades activas o los perfiles Qonsent se mantengan sincronizados en IndexedDB con reconciliación posterior.