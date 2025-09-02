import React from 'react';
import { QmailMessage } from '../types/message';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: QmailMessage[];
  onSelectMessage: (message: QmailMessage) => void;
  selectedMessageId?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onSelectMessage,
  selectedMessageId,
}) => {
  return (
    <div className="border-r border-gray-200 w-80 flex-shrink-0 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Inbox</h2>
        <p className="text-sm text-gray-500">{messages.length} messages</p>
      </div>
      <div className="divide-y divide-gray-200">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isSelected={selectedMessageId === message.id}
            onClick={() => onSelectMessage(message)}
          />
        ))}
      </div>
    </div>
  );
};
