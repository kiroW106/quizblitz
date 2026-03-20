"use client";

import Background from "@/components/Background";
import { Avatar, Container, GlassCard, Logo } from "@/components/ui";
import { supabase, type QuizRow, type QuizQuestion } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PlayerRow = { id: string; quiz_code: string; name: string; score: number; joined_at: string };
type Phase = "read" | "answer" | "reveal";

function kbcLabel(i: 0 | 1 | 2 | 3) {
  return (["A", "B", "C", "D"] as const)[i];
}

function scoreFromTime(t: number) {
  if (t <= 15) return 300;
  if (t <= 25) return 200;
  if (t <= 45) return 100;
  return 50;
}

let globalAudio: HTMLAudioElement | null = null;
let globalMusicOn = false;

function toggleGlobalMusic(on: boolean) {
  globalMusicOn = on;
  if (on) {
    if (!globalAudio) {
      globalAudio = new Audio("/music.mp3");
      globalAudio.loop = true;
      globalAudio.volume = 0.35;
    }
    globalAudio.play().catch(() => {});
  } else {
    if (globalAudio) {
      globalAudio.pause();
      globalAudio.currentTime = 0;
    }
  }
}

export default function GamePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toString();

  const isHost = useMemo(() => {
    const hasHostKey = !!localStorage.getItem(`host_${code}`);
    const hasPlayerKey = !!localStorage.getItem(`qb:playerId:${code}`);
    return hasHostKey && !hasPlayerKey;
  }, [code]);

  // Get playerId immediately - store in ref so it's always current
  const playerIdRef = useRef<string | null>(
    typeof window !== "undefined" ? window.localStorage.getItem(`qb:playerId:${code}`) : null
  );

  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [phase, setPhase] = useState<Phase>("read");
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [picked, setPicked] = useState<0 | 1 | 2 | 3 | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);
  const [musicOn, setMusicOn] = useState(globalMusicOn);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerStartRef = useRef<number>(0);
  const handledRef = useRef<string>("");
  const readSecsRef = useRef(30);
  const answerSecsRef = useRef(60);
  const phaseRef = useRef<Phase>("read");
  const qIndexRef = useRef(0);
  const totalRef = useRef(0);
  const codeRef = useRef(code);
  const routerRef = useRef(router);
  const pickedRef = useRef<number | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);
  useEffect(() => { routerRef.current = router; }, [router]);
  useEffect(() => { pickedRef.current = picked; }, [picked]);

  const question: QuizQuestion | null = (quiz?.questions as QuizQuestion[])?.[qIndex] ?? null;
  const total = (quiz?.questions as QuizQuestion[])?.length ?? 0;
  totalRef.current = total;
  const totalSecs = phase === "read" ? readSecsRef.current : phase === "answer" ? answerSecsRef.current : 5;
  const ringPct = Math.max(0, Math.min(1, timeLeft / totalSecs));
  const progressPct = total > 0 ? Math.round(((qIndex + 1) / total) * 100) : 0;

  function stopTick() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }

  function startTick(startMs: number, duration: number) {
    stopTick();
    setTimeLeft(Math.ceil(duration));
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startMs) / 1000;
      const rem = Math.max(0, Math.ceil(duration - elapsed));
      setTimeLeft(rem);
    }, 200);
  }

  function refreshLeaderboard() {
    void supabase.from("players").select("*")
      .eq("quiz_code", codeRef.current)
      .order("score", { ascending: false })
      .then(({ data }) => { if (data) setPlayers(data as PlayerRow[]); });
  }

  function doGoToAnswer() {
    const now = Date.now();
    answerStartRef.current = now;
    setPhase("answer");
    phaseRef.current = "answer";
    handledRef.current = "";
    startTick(now, answerSecsRef.current);
  }

  function doGoToReveal() {
    handledRef.current = "answer_handled";
    setRevealed(true);
    setPhase("reveal");
    phaseRef.current = "reveal";
    startTick(Date.now(), 5);
    // Wait 1s for all score updates to land then refresh
    setTimeout(refreshLeaderboard, 1000);
    setTimeout(refreshLeaderboard, 2500);
  }

  function doNextQuestion(nextIndex: number, serverTime: number) {
    handledRef.current = "";
    setQIndex(nextIndex);
    qIndexRef.current = nextIndex;
    setPhase("read");
    phaseRef.current = "read";
    setPicked(null);
    pickedRef.current = null;
    setRevealed(false);
    setEarnedPoints(null);
    startTick(serverTime, readSecsRef.current);
  }

  // Load quiz + players
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void (async () => {
      const { data: q } = await supabase.from("quizzes").select("*").eq("code", code).maybeSingle();
      if (!cancelled && q) {
        const qd = q as unknown as QuizRow;
        readSecsRef.current = qd.read_seconds ?? 30;
        answerSecsRef.current = qd.answer_seconds ?? 60;
        setQuiz(qd);
        startTick(Date.now(), readSecsRef.current);
      }
      const { data: p } = await supabase.from("players").select("*").eq("quiz_code", code).order("score", { ascending: false });
      if (!cancelled) setPlayers((p ?? []) as PlayerRow[]);
    })();
    return () => { cancelled = true; stopTick(); };
  }, [code]);

  // Phase transitions
  useEffect(() => {
    if (timeLeft > 0) return;
    const p = phaseRef.current;

    if (p === "read") {
      doGoToAnswer();
      return;
    }
    if (p === "answer" && handledRef.current !== "answer_handled") {
      doGoToReveal();
      return;
    }
    if (p === "reveal" && handledRef.current !== "reveal_handled") {
      handledRef.current = "reveal_handled";
      const isH = !!localStorage.getItem(`host_${codeRef.current}`) && !localStorage.getItem(`qb:playerId:${codeRef.current}`);
      if (!isH) return;
      stopTick();
      const next = qIndexRef.current + 1;
      void (async () => {
        const ch = supabase.channel(`qb:game:${codeRef.current}`);
        await ch.subscribe();
        if (next >= totalRef.current) {
          await ch.send({ type: "broadcast", event: "end", payload: {} });
          toggleGlobalMusic(false);
          routerRef.current.push(`/results/${codeRef.current}`);
          return;
        }
        const now = Date.now();
        await ch.send({ type: "broadcast", event: "goto", payload: { index: next, serverTime: now } });
        doNextQuestion(next, now);
      })();
    }
  }, [timeLeft]);

  // Realtime channel
  useEffect(() => {
    if (!code) return;
    const ch = supabase
      .channel(`qb:game:${code}`)
      .on("broadcast", { event: "goto" }, (payload) => {
        doNextQuestion(payload.payload?.index ?? 0, payload.payload?.serverTime ?? Date.now());
      })
      .on("broadcast", { event: "end" }, () => {
        stopTick();
        toggleGlobalMusic(false);
        router.push(`/results/${code}`);
      })
      .subscribe();
    return () => { stopTick(); void supabase.removeChannel(ch); };
  }, [code, router]);

  async function pickAnswer(i: 0 | 1 | 2 | 3) {
    if (isHost) return;
    if (phaseRef.current !== "answer") return;
    if (pickedRef.current !== null) return;

    // Get playerId fresh from localStorage every time
    const pid = sessionStorage.getItem(`qb:playerId:${code}`) || localStorage.getItem(`qb:playerId:${code}`);
    if (!pid) {
      console.error("No player ID found in localStorage");
      return;
    }

    if (!question) return;

    // Lock immediately
    setPicked(i);
    pickedRef.current = i;

    const timeTaken = Math.max(0, Math.round((Date.now() - answerStartRef.current) / 1000));
    const correctIndex = (question as any)?.correct ?? question?.correctIndex ?? -1;
    const correct = i === correctIndex;
    const points = correct ? scoreFromTime(timeTaken) : 0;
    setEarnedPoints(points);

    // Save answer
    await supabase.from("answers").insert({
      quiz_code: code,
      player_id: pid,
      question_index: qIndex,
      answer: i,
      time_taken: timeTaken,
      points,
    });

    // Update score atomically
    if (points > 0) {
      const { error } = await supabase.rpc("increment_score", { player_id: pid, amount: points });
      if (error) {
        console.error("Score update failed:", error);
        // Fallback: direct update
        const { data: pl } = await supabase.from("players").select("score").eq("id", pid).maybeSingle();
        const current = (pl?.score ?? 0) as number;
        await supabase.from("players").update({ score: current + points }).eq("id", pid);
      }
    }
  }

  const circumference = 2 * Math.PI * 46;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Background />

      {/* Floating music button */}
      <button
        onClick={() => { const next = !musicOn; setMusicOn(next); toggleGlobalMusic(next); }}
        style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
          background: musicOn ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.08)",
          border: `1px solid ${musicOn ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.15)"}`,
          borderRadius: "50%", width: "52px", height: "52px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "22px", cursor: "pointer",
          boxShadow: musicOn ? "0 0 20px rgba(245,158,11,0.3)" : "0 4px 12px rgba(0,0,0,0.3)",
          transition: "all 0.2s",
        }}
      >
        {musicOn ? "🎵" : "🔇"}
      </button>

      <Container>
        <div className="relative py-10">
          <div className="flex items-center justify-between gap-4">
            <Logo size="sm" />
            <div className="flex items-center gap-2">
              {isHost && <div className="qb-glass rounded-2xl px-4 py-3 text-sm font-extrabold text-qb-amber">👑 Host View</div>}
              <div className="qb-glass rounded-2xl px-4 py-3 text-sm font-extrabold text-white/70">{qIndex + 1}/{Math.max(1, total)}</div>
            </div>
          </div>

          <div className="mt-6 qb-glass h-3 overflow-hidden rounded-full">
            <div className="h-full bg-gradient-to-r from-qb-purple via-qb-cyan to-qb-amber" style={{ width: `${progressPct}%`, transition: "width 0.5s" }} />
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.65fr]">
            <GlassCard accent="purple" className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div style={{ flex: 1 }}>
                  <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">
                    {phase === "read" ? "📖 Read Phase" : phase === "answer" ? "⚡ Answer Phase" : "✅ Reveal"}
                  </div>
                  <div className="mt-2 text-2xl md:text-3xl font-extrabold text-white leading-snug">{question?.question ?? "Loading..."}</div>
                  <div className="mt-1 text-sm font-bold text-white/40">Question {qIndex + 1} of {total}</div>
                </div>

                <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="46" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
                    <motion.circle cx="60" cy="60" r="46"
                      stroke={phase === "read" ? "rgba(245,158,11,0.95)" : phase === "reveal" ? "rgba(16,185,129,0.95)" : timeLeft <= 10 ? "rgba(239,68,68,0.95)" : "rgba(6,182,212,0.95)"}
                      strokeWidth="10" fill="none" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - ringPct)}
                      transform="rotate(-90 60 60)"
                      animate={{ strokeDashoffset: circumference * (1 - ringPct) }}
                      transition={{ duration: 0.15, ease: "linear" }}
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ color: timeLeft <= 10 && phase === "answer" ? "#ef4444" : "white", fontSize: "20px", fontWeight: 900, lineHeight: 1 }}>{timeLeft}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "9px", fontWeight: 800, letterSpacing: "1px" }}>SEC</div>
                  </div>
                </div>
              </div>

              {phase === "read" && (
                <div className="mt-5 qb-glass rounded-2xl p-5">
                  <div className="text-sm font-semibold text-white/65">📖 Read carefully. Options appear in {timeLeft}s...</div>
                </div>
              )}

              {phase !== "read" && (
                <div className="mt-6 grid gap-3">
                  {(question?.options ?? ["", "", "", ""]).map((opt, i) => {
                    const optIdx = i as 0 | 1 | 2 | 3;
                    const correctIndex = (question as any)?.correct ?? question?.correctIndex ?? -1;
                    const isCorrect = correctIndex === i;
                    const isPicked = picked === optIdx;
                    const isWrong = revealed && isPicked && !isCorrect;
                    const showCorrect = revealed && isCorrect;
                    const hostHighlight = isHost && isCorrect;
                    const border = showCorrect || hostHighlight ? "2px solid #10b981" : isWrong ? "2px solid #ef4444" : isPicked ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.1)";
                    const bg = showCorrect || hostHighlight ? "rgba(16,185,129,0.12)" : isWrong ? "rgba(239,68,68,0.1)" : isPicked ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)";
                    return (
                      <button key={i}
                        disabled={isHost || phase !== "answer" || picked !== null}
                        onClick={() => pickAnswer(optIdx)}
                        style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", borderRadius: "14px", textAlign: "left", border, background: bg, cursor: isHost ? "default" : phase === "answer" && picked === null ? "pointer" : "default", fontFamily: "Nunito, sans-serif", transition: "all 0.2s", width: "100%" }}
                      >
                        <div style={{ width: "42px", height: "42px", borderRadius: "10px", flexShrink: 0, background: showCorrect || hostHighlight ? "#10b981" : isWrong ? "#ef4444" : ["#7c3aed","#f59e0b","#06b6d4","#10b981"][i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 900, color: "white" }}>
                          {showCorrect || hostHighlight ? "✓" : isWrong ? "✗" : kbcLabel(optIdx)}
                        </div>
                        <div>
                          <div style={{ color: "white", fontSize: "15px", fontWeight: 800 }}>{opt}</div>
                          <div style={{ fontSize: "11px", fontWeight: 700, marginTop: "2px", color: showCorrect || hostHighlight ? "#10b981" : isWrong ? "#ef4444" : isPicked ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>
                            {showCorrect || hostHighlight ? "✅ Correct!" : isWrong ? "❌ Wrong" : isPicked ? "Selected ✓" : "Choose wisely"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {phase === "answer" && picked !== null && !isHost && (
                <div className="mt-4 qb-glass rounded-2xl p-4 text-sm font-bold text-white/70 text-center">
                  ✅ Locked in! Reveals in {timeLeft}s...
                </div>
              )}
              {phase === "answer" && isHost && (
                <div className="mt-4 qb-glass rounded-2xl p-4 text-sm font-bold text-qb-amber text-center">
                  👑 Waiting for players... ({timeLeft}s remaining)
                </div>
              )}
              {phase === "reveal" && !isHost && (
                <div className="mt-5 qb-glass rounded-2xl p-4 text-center">
                  <div style={{ color: earnedPoints ? "#10b981" : "#ef4444", fontSize: "20px", fontWeight: 900 }}>
                    {picked === null ? "⏰ No answer — 0 pts" : earnedPoints ? `🎉 +${earnedPoints} pts!` : "❌ Wrong — 0 pts"}
                  </div>
                  <div className="text-sm font-bold text-white/50 mt-1">Next question in {timeLeft}s...</div>
                </div>
              )}
              {phase === "reveal" && isHost && (
                <div className="mt-5 qb-glass rounded-2xl p-4 text-center">
                  <div className="text-sm font-extrabold text-qb-amber">👑 Next question in {timeLeft}s...</div>
                </div>
              )}
            </GlassCard>

            <GlassCard accent="amber" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">🏆 Live Scores</div>
                  <div className="mt-1 text-xl font-extrabold text-white">Leaderboard</div>
                </div>
                <div className="qb-glass rounded-2xl px-3 py-2 text-xs font-extrabold text-white/65">{code}</div>
              </div>
              <div className="grid gap-2">
                {players.slice(0, 10).map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(0.5, i * 0.03) }} className="qb-glass flex items-center gap-3 rounded-2xl p-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">
                      {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </div>
                    <Avatar name={p.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-white">{p.name}</div>
                      <div className="text-xs font-bold text-white/50">{p.score} pts</div>
                    </div>
                  </motion.div>
                ))}
                {players.length === 0 && (
                  <div className="qb-glass rounded-2xl p-6 text-sm font-semibold text-white/55">No players yet...</div>
                )}
              </div>
              <div className="mt-4 qb-glass rounded-2xl p-3">
                <div className="text-xs font-extrabold text-white/40 uppercase tracking-widest mb-2">Timer</div>
                <div className="flex gap-3 text-xs font-bold">
                  <span style={{ color: "#f59e0b" }}>📖 {readSecsRef.current}s read</span>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                  <span style={{ color: "#06b6d4" }}>⚡ {answerSecsRef.current}s answer</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </Container>
    </main>
  );
}
