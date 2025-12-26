/**
 * REST API calls for messaging
 */
import { apiUrl } from "../config";
import { Message, Conversation, User } from "../types/messaging";

export const messagingApi = {
  /**
   * Get all conversations for a user
   */
  getConversations: async (userEmail: string): Promise<Conversation[]> => {
    const response = await fetch(
      apiUrl(`/api/conversations?user_email=${encodeURIComponent(userEmail)}`)
    );
    if (!response.ok) throw new Error("Failed to fetch conversations");
    return response.json();
  },

  /**
   * Get messages from a conversation
   */
  getMessages: async (
    conversationId: string,
    limit: number = 30,
    skip: number = 0
  ): Promise<Message[]> => {
    const response = await fetch(
      apiUrl(
        `/api/conversations/${conversationId}/messages?limit=${limit}&skip=${skip}`
      )
    );
    if (!response.ok) throw new Error("Failed to fetch messages");
    return response.json();
  },

  /**
   * Send a message (REST API fallback)
   */
  sendMessage: async (
    receiverEmail: string,
    content: string,
    conversationId?: string,
    senderEmail?: string,
    attachments?: Array<{ filename: string; url: string; mime?: string; size?: number }>
  ): Promise<Message> => {
    // Get sender email from sessionStorage first (per-tab), then fallback to localStorage
    const sender = senderEmail || sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail') || 'unknown@example.com';
    
    const response = await fetch(apiUrl("/api/messages"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_email: sender,
        receiver_email: receiverEmail,
        content,
        conversation_id: conversationId,
        attachments: attachments || [],
      }),
    });
    if (!response.ok) throw new Error("Failed to send message");
    return response.json();
  },

  /**
   * Upload a file to the backend and return attachment metadata
   */
  uploadFile: async (file: File): Promise<{ filename: string; url: string; mime: string; size: number }> => {
    const form = new FormData();
    form.append('file', file);

    const response = await fetch(apiUrl('/api/uploads'), {
      method: 'POST',
      body: form,
    });
    if (!response.ok) throw new Error('Failed to upload file');
    return response.json();
  },
  /** Create a new group conversation with multiple participants */
  createConversation: async (participants: string[], type: string = 'group', name?: string) => {
    const body: any = { participants, type };
    if (name) body.name = name;
    const response = await fetch(apiUrl('/api/conversations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Failed to create conversation');
    return response.json();
  },

  /**
   * Mark a message as read
   */
  markMessageRead: async (messageId: string): Promise<void> => {
    const response = await fetch(apiUrl(`/api/messages/${messageId}/read`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to mark message as read");
  },

  editMessage: async (messageId: string, content: string) => {
    const response = await fetch(apiUrl(`/api/messages/${messageId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Failed to edit message');
    return response.json();
  },

  deleteMessage: async (messageId: string) => {
    const response = await fetch(apiUrl(`/api/messages/${messageId}`), {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete message');
    return response.json();
  },

  /**
   * Search for users to start conversation
   */
  searchUsers: async (query: string): Promise<User[]> => {
    const response = await fetch(
      apiUrl(`/api/users/search?q=${encodeURIComponent(query)}`)
    );
    if (!response.ok) throw new Error("Failed to search users");
    return response.json();
  },

  /**
   * Get unread message count
   */
  getUnreadCount: async (userEmail: string): Promise<number> => {
    const response = await fetch(
      apiUrl(`/api/messages/unread-count?user_email=${encodeURIComponent(userEmail)}`)
    );
    if (!response.ok) throw new Error("Failed to fetch unread count");
    const data = await response.json();
    return data.unread_count;
  },
};
