"use client";

import { motion } from "framer-motion";

function Doodle({
  className,
  stroke,
  path,
}: {
  className: string;
  stroke: string;
  path: string;
}) {
  return (
    <motion.svg
      aria-hidden
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      initial={{ opacity: 0, rotate: -6, scale: 0.98 }}
      animate={{ opacity: 1, rotate: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <path d={path} stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

const FLOATING = [
  { emoji: "🎯", left: "8%", top: "65%", size: "text-2xl", delay: 0.2, dur: 16 },
  { emoji: "⚡", left: "22%", top: "35%", size: "text-3xl", delay: 1.4, dur: 18 },
  { emoji: "🏆", left: "78%", top: "62%", size: "text-2xl", delay: 0.8, dur: 20 },
  { emoji: "💡", left: "86%", top: "28%", size: "text-2xl", delay: 2.1, dur: 19 },
  { emoji: "📚", left: "62%", top: "78%", size: "text-2xl", delay: 1.1, dur: 21 },
  { emoji: "🎮", left: "12%", top: "18%", size: "text-2xl", delay: 2.8, dur: 22 },
  { emoji: "⚡", left: "46%", top: "22%", size: "text-2xl", delay: 0.6, dur: 17 },
  { emoji: "💡", left: "40%", top: "74%", size: "text-2xl", delay: 1.9, dur: 23 },
];

export default function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 qb-grid opacity-70" />

      <Doodle
        className="absolute left-6 top-10 h-20 w-20 opacity-35"
        stroke="rgba(124,58,237,0.9)"
        path="M60 14l8 22 22 8-22 8-8 22-8-22-22-8 22-8 8-22z"
      />
      <Doodle
        className="absolute right-10 top-24 h-24 w-24 opacity-30"
        stroke="rgba(6,182,212,0.9)"
        path="M20 40c20-26 60-26 80 0M20 80c20 26 60 26 80 0"
      />
      <Doodle
        className="absolute left-10 bottom-14 h-24 w-24 opacity-30"
        stroke="rgba(245,158,11,0.9)"
        path="M25 65c25-35 45 35 70 0"
      />
      <Doodle
        className="absolute right-12 bottom-10 h-20 w-20 opacity-30"
        stroke="rgba(255,255,255,0.85)"
        path="M30 30l60 60M90 30L30 90"
      />

      {FLOATING.map((f, idx) => (
        <motion.div
          key={`${f.emoji}-${idx}`}
          aria-hidden
          className={`absolute select-none ${f.size}`}
          style={{ left: f.left, top: f.top, filter: "blur(0px)" }}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: [-8, -70], opacity: [0, 0.12, 0] }}
          transition={{ duration: f.dur, delay: f.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="opacity-40">{f.emoji}</span>
        </motion.div>
      ))}

      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-qb-purple/20 blur-3xl" />
      <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-qb-cyan/20 blur-3xl" />
      <div className="absolute left-1/4 -bottom-52 h-[620px] w-[620px] rounded-full bg-qb-amber/15 blur-3xl" />
    </div>
  );
}

