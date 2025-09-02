# CreateProposalForm Component Documentation

## Overview

The `CreateProposalForm` component provides a comprehensive interface for authorized DAO members to create new proposals within the AnarQ&Q ecosystem. It features form validation, file attachments, responsive design, and seamless integration with the DAO governance system.

## Features

### ✅ Core Functionality
- **Proposal Creation** - Complete form for creating DAO proposals
- **Form Validation** - Client-side validation with real-time feedback
- **File Attachments** - Drag & drop file upload with preview
- **Authentication Integration** - sQuid identity verification
- **Permission Checking** - Validates user's proposal creation rights

### ✅ User Experience
- **Responsive Design** - Mobile-first responsive layout
- **Loading States** - Visual feedback during form submission
- **Error Handling** - Comprehensive error states with user-friendly messages
- **Accessibility** - WCAG 2.1 compliant with keyboard navigation and screen reader support
- **Real-time Validation** - Immediate feedback on form field errors

## Props

```typescript
interface CreateProposalFormProps {
  daoId: string;              // Required: The ID of the DAO for the proposal
  embedded?: boolean;         // Optional: Whether to render without card wrapper
  onSuccess?: (proposalId: string) => void;  // Optional: Success callback
  onCancel?: () => void;      // Optional: Cancel callback
  className?: string;         // Optional: Additional CSS classes
}
```

## Usage

### Basic Usage

```tsx
import { CreateProposalForm } from '../components/dao';

function ProposalCreationPage({ daoId }: { daoId: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CreateProposalForm daoId={daoId} />
    </div>
  );
}
```

### Embedded in Modal

```tsx
import { CreateProposalForm } from '../components/dao';
import { Dialog, DialogContent } from '../components/ui/dialog';

function DAODashboard({ daoId }: { daoId: string }) {
  const [showForm, setShowForm] = useState(false);
  
  const handleSuccess = (proposalId: string) => {
    console.log('Proposal created:', proposalId);
    setShowForm(false);
    // Refresh proposals list
  };
  
  return (
    <Dialog open={showForm} onOpenChange={setShowForm}>
      <DialogContent>
        <CreateProposalForm 
          daoId={daoId}
          embedded
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
```

### With Custom Styling

```tsx
import { CreateProposalForm } from '../components/dao';

function CustomProposalForm({ daoId }: { daoId: string }) {
  return (
    <CreateProposalForm 
      daoId={daoId}
      className="max-w-4xl mx-auto"
      onSuccess={(id) => console.log('Created:', id)}
    />
  );
}
```

## Form Fields

### Required Fields

1. **Title** (text input)
   - Minimum: 5 characters
   - Maximum: 200 characters
   - Real-time character count

2. **Description** (textarea)
   - Minimum: 20 characters
   - Maximum: 5000 characters
   - Markdown support
   - Real-time character count

3. **Voting Options** (dynamic inputs)
   - Minimum: 2 options
   - Maximum: 5 options
   - Maximum 100 characters per option
   - Add/remove functionality

4. **Expiration Date & Time** (date/time inputs)
   - Minimum: 1 hour from now
   - Maximum: 1 year from now
   - Default: 7 days from creation

### Optional Fields

1. **File Attachments**
   - Drag & drop interface
   - File browser fallback
   - Multiple file support
   - 10MB per file limit
   - Supported formats: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF

## Form Validation

### Client-Side Validation

```typescript
interface FormErrors {
  title?: string;
  description?: string;
  options?: string[];
  expiration?: string;
  general?: string;
}
```

### Validation Rules

- **Title**: Required, 5-200 characters
- **Description**: Required, 20-5000 characters
- **Options**: At least 2 valid options, max 100 chars each
- **Expiration**: Must be 1 hour to 1 year from now
- **Files**: Max 10MB each, supported formats only

### Real-time Feedback

- Character counters for text fields
- Immediate error display on field blur
- Visual indicators for valid/invalid states
- Clear error messages with resolution hints

## File Attachment System

### Drag & Drop Interface

```tsx
// Drag & drop handlers
const handleDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  setDragOver(true);
}, []);

const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  setDragOver(false);
  handleFileSelect(e.dataTransfer.files);
}, []);
```

### File Validation

- **Size Limit**: 10MB per file
- **Format Validation**: PDF, DOC, DOCX, TXT, images
- **Multiple Files**: Support for multiple attachments
- **Preview**: File name and size display
- **Removal**: Individual file removal option

### Integration with Ecosystem

Files are prepared for integration with:
- **Qdrive**: Decentralized file storage
- **QpiC**: Image and media handling
- **IPFS**: Distributed file system

## Authentication & Permissions

### Authentication States

1. **Unauthenticated User**
   ```tsx
   // Shows authentication required message
   <div className="text-center">
     <h3>Authentication Required</h3>
     <p>Please authenticate with your sQuid identity</p>
   </div>
   ```

2. **Authenticated but No Permission**
   ```tsx
   // Shows permission required message with token requirements
   <div className="text-center">
     <h3>Permission Required</h3>
     <p>Required: {amount} {token}</p>
   </div>
   ```

3. **Authorized User**
   ```tsx
   // Shows full form interface
   <form onSubmit={handleSubmit}>
     {/* Form fields */}
   </form>
   ```

### Permission Checking

```typescript
// Checks user's proposal creation rights
const canCreateProposal = membership?.canCreateProposals;

// Validates token requirements
if (currentDAO?.governanceRules?.tokenRequirement) {
  // Display token requirements
}
```

## Form Submission

### Submission Process

1. **Client Validation**: Validate all form fields
2. **Permission Check**: Verify user can create proposals
3. **Data Preparation**: Format proposal data
4. **API Call**: Submit via `createProposal()` hook
5. **Success Handling**: Show success message, reset form
6. **Error Handling**: Display error messages

### Data Format

```typescript
interface ProposalData {
  title: string;
  description: string;
  options: string[];
  durationHours: number;
  attachments: string[];
}
```

### Success Flow

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // Validation
  if (!validateForm()) return;
  
  // Submit
  const proposal = await createProposal(daoId, proposalData);
  
  if (proposal) {
    setSuccess(`Proposal "${proposal.title}" created successfully!`);
    resetForm();
    onSuccess?.(proposal.id);
  }
};
```

## State Management

### Form State

```typescript
interface FormData {
  title: string;
  description: string;
  options: string[];
  expirationDate: string;
  expirationTime: string;
  attachments: File[];
}
```

### UI State

```typescript
const [formData, setFormData] = useState<FormData>();
const [errors, setErrors] = useState<FormErrors>({});
const [submitting, setSubmitting] = useState(false);
const [success, setSuccess] = useState<string | null>(null);
const [dragOver, setDragOver] = useState(false);
```

### State Updates

- **Real-time Updates**: Form fields update immediately
- **Error Clearing**: Errors clear when user starts typing
- **Success Messages**: Auto-clear after 5 seconds
- **Loading States**: Visual feedback during submission

## Responsive Design

### Breakpoints

- **Mobile (< 768px)**: Single column layout, stacked elements
- **Tablet (768px - 1024px)**: Two column grid for date/time
- **Desktop (> 1024px)**: Multi-column layout with proper spacing

### Mobile Optimizations

- **Touch Targets**: Minimum 44px touch targets
- **Readable Text**: Appropriate font sizes
- **Optimized Spacing**: Proper padding and margins
- **Scrollable Content**: Proper overflow handling

## Accessibility Features

### WCAG 2.1 Compliance

- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Management**: Clear focus indicators
- **Error Association**: Errors linked to form fields

### ARIA Implementation

```tsx
<input
  aria-describedby={errors.title ? "title-error" : undefined}
  aria-invalid={!!errors.title}
/>
{errors.title && (
  <p id="title-error" className="text-red-600">
    {errors.title}
  </p>
)}
```

## Integration Points

### DAO Dashboard Integration

```tsx
// In DAODashboard.tsx
const [showCreateProposal, setShowCreateProposal] = useState(false);

const handleCreateProposalSuccess = (proposalId: string) => {
  setShowCreateProposal(false);
  loadDAOData(); // Refresh proposals
};

<Dialog open={showCreateProposal}>
  <CreateProposalForm
    daoId={daoId}
    embedded
    onSuccess={handleCreateProposalSuccess}
    onCancel={() => setShowCreateProposal(false)}
  />
</Dialog>
```

### Hook Integration

```typescript
const {
  currentDAO,
  membership,
  createProposal,
  getDAO,
  getMembership
} = useDAO();
```

## Error Handling

### Error Types

1. **Validation Errors**: Client-side form validation
2. **Permission Errors**: Insufficient rights
3. **Network Errors**: API connectivity issues
4. **Server Errors**: Backend processing failures

### Error Display

- **Field Errors**: Inline error messages
- **General Errors**: Alert banners
- **Success Messages**: Success banners
- **Loading States**: Progress indicators

## Performance Optimizations

### Form Optimization

- **Debounced Validation**: Prevent excessive validation calls
- **Memoized Handlers**: Optimize event handlers
- **Efficient Updates**: Minimal re-renders
- **File Handling**: Efficient file processing

### Memory Management

- **Cleanup**: Remove event listeners on unmount
- **File Cleanup**: Clear file references
- **Timer Cleanup**: Clear success message timers

## Testing

### Test Coverage

- **Form Rendering**: All form fields and states
- **Validation**: All validation rules and edge cases
- **File Upload**: Drag & drop and file selection
- **Submission**: Success and error scenarios
- **Accessibility**: ARIA labels and keyboard navigation
- **Integration**: Hook interactions and callbacks

### Test Files

- `CreateProposalForm.test.tsx`: Comprehensive test suite
- Coverage includes all user interactions and edge cases

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **File API**: Full File API support required for attachments

## Dependencies

### Required

- React 18+
- TypeScript 4.5+
- TailwindCSS 3.0+
- Heroicons React

### Peer Dependencies

- `useDAO` hook from composables
- `useSessionContext` from contexts
- UI components from components/ui

## Customization

### Styling

```tsx
// Custom styling via className
<CreateProposalForm 
  className="custom-form-styles"
  daoId={daoId}
/>
```

### Behavior

```tsx
// Custom callbacks
<CreateProposalForm
  daoId={daoId}
  onSuccess={(id) => {
    // Custom success handling
    console.log('Proposal created:', id);
    router.push(`/dao/${daoId}/proposal/${id}`);
  }}
  onCancel={() => {
    // Custom cancel handling
    router.back();
  }}
/>
```

## Future Enhancements

### Planned Features

1. **Rich Text Editor**: Enhanced description editing
2. **Template System**: Proposal templates
3. **Draft Saving**: Save proposals as drafts
4. **Collaboration**: Multi-user proposal editing
5. **Advanced Attachments**: Better file management

### Integration Roadmap

1. **Qdrive Integration**: Full file storage integration
2. **QpiC Integration**: Image and media handling
3. **Qsocial Integration**: Social features for proposals
4. **AI Assistance**: Proposal writing assistance

## Troubleshooting

### Common Issues

1. **Form Not Submitting**: Check authentication and permissions
2. **File Upload Failing**: Verify file size and format
3. **Validation Errors**: Check field requirements
4. **Permission Denied**: Verify token balance and DAO membership

### Debug Mode

```tsx
// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('Form data:', formData);
  console.log('Validation errors:', errors);
}
```

## Contributing

When contributing to the CreateProposalForm component:

1. Follow existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure accessibility compliance
5. Test on multiple devices and browsers

## License

Part of the AnarQ&Q ecosystem under the project license.