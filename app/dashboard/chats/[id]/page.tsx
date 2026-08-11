import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/profile";
import { isParticipant, listMessages } from "@/lib/chats/store";
import { isBlockedEitherWay } from "@/lib/social/blocks";
import { getListeningStatus } from "@/lib/social/play-history";
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

  const { data: conversation } = admin
    ? await admin.from("conversations").select("kind, name").eq("id", id).maybeSingle()
    : { data: null };

  const { data: participants } = admin
    ? await admin
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", id)
    : { data: [] };
  const otherIds = (participants ?? [])
    .map((p) => p.user_id as string)
    .filter((uid) => uid !== profile.id);

  let blocked = false;
  for (const otherId of otherIds) {
    if (await isBlockedEitherWay(profile.id, otherId)) {
      blocked = true;
      break;
    }
  }

  const isGroup = conversation?.kind === "group";
  let headerTitle = (conversation?.name as string | null) || "Group chat";
  let headerAvatarKey: string | null = null;
  let headerOtherUserId: string | null = null;
  let headerSubtitle: string | null = null;

  if (!isGroup && otherIds.length === 1) {
    headerOtherUserId = otherIds[0];
    const { data: otherProfile } = admin
      ? await admin
          .from("profiles")
          .select("full_name, avatar_key")
          .eq("id", headerOtherUserId)
          .maybeSingle()
      : { data: null };
    headerTitle = (otherProfile?.full_name as string | null) || "Tazama listener";
    headerAvatarKey = (otherProfile?.avatar_key as string | null) ?? null;
    if (!blocked) {
      headerSubtitle = await getListeningStatus(headerOtherUserId, profile.id);
    }
  }

  return (
    <ThreadView
      conversationId={id}
      viewerId={profile.id}
      initialMessages={messages}
      blocked={blocked}
      headerTitle={headerTitle}
      headerSubtitle={headerSubtitle}
      headerOtherUserId={headerOtherUserId}
      headerAvatarKey={headerAvatarKey}
    />
  );
}
