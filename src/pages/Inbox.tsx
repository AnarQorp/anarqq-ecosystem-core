
import { useState, useEffect } from 'react';
import { Layout } from '@/components/common/Layout';
import { MessageItem } from '@/components/qmail/MessageItem';
import { generateMockMessages, generateMockUser } from '@/utils/mockData';
import { Message, User } from '@/types';
import { filterMessagesByPrivacy } from '@/utils/validateAccess';
import { decryptMessage } from '@/utils/encryptMock';
import { parseQmailContent } from '@/utils/encryptMock';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Mail, AlertTriangle, Inbox as InboxIcon } from 'lucide-react';

export default function Inbox() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    // In a real app, these would come from an API
    const mockUser = generateMockUser();
    setUser(mockUser);
    
    const mockMessages = generateMockMessages();
    setMessages(mockMessages);
    
    // Filter messages based on privacy settings
    if (mockUser) {
      const visibleMessages = filterMessagesByPrivacy(
        mockMessages, 
        mockUser.privacySettings.level
      );
      setFilteredMessages(visibleMessages);
    }
  }, []);
  
  useEffect(() => {
    // When a message is selected, decrypt its content
    if (selectedMessage) {
      const decryptAndDisplay = async () => {
        try {
          // In a real app, we'd retrieve the private key from secure storage
          const privateKey = localStorage.getItem('anarq_private_key') || 'mock-private-key';
          
          const decrypted = await decryptMessage(
            selectedMessage.content,
            privateKey
          );
          
          if (decrypted) {
            setDecryptedContent(decrypted);
          } else {
            setDecryptedContent('Failed to decrypt message content.');
          }
        } catch (error) {
          console.error('Decryption error:', error);
          setDecryptedContent('Error decrypting message.');
        }
      };
      
      decryptAndDisplay();
    } else {
      setDecryptedContent(null);
    }
  }, [selectedMessage]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setFilteredMessages(
        user ? filterMessagesByPrivacy(messages, user.privacySettings.level) : []
      );
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results = messages.filter(
      message => (
        message.subject.toLowerCase().includes(query) ||
        message.senderIdentityId.toLowerCase().includes(query)
      )
    );
    
    setFilteredMessages(
      user ? filterMessagesByPrivacy(results, user.privacySettings.level) : []
    );
  };
  
  // Parse content if it's in QMail format
  const parsedContent = decryptedContent ? parseQmailContent(decryptedContent) : null;
  
  return (
    <Layout module="qmail">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List Panel */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <InboxIcon className="mr-2 h-5 w-5" />
                Inbox
              </CardTitle>
              
              <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2 mt-2">
                <Input
                  type="search"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </CardHeader>
            
            <CardContent className="p-0">
              <Tabs defaultValue="all">
                <TabsList className="w-full rounded-none justify-start border-b">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="important">Important</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="m-0">
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                    {filteredMessages.length > 0 ? (
                      filteredMessages.map(message => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          onClick={() => setSelectedMessage(message)}
                          selected={selectedMessage?.id === message.id}
                        />
                      ))
                    ) : (
                      <div className="p-6 text-center text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No messages found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="unread" className="m-0">
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                    {filteredMessages.filter(m => m.status === 'unread').length > 0 ? (
                      filteredMessages
                        .filter(m => m.status === 'unread')
                        .map(message => (
                          <MessageItem
                            key={message.id}
                            message={message}
                            onClick={() => setSelectedMessage(message)}
                            selected={selectedMessage?.id === message.id}
                          />
                        ))
                    ) : (
                      <div className="p-6 text-center text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No unread messages</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="important" className="m-0">
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                    {filteredMessages.filter(m => m.priority === 'urgent' || m.priority === 'high').length > 0 ? (
                      filteredMessages
                        .filter(m => m.priority === 'urgent' || m.priority === 'high')
                        .map(message => (
                          <MessageItem
                            key={message.id}
                            message={message}
                            onClick={() => setSelectedMessage(message)}
                            selected={selectedMessage?.id === message.id}
                          />
                        ))
                    ) : (
                      <div className="p-6 text-center text-muted-foreground">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No important messages</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Message Display Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            {selectedMessage ? (
              <>
                <CardHeader>
                  <CardTitle>{selectedMessage.subject}</CardTitle>
                  <CardDescription>
                    From: {selectedMessage.senderIdentityId}<br />
                    To: {selectedMessage.recipientIdentityId}<br />
                    Encryption: {selectedMessage.encryptionLevel}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {parsedContent ? (
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-2">
                          Message from {parsedContent.sender}
                        </div>
                        <div className="whitespace-pre-wrap">
                          {parsedContent.body}
                        </div>
                      </div>
                      
                      {selectedMessage.attachments.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">Attachments</h3>
                          <div className="space-y-2">
                            {selectedMessage.attachments.map(attachment => (
                              <div key={attachment.id} className="flex items-center p-2 bg-secondary/30 rounded">
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{attachment.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {attachment.mimeType} • {(attachment.size / 1024).toFixed(1)} KB
                                  </div>
                                </div>
                                <Button size="sm" variant="outline">View</Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground border-t pt-4">
                        <div>Message ID: {selectedMessage.id}</div>
                        <div>IPFS Hash: {selectedMessage.metadata.ipfsHash || 'Not stored on IPFS'}</div>
                        <div>Signature: {selectedMessage.metadata.signature}</div>
                        <div>Routing: {selectedMessage.metadata.routingPath.join(' → ')}</div>
                      </div>
                    </div>
                  ) : decryptedContent ? (
                    <div className="whitespace-pre-wrap">
                      {decryptedContent}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="spinner mb-4"></div>
                      <p>Decrypting message content...</p>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <Mail className="h-16 w-16 mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-xl font-medium mb-2">No message selected</h3>
                <p className="text-muted-foreground max-w-md">
                  Select a message from your inbox to view its contents. All messages are encrypted using the QLock encryption engine.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
