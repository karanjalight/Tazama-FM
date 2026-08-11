import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chats" };

export default function ChatsIndexPage() {
  return (
    <div className="flex h-full flex-1 items-center justify-center p-8 text-center">
      <p className="text-sm text-muted-foreground">Select a conversation to start chatting.</p>
    </div>
  );
}
