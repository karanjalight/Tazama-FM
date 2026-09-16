"use client";

import { motion } from "framer-motion";
import { Megaphone, Music, Pause, Tag } from "lucide-react";

import { Chip, Equalizer, Icon, Label, Panel, Scene, TextLine, TvFrame, useLoop } from "./kit";

/** framer-motion overrides a CSS transform-origin on SVG, so anchor scaling with its own origin values. */
const SHRINK_LEFT = { originX: 0 } as const;

/**
 * One 8s cycle in 16 half-second steps (17 keyframes): music → ad takeover →
 * music. Both screen states share the cycle so exactly one is visible at a time.
 * Reduced motion rests on the ad takeover (music group starts hidden).
 */
const CYCLE = 8;
const MUSIC = [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1];
const AD = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
const COUNTDOWN = [1, 1, 1, 1, 1, 1, 1, 0.83, 0.67, 0.5, 0.33, 0.17, 0, 0, 1, 1, 1];
const PLUS_ONE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0];
const PLUS_ONE_Y = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, -4, -8, 4];

/* Screen size inside the TV (TvFrame w/h minus the 8px bezel on each side). */
const SW = 312;
const SH = 182;

export function AdvertisingScene() {
  const loop = useLoop();
  return (
    <Scene label="A TV briefly switches from the music to a minus 20 percent ad, then back, while a campaign card counts impressions">
      <g textRendering="geometricPrecision">
      <TvFrame x={24} y={28} w={SW + 16} h={SH + 16}>
        <motion.g initial={{ opacity: 0 }} {...loop({ opacity: MUSIC }, { duration: CYCLE })}>
          <rect x={24} y={30} width={104} height={104} rx={12} className="fill-muted-foreground/20" />
          <Icon icon={Music} x={62} y={68} size={28} className="text-muted-foreground" />
          <TextLine x={148} y={46} w={118} h={8} strong />
          <TextLine x={148} y={64} w={82} />
          <Equalizer x={148} y={86} bars={5} h={22} barW={4} gap={3} />
          <rect x={148} y={126} width={140} height={4} rx={2} className="fill-muted-foreground/20" />
          <rect x={148} y={126} width={77} height={4} rx={2} className="fill-foreground/70" />
        </motion.g>

        <motion.g initial={{ opacity: 1 }} {...loop({ opacity: AD }, { duration: CYCLE })}>
          <rect width={SW} height={SH} rx={8} className="fill-foreground" />
          <rect x={16} y={14} width={SW - 32} height={4} rx={2} className="fill-background/20" />
          <motion.rect
            x={16}
            y={14}
            width={SW - 32}
            height={4}
            rx={2}
            className="fill-brand"
            style={SHRINK_LEFT}
            initial={{ scaleX: 0.6 }}
            {...loop({ scaleX: COUNTDOWN }, { duration: CYCLE, ease: "linear" })}
          />
          <Chip x={16} y={30} w={36} label="AD" />
          <rect x={24} y={66} width={96} height={96} rx={14} className="fill-background/15" />
          <Icon icon={Tag} x={54} y={96} size={36} className="text-background" />
          <Label x={140} y={112} size={42} weight={700} tone="inverse">
            −20%
          </Label>
          <Label x={142} y={136} size={15} weight={500} tone="inverse">
            today
          </Label>
          <rect x={142} y={148} width={84} height={6} rx={3} className="fill-background/30" />
        </motion.g>
      </TvFrame>

      <g transform="translate(34 264)">
        <rect y="4" width="132" height="32" rx="16" className="fill-foreground/5" />
        <rect width="132" height="32" rx="16" strokeWidth="1.5" className="fill-card stroke-border" />
        <motion.g initial={{ opacity: 0 }} {...loop({ opacity: MUSIC }, { duration: CYCLE })}>
          <Icon icon={Music} x={12} y={9} size={14} className="text-foreground" />
          <Label x={32} y={20.5} size={11} tone="strong">
            Music playing
          </Label>
        </motion.g>
        <motion.g initial={{ opacity: 1 }} {...loop({ opacity: AD }, { duration: CYCLE })}>
          <Icon icon={Pause} x={12} y={9} size={14} className="text-foreground" />
          <Label x={32} y={20.5} size={11} tone="strong">
            Music paused
          </Label>
        </motion.g>
      </g>

      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6.5, delay: 0.5 })}>
        <Panel x={292} y={192} w={164} h={128}>
          <rect x={14} y={14} width={30} height={30} rx={9} className="fill-muted" />
          <Icon icon={Megaphone} x={21} y={21} size={16} />
          <TextLine x={54} y={20} w={72} strong />
          <TextLine x={54} y={33} w={46} />
          <Label x={14} y={76} size={24} weight={600} tone="strong">
            12,480
          </Label>
          <motion.g initial={{ opacity: 0 }} {...loop({ opacity: PLUS_ONE, y: PLUS_ONE_Y }, { duration: CYCLE })}>
            <Label x={104} y={74} size={12} weight={600} tone="strong">
              +1
            </Label>
          </motion.g>
          <Label x={14} y={96} size={10.5}>
            impressions
          </Label>
          <rect x={14} y={108} width={136} height={6} rx={3} className="fill-muted" />
          <rect x={14} y={108} width={92} height={6} rx={3} className="fill-foreground/70" />
        </Panel>
      </motion.g>
      </g>
    </Scene>
  );
}
