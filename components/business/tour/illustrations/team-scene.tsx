"use client";

import { motion } from "framer-motion";
import { MapPin, Plus, Speaker as SpeakerIcon, Tv } from "lucide-react";

import { Avatar, Chip, FlowLine, Icon, LiveDot, ORIGIN_CENTER, Panel, Scene, TextLine, useLoop } from "./kit";

/* Where connectors land on the location cards' top edges. */
const CARD_TOP = 232;
const RAIL_Y = 198;
const LEFT_DROP = 140;
const RIGHT_DROP = 322;
const MANAGER_DROP = 376;

function LocationCard({ x, nameW, detailW }: { x: number; nameW: number; detailW: number }) {
  return (
    <Panel x={x} y={CARD_TOP} w={168} h={88}>
      <rect x={14} y={14} width={32} height={32} rx={9} className="fill-muted" />
      <Icon icon={MapPin} x={22} y={22} size={16} />
      <TextLine x={56} y={20} w={nameW} strong />
      <TextLine x={56} y={34} w={detailW} />
      <line x1={14} x2={154} y1={58} y2={58} strokeWidth="1.5" className="stroke-border" />
      <Icon icon={Tv} x={14} y={66} size={14} className="text-muted-foreground" />
      <TextLine x={34} y={70} w={28} />
      <Icon icon={SpeakerIcon} x={78} y={66} size={14} className="text-muted-foreground" />
      <TextLine x={98} y={70} w={20} />
    </Panel>
  );
}

export function TeamScene() {
  const loop = useLoop();
  return (
    <Scene label="An owner and an admin connected to both locations, and a manager connected to only one of them">
      <g textRendering="geometricPrecision">
        {/* Owner and admin share one rail that drops into both locations; the manager has a single dashed line. */}
        <path
          d={`M${LEFT_DROP} ${CARD_TOP} V${RAIL_Y + 12} Q${LEFT_DROP} ${RAIL_Y} ${LEFT_DROP + 12} ${RAIL_Y} H${RIGHT_DROP - 12} Q${RIGHT_DROP} ${RAIL_Y} ${RIGHT_DROP} ${RAIL_Y + 12} V${CARD_TOP}`}
          fill="none"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="stroke-foreground/30"
        />
        <path d={`M240 138 V${RAIL_Y}`} fill="none" strokeWidth="1.75" className="stroke-foreground/30" />
        <path
          d={`M112 152 V${RAIL_Y - 12} Q112 ${RAIL_Y} 124 ${RAIL_Y} H${LEFT_DROP + 12}`}
          fill="none"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="stroke-foreground/30"
        />
        <FlowLine d={`M368 152 C 368 186, ${MANAGER_DROP} 196, ${MANAGER_DROP} ${CARD_TOP}`} />
        <circle cx={240} cy={RAIL_Y} r={4} className="fill-foreground/40" />

        <motion.g {...loop({ y: [0, -3, 0] }, { duration: 5.5, delay: 0.4 })}>
          <Avatar cx={112} cy={104} r={26} initial="J" />
          <Chip x={86} y={140} w={52} label="Admin" />
        </motion.g>

        <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6 })}>
          <circle cx={240} cy={82} r={44} className="fill-foreground/5" />
          <Avatar cx={240} cy={82} r={34} initial="M" tone="ink" />
          <LiveDot cx={266} cy={106} r={5} />
          <Chip x={212} y={126} w={56} label="Owner" tone="ink" />
        </motion.g>

        <motion.g {...loop({ y: [0, -3, 0] }, { duration: 5.5, delay: 1.1 })}>
          <Avatar cx={368} cy={104} r={26} initial="S" />
          <Chip x={334} y={140} w={68} label="Manager" />
        </motion.g>

        <LocationCard x={56} nameW={70} detailW={46} />
        <LocationCard x={256} nameW={58} detailW={52} />
        {[LEFT_DROP, RIGHT_DROP, MANAGER_DROP].map((cx) => (
          <circle key={cx} cx={cx} cy={CARD_TOP} r={4} strokeWidth="1.5" className="fill-card stroke-foreground/40" />
        ))}

        <motion.g style={ORIGIN_CENTER} {...loop({ scale: [1, 1.05, 1] }, { duration: 2.8 })}>
          <rect x={376} y={30} width={80} height={30} rx={15} strokeWidth="1.5" strokeDasharray="4 3" className="fill-card stroke-muted-foreground/50" />
          <Icon icon={Plus} x={389} y={38} size={14} />
          <text x={407} y={49.5} fontSize={11.5} fontWeight={600} className="fill-foreground">
            Invite
          </text>
        </motion.g>
      </g>
    </Scene>
  );
}
