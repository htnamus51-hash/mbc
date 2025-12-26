/**
 * TypeScript types for messaging feature
 */

export interface Message {
  id: string;
  conversation_id: string;
  sender_email: string;
  receiver_email: string;
  content: string;
  timestamp: string;
  read: boolean;
  read_at?: string;
  attachments?: Array<{ filename: string; url: string; mime?: string; size?: number }>;
}

export interface Conversation {
  id: string;
  participants: string[];
  type: "admin-admin" | "doctor-doctor" | "admin-doctor";
  // 'group' added for multi-participant conversations
  type: "admin-admin" | "doctor-doctor" | "admin-doctor" | "group";
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  unread_count: number;
}

export interface User {
  email: string;
  full_name: string;
  role: "admin" | "doctor";
}

export interface TypingStatus {
  sender_email: string;
  is_typing: boolean;
}

export interface OnlineStatus {
  email: string;
  name: string;
}
