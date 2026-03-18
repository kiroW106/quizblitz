"use client";

import Background from "@/components/Background";
import { Avatar, ButtonLink, Container, GlassCard, Logo } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type PlayerRow = { id: string; quiz_code: string; name: string; score: number; joined_at: string };
type AnswerRow = { id: string; quiz_code: string; player_id: string; points: number };

function medal(rank: number) {
  if (rank === 1) return "👑";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "⭐";
}

export default function ResultsPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toString();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    let cancelled = false;
    if (code) {
      void (async () => {
        const { data: p } = await sb
          .from("players")
          .select("*")
          .eq("quiz_code", code)
          .order("score", { ascending: false })
          .limit(20);
        const { data: a } = await sb
          .from("answers")
          .select("id,quiz_code,player_id,points")
          .eq("quiz_code", code);
        if (cancelled) return;
        setPlayers((p ?? []) as PlayerRow[]);
        setAnswers((a ?? []) as AnswerRow[]);
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [code, supabase]);

  const breakdown = useMemo(() => {
    const map = new Map<string, { total: number; correct: number; rounds: number }>();
    for (const a of answers) {
      const cur = map.get(a.player_id) ?? { total: 0, correct: 0, rounds: 0 };
      cur.total += a.points ?? 0;
      cur.correct += (a.points ?? 0) > 0 ? 1 : 0;
      cur.rounds += 1;
      map.set(a.player_id, cur);
    }
    return map;
  }, [answers]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Background />
      <Container>
        <div className="relative py-10">
          <div className="flex items-center justify-between gap-4">
            <Logo size="sm" />
            <ButtonLink href="/" tone="ghost" className="h-12">
              Play Again
            </ButtonLink>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <GlassCard accent="green" className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">Results</div>
                  <div className="mt-2 text-3xl font-extrabold text-white">Leaderboard</div>
                </div>
                <div className="qb-glass rounded-2xl px-4 py-3 text-sm font-extrabold text-white/70">Code: {code}</div>
              </div>

              <div className="mt-5 grid gap-2">
                {players.map((p, i) => {
                  const rank = i + 1;
                  const b = breakdown.get(p.id) ?? { total: 0, correct: 0, rounds: 0 };
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(0.7, i * 0.04) }}
                      className="qb-glass flex items-center gap-4 rounded-2xl p-4"
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                        <div className="text-base">{medal(rank)}</div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                        <div className="text-sm font-extrabold text-white/80">#{rank}</div>
                      </div>
                      <Avatar name={p.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold text-white">{p.name}</div>
                        <div className="text-xs font-bold text-white/50">
                          Correct: {b.correct}/{Math.max(1, b.rounds)} · Points from answers: {b.total}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-white">{p.score}</div>
                        <div className="text-xs font-extrabold uppercase tracking-widest text-white/50">pts</div>
                      </div>
                    </motion.div>
                  );
                })}
                {players.length === 0 ? (
                  <div className="qb-glass rounded-2xl p-6 text-sm font-semibold text-white/55">
                    No results yet.
                  </div>
                ) : null}
              </div>
            </GlassCard>

            <GlassCard accent="amber" className="p-6">
              <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">Points system</div>
              <div className="mt-2 text-xl font-extrabold text-white">Speed rewards</div>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-white/60">
                <div className="qb-glass rounded-2xl p-4">
                  <div className="font-extrabold text-white">≤ 15s</div>
                  <div className="mt-1">300 points</div>
                </div>
                <div className="qb-glass rounded-2xl p-4">
                  <div className="font-extrabold text-white">≤ 25s</div>
                  <div className="mt-1">200 points</div>
                </div>
                <div className="qb-glass rounded-2xl p-4">
                  <div className="font-extrabold text-white">≤ 45s</div>
                  <div className="mt-1">100 points</div>
                </div>
                <div className="qb-glass rounded-2xl p-4">
                  <div className="font-extrabold text-white">&gt; 45s</div>
                  <div className="mt-1">50 points</div>
                </div>
                <div className="qb-glass rounded-2xl p-4">
                  <div className="font-extrabold text-white">Wrong / No answer</div>
                  <div className="mt-1">0 points</div>
                </div>
              </div>
              <div className="mt-5 text-sm font-semibold text-white/50">
                Top 20 are animated for a premium, game-show feel.
              </div>
            </GlassCard>
          </div>
        </div>
      </Container>
    </main>
  );
}

