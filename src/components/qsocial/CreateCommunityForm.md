# CreateCommunityForm Component

## Overview

The `CreateCommunityForm` component allows authenticated users to create new DAO-backed communities in Qsocial with comprehensive privacy settings, governance parameters, access controls, and ecosystem integrations.

## Features

### 1. Community Metadata
- **Name**: Required field (3-100 characters)
- **Description**: Optional field (max 2000 characters)  
- **Tags**: Optional hashtags (max 10 tags)
- **Logo Upload**: Optional community avatar (max 2MB, JPG/PNG)

### 2. Governance Settings
- **Visibility**: Public, DAO-only, or Private
- **Quorum**: Percentage of members required for valid proposals (1-100%)
- **Voting Method**: Token-weighted, 1-person-1-vote, or NFT-holders-only

### 3. Access Configuration
- **Token/NFT Requirements**: Optional gating mechanism
- **Minimum Token Amount**: Required QToken amount for access
- **NFT ID List**: Specific NFT IDs required for membership

### 4. Initial Roles Setup
- **Moderators**: Add sQuid DIDs for initial moderators
- **Proposal Creation**: Configure who can create proposals (everyone or mods-only)

### 5. File Attachments
- **Logo**: Community avatar image
- **Constitution**: PDF document with community rules (max 10MB)

## Ecosystem Integrations

The component integrates with all major Q∞ ecosystem modules:

### sQuid Identity
- User authentication and KYC verification
- Identity-based access control
- DID-based moderator assignment

### Qonsent Privacy
- Automatic privacy profile generation
- Consent management based on visibility settings
- Data protection controls

### Qwallet Integration
- Token balance verification
- NFT ownership checking
- Community token minting for NFT-gated communities

### Qlock Encryption
- Metadata encryption for private communities
- Multi-level encryption based on privacy settings
- Secure key management

### Qindex Registration
- Community metadata indexing
- Searchability configuration
- Ownership registration

### Qerberos Security
- Creation event logging
- Security threat detection
- Audit trail maintenance

## Props Interface

```typescript
interface CreateCommunityFormProps {
  embedded?: boolean;           // Whether to render in embedded mode
  onSuccess?: (communityId: string) => void;  // Success callback
  onCancel?: () => void;        // Cancel callback
}
```

## Usage Examples

### Basic Usage
```tsx
import { CreateCommunityForm } from '@/components/qsocial';

function CommunityCreationPage() {
  const handleSuccess = (communityId: string) => {
    console.log('Community created:', communityId);
    // Redirect to community dashboard
  };

  return (
    <CreateCommunityForm 
      onSuccess={handleSuccess}
      onCancel={() => history.back()}
    />
  );
}
```

### Embedded Mode
```tsx
import { CreateCommunityForm } from '@/components/qsocial';

function CommunityModal() {
  return (
    <Dialog>
      <DialogContent>
        <CreateCommunityForm 
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

### Required Fields
- Community name (3-100 characters)
- User must be authenticated

### Conditional Validation
- If token/NFT access is enabled:
  - Token-weighted voting requires minimum token amount
  - NFT-holders-only voting requires at least one NFT ID
- File uploads must meet size and type requirements

### Security Validation
- Input sanitization for XSS prevention
- File type validation for uploads
- DID format validation for moderators

## Form Flow

1. **Metadata Tab**: Basic community information
2. **Governance Tab**: Voting and visibility settings
3. **Access Tab**: Token/NFT requirements
4. **Roles Tab**: Moderator and permission setup
5. **Files Tab**: Logo and constitution uploads
6. **Preview**: Review all settings before submission

## Error Handling

The component provides comprehensive error handling:

- **Validation Errors**: Real-time field validation with user feedback
- **Network Errors**: Graceful handling of API failures
- **Authentication Errors**: Clear messaging for auth requirements
- **File Upload Errors**: Size and type validation with helpful messages

## Accessibility

- Full keyboard navigation support
- Screen reader compatible labels and descriptions
- High contrast mode support
- Focus management for modal interactions

## Testing

The component includes comprehensive test coverage:

- Unit tests for all form interactions
- Integration tests for ecosystem services
- Validation testing for all input fields
- Error handling and edge case testing

## Performance Considerations

- Lazy loading of ecosystem services
- Debounced validation for real-time feedback
- Optimized file upload with progress tracking
- Efficient state management to prevent unnecessary re-renders

## Browser Support

- Modern browsers with ES2020+ support
- File API support for uploads
- Crypto API support for hashing
- LocalStorage for temporary data persistence