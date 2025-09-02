import React from 'react';
import { QmailMessage } from '../types/message';
import { LockClosedIcon, LockOpenIcon, PaperClipIcon } from '@heroicons/react/24/outline';

interface MessageItemProps {
  message: QmailMessage;
  isSelected: boolean;
  onClick: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isSelected, onClick }) => {
  const hasAttachments = message.payload?.attachments && message.payload.attachments.length > 0;
  const isEncrypted = message.isEncrypted;
  
  const bgColor = isSelected 
    ? 'bg-blue-50 border-l-4 border-blue-500' 
    : message.isRead 
      ? 'bg-white' 
      : 'bg-blue-50';
  
  return (
    <div 
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${bgColor}`}
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          {isEncrypted ? (
            <LockClosedIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <LockOpenIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex justify-between">
            <p className={`text-sm font-medium ${!message.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
              {message.payload?.from || 'Unknown Sender'}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <p className={`text-sm ${!message.isRead ? 'font-semibold' : 'font-normal'} truncate`}>
            {message.payload?.subject || 'No Subject'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {message.payload?.body?.substring(0, 60) || 'No preview available'}
            {message.payload?.body && message.payload.body.length > 60 ? '...' : ''}
          </p>
          {hasAttachments && (
            <div className="mt-1 flex items-center text-xs text-gray-500">
              <PaperClipIcon className="h-3 w-3 mr-1" />
              {message.payload?.attachments?.length} attachment
              {message.payload?.attachments?.length !== 1 ? 's' : ''}
            </div>
          )}
          {message.decryptionError && (
            <div className="mt-1 text-xs text-red-500">
              Decryption failed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
