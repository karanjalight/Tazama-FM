import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/profile";
import { listConversationsForUser } from "@/lib/chats/store";
import { ChatsSplitShell } from "@/components/chats/chats-split-shell";

export default async function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const conversations = await listConversationsForUser(profile.id);

  return (
    <ChatsSplitShell conversations={conversations} viewerId={profile.id}>
      {children}
    </ChatsSplitShell>
  );
}
