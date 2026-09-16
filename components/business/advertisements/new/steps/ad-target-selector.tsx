"use client";

import * as React from "react";
import { ChevronRight, Monitor } from "lucide-react";

import {
  coveredScreens,
  isRoomCovered,
  type CampaignTarget,
  type CampaignTargetOptions,
  type TargetOption,
} from "@/lib/business/campaign-types";
import { cn } from "@/lib/utils";

type Level = keyof CampaignTarget;

/**
 * Location → Zone → Room → Screen tree. Selections at every level are
 * independent and coverage is their UNION (matching the ad resolver): picking
 * a zone covers all its rooms and screens, so those children show as
 * "included" (checked, locked) rather than being written as extra rows.
 */
export function AdTargetSelector({
  target,
  options,
  onChange,
}: {
  target: CampaignTarget;
  options: CampaignTargetOptions;
  onChange: (next: CampaignTarget) => void;
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(options.locations.length <= 2 ? options.locations.map((l) => `loc:${l.id}`) : []),
  );

  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  function toggle(level: Level, id: string) {
    const current = target[level];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange({ ...target, [level]: next });
  }

  const covered = new Set(coveredScreens(target, options).map((s) => s.id));

  return (
    <div className="max-h-96 overflow-y-auto rounded-xl border border-border p-1.5">
      {options.locations.map((location) => {
        const zones = options.zones.filter((z) => z.branchId === location.id);
        const unzonedRooms = options.rooms.filter((r) => r.branchId === location.id && !r.zoneId);
        const locationScreens = options.screens.filter((s) => s.branchId === location.id);
        const locKey = `loc:${location.id}`;
        return (
          <div key={location.id}>
            <TreeRow
              depth={0}
              label={location.name}
              meta={`${locationScreens.filter((s) => covered.has(s.id)).length}/${locationScreens.length} screens`}
              warning={location.allowsAds === false ? "Ads off for this location" : null}
              checked={target.locationIds.includes(location.id)}
              onToggle={() => toggle("locationIds", location.id)}
              expandable
              expanded={expanded.has(locKey)}
              onExpand={() => toggleExpanded(locKey)}
            />
            {expanded.has(locKey) && (
              <>
                {zones.map((zone) => {
                  const zoneKey = `zone:${zone.id}`;
                  const zoneRooms = options.rooms.filter((r) => r.zoneId === zone.id);
                  const inheritedZone = target.locationIds.includes(location.id);
                  return (
                    <div key={zone.id}>
                      <TreeRow
                        depth={1}
                        label={zone.name}
                        meta={`${zoneRooms.length} room${zoneRooms.length === 1 ? "" : "s"}`}
                        checked={inheritedZone || target.zoneIds.includes(zone.id)}
                        inherited={inheritedZone}
                        onToggle={() => toggle("zoneIds", zone.id)}
                        expandable={zoneRooms.length > 0}
                        expanded={expanded.has(zoneKey)}
                        onExpand={() => toggleExpanded(zoneKey)}
                      />
                      {expanded.has(zoneKey) &&
                        zoneRooms.map((room) => (
                          <RoomBranch
                            key={room.id}
                            depth={2}
                            room={room}
                            target={target}
                            options={options}
                            expanded={expanded}
                            onExpand={toggleExpanded}
                            onToggle={toggle}
                          />
                        ))}
                    </div>
                  );
                })}
                {unzonedRooms.map((room) => (
                  <RoomBranch
                    key={room.id}
                    depth={1}
                    room={room}
                    target={target}
                    options={options}
                    expanded={expanded}
                    onExpand={toggleExpanded}
                    onToggle={toggle}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RoomBranch({
  depth,
  room,
  target,
  options,
  expanded,
  onExpand,
  onToggle,
}: {
  depth: number;
  room: TargetOption;
  target: CampaignTarget;
  options: CampaignTargetOptions;
  expanded: Set<string>;
  onExpand: (key: string) => void;
  onToggle: (level: Level, id: string) => void;
}) {
  const key = `room:${room.id}`;
  const screens = options.screens.filter((s) => s.roomId === room.id);
  const inheritedRoom = isRoomCovered({ ...target, roomIds: [] }, room);
  const roomChecked = inheritedRoom || target.roomIds.includes(room.id);
  return (
    <div>
      <TreeRow
        depth={depth}
        label={room.name}
        meta={[room.capacity ? `${room.capacity} capacity` : null, `${screens.length} screen${screens.length === 1 ? "" : "s"}`]
          .filter(Boolean)
          .join(" · ")}
        checked={roomChecked}
        inherited={inheritedRoom}
        onToggle={() => onToggle("roomIds", room.id)}
        expandable={screens.length > 0}
        expanded={expanded.has(key)}
        onExpand={() => onExpand(key)}
      />
      {expanded.has(key) &&
        screens.map((screen) => (
          <TreeRow
            key={screen.id}
            depth={depth + 1}
            icon
            label={screen.name}
            online={screen.online}
            warning={screen.adsEnabled === false ? "Ads off" : null}
            checked={roomChecked || target.screenIds.includes(screen.id)}
            inherited={roomChecked}
            onToggle={() => onToggle("screenIds", screen.id)}
          />
        ))}
    </div>
  );
}

function TreeRow({
  depth,
  label,
  meta,
  warning,
  checked,
  inherited,
  onToggle,
  expandable,
  expanded,
  onExpand,
  icon,
  online,
}: {
  depth: number;
  label: string;
  meta?: string;
  warning?: string | null;
  checked: boolean;
  inherited?: boolean;
  onToggle: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  icon?: boolean;
  online?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg pr-2 hover:bg-muted/40" style={{ paddingLeft: `${depth * 18 + 4}px` }}>
      {expandable ? (
        <button
          type="button"
          onClick={onExpand}
          aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
          aria-expanded={expanded}
          className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
      ) : (
        <span className="size-6 shrink-0" />
      )}
      <label className={cn("flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5", inherited && "cursor-default")}>
        <input
          type="checkbox"
          checked={checked}
          disabled={inherited}
          onChange={onToggle}
          className="size-3.5 shrink-0 rounded border-input accent-violet-600 disabled:opacity-60"
        />
        {icon && (
          <span className="relative shrink-0">
            <Monitor className="size-3.5 text-muted-foreground" />
            <span
              className={cn("absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full ring-1 ring-card", online ? "bg-emerald-500" : "bg-muted-foreground/50")}
              aria-label={online ? "online" : "offline"}
            />
          </span>
        )}
        <span className={cn("truncate text-sm", depth === 0 ? "font-semibold text-foreground" : "text-foreground")}>{label}</span>
        {inherited && <span className="shrink-0 text-[10px] text-violet-400">included</span>}
        {warning && <span className="shrink-0 rounded bg-rose-500/10 px-1.5 text-[10px] text-rose-400">{warning}</span>}
      </label>
      {meta && <span className="shrink-0 text-[11px] text-muted-foreground">{meta}</span>}
    </div>
  );
}
