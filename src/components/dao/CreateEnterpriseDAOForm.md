# CreateEnterpriseDAOForm Component

## Overview

The `CreateEnterpriseDAOForm` component allows authorized users with valid business sub-identities to create Enterprise DAOs within the AnarQ&Q ecosystem. It provides comprehensive governance settings, access controls, token minting capabilities, and full ecosystem integrations.

## Features

### 1. Metadata Management
- **Company Name**: Required field (3-100 characters)
- **Description**: Optional field (max 2000 characters)
- **Sector**: Required dropdown selection from predefined categories
- **Tags**: Optional hashtags (max 10 tags)
- **Logo Upload**: Optional company logo (SVG/JPG/PNG, max 2MB)
- **Website URL**: Optional company website

### 2. Governance Configuration
- **Parent DAO**: Dynamic dropdown based on selected sector
- **Voting Method**: User-based, NFT-weighted, or Token-weighted
- **Quorum**: Percentage of members required for valid proposals (1-100%)
- **Initial Roles**: CEO, CTO, Validator, Legal, Moderator assignment by DID/wallet
- **Delegate Voting**: Optional toggle for vote delegation

### 3. Access & Tokens
- **Internal KYC**: Requirement for employee verification
- **Gated Access**: Token/NFT-based access control
- **Token Minting**: Custom enterprise token creation with name, symbol, decimals
- **Initial Supply**: Configurable token supply
- **Enterprise NFT**: Optional unique NFT representing the enterprise
- **Access Price**: Optional QToken price for enterprise access

### 4. Permissions & Privacy
- **Visibility**: Public, DAO-only, or Private access levels
- **Qonsent Profile**: Auto-generated privacy profile based on sector
- **Qlock Encryption**: Public, symmetric, or asymmetric encryption levels
- **Parent DAO Signature**: Required approval from parent DAO

### 5. Files & Compliance
- **Constitution Document**: Required PDF constitution (max 10MB)
- **Legal Documents**: Optional additional legal documents (max 10MB each)
- **Certificates**: Optional business certificates and licenses
- **Terms Agreement**: Required ecosystem terms acceptance

## Ecosystem Integrations

The component integrates with all major Q∞ ecosystem modules:

### sQuid Identity
- Business sub-identity validation and KYC verification
- Role-based access control and permissions
- DID-based role assignments

### Qonsent Privacy
- Automatic privacy profile generation based on sector
- Configurable privacy levels and data sharing controls
- Consent management for enterprise operations

### Qwallet Integration
- Enterprise token minting and management
- NFT creation for enterprise representation
- Balance verification and transaction handling

### Qlock Encryption
- Multi-level encryption for sensitive enterprise data
- Key generation and management
- Secure document storage and transmission

### Qindex Registration
- Enterprise DAO registration and indexing
- File registration and metadata storage
- Searchability and discovery configuration

### Qerberos Security
- Security threat detection and validation
- Audit logging and compliance tracking
- Integrity verification and monitoring

## Props Interface

```typescript
interface CreateEnterpriseDAOFormProps {
  embedded?: boolean;           // Whether to render in embedded mode
  onSuccess?: (daoId: string) => void;  // Success callback with DAO ID
  onCancel?: () => void;        // Cancel callback
}
```

## Usage Examples

### Basic Usage
```tsx
import { CreateEnterpriseDAOForm } from '@/components/dao';

function EnterpriseDAOCreationPage() {
  const handleSuccess = (daoId: string) => {
    console.log('Enterprise DAO created:', daoId);
    // Redirect to DAO dashboard
  };

  return (
    <CreateEnterpriseDAOForm 
      onSuccess={handleSuccess}
      onCancel={() => history.back()}
    />
  );
}
```

### Embedded Mode
```tsx
import { CreateEnterpriseDAOForm } from '@/components/dao';

function EnterpriseDAOModal() {
  return (
    <Dialog>
      <DialogContent className="max-w-4xl">
        <CreateEnterpriseDAOForm 
          embedded={true}
          onSuccess={(id) => setShowModal(false)}
          onCancel={() => setShowModal(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
```

## Validation Rules

### Authentication Requirements
- User must have valid business sub-identity
- KYC verification required
- Session must be authenticated

### Required Fields
- Company name (3-100 characters)
- Sector selection
- Parent DAO assignment
- CEO role assignment
- Constitution document upload
- Terms agreement acceptance

### Conditional Validation
- Token minting fields required when token minting is enabled
- Token name and symbol uniqueness validation
- File size and type validation for uploads
- URL format validation for website field

### Business Logic Validation
- Parent DAO must match selected sector
- Role assignments must be valid DIDs or wallet addresses
- Quorum percentage must be between 1-100%
- Access price cannot be negative

## Form Flow

1. **Metadata Tab**: Basic enterprise information and branding
2. **Governance Tab**: DAO structure and voting configuration
3. **Access Tab**: Token minting and access control settings
4. **Privacy Tab**: Visibility and encryption configuration
5. **Files Tab**: Document uploads and compliance agreements

## Sector-Based Parent DAO Assignment

The form dynamically loads parent DAOs based on the selected sector:

- **Technology**: TechCorp DAO, Innovation Hub DAO
- **Finance**: FinTech Alliance DAO, Banking Consortium DAO
- **Healthcare**: MedTech DAO, Healthcare Providers DAO
- **And more sectors...**

## Token Minting Features

When token minting is enabled, the form provides:

- **Token Configuration**: Name, symbol, decimals
- **Supply Management**: Initial supply setting
- **Metadata**: Automatic attribute generation
- **Integration**: Seamless Qwallet integration

## Security Features

- **Threat Detection**: Real-time security validation
- **Input Sanitization**: XSS and injection prevention
- **File Validation**: Type and size restrictions
- **Audit Logging**: Complete action tracking

## Error Handling

The component provides comprehensive error handling:

- **Validation Errors**: Real-time field validation with user feedback
- **Network Errors**: Graceful handling of API failures
- **Authentication Errors**: Clear messaging for auth requirements
- **File Upload Errors**: Size and type validation with helpful messages
- **Ecosystem Errors**: Detailed error reporting for service failures

## Progress Tracking

Visual progress indicator shows completion status:

- **Metadata**: Company name and sector completion
- **Governance**: Parent DAO and CEO assignment
- **Access**: Always considered complete
- **Privacy**: Visibility setting completion
- **Files**: Constitution and terms agreement

## Accessibility

- Full keyboard navigation support
- Screen reader compatible labels and descriptions
- High contrast mode support
- Focus management for modal interactions
- ARIA labels and roles for complex interactions
- Helpful tooltips for complex fields

## Testing

The component includes comprehensive test coverage:

- **Unit Tests**: All form interactions and validations
- **Integration Tests**: Ecosystem service integrations
- **Validation Tests**: All input field validations
- **Error Handling Tests**: Various failure scenarios
- **Accessibility Tests**: Keyboard navigation and screen readers
- **File Upload Tests**: Upload and removal functionality

## Performance Considerations

- Lazy loading of parent DAOs based on sector selection
- Debounced validation for real-time feedback
- Optimized file upload with progress tracking
- Efficient state management to prevent unnecessary re-renders
- Memoized ecosystem service calls

## Browser Support

- Modern browsers with ES2020+ support
- File API support for uploads
- Crypto API support for hashing and encryption
- LocalStorage for temporary data persistence
- WebAssembly support for advanced cryptographic operations

## Security Considerations

- Input sanitization and validation
- File type and size restrictions
- Secure key generation and storage
- Audit trail for all operations
- Rate limiting for API calls
- CSRF protection for form submissions