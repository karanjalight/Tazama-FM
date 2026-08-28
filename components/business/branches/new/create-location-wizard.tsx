"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Save } from "lucide-react";

import {
  DEFAULT_ROOMS,
  DEFAULT_ZONES,
  newDeviceId,
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
import { VioletButton } from "./violet-button";
import type { NewRoomInput } from "./modals/add-room-dialog";
import type { NewScreenInput } from "./modals/add-screen-dialog";
import type { NewAudioZoneInput } from "./modals/add-audio-zone-dialog";

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

export function CreateLocationWizard() {
  const router = useRouter();
  const { draft, setDraft, hydrated, resumed, clearDraft } = useWizardDraft();
  const { step, details, zones, rooms, screens, audioZones } = draft;

  const [selectedZoneId, setSelectedZoneId] = React.useState(DEFAULT_ZONES[0].id);
  const [selectedRoomId, setSelectedRoomId] = React.useState(DEFAULT_ROOMS[0].id);

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

  function handleCreateScreen(input: NewScreenInput) {
    const screen: WizardScreen = {
      id: newId("scr"),
      roomId: input.roomId,
      name: input.name,
      deviceModel: input.deviceModel,
      deviceId: newDeviceId(),
      type: input.type,
      status: "offline",
    };
    setDraft((d) => ({ ...d, screens: [...d.screens, screen] }));
    setSelectedRoomId(input.roomId);
    toast.success(`Screen "${screen.name}" registered`, {
      description: `Device ID ${screen.deviceId} — pair it after the location is created.`,
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
      deviceId: newDeviceId(),
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

  function handleCreateLocation() {
    const name = details.name || "Location";
    clearDraft();
    toast.success(`${name} created`, {
      description: "It's now available to pair devices and schedule content.",
    });
    router.push("/business/branches");
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
            <VioletButton onClick={handleCreateLocation}>Create Location</VioletButton>
          )}
        </div>
      </div>
    </div>
  );
}
