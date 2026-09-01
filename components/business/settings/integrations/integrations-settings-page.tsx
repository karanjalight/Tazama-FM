"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CategoryFilters } from "./category-filters";
import { ConnectIntegrationDialog } from "./connect-integration-dialog";
import { ConnectedIntegrationCard, MarketplaceIntegrationCard } from "./integration-card";
import { DisconnectConfirmDialog } from "./disconnect-confirm-dialog";
import { EmptyIntegrationsState } from "./empty-state";
import { IntegrationDetailDrawer } from "./integration-detail-drawer";
import { LearnMoreDialog } from "./learn-more-dialog";
import { presentationFor, type FilterCategory, type Integration } from "./mock-data";
import { connectIntegration, disconnectIntegration } from "@/app/business/settings/actions";
import type { Integration as DbIntegration } from "@/lib/business/settings-queries";

/** Maps the `?category=` query param (e.g. from a "Devices" nav link) to a filter tab. */
const CATEGORY_PARAM_MAP: Record<string, FilterCategory> = {
  payments: "Payments",
  music: "Music",
  devices: "Devices",
  communication: "Communication",
  analytics: "Analytics",
};

function formatConnectedAt(iso: string | null): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Merges real connection state (from Supabase) with the static per-provider
 * presentation metadata (icon, capability/permission copy) the UI needs. */
function toUiIntegration(row: DbIntegration): Integration {
  const meta = presentationFor(row.key);
  return {
    id: row.key,
    name: row.name,
    categoryLabel: meta.categoryLabel,
    filterCategory: meta.filterCategory,
    description: row.description,
    status: row.status === "coming_soon" ? "coming-soon" : row.status,
    icon: meta.icon,
    connectedAt: formatConnectedAt(row.connectedAt),
    account: row.accountLabel ?? undefined,
    capabilities: meta.capabilities,
    permissions: meta.permissions,
  };
}

function IntegrationsSettingsPageInner({
  businessId,
  integrations: dbIntegrations,
}: {
  businessId: string;
  integrations: DbIntegration[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const integrations = React.useMemo(
    () => dbIntegrations.map(toUiIntegration),
    [dbIntegrations],
  );

  const [filter, setFilter] = React.useState<FilterCategory>(() => {
    const raw = searchParams.get("category")?.toLowerCase() ?? "";
    return CATEGORY_PARAM_MAP[raw] ?? "All";
  });

  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [connectId, setConnectId] = React.useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = React.useState(false);
  const [disconnectId, setDisconnectId] = React.useState<string | null>(null);
  const [learnMoreId, setLearnMoreId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const connected = integrations.filter((i) => i.status === "connected");
  const marketplace =
    filter === "All" ? integrations : integrations.filter((i) => i.filterCategory === filter);

  const detailIntegration = integrations.find((i) => i.id === detailId) ?? null;
  const connectIntegrationRow = integrations.find((i) => i.id === connectId) ?? null;
  const disconnectIntegrationRow = integrations.find((i) => i.id === disconnectId) ?? null;
  const learnMoreIntegration = integrations.find((i) => i.id === learnMoreId) ?? null;

  function openConnectDialogFor(id: string) {
    setConnectId(id);
    setConnectDialogOpen(true);
  }

  function openGenericConnectDialog() {
    const nextAvailable = integrations.find((i) => i.status === "available");
    setConnectId(nextAvailable ? nextAvailable.id : null);
    setConnectDialogOpen(true);
  }

  async function handleConnect(id: string, accountLabel: string) {
    setPending(true);
    const result = await connectIntegration({
      businessId,
      integrationKey: id,
      accountLabel,
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    const name = integrations.find((i) => i.id === id)?.name ?? "Integration";
    setConnectDialogOpen(false);
    setConnectId(null);
    toast.success(`${name} connected successfully`);
    router.refresh();
  }

  async function handleDisconnectConfirm(id: string) {
    setPending(true);
    const result = await disconnectIntegration({ businessId, integrationKey: id });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    const name = integrations.find((i) => i.id === id)?.name ?? "Integration";
    setDisconnectId(null);
    if (detailId === id) setDetailId(null);
    toast.success(`${name} disconnected`);
    router.refresh();
  }

  function handleNotify(id: string) {
    const target = integrations.find((i) => i.id === id);
    if (target) toast.success(`We'll let you know when ${target.name} is ready.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect Tazama with the tools, services and devices your business uses.
          </p>
        </div>
        <Button type="button" variant="brand" className="gap-1.5" onClick={openGenericConnectDialog}>
          <Plus className="size-4" />
          Connect Integration
        </Button>
      </div>

      <CategoryFilters active={filter} onChange={setFilter} />

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">Connected</h2>
        {connected.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {connected.map((integration) => (
              <ConnectedIntegrationCard
                key={integration.id}
                integration={integration}
                onOpenDetail={setDetailId}
                onDisconnect={setDisconnectId}
              />
            ))}
          </div>
        ) : (
          <EmptyIntegrationsState onConnect={openGenericConnectDialog} />
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">Available Integrations</h2>
        <div
          id="integrations-panel"
          role="tabpanel"
          aria-labelledby={`integrations-tab-${filter}`}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {marketplace.map((integration) => (
            <MarketplaceIntegrationCard
              key={integration.id}
              integration={integration}
              onOpenDetail={setDetailId}
              onConnectClick={openConnectDialogFor}
              onLearnMoreClick={setLearnMoreId}
              onNotifyClick={handleNotify}
            />
          ))}
        </div>
      </div>

      <IntegrationDetailDrawer
        integration={detailIntegration}
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onDisconnect={setDisconnectId}
      />

      <ConnectIntegrationDialog
        integration={connectIntegrationRow}
        open={connectDialogOpen}
        onOpenChange={(open) => {
          setConnectDialogOpen(open);
          if (!open) setConnectId(null);
        }}
        onConnect={handleConnect}
        pending={pending}
      />

      <DisconnectConfirmDialog
        integration={disconnectIntegrationRow}
        open={disconnectId !== null}
        onOpenChange={(open) => {
          if (!open) setDisconnectId(null);
        }}
        onConfirm={handleDisconnectConfirm}
        pending={pending}
      />

      <LearnMoreDialog
        integration={learnMoreIntegration}
        open={learnMoreId !== null}
        onOpenChange={(open) => {
          if (!open) setLearnMoreId(null);
        }}
      />
    </div>
  );
}

/**
 * Top-level Integrations settings page. Wrapped in Suspense because it reads
 * `?category=` via useSearchParams, which Next requires a Suspense boundary
 * around in a client component (see node_modules/next/dist/docs/01-app —
 * useSearchParams skips prerendering and needs a fallback boundary).
 */
export function IntegrationsSettingsPage({
  businessId,
  integrations,
}: {
  businessId: string;
  integrations: DbIntegration[];
}) {
  return (
    <React.Suspense fallback={null}>
      <IntegrationsSettingsPageInner businessId={businessId} integrations={integrations} />
    </React.Suspense>
  );
}
