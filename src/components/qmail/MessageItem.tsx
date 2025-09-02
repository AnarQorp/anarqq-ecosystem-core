
import { Message, MessagePriority, MessageStatus } from '@/types';
import { formatDateWithRelative, formatRelativeTime } from '@/utils/formatDate';
import { 
  Eye, 
  Mail, 
  MailOpen, 
  AlertTriangle, 
  Paperclip, 
  Clock,
  ArrowUp
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onClick?: () => void;
  selected?: boolean;
}

export function MessageItem({ message, onClick, selected = false }: MessageItemProps) {
  const isUnread = message.status === MessageStatus.UNREAD;
  
  const getPriorityIndicator = (priority: MessagePriority) => {
    switch (priority) {
      case MessagePriority.URGENT:
        return (
          <span className="flex items-center text-red-500">
            <AlertTriangle className="w-3 h-3 mr-1" />
            <span className="text-xs font-medium">Urgent</span>
          </span>
        );
      case MessagePriority.HIGH:
        return (
          <span className="flex items-center text-orange-500">
            <ArrowUp className="w-3 h-3 mr-1" />
            <span className="text-xs font-medium">High</span>
          </span>
        );
      default:
        return null;
    }
  };
  
  return (
    <div 
      onClick={onClick}
      className={`
        p-3 border-b flex gap-3 items-start
        ${isUnread ? 'bg-primary/5' : ''}
        ${selected ? 'border-l-4 border-l-primary' : ''}
        ${onClick ? 'cursor-pointer hover:bg-muted/50' : ''}
      `}
    >
      <div className="flex-shrink-0 mt-1">
        {isUnread ? (
          <Mail className="w-5 h-5 text-primary" />
        ) : (
          <MailOpen className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h3 className={`text-sm font-medium truncate ${isUnread ? 'font-semibold' : ''}`}>
            {message.subject}
          </h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatDateWithRelative(message.timestamp)}
          </span>
        </div>
        
        <div className="text-xs text-muted-foreground truncate mt-1">
          From: <span className="font-medium">{message.senderIdentityId}</span>
        </div>
        
        <div className="flex items-center gap-3 mt-2">
          {message.attachments.length > 0 && (
            <span className="flex items-center text-xs text-muted-foreground">
              <Paperclip className="w-3 h-3 mr-1" />
              {message.attachments.length}
            </span>
          )}
          
          {getPriorityIndicator(message.priority)}
          
          <span className="text-xs text-muted-foreground flex items-center">
            <Eye className="w-3 h-3 mr-1" />
            {message.encryptionLevel}
          </span>
          
          {message.expires && (
            <span className="text-xs text-amber-500 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Expires in {formatRelativeTime(message.expires)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
