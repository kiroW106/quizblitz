"use client";

import { supabase, type QuizRow } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PlayerRow = { id: string; quiz_code: string; name: string; score: number; joined_at: string };

function playJoinSound() {
  try {
    const ctx = new AudioContext();
    const notes = [
      { freq: 987.77, start: 0, dur: 0.12 },
      { freq: 1318.51, start: 0.13, dur: 0.12 },
      { freq: 1567.98, start: 0.26, dur: 0.22 },
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    });
  } catch {}
}

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toString();

  const [isHost, setIsHost] = useState(false);
  useEffect(() => {
    setIsHost(!!localStorage.getItem(`host_${code}`));
  }, [code]);

  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const prevPlayersRef = useRef<PlayerRow[]>([]);

  // Redirect player back to lobby if they refresh (using stored playerId)
  useEffect(() => {
    const hostFlag = localStorage.getItem(`host_${code}`);
    if (hostFlag) return;
    const playerId = localStorage.getItem(`qb:playerId:${code}`);
    if (!playerId) {
      router.replace(`/join`);
    }
  }, [code, router]);

  // Load quiz and players
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void (async () => {
      const { data: q, error: qErr } = await supabase.from("quizzes").select("*").eq("code", code).maybeSingle();
      if (qErr) { setError(qErr.message); return; }
      if (!q) { setError("Quiz not found."); return; }
      if (!cancelled) setQuiz(q as unknown as QuizRow);
      const { data: p } = await supabase.from("players").select("*").eq("quiz_code", code).order("joined_at", { ascending: true });
      if (!cancelled) {
        const playerList = (p ?? []) as PlayerRow[];
        setPlayers(playerList);
        prevPlayersRef.current = playerList;
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  // Realtime — players joining + countdown broadcast
  useEffect(() => {
    if (!code) return;
    const channel = supabase
      .channel(`qb:lobby:${code}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "players", filter: `quiz_code=eq.${code}` },
        async () => {
          const { data } = await supabase.from("players").select("*").eq("quiz_code", code).order("joined_at", { ascending: true });
          const newList = (data ?? []) as PlayerRow[];
          // Play sound if new player joined
          if (newList.length > prevPlayersRef.current.length) {
            playJoinSound();
          }
          prevPlayersRef.current = newList;
          setPlayers(newList);
        }
      )
      .on("broadcast", { event: "countdown" }, (payload) => {
        const n = payload.payload?.n as number;
        setCountdown(n);
        if (n === 0) setTimeout(() => router.push(`/game/${code}`), 800);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [code, router]);

  async function startGame() {
    if (players.length === 0) { setError("At least 1 player must join first!"); return; }
    setStarting(true);
    setError(null);
    try {
      await supabase.from("answers").delete().eq("quiz_code", code);
      await supabase.from("players").update({ score: 0 }).eq("quiz_code", code);
      const channel = supabase.channel(`qb:lobby:${code}`);
      await channel.subscribe();
      for (let i = 10; i >= 0; i--) {
        setCountdown(i);
        await channel.send({ type: "broadcast", event: "countdown", payload: { n: i } });
        if (i > 0) await new Promise(res => setTimeout(res, 1000));
      }
      setTimeout(() => router.push(`/game/${code}`), 800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to start.";
      setError(msg);
      setStarting(false);
      setCountdown(null);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const AVATAR_COLORS = ["#7c3aed","#f59e0b","#06b6d4","#10b981","#ef4444","#8b5cf6","#f97316","#3b82f6"];
  function avatarColor(name: string) {
    let hash = 0;
    for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0d0d1a", fontFamily: "Nunito, sans-serif", padding: "24px 16px", position: "relative" }}>

      <div style={{ position: "fixed", top: "-80px", left: "-60px", width: "300px", height: "300px", background: "radial-gradient(circle,#7c3aed,transparent 70%)", opacity: 0.12, pointerEvents: "none" }}/>
      <div style={{ position: "fixed", bottom: "0", right: "-40px", width: "250px", height: "250px", background: "radial-gradient(circle,#06b6d4,transparent 70%)", opacity: 0.12, pointerEvents: "none" }}/>

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(13,13,26,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          >
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "24px" }}>
              🧠 Quiz starting in
            </div>
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, type: "spring" }}
              style={{
                fontSize: countdown === 0 ? "72px" : "140px",
                fontWeight: 900,
                color: countdown === 0 ? "#10b981" : countdown <= 3 ? "#ef4444" : "#f59e0b",
                lineHeight: 1,
                fontFamily: "Righteous, cursive",
                textShadow: `0 0 40px ${countdown === 0 ? "#10b981" : countdown <= 3 ? "#ef4444" : "#f59e0b"}`
              }}
            >
              {countdown === 0 ? "GO! 🚀" : countdown}
            </motion.div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px", fontWeight: 700, marginTop: "32px" }}>
              {players.length} player{players.length !== 1 ? "s" : ""} locked in
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "linear-gradient(145deg,#fbbf24,#f59e0b)", borderRadius: "10px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", boxShadow: "0 0 16px rgba(251,191,36,0.35)" }}>⚡</div>
            <span style={{ fontSize: "22px", fontWeight: 900, color: "white" }}>Quiz<span style={{ color: "#f59e0b" }}>Blitz</span></span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "8px 16px", color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 800 }}>
            {isHost ? "👑 Host" : "👤 Player"} · {quiz?.title ?? "Loading..."}
          </div>
        </div>

        <div style={{ display: "grid", gap: "16px" }}>

          {/* Main lobby card */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.3)", borderLeft: "5px solid #7c3aed", borderRadius: "20px", padding: "28px" }}>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "8px" }}>🔑 Join Code</div>
                <div style={{ fontSize: "52px", fontWeight: 900, color: "white", fontFamily: "Righteous, cursive", letterSpacing: "8px", lineHeight: 1 }}>{code}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", fontWeight: 700, marginTop: "6px" }}>Share this with your players</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end" }}>
                <button onClick={copyCode} style={{ background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: "12px", padding: "10px 20px", color: copied ? "#10b981" : "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif", transition: "all 0.2s" }}>
                  {copied ? "✅ Copied!" : "📋 Copy Code"}
                </button>
                {isHost ? (
                  <button
                    onClick={startGame}
                    disabled={starting || players.length === 0}
                    style={{
                      background: players.length === 0 ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#7c3aed,#a855f7)",
                      color: players.length === 0 ? "rgba(255,255,255,0.3)" : "white",
                      border: "none", borderRadius: "12px", padding: "12px 24px",
                      fontSize: "15px", fontWeight: 900,
                      cursor: players.length === 0 ? "not-allowed" : "pointer",
                      fontFamily: "Nunito, sans-serif",
                      boxShadow: players.length > 0 ? "0 8px 24px rgba(124,58,237,0.4)" : "none",
                      transition: "all 0.2s", minWidth: "160px"
                    }}
                  >
                    {starting ? "Starting..." : players.length === 0 ? "⏳ Waiting..." : `🚀 Start (${players.length})`}
                  </button>
                ) : (
                  <div style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: "12px", padding: "12px 20px", color: "#06b6d4", fontSize: "13px", fontWeight: 800, textAlign: "center" }}>
                    ⏳ Waiting for host to start...
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "12px 16px", color: "#ef4444", fontSize: "13px", fontWeight: 700, marginBottom: "16px" }}>
                ⚠️ {error}
              </div>
            )}

            {/* Players */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase" }}>
                👥 Players ({players.length}/20)
              </div>
              {isHost && players.length > 0 && (
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", fontWeight: 700 }}>
                  🔔 Sound plays when someone joins
                </div>
              )}
            </div>

            {players.length === 0 ? (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "14px", padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>👀</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px", fontWeight: 700 }}>No players yet. Share the code!</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                <AnimatePresence>
                  {players.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.7, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.3, type: "spring" }}
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "14px", display: "flex", alignItems: "center", gap: "10px" }}
                    >
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: avatarColor(p.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 900, color: "white", flexShrink: 0 }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "white", fontSize: "13px", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                        <div style={{ color: "#10b981", fontSize: "11px", fontWeight: 700 }}>✓ Ready</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Info card */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(6,182,212,0.25)", borderLeft: "5px solid #06b6d4", borderRadius: "20px", padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              {[
                ["📖 Read Phase", "Question shows first. No options yet."],
                ["⚡ Answer Phase", "Pick A/B/C/D fast. Speed = more points."],
                ["🏆 Scoring", "300 → 200 → 100 → 50 pts by speed."],
                ["👑 Host Control", "Only host can start the game."],
              ].map(([title, desc]) => (
                <div key={title}>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>{title}</div>
                  <div style={{ color: "white", fontSize: "13px", fontWeight: 700 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
