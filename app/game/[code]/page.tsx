"use client";

import Background from "@/components/Background";
import { Avatar, Button, Container, GlassCard, Logo } from "@/components/ui";
import { getOrCreateLocalId, scoreFromTimeSeconds } from "@/lib/game";
import { getSupabaseBrowserClient, isSupabaseConfigured, type QuizQuestion, type QuizRow } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PlayerRow = { id: string; quiz_code: string; name: string; score: number; joined_at: string };

type Phase = "read" | "answer" | "reveal";

const READ_SECONDS = 90;
const ANSWER_SECONDS = 80;

function kbcLabel(i: 0 | 1 | 2 | 3) {
  return (["A", "B", "C", "D"] as const)[i];
}

function useSfxMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  function start() {
    if (ctxRef.current) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 220;
    gain.gain.value = 0.012;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    ctxRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;
  }

  function stop() {
    try {
      oscRef.current?.stop();
    } catch {}
    oscRef.current?.disconnect();
    gainRef.current?.disconnect();
    ctxRef.current?.close();
    ctxRef.current = null;
    oscRef.current = null;
    gainRef.current = null;
  }

  return { start, stop };
}

export default function GamePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toString();

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const hostId = useMemo(() => getOrCreateLocalId("qb:hostId"), []);

  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("read");
  const [qIndex, setQIndex] = useState(0);
  const [phaseEndsAt, setPhaseEndsAt] = useState<number>(() => Date.now() + READ_SECONDS * 1000);
  const [now, setNow] = useState<number>(() => Date.now());
  const [picked, setPicked] = useState<0 | 1 | 2 | 3 | null>(null);
  const [reveal, setReveal] = useState<{ correct: 0 | 1 | 2 | 3; points: number } | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const music = useSfxMusic();

  const isHost = quiz?.host_id === hostId;
  const question: QuizQuestion | null = quiz?.questions?.[qIndex] ?? null;
  const remainingMs = Math.max(0, phaseEndsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);

  useEffect(() => {
    setPlayerId(typeof window !== "undefined" ? window.localStorage.getItem(`qb:playerId:${code}`) : null);
  }, [code]);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    let cancelled = false;
    if (code) {
      void (async () => {
        const { data: q } = await sb.from("quizzes").select("*").eq("code", code).maybeSingle();
        if (!cancelled) setQuiz((q as unknown as QuizRow) ?? null);

        const { data: p } = await sb
          .from("players")
          .select("*")
          .eq("quiz_code", code)
          .order("score", { ascending: false });
        if (!cancelled) setPlayers((p ?? []) as PlayerRow[]);
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [code, supabase]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remainingMs > 0) return;
    if (phase === "read") {
      setPhase("answer");
      setPhaseEndsAt(Date.now() + ANSWER_SECONDS * 1000);
      setPicked(null);
      setReveal(null);
      return;
    }
    if (phase === "answer") {
      setPhase("reveal");
      if (question) setReveal({ correct: question.correctIndex, points: 0 });
      return;
    }
  }, [phase, question, remainingMs]);

  useEffect(() => {
    const sb = supabase;
    if (!code || !sb) return;
    const channel = sb
      .channel(`qb:game:${code}`)
      .on("broadcast", { event: "goto" }, (payload) => {
        const nextIndex = (payload.payload?.index ?? 0) as number;
        setQIndex(nextIndex);
        setPhase("read");
        setPhaseEndsAt(Date.now() + READ_SECONDS * 1000);
        setPicked(null);
        setReveal(null);
      })
      .on("broadcast", { event: "end" }, () => {
        router.push(`/results/${code}`);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `quiz_code=eq.${code}` },
        async () => {
          const { data } = await sb
            .from("players")
            .select("*")
            .eq("quiz_code", code)
            .order("score", { ascending: false });
          setPlayers((data ?? []) as PlayerRow[]);
        }
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [code, router, supabase]);

  useEffect(() => {
    if (!quiz || playerId) return;
    if (!isHost) return;
    const sb = supabase;
    if (!sb) return;
    let cancelled = false;
    void (async () => {
      const { data: existing } = await sb
        .from("players")
        .select("id")
        .eq("quiz_code", code)
        .ilike("name", "Host")
        .limit(1);
      if (cancelled) return;
      if (existing && existing[0]?.id) {
        window.localStorage.setItem(`qb:playerId:${code}`, existing[0].id);
        setPlayerId(existing[0].id);
        return;
      }
      const { data: created } = await sb
        .from("players")
        .insert({ quiz_code: code, name: "Host", score: 0 })
        .select("id")
        .single();
      if (cancelled) return;
      if (created?.id) {
        window.localStorage.setItem(`qb:playerId:${code}`, created.id);
        setPlayerId(created.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, isHost, playerId, quiz, supabase]);

  async function pickAnswer(i: 0 | 1 | 2 | 3) {
    if (!question) return;
    if (!playerId) return;
    if (phase !== "answer") return;
    if (picked !== null) return;
    const sb = supabase;
    if (!isSupabaseConfigured() || !sb) return;
    setPicked(i);

    const timeTaken = Math.max(0, Math.round((ANSWER_SECONDS * 1000 - remainingMs) / 1000));
    const correct = i === question.correctIndex;
    const points = correct ? scoreFromTimeSeconds(timeTaken) : 0;

    setReveal({ correct: question.correctIndex, points });

    await sb.from("answers").insert({
      quiz_code: code,
      player_id: playerId,
      question_index: qIndex,
      answer: i,
      time_taken: timeTaken,
      points,
    });

    const { data: player } = await sb.from("players").select("score").eq("id", playerId).maybeSingle();
    const currentScore = (player?.score ?? 0) as number;
    await sb.from("players").update({ score: currentScore + points }).eq("id", playerId);
  }

  async function hostNext() {
    if (!quiz) return;
    const sb = supabase;
    if (!isSupabaseConfigured() || !sb) return;
    const next = qIndex + 1;
    const channel = sb.channel(`qb:game:${code}`);
    await channel.subscribe();
    if (next >= quiz.questions.length) {
      await channel.send({ type: "broadcast", event: "end", payload: { code } });
      router.push(`/results/${code}`);
      return;
    }
    await channel.send({ type: "broadcast", event: "goto", payload: { index: next } });
    setQIndex(next);
    setPhase("read");
    setPhaseEndsAt(Date.now() + READ_SECONDS * 1000);
    setPicked(null);
    setReveal(null);
  }

  const total = quiz?.questions?.length ?? 0;
  const progressPct = total > 0 ? Math.round(((qIndex + 1) / total) * 100) : 0;
  const ringPct =
    phase === "read"
      ? Math.max(0, Math.min(1, remainingMs / (READ_SECONDS * 1000)))
      : Math.max(0, Math.min(1, remainingMs / (ANSWER_SECONDS * 1000)));

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Background />
      <Container>
        <div className="relative py-10">
          <div className="flex items-center justify-between gap-4">
            <Logo size="sm" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const next = !musicOn;
                  setMusicOn(next);
                  if (next) music.start();
                  else music.stop();
                }}
                className={`qb-focus qb-glass rounded-2xl px-4 py-3 text-sm font-extrabold ${
                  musicOn ? "text-qb-amber ring-1 ring-qb-amber/30" : "text-white/70 ring-1 ring-white/10"
                }`}
              >
                {musicOn ? "Music: ON" : "Music: OFF"}
              </button>
              <div className="qb-glass rounded-2xl px-4 py-3 text-sm font-extrabold text-white/70">
                {qIndex + 1}/{Math.max(1, total)}
              </div>
            </div>
          </div>

          <div className="mt-6 qb-glass h-3 overflow-hidden rounded-full">
            <div
              className="h-full bg-gradient-to-r from-qb-purple via-qb-cyan to-qb-amber"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.65fr]">
            <GlassCard accent="purple" className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">
                    {phase === "read" ? "READ PHASE" : phase === "answer" ? "ANSWER PHASE" : "REVEAL"}
                  </div>
                  <div className="mt-2 text-2xl md:text-3xl font-extrabold text-white leading-snug">
                    {question?.question ?? "Loading question..."}
                  </div>
                </div>

                <div className="relative grid place-items-center">
                  <svg width="72" height="72" viewBox="0 0 120 120" className="drop-shadow-[0_12px_25px_rgba(6,182,212,0.15)]">
                    <circle cx="60" cy="60" r="46" stroke="rgba(255,255,255,0.12)" strokeWidth="10" fill="none" />
                    <motion.circle
                      cx="60"
                      cy="60"
                      r="46"
                      stroke={phase === "read" ? "rgba(245,158,11,0.95)" : "rgba(6,182,212,0.95)"}
                      strokeWidth="10"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 46}`}
                      strokeDashoffset={`${(1 - ringPct) * 2 * Math.PI * 46}`}
                      transform="rotate(-90 60 60)"
                      animate={{ strokeDashoffset: (1 - ringPct) * 2 * Math.PI * 46 }}
                      transition={{ duration: 0.12, ease: "linear" }}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-xl font-extrabold text-white">{remainingSec}</div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-white/55">
                      sec
                    </div>
                  </div>
                </div>
              </div>

              {phase === "read" ? (
                <div className="mt-5 qb-glass rounded-2xl p-5">
                  <div className="text-sm font-semibold text-white/65">
                    Options appear after the read timer. Get ready to answer fast.
                  </div>
                </div>
              ) : null}

              {phase !== "read" ? (
                <div className="mt-6 grid gap-3">
                  {(question?.options ?? ["", "", "", ""]).map((opt, i) => {
                    const optIdx = i as 0 | 1 | 2 | 3;
                    const isCorrect = reveal?.correct === optIdx && phase === "reveal";
                    const isPicked = picked === optIdx;
                    const ring =
                      isCorrect ? "ring-2 ring-qb-green" : isPicked ? "ring-2 ring-qb-amber" : "ring-1 ring-white/10";
                    const bg =
                      isCorrect ? "bg-qb-green/12" : isPicked ? "bg-qb-amber/10" : "bg-white/5 hover:bg-white/7";
                    return (
                      <button
                        key={i}
                        disabled={phase !== "answer" || picked !== null}
                        onClick={() => pickAnswer(optIdx)}
                        className={`qb-focus qb-glass ${bg} ${ring} flex items-center gap-4 rounded-2xl p-4 text-left transition disabled:cursor-not-allowed`}
                      >
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                          <div className="text-sm font-extrabold text-white">{kbcLabel(optIdx)}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-white">{opt}</div>
                          {isCorrect ? (
                            <div className="text-xs font-bold text-qb-green">Correct</div>
                          ) : isPicked && phase === "reveal" ? (
                            <div className="text-xs font-bold text-qb-amber">Your pick</div>
                          ) : (
                            <div className="text-xs font-bold text-white/45">Choose wisely</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {phase === "reveal" ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="qb-glass rounded-2xl px-4 py-3 text-sm font-extrabold text-white/80">
                    {picked === null ? "No answer submitted." : reveal?.points ? `+${reveal.points} pts!` : "0 pts"}
                  </div>
                  {isHost ? (
                    <Button tone="purple" className="h-12" onClick={hostNext}>
                      {qIndex + 1 >= total ? "Finish" : "Next Question"}
                    </Button>
                  ) : (
                    <div className="qb-glass rounded-2xl px-4 py-3 text-sm font-extrabold text-white/70">
                      Waiting for host…
                    </div>
                  )}
                </div>
              ) : null}
            </GlassCard>

            <GlassCard accent="amber" className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">Live leaderboard</div>
                  <div className="mt-1 text-xl font-extrabold text-white">Top players</div>
                </div>
                <div className="qb-glass rounded-2xl px-3 py-2 text-xs font-extrabold text-white/65">
                  Code: {code}
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {players.slice(0, 8).map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(0.5, i * 0.03) }}
                    className="qb-glass flex items-center gap-3 rounded-2xl p-4"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                      <div className="text-xs font-extrabold text-white/80">#{i + 1}</div>
                    </div>
                    <Avatar name={p.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-white">{p.name}</div>
                      <div className="text-xs font-bold text-white/50">{p.score} pts</div>
                    </div>
                  </motion.div>
                ))}
                {players.length === 0 ? (
                  <div className="qb-glass rounded-2xl p-6 text-sm font-semibold text-white/55">
                    Waiting for players…
                  </div>
                ) : null}
              </div>
            </GlassCard>
          </div>
        </div>
      </Container>
    </main>
  );
}

