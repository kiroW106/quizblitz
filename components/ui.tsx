"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Container({ children }: { children: ReactNode }) {
  return <div className="relative mx-auto w-full max-w-6xl px-5 md:px-10">{children}</div>;
}

export function GlassCard({
  children,
  accent = "purple",
  className = "",
}: {
  children: ReactNode;
  accent?: "purple" | "amber" | "cyan" | "red" | "green";
  className?: string;
}) {
  const accentClass =
    accent === "purple"
      ? "border-l-qb-purple"
      : accent === "amber"
        ? "border-l-qb-amber"
        : accent === "cyan"
          ? "border-l-qb-cyan"
          : accent === "green"
            ? "border-l-qb-green"
            : "border-l-qb-red";

  return (
    <div className={`qb-glass rounded-2xl border-l-4 ${accentClass} ${className}`}>{children}</div>
  );
}

export function Logo({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <div className={`flex items-center gap-3 ${size === "lg" ? "text-4xl md:text-5xl" : "text-2xl"}`}>
      <span className="select-none text-qb-amber drop-shadow-[0_8px_20px_rgba(245,158,11,0.22)]">⚡</span>
      <div className="font-logo tracking-wide">
        <span className="text-white">Quiz</span>
        <span className="text-qb-amber">Blitz</span>
      </div>
    </div>
  );
}

export function Chip({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "purple" }) {
  const cls =
    tone === "red"
      ? "bg-qb-red/20 text-qb-red ring-1 ring-qb-red/35"
      : "bg-qb-purple/20 text-qb-purple ring-1 ring-qb-purple/35";
  return (
    <motion.div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${cls}`}
      animate={tone === "red" ? { boxShadow: ["0 0 0 0 rgba(239,68,68,0.0)", "0 0 0 10px rgba(239,68,68,0.0)"] } : {}}
      transition={tone === "red" ? { duration: 1.8, repeat: Infinity, ease: "easeOut" } : {}}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-current" />
      {children}
    </motion.div>
  );
}

type ButtonTone = "purple" | "amber" | "cyan" | "ghost";

function toneToClasses(tone: ButtonTone) {
  if (tone === "purple") return "bg-qb-purple/95 hover:bg-qb-purple text-white shadow-glowPurple";
  if (tone === "amber") return "bg-qb-amber/95 hover:bg-qb-amber text-[#120a00] shadow-glowAmber";
  if (tone === "cyan") return "bg-qb-cyan/95 hover:bg-qb-cyan text-[#001014] shadow-glowCyan";
  return "qb-glass hover:bg-white/10 text-white";
}

export function ButtonLink({
  href,
  children,
  tone = "ghost",
  className = "",
}: {
  href: string;
  children: ReactNode;
  tone?: ButtonTone;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`qb-focus inline-flex items-center justify-center rounded-2xl px-5 py-3 font-extrabold tracking-wide transition-all active:scale-[0.99] ${toneToClasses(
        tone
      )} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Button({
  children,
  onClick,
  tone = "ghost",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: ButtonTone;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`qb-focus inline-flex items-center justify-center rounded-2xl px-5 py-3 font-extrabold tracking-wide transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${toneToClasses(
        tone
      )} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`qb-focus w-full rounded-2xl bg-white/5 px-4 py-3 font-semibold text-white placeholder:text-white/35 ring-1 ring-white/10 transition focus:ring-qb-cyan ${className}`}
    />
  );
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="qb-glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <div className="text-xs font-extrabold uppercase tracking-widest text-white/60">{label}</div>
      <div className="text-sm font-extrabold text-white">{value}</div>
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="qb-glass h-3 w-full overflow-hidden rounded-full">
      <div
        className="h-full rounded-full bg-gradient-to-r from-qb-purple via-qb-cyan to-qb-amber"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
      <div className="text-sm font-extrabold text-white/90">{initials || "?"}</div>
    </div>
  );
}

