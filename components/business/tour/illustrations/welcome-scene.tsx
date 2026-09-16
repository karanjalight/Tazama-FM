"use client";

import { motion } from "framer-motion";
import { AudioLines, Heart, Image as ImageIcon } from "lucide-react";

import {
  Equalizer,
  FlowLine,
  Icon,
  LiveDot,
  ORIGIN_CENTER,
  ORIGIN_LEFT,
  Panel,
  PhoneFrame,
  Scene,
  Speaker,
  TextLine,
  TvFrame,
  useLoop,
} from "./kit";

export function WelcomeScene() {
  const loop = useLoop();
  return (
    <Scene label="One Tazama hub connected to a TV, speakers, a menu screen and a guest's phone">
      <FlowLine d="M218 176 C 196 166, 188 156, 176 150" />
      <FlowLine d="M262 170 C 300 150, 326 120, 352 102" delay={0.3} />
      <FlowLine d="M262 196 C 290 214, 304 226, 318 236" delay={0.6} />
      <FlowLine d="M218 196 C 204 214, 200 236, 196 250" delay={0.9} />

      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6 })}>
        <TvFrame x={28} y={34} w={176} h={112}>
          <rect x="12" y="14" width="54" height="54" rx="8" className="fill-muted-foreground/20" />
          <TextLine x={78} y={22} w={62} strong />
          <TextLine x={78} y={36} w={44} />
          <Equalizer x={78} y={50} />
          <rect x="12" y="80" width="136" height="3" rx="1.5" className="fill-muted-foreground/20" />
          <motion.rect
            x="12"
            y="80"
            width="136"
            height="3"
            rx="1.5"
            className="fill-foreground/70"
            style={ORIGIN_LEFT}
            initial={{ scaleX: 0.45 }}
            {...loop({ scaleX: [0.1, 0.9] }, { duration: 9, ease: "linear" })}
          />
        </TvFrame>
      </motion.g>

      <motion.g {...loop({ y: [0, -3, 0] }, { duration: 5, delay: 0.8 })}>
        <Speaker x={352} y={48} w={46} h={68} />
        <Speaker x={408} y={62} w={36} h={54} />
      </motion.g>

      <motion.g style={ORIGIN_CENTER} {...loop({ scale: [1, 1.04, 1] }, { duration: 3 })}>
        <Panel x={208} y={154} w={64} h={64} r={18}>
          <Icon icon={AudioLines} x={18} y={18} size={28} />
        </Panel>
        <LiveDot cx={266} cy={160} />
      </motion.g>

      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6.5, delay: 1.2 })}>
        <Panel x={44} y={214} w={152} h={100}>
          <rect x="12" y="12" width="50" height="50" rx="8" className="fill-muted" />
          <Icon icon={ImageIcon} x={27} y={27} size={20} className="text-muted-foreground" />
          <TextLine x={72} y={16} w={62} strong />
          <TextLine x={72} y={30} w={48} />
          <TextLine x={12} y={74} w={84} />
          <TextLine x={112} y={74} w={28} strong />
          <TextLine x={12} y={86} w={70} />
          <TextLine x={112} y={86} w={28} strong />
        </Panel>
      </motion.g>

      <motion.g {...loop({ y: [0, -5, 0] }, { duration: 5.5, delay: 0.4 })}>
        <PhoneFrame x={318} y={170} w={88} h={160}>
          <TextLine x={12} y={24} w={40} strong />
          <rect x="12" y="38" width="52" height="52" rx="8" className="fill-muted" />
          <TextLine x={12} y={100} w={50} />
          <TextLine x={12} y={112} w={34} />
          <motion.g initial={{ opacity: 0.9 }} {...loop({ y: [0, -40], opacity: [0, 1, 0] }, { duration: 2.6, repeatDelay: 0.6 })}>
            <Icon icon={Heart} x={50} y={118} size={16} className="fill-foreground text-foreground" />
          </motion.g>
        </PhoneFrame>
      </motion.g>
    </Scene>
  );
}
