import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/profile";
import { isParticipant, listMessages } from "@/lib/chats/store";
import { isBlockedEitherWay } from "@/lib/social/blocks";
import { createAdminClient } from "@/lib/supabase/admin";
import { ThreadView } from "@/components/chats/thread-view";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { id } = await params;
  const allowed = await isParticipant(id, profile.id);
  if (!allowed) redirect("/dashboard/chats");

  const messages = await listMessages(id, profile.id);

  const admin = createAdminClient();
  const { data: participants } = admin
    ? await admin
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", id)
    : { data: [] };
  const others = (participants ?? [])
    .map((p) => p.user_id as string)
    .filter((uid) => uid !== profile.id);
  let blocked = false;
  for (const otherId of others) {
    if (await isBlockedEitherWay(profile.id, otherId)) {
      blocked = true;
      break;
    }
  }

  return (
    <ThreadView
      conversationId={id}
      viewerId={profile.id}
      initialMessages={messages}
      blocked={blocked}
    />
  );
}
