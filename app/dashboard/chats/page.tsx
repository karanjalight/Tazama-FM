import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/profile";
import { listConversationsForUser } from "@/lib/chats/store";
import { ConversationList } from "@/components/chats/conversation-list";

export const metadata: Metadata = { title: "Chats" };

export default async function ChatsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const conversations = await listConversationsForUser(profile.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">Chats</h1>
      <ConversationList conversations={conversations} />
    </div>
  );
}
