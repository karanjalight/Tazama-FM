export interface SharedTrack {
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

/** `path` is a private Storage object path, never a public URL — playback
 * always goes through a fresh signed URL fetched right before playing. */
export interface VoiceNote {
  path: string;
  durationMs: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  kind: "text" | "track" | "voice";
  body: string | null;
  track: SharedTrack | null;
  voice: VoiceNote | null;
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
  kind: "text" | "track" | "voice";
  body?: string;
  track?: SharedTrack;
  voice?: VoiceNote;
}
