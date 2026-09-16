"use client";

import { motion } from "framer-motion";
import { Music } from "lucide-react";

import { Avatar, Equalizer, Icon, Label, ORIGIN_CENTER, Panel, PhoneFrame, Scene, TextLine, TvFrame, useLoop } from "./kit";

/** Attach keyframe `times` to a loop so several elements share one sequenced cycle. */
function withTimes(props: ReturnType<ReturnType<typeof useLoop>>, times: number[]) {
  return "transition" in props ? { ...props, transition: { ...props.transition, times } } : props;
}

// 7×7 stylised QR: 1 = dark module. Finder corners are drawn separately.
const QR_BITS = [
  "0000000",
  "0000000",
  "0001000",
  "1010110",
  "0001011",
  "0000101",
  "0000110",
];

function QrCode({ x, y, cell = 8 }: { x: number; y: number; cell?: number }) {
  const size = cell * 7;
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx + 1} y={fy + 1} width={cell * 3 - 2} height={cell * 3 - 2} rx="3" strokeWidth="3" fill="none" className="stroke-foreground" />
      <rect x={fx + cell} y={fy + cell} width={cell} height={cell} rx="1.5" className="fill-foreground" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-8" y="-8" width={size + 16} height={size + 16} rx="10" strokeWidth="1.5" className="fill-card stroke-border" />
      {finder(0, 0)}
      {finder(cell * 4, 0)}
      {finder(0, cell * 4)}
      {QR_BITS.flatMap((row, r) =>
        row.split("").map((bit, c) =>
          bit === "1" ? (
            <rect key={`${r}-${c}`} x={c * cell + 0.5} y={r * cell + 0.5} width={cell - 1} height={cell - 1} rx="1.5" className="fill-foreground" />
          ) : null,
        ),
      )}
    </g>
  );
}

// One 8s story that starts (and rests) on the request having landed:
// toast on the TV, song list on the phone → toast leaves → phone scans → picks a song → toast returns.
const STORY = { duration: 8, ease: "easeInOut" as const };

export function GuestRequestsScene() {
  const loop = useLoop();
  return (
    <Scene label="A guest scans the TV's QR code, picks a song on their phone, and the TV shows it was requested by Amani">
      <TvFrame x={24} y={26} w={340} h={212}>
        {/* Now playing */}
        <rect x="16" y="16" width="84" height="84" rx="10" className="fill-muted-foreground/20" />
        <Icon icon={Music} x={44} y={44} size={28} className="text-muted-foreground" />
        <TextLine x={114} y={30} w={96} h={8} strong />
        <TextLine x={114} y={48} w={66} />
        <Equalizer x={114} y={66} bars={4} h={18} />
        <rect x="16" y="114" width="196" height="4" rx="2" className="fill-muted-foreground/20" />
        <rect x="16" y="114" width="82" height="4" rx="2" className="fill-foreground/60" />

        <QrCode x={232} y={22} />
        <Label x={260} y={106} size={10.5} anchor="middle">
          Scan to request
        </Label>

        {/* Toast */}
        <motion.g
          initial={{ opacity: 1, y: 0 }}
          {...withTimes(
            loop({ opacity: [1, 1, 0, 0, 1, 1], y: [0, 0, 26, 26, 0, 0] }, STORY),
            [0, 0.22, 0.3, 0.72, 0.8, 1],
          )}
        >
          <Panel x={16} y={132} w={196} h={48} r={12}>
            <Avatar cx={24} cy={24} r={13} initial="A" tone="ink" />
            <Label x={46} y={21} size={11.5} tone="strong">
              Requested by Amani
            </Label>
            <TextLine x={46} y={30} w={84} />
          </Panel>
        </motion.g>
      </TvFrame>

      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6, delay: 0.5 })}>
        <PhoneFrame x={338} y={118} w={112} h={214}>
          {/* Song list with the chosen row and a Request button */}
          <motion.g
            initial={{ opacity: 1 }}
            {...withTimes(loop({ opacity: [1, 1, 0, 0, 1, 1] }, STORY), [0, 0.3, 0.36, 0.6, 0.66, 1])}
          >
            <TextLine x={12} y={26} w={52} strong />
            {[0, 1, 2].map((i) => {
              const top = 44 + i * 36;
              const picked = i === 1;
              return (
                <g key={i}>
                  {picked && <rect x="4" y={top - 3} width="92" height="34" rx="9" strokeWidth="1.5" className="fill-muted stroke-foreground/60" />}
                  <rect x="11" y={top + 3} width="22" height="22" rx="5" className={picked ? "fill-muted-foreground/35" : "fill-muted"} />
                  <TextLine x={40} y={top + 7} w={[44, 50, 38][i]} strong={picked} />
                  <TextLine x={40} y={top + 17} w={[30, 36, 26][i]} />
                </g>
              );
            })}
            <motion.g
              style={ORIGIN_CENTER}
              {...withTimes(loop({ scale: [1, 1, 0.9, 1, 1] }, STORY), [0, 0.68, 0.71, 0.74, 1])}
            >
              <rect x="10" y="166" width="80" height="26" rx="13" className="fill-foreground" />
              <Label x={50} y={183} size={11} weight={600} tone="inverse" anchor="middle">
                Request
              </Label>
            </motion.g>
          </motion.g>

          {/* Camera scanning the TV's code */}
          <motion.g
            initial={{ opacity: 0 }}
            {...withTimes(loop({ opacity: [0, 0, 1, 1, 0, 0] }, STORY), [0, 0.3, 0.36, 0.6, 0.66, 1])}
          >
            <rect width="100" height="202" rx="15" className="fill-muted" />
            <g transform="translate(22 62) scale(0.75)">
              <QrCode x={8} y={8} />
            </g>
            {[
              "M14 66 V56 H24",
              "M76 56 H86 V66",
              "M14 116 V126 H24",
              "M76 126 H86 V116",
            ].map((d) => (
              <path key={d} d={d} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-foreground" />
            ))}
            <motion.rect
              x="16"
              y="60"
              width="68"
              height="2.5"
              rx="1.25"
              className="fill-brand"
              initial={{ y: 30 }}
              {...loop({ y: [0, 60, 0] }, { duration: 1.6, ease: "easeInOut" })}
            />
            <TextLine x={24} y={150} w={52} strong />
          </motion.g>
        </PhoneFrame>
      </motion.g>
    </Scene>
  );
}
