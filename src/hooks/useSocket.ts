/**
 * useSocket Hook - Manages WebSocket connection for real-time messaging
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { apiUrl } from "../config";
import { Message, TypingStatus, OnlineStatus } from "../types/messaging";
import { showNotification } from "../utils/notifications";

interface SocketHookCallbacks {
  onMessageReceived?: (message: Message) => void;
  onMessageSent?: (message: Message) => void;
  onTyping?: (status: TypingStatus) => void;
  onMessageRead?: (messageId: string, readAt: string) => void;
  onUserOnline?: (status: OnlineStatus) => void;
  onUserOffline?: (email: string) => void;
  onError?: (error: string) => void;
  onMessageEdited?: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
  // WebRTC signalling callbacks
  onCallInvite?: (payload: any) => void;
  onCallOffer?: (payload: any) => void;
  onCallAnswer?: (payload: any) => void;
  onCallIce?: (payload: any) => void;
  onCallEnd?: (payload: any) => void;
}

export function useSocket(
  userEmail: string | null,
  callbacks: SocketHookCallbacks
) {
  const userEmailRef = useRef<string | null>(userEmail);
  userEmailRef.current = userEmail;
  // Keep a module-level singleton socket to avoid multiple connections
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const callbacksRef = useRef<SocketHookCallbacks>(callbacks);
  callbacksRef.current = callbacks;

  // Initialize socket connection once per page/tab and register handlers once.
  useEffect(() => {
    if (!userEmail) return;

    // If socket already exists, reuse it
    if (!socketRef.current) {
      const socket = io(apiUrl(""), {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        autoConnect: true,
      });
      socketRef.current = socket;
      // expose socket on window for other parts of the app to call disconnect() if necessary
      try {
        (window as any).__mbc_socket = socket;
      } catch (e) {
        // ignore (non-browser env)
      }
    }

    const socket = socketRef.current as Socket;

    // Avoid registering handlers multiple times
    if ((socket as any).__handlersRegistered) {
      // Ensure we still emit user_joined (in case of reconnect)
      if (socket.connected) {
        socket.emit("user_joined", { email: userEmail });
      }
      return;
    }

    socket.on("connect", () => {
      console.log("[Socket] Connected to server");
      console.log("[Socket] Socket ID:", socket.id);
      setIsConnected(true);
      console.log("[Socket] Emitting user_joined with email:", userEmail);
      // include access token if present in sessionStorage/localStorage
      const token = (typeof window !== 'undefined')
        ? sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken')
        : null;
      socket.emit("user_joined", token ? { email: userEmail, token } : { email: userEmail });
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected", reason);
      setIsConnected(false);
    });

    socket.on("receive_message", (message: Message) => {
      callbacksRef.current.onMessageReceived?.(message);
      try {
        // Show desktop notification if tab is not visible and sender is not current user
        if (typeof document !== "undefined" && document.hidden) {
          const currentEmail = userEmailRef.current;
          if (message && message.sender_email && message.sender_email !== currentEmail) {
            showNotification(message.sender_email, {
              body: message.content ?? "",
              tag: message.conversation_id,
              data: { conversationId: message.conversation_id },
            } as any);
          }
        }
      } catch (e) {
        /* ignore notification errors */
      }
    });

    socket.on("message_sent_confirmed", (message: Message) => {
      callbacksRef.current.onMessageSent?.(message);
    });

    socket.on("user_typing", (status: TypingStatus) => {
      callbacksRef.current.onTyping?.(status);
    });

    socket.on("message_read_receipt", (data: { message_id: string; read_at: string }) => {
      callbacksRef.current.onMessageRead?.(data.message_id, data.read_at);
    });

      socket.on("message_edited", (message) => {
        callbacksRef.current.onMessageEdited?.(message);
      });

      socket.on("message_deleted", (data: { id: string; deleted: boolean }) => {
        callbacksRef.current.onMessageDeleted?.(data.id);
      });

    socket.on("user_online", (status: OnlineStatus) => {
      callbacksRef.current.onUserOnline?.(status);
    });

    socket.on("user_offline", (data: { email: string }) => {
      callbacksRef.current.onUserOffline?.(data.email);
    });

    // WebRTC signalling handlers
    socket.on("call.invite", (payload) => {
      callbacksRef.current.onCallInvite?.(payload);
      try { window.dispatchEvent(new CustomEvent('mbc_incoming_call', { detail: { type: 'invite', payload } })); } catch (e) {}
    });

    socket.on("call.offer", (payload) => {
      callbacksRef.current.onCallOffer?.(payload);
      try { window.dispatchEvent(new CustomEvent('mbc_incoming_call', { detail: { type: 'offer', payload } })); } catch (e) {}
    });

    socket.on("call.answer", (payload) => {
      callbacksRef.current.onCallAnswer?.(payload);
      try { window.dispatchEvent(new CustomEvent('mbc_call_answer', { detail: payload })); } catch (e) {}
    });

    socket.on("call.ice", (payload) => {
      callbacksRef.current.onCallIce?.(payload);
      try { window.dispatchEvent(new CustomEvent('mbc_call_ice', { detail: payload })); } catch (e) {}
    });

    socket.on("call.end", (payload) => {
      callbacksRef.current.onCallEnd?.(payload);
      try { window.dispatchEvent(new CustomEvent('mbc_call_end', { detail: payload })); } catch (e) {}
    });

    socket.on("error", (error: { message: string }) => {
      console.error("[Socket] Error:", error?.message || error);
      callbacksRef.current.onError?.(error?.message || String(error));
    });

    // mark that we've registered handlers for this socket
    (socket as any).__handlersRegistered = true;

    // Keep socket alive for the lifetime of the page/tab. Do not disconnect on hook unmount to avoid reconnect churn.
    // If you need to fully teardown (e.g., logout), call `socket.disconnect()` explicitly from your auth flow.
    // No cleanup needed here.
  }, [userEmail]);

  // Send message
  const sendMessage = useCallback(
    (receiverEmail: string, content: string, conversationId?: string) => {
      console.log("[useSocket] sendMessage called");
      console.log("[useSocket] isConnected:", socketRef.current?.connected);
      console.log("[useSocket] receiverEmail:", receiverEmail);
      console.log("[useSocket] content:", content);
      console.log("[useSocket] conversationId:", conversationId);
      
      if (!socketRef.current?.connected) {
        console.warn("[useSocket] NOT CONNECTED - using fallback");
        callbacksRef.current.onError?.(
          "Not connected. Message will be saved for later delivery."
        );
        return;
      }

      console.log("[useSocket] Emitting send_message event...");
      socketRef.current.emit("send_message", {
        receiver_email: receiverEmail,
        content,
        conversation_id: conversationId,
      });
      console.log("[useSocket] send_message event emitted");
    },
    []
  );

  // Typing indicator
  const sendTypingStatus = useCallback((receiverEmail: string, isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("user_typing", {
        receiver_email: receiverEmail,
        is_typing: isTyping,
      });
    }
  }, []);

  // Mark message as read
  const markMessageRead = useCallback((messageId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("mark_message_read", {
        message_id: messageId,
      });
    }
  }, []);

  // Allow explicit disconnect (useful on logout)
  const disconnect = useCallback(() => {
    const s = socketRef.current as Socket | null;
    if (s) {
      try {
        s.disconnect();
      } catch (e) {
        console.warn("[useSocket] error during disconnect", e);
      }
      try {
        (s as any).__handlersRegistered = false;
      } catch (e) {
        /* ignore */
      }
      socketRef.current = null;
      try {
        delete (window as any).__mbc_socket;
      } catch (e) {
        /* ignore */
      }
      setIsConnected(false);
    }
  }, []);

  return {
    isConnected,
    sendMessage,
    sendTypingStatus,
    markMessageRead,
    socket: socketRef.current,
    disconnect,
    // Call signalling emitters
    inviteCall: (to: string, conversationId?: string, meta?: any) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call.invite', { to, conversation_id: conversationId, meta });
      }
    },
    sendOffer: (to: string, sdp: any, conversationId?: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call.offer', { to, sdp, conversation_id: conversationId });
      }
    },
    sendAnswer: (to: string, sdp: any, conversationId?: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call.answer', { to, sdp, conversation_id: conversationId });
      }
    },
    sendIce: (to: string, candidate: any, conversationId?: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call.ice', { to, candidate, conversation_id: conversationId });
      }
    },
    endCall: (to: string, conversationId?: string, reason?: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call.end', { to, conversation_id: conversationId, reason });
      }
    }
  };
}
