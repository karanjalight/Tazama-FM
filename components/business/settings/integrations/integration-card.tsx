"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Integration } from "./mock-data";
import { ComingSoonBadge, StatusDot } from "./status-dot";

const ROSE_OUTLINE = "border-rose-500/30 text-rose-400 hover:bg-rose-500/10";

function IntegrationIcon({ integration }: { integration: Integration }) {
  const Icon = integration.icon;
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
      <Icon className="size-5" />
    </span>
  );
}

/** Keyboard-accessible "the whole card body is clickable" wrapper, used for connected cards. */
function ClickableCardShell({
  onActivate,
  children,
  ariaLabel,
}: {
  onActivate?: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  if (!onActivate) {
    return <div className="rounded-2xl border border-border bg-card p-5">{children}</div>;
  }
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      className="cursor-pointer rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-muted/40"
    >
      {children}
    </div>
  );
}

/** Card shown in the "Connected" strip up top — full Manage/Disconnect controls. */
export function ConnectedIntegrationCard({
  integration,
  onOpenDetail,
  onDisconnect,
}: {
  integration: Integration;
  onOpenDetail: (id: string) => void;
  onDisconnect: (id: string) => void;
}) {
  return (
    <ClickableCardShell
      onActivate={() => onOpenDetail(integration.id)}
      ariaLabel={`View ${integration.name} details`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IntegrationIcon integration={integration} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{integration.name}</p>
            <p className="text-xs text-muted-foreground">{integration.categoryLabel}</p>
          </div>
        </div>
        <StatusDot label="Active" className="shrink-0" />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">Connected {integration.connectedAt}</p>

      <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onOpenDetail(integration.id)}
        >
          Manage
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("flex-1", ROSE_OUTLINE)}
          onClick={() => onDisconnect(integration.id)}
        >
          Disconnect
        </Button>
      </div>
    </ClickableCardShell>
  );
}

/** Card shown in the full marketplace grid — one per integration, treatment varies by status. */
export function MarketplaceIntegrationCard({
  integration,
  onOpenDetail,
  onConnectClick,
  onLearnMoreClick,
  onNotifyClick,
}: {
  integration: Integration;
  onOpenDetail: (id: string) => void;
  onConnectClick: (id: string) => void;
  onLearnMoreClick: (id: string) => void;
  onNotifyClick: (id: string) => void;
}) {
  const { status } = integration;

  return (
    <ClickableCardShell
      onActivate={status === "connected" ? () => onOpenDetail(integration.id) : undefined}
      ariaLabel={`View ${integration.name} details`}
    >
      <div className="flex items-center gap-3">
        <IntegrationIcon integration={integration} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-foreground">{integration.name}</p>
            {status === "coming-soon" && <ComingSoonBadge />}
          </div>
          <p className="text-xs text-muted-foreground">{integration.categoryLabel}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {status === "coming-soon"
          ? `We're preparing direct ${integration.name} connectivity for Tazama businesses.`
          : integration.description}
      </p>

      <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        {status === "connected" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Check className="size-3" />
            Connected
          </span>
        )}
        {status === "available" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onConnectClick(integration.id)}
          >
            Connect
          </Button>
        )}
        {status === "coming-soon" && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onLearnMoreClick(integration.id)}
            >
              Learn More
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNotifyClick(integration.id)}
            >
              Notify Me
            </Button>
          </>
        )}
      </div>
    </ClickableCardShell>
  );
}
