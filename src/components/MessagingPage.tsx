import { useState, useEffect, useRef } from 'react';
import { Search, Send, Paperclip, Smile, MoreVertical, Plus, X, Video, Phone } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { useSocket } from '../hooks/useSocket';
import CallModal from './CallModal';
import { useMessages } from '../hooks/useMessages';
import { messagingApi } from '../services/messagingApi';
import { Message, Conversation, User } from '../types/messaging';
import { renderShortcodes } from '../utils/emoji';

interface MessagingPageProps {
  userEmail: string;
  userRole: 'admin' | 'doctor';
}

export function MessagingPage({ userEmail, userRole }: MessagingPageProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<Array<any>>([]);
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsersForNewChat, setSelectedUsersForNewChat] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');

  const {
    conversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    unreadCount,
    loading,
    typingUsers,
    loadConversations,
    loadMessages,
    handleMessageReceived,
    handleMessageSent,
    handleMessageEdited,
    handleMessageDeleted,
    handleTypingStatus,
    handleMessageRead,
    addLocalMessage,
    markAsRead,
  } = useMessages(userEmail);

  const { isConnected, sendMessage, sendTypingStatus, markMessageRead, sendAnswer, endCall } = useSocket(
    userEmail,
    {
      onMessageReceived: handleMessageReceived,
      onMessageSent: handleMessageSent,
      onTyping: handleTypingStatus,
      onMessageRead: handleMessageRead,
      onMessageEdited: handleMessageEdited,
      onMessageDeleted: handleMessageDeleted,
      // WebRTC signalling callbacks
      onCallInvite: (payload: any) => {
        console.log('[Call] invite received', payload);
        setCallPeer(payload.from);
        setIncomingOffer(payload);
      },
      onCallOffer: (payload: any) => {
        console.log('[Call] offer received', payload);
        setCallPeer(payload.from);
        setIncomingOffer(payload);
      },
      onCallAnswer: (payload: any) => {
        console.log('[Call] answer received', payload);
        window.dispatchEvent(new CustomEvent('mbc_call_answer', { detail: payload }));
      },
      onCallIce: (payload: any) => {
        window.dispatchEvent(new CustomEvent('mbc_call_ice', { detail: payload }));
      },
      onCallEnd: (payload: any) => {
        window.dispatchEvent(new CustomEvent('mbc_call_end', { detail: payload }));
      },
    }
  );

  // Call UI state
  const [showCallModal, setShowCallModal] = useState(false);
  const [callPeer, setCallPeer] = useState<string | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<any | null>(null);
  const [incomingToastVisible, setIncomingToastVisible] = useState(false);

  useEffect(() => {
    if (incomingOffer) setIncomingToastVisible(true);
  }, [incomingOffer]);

  const acceptIncomingCall = () => {
    // detect if incoming offer contains video m-line; if not, treat as audio-only
    let audioOnlyMode = false;
    try {
      const sdp = incomingOffer?.sdp?.sdp || '';
      if (sdp && !sdp.includes('\nm=video')) audioOnlyMode = true;
    } catch (e) {
      audioOnlyMode = false;
    }
    setCallAudioOnly(audioOnlyMode);
    setShowCallModal(true);
    setIncomingToastVisible(false);
    // CallModal will handle answering when mounted (it listens to incomingOffer)
  };

  const declineIncomingCall = () => {
    if (incomingOffer && incomingOffer.from) {
      try {
        endCall(incomingOffer.from, selectedConversation ? selectedConversation.id : undefined, 'rejected');
      } catch (e) {
        console.warn('Failed to send decline', e);
      }
    }
    setIncomingToastVisible(false);
    setIncomingOffer(null);
  };
  const [callAudioOnly, setCallAudioOnly] = useState(false);

  // Attach WebRTC callbacks to socket
  useEffect(() => {
    // signalling callbacks are now provided via `useSocket` callbacks
    // keep this effect as a fallback but do not depend on it for core signalling
    // no-op
    return () => {};
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      // If this is a temporary local conversation (not persisted), don't call backend messages endpoint
      if (selectedConversation.id && String(selectedConversation.id).startsWith('temp_')) {
        // clear messages (no persisted history yet)
        setSelectedConversationId(selectedConversation.id);
        // messages will be empty until a message is sent and backend returns a real conversation id
        return;
      }

      loadMessages(selectedConversation.id);
      setSelectedConversationId(selectedConversation.id);
    }
  }, [selectedConversation, loadMessages]);

  // Listen for service-worker driven open conversation events (notification clicks)
  useEffect(() => {
    const handler = async (e: any) => {
      try {
        const convId = e?.detail?.conversationId;
        if (!convId) return;

        // try to find in loaded conversations
        const found = conversations.find((c) => c.id === convId);
        if (found) {
          setSelectedConversation(found);
        } else {
          // reload conversations and attempt to find it
          await loadConversations();
          const reFound = conversations.find((c) => c.id === convId);
          if (reFound) setSelectedConversation(reFound);
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('mbc_open_conversation', handler as EventListener);
    return () => {
      window.removeEventListener('mbc_open_conversation', handler as EventListener);
    };
  }, [conversations, loadConversations, setSelectedConversation]);

  // Mark unread messages as read when viewing conversation
  useEffect(() => {
    if (selectedConversation) {
      messages.forEach((msg) => {
        if (msg.receiver_email === userEmail && !msg.read) {
          markAsRead(msg.id);
          markMessageRead(msg.id);
        }
      });
    }
  }, [selectedConversation, messages, userEmail, markAsRead, markMessageRead]);

  // Search for users to start new conversation
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await messagingApi.searchUsers(query);
      setSearchResults(results.filter((user) => user.email !== userEmail));
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Start new conversation with user
  const handleStartConversation = (user: User) => {
    // single user click: start 1:1 conversation
    const existing = conversations.find((conv) => conv.participants.includes(user.email));
    if (existing) {
      setSelectedConversation(existing);
    } else {
      const newConv: Conversation = {
        id: `temp_${Date.now()}`,
        participants: [userEmail!, user.email],
        type: userRole === 'admin' ? 'admin-doctor' : 'doctor-doctor',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unread_count: 0,
      };
      setSelectedConversation(newConv);
    }

    setShowNewChat(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleSelectUser = (email: string) => {
    setSelectedUsersForNewChat((prev) => {
      if (prev.includes(email)) return prev.filter((p) => p !== email);
      return [...prev, email];
    });
  };

  const createGroupConversation = async () => {
    if (selectedUsersForNewChat.length < 1) return;
    const participants = Array.from(new Set([userEmail!, ...selectedUsersForNewChat]));
    try {
      const conv = await messagingApi.createConversation(participants, 'group', groupName || undefined);
      // Reload conversations and select new
      await loadConversations();
      setSelectedConversation(conv);
      setShowNewChat(false);
      setSelectedUsersForNewChat([]);
      setGroupName('');
    } catch (e) {
      console.error('Failed to create group conversation', e);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    console.log("[MessagePage] Send message clicked");
    
    if (!messageInput.trim() || !selectedConversation) {
      console.log("[MessagePage] Aborted: empty message or no conversation");
      return;
    }

    const receiverEmail = selectedConversation.participants.find(
      (email) => email !== userEmail
    );

    if (!receiverEmail) {
      console.log("[MessagePage] Aborted: no receiver email");
      return;
    }

    console.log("[MessagePage] Sending message via REST API...");
    console.log("[MessagePage] Receiver:", receiverEmail);
    console.log("[MessagePage] Content:", messageInput);

    try {
      // Convert shortcodes (e.g., :smile:) to emoji before sending so storage contains emojis
      const convertedContent = renderShortcodes(messageInput.trim());

      // If the selected conversation uses a temporary id, omit conversation id so backend will create it
      const convIdToSend = selectedConversation.id && String(selectedConversation.id).startsWith('temp_')
        ? undefined
        : selectedConversation.id;

      // Send via REST API (most reliable), include attachments if any
      const response = await messagingApi.sendMessage(
        receiverEmail,
        convertedContent,
        convIdToSend,
        userEmail,
        attachments
      );
      
      console.log("[MessagePage] Message sent successfully:", response);
      
      // Add message to local state
      const newMessage: Message = {
        id: response.id || `local_${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_email: userEmail,
        receiver_email: receiverEmail,
        content: convertedContent,
        attachments: response.attachments || [],
        timestamp: response.timestamp || new Date().toISOString(),
        read: false,
      };
      
      addLocalMessage(newMessage);
      setMessageInput('');
      setIsTyping(false);
    } catch (error) {
      console.error("[MessagePage] Error sending message:", error);
    }
  };

  // Handle file selection and upload immediately
  const handleFileChange = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      // Client-side validation (quick): size limit 10MB, allowed types
      const MAX_BYTES = 10 * 1024 * 1024;
      const allowed = [
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (file.size > MAX_BYTES) {
        console.warn('File too large');
        setUploading(false);
        return;
      }
      if (!allowed.includes(file.type)) {
        console.warn('Unsupported file type', file.type);
        setUploading(false);
        return;
      }

      const meta = await messagingApi.uploadFile(file);
      setAttachments((prev) => [...prev, meta]);
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle typing indicator
  const handleInputChange = (text: string) => {
    setMessageInput(text);

    if (!selectedConversation) return;
    const receiverEmail = selectedConversation.participants.find(
      (email) => email !== userEmail
    );

    if (!receiverEmail) return;

    // Send typing indicator
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      sendTypingStatus(receiverEmail, true);
    }

    // Clear typing after 3 seconds of inactivity
    if (typingTimeout) clearTimeout(typingTimeout);
    const timeout = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(receiverEmail, false);
    }, 3000);

    setTypingTimeout(timeout);
  };

  const selectedConvData = selectedConversation;
  const conversationDisplayName = selectedConvData
    ? selectedConvData.name || (selectedConvData.participants.length > 2
        ? `Group (${selectedConvData.participants.length})`
        : selectedConvData.participants.find((email) => email !== userEmail))
    : undefined;
  const otherUserEmail = selectedConvData?.participants.find((email) => email !== userEmail);
  const isOtherUserTyping = otherUserEmail ? typingUsers[otherUserEmail] : false;

  const [showParticipants, setShowParticipants] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Secure Messaging</h1>
          <p className="text-slate-600 mt-1">
            Communicate securely with other {userRole === 'admin' ? 'doctors' : 'doctors and admins'}
          </p>
        </div>
        <button
          onClick={() => setShowNewChat(!showNewChat)}
          className="p-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-700 hover:to-teal-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Message
        </button>
      </div>

      <Card className="border-slate-200 rounded-2xl overflow-hidden h-[calc(100vh-200px)]">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-slate-500">Loading conversations...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  <p>No conversations yet</p>
                  <p className="text-sm mt-2">Start a new message to begin!</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors border-l-4 ${
                      selectedConversationId === conversation.id
                        ? 'bg-slate-50 border-l-cyan-600'
                        : 'border-l-transparent'
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                          {conversation.participants[0]
                            .split('@')[0]
                            .split('')
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium text-slate-900">
                          {conversation.name || conversation.participants.find((e) => e !== userEmail)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(conversation.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 truncate pr-2">
                          Chat with {conversation.type}
                        </p>
                        {conversation.unread_count > 0 && (
                          <Badge className="w-5 h-5 flex items-center justify-center p-0 bg-cyan-500 text-white text-xs rounded-full">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedConvData ? (
            <div className="flex-1 flex flex-col bg-white">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                      {(conversationDisplayName || otherUserEmail || '')
                        .split('@')[0]
                        .split('')
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{conversationDisplayName || otherUserEmail}</div>
                    <div className="text-xs text-slate-500">
                      {isConnected ? '🟢 Online' : '⚪ Offline'}
                    </div>
                  </div>
                  {selectedConvData && selectedConvData.participants.length > 1 && (
                    <button onClick={() => setShowParticipants((s) => !s)} className="ml-3 text-xs px-2 py-1 bg-slate-100 rounded">
                      {showParticipants ? 'Hide participants' : 'Show participants'}
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { if (otherUserEmail) { setCallPeer(otherUserEmail); setCallAudioOnly(false); setShowCallModal(true); } }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors mr-2">
                    <Video className="w-5 h-5 text-slate-600" />
                  </button>
                  <button onClick={() => { if (otherUserEmail) { setCallPeer(otherUserEmail); setCallAudioOnly(true); setShowCallModal(true); setIncomingOffer(null); } }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors mr-2" title="Start audio call">
                    <Phone className="w-5 h-5 text-slate-600" />
                  </button>
                  <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>

              {showParticipants && selectedConvData && (
                <div className="p-2 border-b border-slate-100 bg-white">
                  <div className="text-xs text-slate-500 mb-2">Participants</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedConvData.participants.map((p) => (
                      <div key={p} className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-xs">
                            {p.split('@')[0].slice(0,2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-xs text-slate-700">{p}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_email === userEmail ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] ${
                        message.sender_email === userEmail ? 'order-2' : 'order-1'
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.sender_email === userEmail
                            ? 'bg-gradient-to-br from-cyan-600 to-teal-600 text-white'
                            : 'bg-white text-slate-900 border border-slate-200'
                        }`}
                      >
                        {message.deleted ? (
                          <p className="text-sm italic text-slate-400">Message deleted</p>
                        ) : editingId === message.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea value={editBuffer} onChange={(e) => setEditBuffer(e.target.value)} className="w-full p-2 border rounded" />
                            <div className="flex gap-2">
                              <button onClick={async () => {
                                try {
                                  const updated = await messagingApi.editMessage(message.id, editBuffer);
                                  handleMessageEdited(updated);
                                  setEditingId(null);
                                  setEditBuffer('');
                                } catch (e) { console.error(e); }
                              }} className="px-2 py-1 bg-cyan-600 text-white rounded">Save</button>
                              <button onClick={() => { setEditingId(null); setEditBuffer(''); }} className="px-2 py-1 border rounded">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm break-words">{renderShortcodes(message.content)}</p>
                        )}
                      </div>
                      <div
                        className={`text-xs text-slate-400 mt-1 ${
                          message.sender_email === userEmail ? 'text-right' : 'text-left'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {message.sender_email === userEmail && message.read && (
                          <span className="text-blue-500 ml-1">✓✓</span>
                        )}
                      </div>
                      {message.sender_email === userEmail && !message.deleted && (
                        <div className="mt-1 flex gap-2 justify-end">
                          <button onClick={() => { setEditingId(message.id); setEditBuffer(message.content); }} className="text-xs text-slate-500 px-2 py-1 hover:bg-slate-100 rounded">Edit</button>
                          <button onClick={async () => {
                            if (!confirm('Delete this message?')) return;
                            try {
                              await messagingApi.deleteMessage(message.id);
                              handleMessageDeleted(message.id);
                            } catch (e) { console.error(e); }
                          }} className="text-xs text-red-500 px-2 py-1 hover:bg-slate-100 rounded">Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isOtherUserTyping && (
                  <div className="flex justify-start">
                    <div className="text-xs text-slate-500 italic">
                      {otherUserEmail} is typing...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-200 bg-white">
                <div className="flex items-end gap-3">
                  <label className="p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                    <Paperclip className="w-5 h-5 text-slate-600" />
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files ? e.target.files[0] : undefined;
                        handleFileChange(f);
                        // reset input
                        if (e.target) e.target.value = '';
                      }}
                    />
                  </label>
                  <div className="flex-1 relative">
                    <textarea
                      value={messageInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <div className="absolute right-3 bottom-12">
                      {showEmojiPicker && (
                        <div className="z-50">
                          <EmojiPicker onSelect={(emoji) => {
                            // insert emoji at cursor end
                            setMessageInput((prev) => prev + emoji);
                            setShowEmojiPicker(false);
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setShowEmojiPicker((s) => !s)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <Smile className="w-5 h-5 text-slate-600" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="p-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                {attachments.length > 0 && (
                  <div className="p-2 mt-2 bg-slate-50 rounded-xl flex gap-2 items-center overflow-x-auto">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2 py-1">
                        <div className="relative">
                          {att.mime?.startsWith('image/') ? (
                            <img src={att.url} alt={att.filename} className="w-12 h-8 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-8 flex items-center justify-center bg-slate-100 rounded text-xs">{att.filename.split('.').pop()}</div>
                          )}
                          <button onClick={() => removeAttachment(idx)} title="Remove" className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow">
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-600 max-w-xs truncate">{att.filename}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-2">
                  All messages are encrypted and HIPAA-compliant
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <div className="text-slate-400 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium">Select a conversation</p>
                <p className="text-slate-500 text-sm mt-1">
                  or create a new message to get started
                </p>
              </div>
            </div>
          )}

          {/* New Chat Modal */}
          {showNewChat && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-96 border-slate-200 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">New Message</h2>
                    <button
                      onClick={() => {
                        setShowNewChat(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search users by email or name..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div className="mb-3">
                    {selectedUsersForNewChat.length > 0 && (
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {selectedUsersForNewChat.map((email) => (
                          <div key={email} className="px-2 py-1 bg-cyan-50 text-cyan-800 rounded-full text-xs flex items-center gap-2">
                            <span>{email.split('@')[0]}</span>
                            <button onClick={() => toggleSelectUser(email)} className="p-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 ml-auto">
                          <input
                            type="text"
                            placeholder="Group name (optional)"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="px-2 py-1 rounded-md border border-slate-200 text-sm"
                          />
                          <button
                            onClick={createGroupConversation}
                            disabled={selectedUsersForNewChat.length < 1}
                            className="px-3 py-1 bg-cyan-600 text-white rounded-md text-sm disabled:opacity-50"
                          >
                            Create Group
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {searchResults.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">
                          {searchQuery.length < 2 ? 'Type to search...' : 'No results found'}
                        </p>
                      ) : (
                        searchResults.map((user) => (
                          <div
                            key={user.email}
                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left"
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsersForNewChat.includes(user.email)}
                              onChange={() => toggleSelectUser(user.email)}
                              className="mr-2"
                            />
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-xs">
                                {user.email
                                  .split('@')[0]
                                  .split('')
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStartConversation(user)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-md text-sm"
                              >
                                Start
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {/* Incoming call toast */}
          {incomingToastVisible && incomingOffer && (
            <div className="fixed bottom-8 right-8 z-50">
              <div className="bg-white border shadow p-4 rounded-lg w-80">
                <div className="font-medium">Incoming call from {incomingOffer.from}</div>
                <div className="text-xs text-slate-500 mt-1">Conversation: {incomingOffer.conversation_id || 'N/A'}</div>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={declineIncomingCall} className="px-3 py-2 bg-white border rounded">Decline</button>
                  <button onClick={acceptIncomingCall} className="px-3 py-2 bg-cyan-600 text-white rounded">Accept</button>
                </div>
              </div>
            </div>
          )}

          {/* Call Modal */}
          {showCallModal && callPeer && (
            <CallModal
              isOpen={showCallModal}
              onClose={() => { setShowCallModal(false); setCallPeer(null); setIncomingOffer(null); }}
              userEmail={userEmail!}
              peerEmail={callPeer}
              conversationId={selectedConversation ? selectedConversation.id : undefined}
              incomingOffer={incomingOffer}
              audioOnly={callAudioOnly}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

