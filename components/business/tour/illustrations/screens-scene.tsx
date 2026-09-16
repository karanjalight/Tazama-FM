"use client";

import { motion } from "framer-motion";

import { Chip, FlowLine, Label, Panel, Scene, TextLine, TvFrame, useLoop, type LoopOptions } from "./kit";

const CODE = ["4", "8", "2", "7"];

/** One pairing cycle sampled into evenly spaced keyframes. */
const FRAMES = 16;
const CYCLE: LoopOptions = { duration: 8, ease: "easeInOut" };
const RESET_AT = 13;

/** Opacity keyframes: 0 until frame `on`, 1 until frame `off`, then 0 again. */
function shown(on: number, off = RESET_AT) {
  return Array.from({ length: FRAMES }, (_, i) => (i >= on && i < off ? 1 : 0));
}

const PANEL_W = 176;
const BOX_W = 32;
const BOX_GAP = 8;
const BOX_X = (PANEL_W - (BOX_W * 4 + BOX_GAP * 3)) / 2;

export function ScreensScene() {
  const loop = useLoop();
  return (
    <Scene label="A TV showing the pairing code 4 8 2 7, typed digit by digit into the dashboard until the screen shows as connected">
      <FlowLine d="M262 122 C 322 122, 368 116, 368 150" />

      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6 })}>
        <TvFrame x={24} y={52} w={238} h={164}>
          <TextLine x={81} y={30} w={60} strong />
          <Label x={111} y={86} size={30} weight={600} tone="strong" anchor="middle" mono>
            4 8 2 7
          </Label>
          <TextLine x={67} y={104} w={88} />
        </TvFrame>
      </motion.g>

      <motion.g {...loop({ y: [0, -3, 0] }, { duration: 6.5, delay: 0.9 })}>
        <Panel x={280} y={150} w={PANEL_W} h={158} r={16}>
          <TextLine x={16} y={18} w={78} strong />
          <TextLine x={16} y={32} w={108} />

          {CODE.map((digit, i) => {
            const bx = BOX_X + i * (BOX_W + BOX_GAP);
            return (
              <g key={digit}>
                <rect x={bx} y={52} width={BOX_W} height={44} rx="9" strokeWidth="1.5" className="fill-muted/60 stroke-border" />
                <motion.rect
                  x={bx}
                  y={52}
                  width={BOX_W}
                  height={44}
                  rx="9"
                  fill="none"
                  strokeWidth="1.5"
                  className="stroke-foreground/70"
                  {...loop({ opacity: shown(2 + i) }, CYCLE)}
                />
                <motion.g {...loop({ opacity: shown(2 + i) }, CYCLE)}>
                  <Label x={bx + BOX_W / 2} y={81} size={20} weight={600} tone="strong" anchor="middle" mono>
                    {digit}
                  </Label>
                </motion.g>
              </g>
            );
          })}

          <motion.g {...loop({ opacity: shown(7) }, CYCLE)}>
            <Chip x={(PANEL_W - 86) / 2} y={114} label="Connected" dot />
          </motion.g>
        </Panel>
      </motion.g>
    </Scene>
  );
}
