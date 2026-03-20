"use client";

import Background from "@/components/Background";
import { Avatar, ButtonLink, Container, GlassCard, Logo } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type PlayerRow = { id: string; quiz_code: string; name: string; score: number; joined_at: string };

function medal(rank: number) {
  if (rank === 1) return "👑";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "⭐";
}

export default function ResultsPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toString();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const totalQuestions = players.length > 0
    ? Math.max(...players.map(p => p.score > 0 ? Math.ceil(p.score / 50) : 0))
    : 0;

  useEffect(() => {
    if (!code) return;
    void (async () => {
      const { data: p } = await supabase
        .from("players")
        .select("*")
        .eq("quiz_code", code)
        .order("score", { ascending: false })
        .limit(20);
      setPlayers((p ?? []) as PlayerRow[]);
      setLoading(false);
    })();
  }, [code]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Background />
      <Container>
        <div className="relative py-10">
          <div className="flex items-center justify-between gap-4">
            <Logo size="sm" />
            <ButtonLink href="/" tone="ghost" className="h-12">
              🏠 Home
            </ButtonLink>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <GlassCard accent="green" className="p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">🏆 Final Results</div>
                  <div className="mt-2 text-3xl font-extrabold text-white">Leaderboard</div>
                </div>
                <div className="qb-glass rounded-2xl px-4 py-3 text-sm font-extrabold text-white/70">Code: {code}</div>
              </div>

              {loading ? (
                <div className="qb-glass rounded-2xl p-6 text-sm font-semibold text-white/55 text-center">Loading results...</div>
              ) : players.length === 0 ? (
                <div className="qb-glass rounded-2xl p-6 text-sm font-semibold text-white/55 text-center">No results found.</div>
              ) : (
                <div className="grid gap-3">
                  {players.map((p, i) => {
                    const rank = i + 1;
                    const isTop3 = rank <= 3;
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(0.8, i * 0.06) }}
                        style={{
                          display: "flex", alignItems: "center", gap: "14px",
                          padding: isTop3 ? "18px" : "14px",
                          borderRadius: "16px",
                          background: rank === 1 ? "rgba(245,158,11,0.08)" : rank === 2 ? "rgba(192,192,192,0.06)" : rank === 3 ? "rgba(205,127,50,0.06)" : "rgba(255,255,255,0.04)",
                          border: rank === 1 ? "1px solid rgba(245,158,11,0.3)" : rank === 2 ? "1px solid rgba(192,192,192,0.2)" : rank === 3 ? "1px solid rgba(205,127,50,0.2)" : "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div style={{ fontSize: isTop3 ? "28px" : "18px", width: "36px", textAlign: "center", flexShrink: 0 }}>
                          {medal(rank)}
                        </div>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: 800 }}>#{rank}</span>
                        </div>
                        <Avatar name={p.name} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "white", fontSize: "15px", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ color: rank === 1 ? "#f59e0b" : "white", fontSize: isTop3 ? "22px" : "18px", fontWeight: 900, lineHeight: 1 }}>{p.score}</div>
                          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>pts</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            <GlassCard accent="amber" className="p-6">
              <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">⚡ Speed Rewards</div>
              <div className="mt-2 text-xl font-extrabold text-white">How scoring worked</div>
              <div className="mt-4 grid gap-3">
                {[
                  ["≤ 15s", "300 pts", "#7c3aed"],
                  ["≤ 25s", "200 pts", "#06b6d4"],
                  ["≤ 45s", "100 pts", "#f59e0b"],
                  ["> 45s", "50 pts", "#10b981"],
                  ["Wrong", "0 pts", "#ef4444"],
                ].map(([time, pts, color]) => (
                  <div key={time} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "12px 16px", border: `1px solid ${color}25` }}>
                    <span style={{ color, fontSize: "14px", fontWeight: 800 }}>{time}</span>
                    <span style={{ color: "white", fontSize: "15px", fontWeight: 900 }}>{pts}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 qb-glass rounded-2xl p-4 text-center">
                <ButtonLink href="/" tone="ghost" className="h-10 w-full">
                  🎮 Play Again
                </ButtonLink>
              </div>
            </GlassCard>
          </div>
        </div>
      </Container>
    </main>
  );
}
