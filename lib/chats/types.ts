export interface SharedTrack {
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  kind: "text" | "track";
  body: string | null;
  track: SharedTrack | null;
  createdAt: string;
}

export interface ConversationParticipant {
  id: string;
  fullName: string;
  avatarKey: string | null;
}

export interface ConversationSummary {
  id: string;
  kind: "dm" | "group";
  name: string | null;
  otherParticipants: ConversationParticipant[];
  lastMessage: ChatMessage | null;
  unread: boolean;
}

export interface SendMessageInput {
  kind: "text" | "track";
  body?: string;
  track?: SharedTrack;
}
