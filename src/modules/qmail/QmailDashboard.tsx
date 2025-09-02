import React, { useState } from 'react';
import { useIdentity } from '../../../contexts/IdentityContext';
import { MessageList } from './components/MessageList';
import { MessageViewer } from './components/MessageViewer';
import { MOCK_INBOX, QmailMessage } from './types/message';

export const QmailDashboard: React.FC = () => {
  const { identity } = useIdentity();
  const [messages, setMessages] = useState<QmailMessage[]>(MOCK_INBOX);
  const [selectedMessage, setSelectedMessage] = useState<QmailMessage | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  // Toggle mobile view when screen size changes
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768); // md breakpoint
    };

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectMessage = (message: QmailMessage) => {
    // Mark as read when selected
    if (!message.isRead) {
      const updatedMessages = messages.map((msg) =>
        msg.id === message.id ? { ...msg, isRead: true } : msg
      );
      setMessages(updatedMessages);
    }
    setSelectedMessage(message);
  };

  const handleBackToList = () => {
    setSelectedMessage(null);
  };

  const handleDecryptSuccess = (originalMessage: QmailMessage, decryptedMessage: QmailMessage) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === originalMessage.id ? { ...decryptedMessage, isRead: true } : msg
      )
    );
    setSelectedMessage(decryptedMessage);
  };

  // If no identity is available (user not logged in)
  if (!identity) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Secure Qmail</h2>
          <p className="text-gray-600 mb-6">
            Please sign in with your sQuid identity to access your encrypted messages.
          </p>
          <button
            onClick={() => window.alert('This would trigger sQuid authentication')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign In with sQuid
          </button>
        </div>
      </div>
    );
  }

  // Mobile view: show either list or message, not both
  if (isMobileView) {
    return selectedMessage ? (
      <MessageViewer
        message={selectedMessage}
        onBack={handleBackToList}
        onDecrypt={handleDecryptSuccess}
      />
    ) : (
      <MessageList
        messages={messages}
        onSelectMessage={handleSelectMessage}
      />
    );
  }

  // Desktop view: show both list and message side by side
  return (
    <div className="flex h-full bg-white">
      <div className="w-80 border-r border-gray-200 flex-shrink-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Secure Qmail</h1>
          <p className="text-sm text-gray-500">
            Welcome back, {identity.name || 'User'}
          </p>
        </div>
        <MessageList
          messages={messages}
          onSelectMessage={handleSelectMessage}
          selectedMessageId={selectedMessage?.id}
        />
      </div>
      
      <MessageViewer
        message={selectedMessage}
        onBack={handleBackToList}
        onDecrypt={handleDecryptSuccess}
      />
    </div>
  );
};

export default QmailDashboard;
