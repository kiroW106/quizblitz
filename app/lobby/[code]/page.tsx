"use client";

import Background from "@/components/Background";
import { Avatar, Button, Container, GlassCard, Logo } from "@/components/ui";
import { getOrCreateLocalId } from "@/lib/game";
import { getSupabaseBrowserClient, isSupabaseConfigured, type QuizRow } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PlayerRow = {
  id: string;
  quiz_code: string;
  name: string;
  score: number;
  joined_at: string;
};

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toString();

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const hostId = useMemo(() => getOrCreateLocalId("qb:hostId"), []);
  const isHost = quiz?.host_id && quiz.host_id === hostId;

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    let cancelled = false;
    if (code) {
      void (async () => {
        setError(null);
        const { data: q, error: qErr } = await sb.from("quizzes").select("*").eq("code", code).maybeSingle();
        if (qErr) {
          setError(qErr.message);
          return;
        }
        if (!q) {
          setError("Quiz not found.");
          return;
        }
        if (!cancelled) setQuiz(q as unknown as QuizRow);

        const { data: p, error: pErr } = await sb
          .from("players")
          .select("*")
          .eq("quiz_code", code)
          .order("joined_at", { ascending: true });
        if (pErr) {
          setError(pErr.message);
          return;
        }
        if (!cancelled) setPlayers((p ?? []) as PlayerRow[]);
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [code, supabase]);

  useEffect(() => {
    const sb = supabase;
    if (!code || !sb) return;
    const channel = sb
      .channel(`qb:lobby:${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `quiz_code=eq.${code}` },
        async () => {
          const { data } = await sb
            .from("players")
            .select("*")
            .eq("quiz_code", code)
            .order("joined_at", { ascending: true });
          setPlayers((data ?? []) as PlayerRow[]);
        }
      )
      .on("broadcast", { event: "start" }, () => {
        router.push(`/game/${code}`);
      })
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [code, router, supabase]);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      if (!isSupabaseConfigured() || !supabase) {
        setError("Supabase is not configured. Update .env.local and restart the dev server.");
        return;
      }
      const channel = supabase.channel(`qb:lobby:${code}`);
      await channel.subscribe();
      await channel.send({ type: "broadcast", event: "start", payload: { code } });
      router.push(`/game/${code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to start.";
      setError(msg);
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Background />
      <Container>
        <div className="relative py-10">
          <div className="flex items-center justify-between gap-4">
            <Logo size="sm" />
            <div className="text-sm font-extrabold text-white/65">
              Lobby <span className="text-white/35">·</span>{" "}
              <span className="text-white/90">{quiz?.title ?? "Quiz"}</span>
            </div>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <GlassCard accent="purple" className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">Join code</div>
                  <div className="mt-2 font-logo text-5xl tracking-[0.18em] text-white">{code}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    tone="ghost"
                    className="h-12"
                    onClick={async () => {
                      await navigator.clipboard.writeText(code);
                    }}
                  >
                    Copy
                  </Button>
                  {isHost ? (
                    <Button tone="purple" className="h-12" onClick={start} disabled={starting}>
                      {starting ? "Starting..." : "Start Game"}
                    </Button>
                  ) : (
                    <div className="qb-glass rounded-2xl px-4 py-3 text-sm font-extrabold text-white/75">
                      Waiting for host…
                    </div>
                  )}
                </div>
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl bg-qb-red/15 p-4 text-sm font-bold text-qb-red ring-1 ring-qb-red/25">
                  {error}
                </div>
              ) : null}

              <div className="mt-6">
                <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">
                  Players ({players.length})
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {players.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(0.6, i * 0.03) }}
                      className="qb-glass flex items-center gap-3 rounded-2xl p-4"
                    >
                      <Avatar name={p.name} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-white">{p.name}</div>
                        <div className="text-xs font-bold text-white/50">Score: {p.score}</div>
                      </div>
                    </motion.div>
                  ))}
                  {players.length === 0 ? (
                    <div className="qb-glass rounded-2xl p-6 text-sm font-semibold text-white/55">
                      No players yet. Share the code above.
                    </div>
                  ) : null}
                </div>
              </div>
            </GlassCard>

            <GlassCard accent="cyan" className="p-6">
              <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">How it works</div>
              <div className="mt-2 text-xl font-extrabold text-white">KBC-style flow</div>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-white/60">
                <div className="qb-glass rounded-2xl p-4">
                  <div className="font-extrabold text-white">Read phase</div>
                  <div className="mt-1">Question shows first. Options stay hidden for 90 seconds.</div>
                </div>
                <div className="qb-glass rounded-2xl p-4">
                  <div className="font-extrabold text-white">Answer phase</div>
                  <div className="mt-1">Choose A/B/C/D before the timer ends.</div>
                </div>
                <div className="qb-glass rounded-2xl p-4">
                  <div className="font-extrabold text-white">Scoring</div>
                  <div className="mt-1">Faster correct answers earn more points.</div>
                </div>
              </div>
              <div className="mt-5 text-sm font-semibold text-white/50">
                Host: you’re detected by your browser’s local host id.
              </div>
            </GlassCard>
          </div>
        </div>
      </Container>
    </main>
  );
}

