"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, Save } from "lucide-react";

import {
  newId,
  type AudioZone,
  type LocationDetailsForm,
  type WizardRoom,
  type WizardScreen,
  type WizardZone,
} from "./wizard-data";
import { useWizardDraft } from "./use-wizard-draft";
import { StepIndicator } from "./step-indicator";
import { LocationSummaryPanel } from "./location-summary-panel";
import { LocationDetailsStep } from "./steps/location-details-step";
import { RoomsZonesStep } from "./steps/rooms-zones-step";
import { ScreensDevicesStep } from "./steps/screens-devices-step";
import { AudioZonesStep } from "./steps/audio-zones-step";
import { ReviewCreateStep } from "./steps/review-create-step";
import { LocationCreatedSuccess } from "./location-created-success";
import { VioletButton } from "./violet-button";
import type { NewRoomInput } from "./modals/add-room-dialog";
import type { UpdateZoneInput } from "./modals/edit-zone-dialog";
import type { UpdateRoomInput } from "./modals/edit-room-dialog";
import type { NewScreenInput } from "./modals/add-screen-dialog";
import type { NewAudioZoneInput } from "./modals/add-audio-zone-dialog";
import { createLocationFromDraft, type CreateLocationResult } from "@/app/business/branches/new/actions";

const TOTAL_STEPS = 5;

const HEADINGS: Record<number, { title: string; subtitle: (name: string) => string }> = {
  1: {
    title: "Create New Location",
    subtitle: () => "Set up your location, rooms, screens and audio zones",
  },
  2: { title: "Add Location", subtitle: (name) => `Set up rooms and zones for ${name}` },
  3: { title: "Add Location", subtitle: () => "Add screens and devices to your rooms" },
  4: { title: "Add Location", subtitle: (name) => `Set up audio zones for ${name}` },
  5: { title: "Add Location", subtitle: (name) => `Review everything before creating ${name}` },
};

export function CreateLocationWizard({ businessName }: { businessName: string }) {
  const { draft, setDraft, hydrated, resumed, clearDraft } = useWizardDraft();
  const { step, details: rawDetails, zones, rooms, screens, audioZones } = draft;
  // `details.business` is a display-only field (createBranch never reads
  // it) with no way to know the real business name at module-load time
  // (wizard-data.ts's DEFAULT_LOCATION_DETAILS is a static constant) — fall
  // back to the real value here at render time instead, without mutating
  // the draft.
  const details = rawDetails.business ? rawDetails : { ...rawDetails, business: businessName };

  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(zones[0]?.id ?? null);
  const [selectedRoomId, setSelectedRoomId] = React.useState<string | null>(rooms[0]?.id ?? null);

  React.useEffect(() => {
    if (hydrated && resumed) {
      toast.info("Resumed your saved draft", {
        description: "Picked up right where you left off.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function setStep(updater: number | ((s: number) => number)) {
    setDraft((d) => ({
      ...d,
      step: typeof updater === "function" ? updater(d.step) : updater,
    }));
  }

  function patchDetails(patch: Partial<LocationDetailsForm>) {
    setDraft((d) => ({ ...d, details: { ...d.details, ...patch } }));
  }

  function handleCreateZone(input: { name: string }) {
    const zone: WizardZone = { id: newId("zone"), name: input.name };
    setDraft((d) => ({ ...d, zones: [...d.zones, zone] }));
    setSelectedZoneId(zone.id);
    toast.success(`Zone "${zone.name}" added`);
  }

  function handleCreateRoom(input: NewRoomInput) {
    const room: WizardRoom = {
      id: newId("room"),
      zoneId: input.zoneId,
      name: input.name,
      type: input.type,
      capacity: input.capacity,
      description: input.description,
    };
    setDraft((d) => ({ ...d, rooms: [...d.rooms, room] }));
    setSelectedZoneId(input.zoneId);
    setSelectedRoomId(room.id);
    toast.success(`Room "${room.name}" added`);
  }

  function handleUpdateZone(input: UpdateZoneInput) {
    setDraft((d) => ({
      ...d,
      zones: d.zones.map((z) => (z.id === input.id ? { ...z, name: input.name } : z)),
    }));
    toast.success(`Zone "${input.name}" updated`);
  }

  function handleDeleteZone(zoneId: string) {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    if (rooms.some((r) => r.zoneId === zoneId)) {
      toast.error("Remove this zone's rooms first.");
      return;
    }
    if (!confirm(`Delete zone "${zone.name}"? This can't be undone.`)) return;
    setDraft((d) => ({ ...d, zones: d.zones.filter((z) => z.id !== zoneId) }));
    setSelectedZoneId((current) => {
      if (current !== zoneId) return current;
      const remaining = zones.filter((z) => z.id !== zoneId);
      return remaining[0]?.id ?? null;
    });
    toast.success(`Zone "${zone.name}" removed`);
  }

  function handleUpdateRoom(input: UpdateRoomInput) {
    setDraft((d) => ({
      ...d,
      rooms: d.rooms.map((r) =>
        r.id === input.id
          ? {
              ...r,
              name: input.name,
              zoneId: input.zoneId,
              type: input.type,
              capacity: input.capacity,
              description: input.description,
            }
          : r,
      ),
    }));
    toast.success(`Room "${input.name}" updated`);
  }

  function handleDeleteRoom(roomId: string) {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    if (screens.some((s) => s.roomId === roomId)) {
      toast.error("Remove this room's screens first.");
      return;
    }
    if (!confirm(`Delete room "${room.name}"? This can't be undone.`)) return;
    setDraft((d) => ({ ...d, rooms: d.rooms.filter((r) => r.id !== roomId) }));
    setSelectedRoomId((current) => {
      if (current !== roomId) return current;
      const remaining = rooms.filter((r) => r.id !== roomId);
      return remaining[0]?.id ?? null;
    });
    toast.success(`Room "${room.name}" removed`);
  }

  function handleCreateScreen(input: NewScreenInput) {
    const screen: WizardScreen = {
      id: newId("scr"),
      roomId: input.roomId,
      name: input.name,
      deviceModel: input.deviceModel,
      deviceId: "",
      type: input.type,
      status: "offline",
    };
    setDraft((d) => ({ ...d, screens: [...d.screens, screen] }));
    setSelectedRoomId(input.roomId);
    toast.success(`Screen "${screen.name}" added`, {
      description: "A real pairing code will be generated when you create this location.",
    });
  }

  function handleCreateAudioZone(input: NewAudioZoneInput) {
    const zone: AudioZone = { id: newId("audio"), name: input.name, roomIds: input.roomIds };
    setDraft((d) => ({ ...d, audioZones: [...d.audioZones, zone] }));
    toast.success(`Audio zone "${zone.name}" added`);
  }

  function handleAutoAssign() {
    const roomsWithout = rooms.filter((r) => !screens.some((s) => s.roomId === r.id));
    if (roomsWithout.length === 0) return;
    const newScreens: WizardScreen[] = roomsWithout.map((r) => ({
      id: newId("scr"),
      roomId: r.id,
      name: `${r.name} TV 01`,
      deviceModel: "Generic Smart TV",
      deviceId: "",
      type: "TV",
      status: "offline",
    }));
    setDraft((d) => ({ ...d, screens: [...d.screens, ...newScreens] }));
    toast.success(
      `Added ${newScreens.length} screen${newScreens.length === 1 ? "" : "s"} automatically`,
    );
  }

  function handleSaveDraft() {
    toast.success("Draft saved", { description: "Your progress is kept on this device." });
  }

  const [creating, setCreating] = React.useState(false);
  const [result, setResult] = React.useState<CreateLocationResult | null>(null);

  async function handleCreateLocation() {
    setCreating(true);
    const res = await createLocationFromDraft({ details, zones, rooms, screens, audioZones });
    setCreating(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    clearDraft();
    setResult(res);
    toast.success(`${details.name || "Location"} created`);
  }

  if (result?.ok) {
    return <LocationCreatedSuccess result={result} locationName={details.name || "Location"} />;
  }

  const heading = HEADINGS[step];
  const locationName = details.name || "this location";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/business/branches" className="hover:text-foreground">
            Locations
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Add Location</span>
        </nav>
        {step >= 2 && (
          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Save className="size-3.5" />
            Save draft
          </button>
        )}
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{heading.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{heading.subtitle(locationName)}</p>
      </header>

      <StepIndicator currentStep={step} />

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {step === 1 && <LocationDetailsStep details={details} onChange={patchDetails} />}
          {step === 2 && (
            <RoomsZonesStep
              zones={zones}
              rooms={rooms}
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
              onCreateZone={handleCreateZone}
              onCreateRoom={handleCreateRoom}
              onUpdateZone={handleUpdateZone}
              onDeleteZone={handleDeleteZone}
              onUpdateRoom={handleUpdateRoom}
              onDeleteRoom={handleDeleteRoom}
            />
          )}
          {step === 3 && (
            <ScreensDevicesStep
              zones={zones}
              rooms={rooms}
              screens={screens}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              onCreateRoom={handleCreateRoom}
              onCreateScreen={handleCreateScreen}
              onAutoAssign={handleAutoAssign}
            />
          )}
          {step === 4 && (
            <AudioZonesStep
              rooms={rooms}
              audioZones={audioZones}
              onCreateAudioZone={handleCreateAudioZone}
            />
          )}
          {step === 5 && (
            <ReviewCreateStep
              details={details}
              zones={zones}
              rooms={rooms}
              screens={screens}
              audioZones={audioZones}
            />
          )}
        </div>
        <LocationSummaryPanel
          step={step}
          details={details}
          zonesCount={step >= 2 ? zones.length : 0}
          roomsCount={step >= 2 ? rooms.length : 0}
          screensCount={step >= 3 ? screens.length : 0}
          audioZonesCount={audioZones.length}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        {step === 1 ? (
          <Link
            href="/business/branches"
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back
          </button>
        )}

        <div className="flex items-center gap-2">
          {step >= 2 && step < TOTAL_STEPS && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
              className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Skip for now
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <VioletButton onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}>
              Next
              <ChevronRight className="size-4" />
            </VioletButton>
          ) : (
            <VioletButton onClick={handleCreateLocation} disabled={creating}>
              {creating ? "Creating…" : "Create Location"}
            </VioletButton>
          )}
        </div>
      </div>
    </div>
  );
}
