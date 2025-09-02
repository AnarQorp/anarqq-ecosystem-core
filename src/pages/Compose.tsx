
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/common/Layout';
import { ComposeForm, MessageFormData } from '@/components/qmail/ComposeForm';
import { generateMockUser } from '@/utils/mockData';
import { User, Identity, Message, MessageStatus, MessagePriority } from '@/types';
import { encryptMessage, formatQmailContent, signMessage } from '@/utils/encryptMock';
import { getAllIdentities } from '@/lib/identityUtils';
import { isAuthorized } from '@/lib/permissions';
import { uploadToIPFS } from '@/lib/ipfsClient';
import { toast } from '@/components/ui/use-toast';

export default function Compose() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [allIdentities, setAllIdentities] = useState<Identity[]>([]);
  const [activeSenderId, setActiveSenderId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  
  useEffect(() => {
    // In a real app, these would come from an API or context
    const mockUser = generateMockUser();
    setUser(mockUser);
    
    if (mockUser) {
      // Get all available identities
      const identities = getAllIdentities(mockUser);
      setAllIdentities(identities);
      
      // Set the primary identity as the default sender
      setActiveSenderId(mockUser.primaryIdentity.id);
    }
  }, []);
  
  const handleChangeSender = (identityId: string) => {
    setActiveSenderId(identityId);
  };
  
  const handleSubmit = async (formData: MessageFormData) => {
    if (!user) return;
    
    setIsSending(true);
    
    try {
      // Get the active identity
      const activeIdentity = allIdentities.find(identity => identity.id === activeSenderId);
      
      if (!activeIdentity) {
        throw new Error('Selected identity not found');
      }
      
      // Check permissions
      const canSend = isAuthorized(
        activeIdentity,
        'messages',
        'send',
        'qmail'
      );
      
      if (!canSend) {
        toast({
          title: 'Permission Denied',
          description: `The selected identity (${activeIdentity.name}) doesn't have permission to send messages.`,
          variant: 'destructive'
        });
        return;
      }
      
      // Format the message content
      const formattedContent = formatQmailContent(
        formData.subject,
        formData.content,
        activeIdentity.name,
        new Date()
      );
      
      // Get recipient's public key (simulated)
      const recipientPublicKey = 'simulated-recipient-public-key';
      
      // Encrypt the message content
      const encrypted = await encryptMessage(
        formattedContent,
        recipientPublicKey,
        formData.encryptionLevel === 'QUANTUM'
      );
      
      // Generate a digital signature
      const privateKey = localStorage.getItem('anarq_private_key') || 'mock-private-key';
      const signature = await signMessage(
        formattedContent,
        privateKey,
        formData.encryptionLevel === 'QUANTUM'
      );
      
      // Simulate storing the message in IPFS
      const ipfsHash = await uploadToIPFS(
        encrypted,
        'application/qmail'
      );
      
      // Create the message object
      const message: Partial<Message> = {
        id: crypto.randomUUID(),
        senderId: user.primaryIdentity.id,
        senderIdentityId: activeIdentity.id,
        recipientId: formData.recipientId,
        recipientIdentityId: formData.recipientId,
        subject: formData.subject,
        content: encrypted,
        encryptionLevel: formData.encryptionLevel,
        timestamp: new Date(),
        expires: formData.expires ? new Date(Date.now() + formData.expiresAfter * 60 * 60 * 1000) : undefined,
        status: MessageStatus.SENT,
        priority: formData.priority as MessagePriority,
        attachments: [], // Would handle attachments in a real implementation
        metadata: {
          ipfsHash,
          signature,
          size: formattedContent.length,
          routingPath: ['local-node']
        },
        visibilityThreshold: formData.visibilityThreshold
      };
      
      console.log('Message sent:', message);
      
      // Success notification
      toast({
        title: 'Message Sent',
        description: 'Your secure message has been encrypted and sent.',
      });
      
      // Navigate back to inbox
      navigate('/inbox');
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      toast({
        title: 'Error Sending Message',
        description: 'There was a problem sending your message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleSaveDraft = (formData: MessageFormData) => {
    console.log('Saving draft:', formData);
    
    toast({
      title: 'Draft Saved',
      description: 'Your message has been saved as a draft.',
    });
  };
  
  return (
    <Layout module="qmail">
      <div className="max-w-4xl mx-auto">
        {user ? (
          <ComposeForm
            senderIdentities={allIdentities}
            activeSenderId={activeSenderId}
            onChangeSender={handleChangeSender}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
          />
        ) : (
          <div className="text-center py-8">
            <p>Loading user data...</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
