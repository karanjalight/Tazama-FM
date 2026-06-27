import Image from "next/image";
import { Building2 } from "lucide-react";

import { avatarSrc } from "@/lib/auth/avatars";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/components/auth/account-type-toggle";

const SIZE = {
  sm: "size-8 text-xs",
  md: "size-9 text-sm",
  lg: "size-11 text-base",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "T";
}

/** The avatar visual for a user: chosen avatar, business mark, or initials. */
export function UserBadge({
  accountType,
  avatarKey,
  name,
  size = "md",
  className,
}: {
  accountType: AccountType | null;
  avatarKey: string | null;
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  if (accountType === "individual" && avatarKey) {
    return (
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl",
          SIZE[size],
          className,
        )}
      >
        <Image
          src={avatarSrc(avatarKey)}
          alt=""
          fill
          sizes="44px"
          className="object-cover"
        />
      </span>
    );
  }

  if (accountType === "business") {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-xl bg-ink text-white dark:bg-white dark:text-ink",
          SIZE[size],
          className,
        )}
      >
        <Building2 className="size-1/2" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl bg-ink font-semibold text-white dark:bg-white dark:text-ink",
        SIZE[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
