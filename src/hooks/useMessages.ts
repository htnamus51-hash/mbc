/**
 * useMessages Hook - Manages messaging state (conversations, messages, etc)
 */
import { useState, useCallback, useEffect } from "react";
import { Message, Conversation } from "../types/messaging";
import { messagingApi } from "../services/messagingApi";

export function useMessages(userEmail: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userEmail) return;

    setLoading(true);
    setError(null);

    try {
      const convs = await messagingApi.getConversations(userEmail);
      setConversations(convs);

      // Calculate total unread
      const total = convs.reduce((sum, conv) => sum + conv.unread_count, 0);
      setUnreadCount(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (conversationId: string, limit: number = 30, skip: number = 0) => {
      setLoading(true);
      setError(null);

      try {
        const msgs = await messagingApi.getMessages(conversationId, limit, skip);
        if (skip === 0) {
          setMessages(msgs);
        } else {
          // Prepend older messages when loading more
          setMessages((prev: Message[]) => [...msgs, ...prev]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Handle incoming message
  const handleMessageReceived = useCallback((message: Message) => {
    setMessages((prev: Message[]) => [...prev, message]);

    // Update conversation's last_message_at
    setConversations((prev: Conversation[]) =>
      prev.map((conv: Conversation) =>
        conv.id === message.conversation_id
          ? {
              ...conv,
              last_message_at: message.timestamp,
              unread_count: conv.unread_count + 1,
            }
          : conv
      )
    );

    setUnreadCount((prev: number) => prev + 1);
  }, []);

  // Handle message sent
  const handleMessageSent = useCallback((message: Message) => {
    setMessages((prev: Message[]) => [...prev, message]);
  }, []);

  const handleMessageEdited = useCallback((edited: Message) => {
    setMessages((prev: Message[]) => prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m)));
  }, []);

  const handleMessageDeleted = useCallback((messageId: string) => {
    setMessages((prev: Message[]) => prev.map((m) => (m.id === messageId ? { ...m, content: '', deleted: true } : m)));
  }, []);

  // Handle typing status
  const handleTypingStatus = useCallback((data: { sender_email: string; is_typing: boolean }) => {
    setTypingUsers((prev: Record<string, boolean>) => ({
      ...prev,
      [data.sender_email]: data.is_typing,
    }));
  }, []);

  // Handle message read
  const handleMessageRead = useCallback((messageId: string) => {
    setMessages((prev: Message[]) =>
      prev.map((msg: Message) =>
        msg.id === messageId ? { ...msg, read: true } : msg
      )
    );
  }, []);

  // Add message to local state
  const addLocalMessage = useCallback(
    (message: Message) => {
      setMessages((prev: Message[]) => [...prev, message]);

      // Create or update conversation
      const existingConv = conversations.find(
        (conv: Conversation) => conv.id === message.conversation_id
      );

      if (existingConv) {
        setConversations((prev: Conversation[]) =>
          prev.map((conv: Conversation) =>
            conv.id === message.conversation_id
              ? {
                  ...conv,
                  last_message_at: message.timestamp,
                  updated_at: message.timestamp,
                }
              : conv
          )
        );
      }
    },
    [conversations]
  );

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await messagingApi.markMessageRead(messageId);
      handleMessageRead(messageId);
    } catch (err) {
      console.error("Failed to mark message as read:", err);
    }
  }, [handleMessageRead]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Poll for new messages for the selected conversation as a fallback
  useEffect(() => {
    let intervalId: any = null;
    let cancelled = false;

    const startPolling = async (conversationId: string) => {
      try {
        const msgs = await messagingApi.getMessages(conversationId, 30, 0);
        if (!cancelled) setMessages(msgs);
      } catch (err) {
        // ignore polling errors
      }
    };

    if (selectedConversation) {
      startPolling(selectedConversation.id);
      intervalId = setInterval(() => {
        if (selectedConversation) startPolling(selectedConversation.id);
      }, 2000);
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedConversation]);

  return {
    conversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    setMessages,
    unreadCount,
    loading,
    error,
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
  };
}
