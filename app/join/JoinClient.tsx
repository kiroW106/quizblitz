"use client";

import Background from "@/components/Background";
import { Button, Container, GlassCard, Input, Logo } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function clampDigit(s: string) {
  const d = s.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase();
  return d;
}

export default function JoinClient() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode");

  
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join("");

  useEffect(() => {
    if (mode === "random") router.replace("/random");
  }, [mode, router]);

  async function join() {
    setError(null);
    
    if (code.length !== 6) {
      setError("Enter a 6-digit code.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter your name (min 2 chars).");
      return;
    }

    setJoining(true);
    try {
      const { data: quiz, error: quizErr } = await supabase
        .from("quizzes")
        .select("code")
        .eq("code", code)
        .maybeSingle();
      if (quizErr) throw quizErr;
      if (!quiz) {
        setError("No quiz found for that code.");
        return;
      }

      const { data: player, error: playerErr } = await supabase
        .from("players")
        .insert({
          quiz_code: code,
          name: name.trim(),
          score: 0,
        })
        .select("id")
        .single();
      if (playerErr) throw playerErr;

      window.localStorage.setItem(`qb:playerId:${code}`, player.id);
      window.sessionStorage.setItem(`qb:playerId:${code}`, player.id);
      router.push(`/lobby/${code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to join.";
      setError(msg);
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Background />
      <Container>
        <div className="relative grid min-h-screen place-items-center py-14">
          <div className="w-full max-w-xl">
            <div className="flex flex-col items-center text-center">
              <Logo />
              <div className="mt-3 text-sm font-extrabold uppercase tracking-[0.35em] text-white/65">
                Join the live lobby
              </div>
              {mode === "random" ? (
                <div className="mt-2 text-sm font-semibold text-white/55">Tip: ask your host for the 6-digit code.</div>
              ) : null}
            </div>

            <div className="mt-10">
              <GlassCard accent="cyan" className="p-6">
                <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">Join code</div>
                <div className="mt-3 grid grid-cols-6 gap-2">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputsRef.current[i] = el;
                      }}
                      value={d}
                      inputMode="text"
                      autoComplete="one-time-code"
                      onChange={(e) => {
                        const next = [...digits];
                        const val = clampDigit(e.target.value);
                        next[i] = val;
                        setDigits(next);
                        if (val && i < 5) inputsRef.current[i + 1]?.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
                        if (e.key === "ArrowLeft" && i > 0) inputsRef.current[i - 1]?.focus();
                        if (e.key === "ArrowRight" && i < 5) inputsRef.current[i + 1]?.focus();
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                        if (!text) return;
                        const next = ["", "", "", "", "", ""];
                        text.split("").forEach((ch, idx) => {
                          next[idx] = ch;
                        });
                        setDigits(next);
                        inputsRef.current[Math.min(5, text.length - 1)]?.focus();
                        e.preventDefault();
                      }}
                      className="qb-focus h-14 w-full rounded-2xl bg-white/5 text-center text-2xl font-extrabold text-white ring-1 ring-white/12 placeholder:text-white/30"
                      placeholder="•"
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>

                <div className="mt-6">
                  <div className="mb-2 text-sm font-extrabold text-white/80">Your name</div>
                  <Input value={name} onChange={setName} placeholder="e.g., Aanya" />
                </div>

                {error ? (
                  <div className="mt-4 rounded-2xl bg-qb-red/15 p-4 text-sm font-bold text-qb-red ring-1 ring-qb-red/25">
                    {error}
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white/55">Ready when you are.</div>
                  <Button tone="cyan" onClick={join} disabled={joining} className="h-12">
                    {joining ? "Joining..." : "Join"}
                  </Button>
                </div>

                {joining ? (
                  <motion.div
                    className="mt-5 qb-glass rounded-2xl p-4"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-extrabold text-white">Connecting to lobby…</div>
                      <motion.div className="h-2 w-24 overflow-hidden rounded-full bg-white/10" initial={false}>
                        <motion.div
                          className="h-full bg-qb-cyan"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                          style={{ width: "40%" }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                ) : null}
              </GlassCard>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}

