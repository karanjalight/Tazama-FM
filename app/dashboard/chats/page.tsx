import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/profile";
import { listConversationsForUser } from "@/lib/chats/store";
import { ChatsInboxShell } from "@/components/chats/chats-inbox-shell";

export const metadata: Metadata = { title: "Chats" };

export default async function ChatsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const conversations = await listConversationsForUser(profile.id);

  return <ChatsInboxShell conversations={conversations} />;
}
