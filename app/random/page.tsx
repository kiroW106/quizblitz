"use client";

import { useEffect, useRef, useState } from "react";

type OfflineQ = { question: string; options: [string, string, string, string]; correct: 0 | 1 | 2 | 3 };
type Phase = "read" | "answer" | "reveal" | "done";

const READ_SECONDS = 10; // change to 90 after testing
const ANSWER_SECONDS = 80;

function scoreFromTime(timeTaken: number): number {
  if (timeTaken <= 15) return 300;
  if (timeTaken <= 25) return 200;
  if (timeTaken <= 45) return 100;
  return 50;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ALL_QUESTIONS: OfflineQ[] = [
  { question: "What is the capital of India?", options: ["Mumbai", "Chennai", "New Delhi", "Kolkata"], correct: 2 },
  { question: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correct: 1 },
  { question: "What is 12 × 12?", options: ["124", "144", "134", "164"], correct: 1 },
  { question: "Which is the largest ocean?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
  { question: "What gas do plants absorb?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correct: 2 },
  { question: "Who invented the telephone?", options: ["Edison", "Newton", "Graham Bell", "Tesla"], correct: 2 },
  { question: "How many sides does a hexagon have?", options: ["5", "7", "8", "6"], correct: 3 },
  { question: "What is the fastest animal on land?", options: ["Lion", "Cheetah", "Horse", "Leopard"], correct: 1 },
  { question: "Which planet is closest to the Sun?", options: ["Venus", "Earth", "Mars", "Mercury"], correct: 3 },
  { question: "What is H2O?", options: ["Salt", "Sugar", "Water", "Acid"], correct: 2 },
  { question: "How many bones are in the adult human body?", options: ["206", "196", "216", "186"], correct: 0 },
  { question: "What color do you get mixing red and blue?", options: ["Green", "Orange", "Purple", "Brown"], correct: 2 },
  { question: "Which is the longest river in the world?", options: ["Amazon", "Nile", "Ganga", "Yangtze"], correct: 1 },
  { question: "What is the square root of 144?", options: ["14", "11", "13", "12"], correct: 3 },
  { question: "How many continents are on Earth?", options: ["5", "6", "8", "7"], correct: 3 },
  { question: "Which animal is called the Ship of the Desert?", options: ["Horse", "Elephant", "Camel", "Donkey"], correct: 2 },
  { question: "What is the chemical symbol for Gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
  { question: "How many hours are in a day?", options: ["12", "48", "24", "36"], correct: 2 },
  { question: "Which is the smallest continent?", options: ["Europe", "Australia", "Antarctica", "South America"], correct: 1 },
  { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], correct: 2 },
];

const LABELS = ["A", "B", "C", "D"];
const COLORS = ["#7c3aed", "#f59e0b", "#06b6d4", "#10b981"];

export default function RandomPage() {
  const [deck, setDeck] = useState<OfflineQ[]>(ALL_QUESTIONS);
useEffect(() => { setDeck(shuffle(ALL_QUESTIONS)); }, []);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("read");
  const [timeLeft, setTimeLeft] = useState(READ_SECONDS);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const answerStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer(seconds: number) {
    stopTimer();
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    startTimer(READ_SECONDS);
    return () => stopTimer();
  }, []);

  useEffect(() => {
    if (timeLeft > 0) return;
    if (phase === "read") {
      setPhase("answer");
      answerStartRef.current = Date.now();
      startTimer(ANSWER_SECONDS);
    } else if (phase === "answer") {
      setLastPoints(0);
      setPhase("reveal");
      stopTimer();
    }
  }, [timeLeft, phase]);

  function pick(i: number) {
    if (phase !== "answer") return;
    if (picked !== null) return;
    stopTimer();
    setPicked(i);
    const timeTaken = Math.round((Date.now() - answerStartRef.current) / 1000);
    const isCorrect = i === deck[index].correct;
    const pts = isCorrect ? scoreFromTime(timeTaken) : 0;
    setLastPoints(pts);
    setScore((s) => s + pts);
    setPhase("reveal");
  }

  function nextQuestion() {
    const next = index + 1;
    if (next >= deck.length) {
      setPhase("done");
      return;
    }
    setIndex(next);
    setPicked(null);
    setLastPoints(null);
    setPhase("read");
    startTimer(READ_SECONDS);
  }

  const q = deck[index];
  const totalSecs = phase === "read" ? READ_SECONDS : ANSWER_SECONDS;
  const ringPct = timeLeft / totalSecs;
  const circumference = 2 * Math.PI * 46;

  if (phase === "done") {
    const maxScore = deck.length * 300;
    const pct = Math.round((score / maxScore) * 100);
    return (
      <main style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Nunito, sans-serif", padding: "24px" }}>
        <div style={{ textAlign: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "48px 40px", maxWidth: "440px", width: "100%" }}>
          <div style={{ fontSize: "72px" }}>🏆</div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", marginTop: "16px" }}>Quiz Complete</div>
          <div style={{ color: "white", fontSize: "28px", fontWeight: 900, marginTop: "8px" }}>Your Final Score</div>
          <div style={{ color: "#f59e0b", fontSize: "80px", fontWeight: 900, lineHeight: 1, marginTop: "8px" }}>{score}</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", marginTop: "6px" }}>{pct}% of max {maxScore} pts</div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "32px", flexWrap: "wrap" }}>
            <button onClick={() => window.location.reload()} style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", border: "none", borderRadius: "14px", padding: "14px 28px", fontSize: "15px", fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}>
              🎲 Play Again
            </button>
            <button onClick={() => window.location.href = "/"} style={{ background: "rgba(255,255,255,0.07)", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "14px 28px", fontSize: "15px", fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}>
              🏠 Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0d0d1a", fontFamily: "Nunito, sans-serif", padding: "20px 16px" }}>

      <div style={{ maxWidth: "820px", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: "linear-gradient(145deg,#fbbf24,#f59e0b)", borderRadius: "10px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>⚡</div>
          <span style={{ fontSize: "22px", fontWeight: 900, color: "white" }}>Quiz<span style={{ color: "#f59e0b" }}>Blitz</span></span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "8px 16px", color: "rgba(255,255,255,0.6)", fontSize: "13px", fontWeight: 800 }}>🎲 Random</div>
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "8px 16px", color: "white", fontSize: "13px", fontWeight: 800 }}>⭐ {score} pts</div>
        </div>
      </div>

      <div style={{ maxWidth: "820px", margin: "0 auto 20px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", height: "8px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${((index + 1) / deck.length) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#06b6d4,#f59e0b)", transition: "width 0.5s" }} />
      </div>

      <div style={{ maxWidth: "820px", margin: "0 auto", display: "grid", gap: "16px" }}>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.35)", borderLeft: "5px solid #7c3aed", borderRadius: "20px", padding: "28px" }}>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase" }}>
                {phase === "read" ? "📖 Read Phase" : phase === "answer" ? "⚡ Answer Phase" : "✅ Reveal"}
              </div>
              <div style={{ color: "white", fontSize: "22px", fontWeight: 900, marginTop: "10px", lineHeight: 1.4 }}>
                {q.question}
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontWeight: 700, marginTop: "8px" }}>
                Question {index + 1} of {deck.length}
              </div>
            </div>

            <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
              <svg width="80" height="80" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="46" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
                <circle
                  cx="60" cy="60" r="46"
                  stroke={phase === "read" ? "#f59e0b" : timeLeft <= 10 ? "#ef4444" : "#06b6d4"}
                  strokeWidth="10" fill="none" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - ringPct)}
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: timeLeft <= 10 && phase === "answer" ? "#ef4444" : "white", fontSize: "20px", fontWeight: 900, lineHeight: 1 }}>{timeLeft}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "9px", fontWeight: 800, letterSpacing: "1px" }}>SEC</div>
              </div>
            </div>
          </div>

          {phase === "read" && (
            <div style={{ marginTop: "20px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "14px", padding: "16px" }}>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", fontWeight: 700 }}>
                📖 Read carefully. Options appear in {timeLeft}s...
              </div>
            </div>
          )}

          {phase !== "read" && (
            <div style={{ marginTop: "20px", display: "grid", gap: "10px" }}>
              {q.options.map((opt, i) => {
                const isCorrect = phase === "reveal" && q.correct === i;
                const isPicked = picked === i;
                const isWrong = phase === "reveal" && isPicked && !isCorrect;
                return (
                  <button
                    key={i}
                    disabled={phase !== "answer" || picked !== null}
                    onClick={() => pick(i)}
                    style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      padding: "14px 18px", borderRadius: "14px", textAlign: "left",
                      border: isCorrect ? "2px solid #10b981" : isWrong ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                      background: isCorrect ? "rgba(16,185,129,0.12)" : isWrong ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                      cursor: phase === "answer" && picked === null ? "pointer" : "default",
                      fontFamily: "Nunito, sans-serif", transition: "all 0.2s", width: "100%",
                    }}
                  >
                    <div style={{ width: "42px", height: "42px", borderRadius: "10px", flexShrink: 0, background: isCorrect ? "#10b981" : isWrong ? "#ef4444" : COLORS[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 900, color: "white" }}>
                      {isCorrect ? "✓" : isWrong ? "✗" : LABELS[i]}
                    </div>
                    <div>
                      <div style={{ color: "white", fontSize: "15px", fontWeight: 800 }}>{opt}</div>
                      <div style={{ fontSize: "11px", fontWeight: 700, marginTop: "2px", color: isCorrect ? "#10b981" : isWrong ? "#ef4444" : "rgba(255,255,255,0.3)" }}>
                        {isCorrect ? "✅ Correct!" : isWrong ? "❌ Wrong" : "Choose wisely"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {phase === "reveal" && (
            <div style={{ marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ background: lastPoints ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${lastPoints ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: "12px", padding: "10px 18px", color: "white", fontSize: "15px", fontWeight: 800 }}>
                {picked === null ? "⏰ No answer — 0 pts" : lastPoints ? `🎉 +${lastPoints} pts!` : "❌ Wrong — 0 pts"}
              </div>
              <button onClick={nextQuestion} style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", border: "none", borderRadius: "14px", padding: "12px 24px", fontSize: "15px", fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}>
                {index + 1 >= deck.length ? "🏁 See Results" : "Next →"}
              </button>
            </div>
          )}
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,158,11,0.25)", borderLeft: "5px solid #f59e0b", borderRadius: "20px", padding: "24px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase" }}>⚡ Speed Scoring</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", marginTop: "14px" }}>
            {[["≤15s", "300", "#7c3aed"], ["≤25s", "200", "#06b6d4"], ["≤45s", "100", "#f59e0b"], [">45s", "50", "#10b981"]].map(([t, p, c]) => (
              <div key={t} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "12px 8px", textAlign: "center", border: `1px solid ${c}30` }}>
                <div style={{ color: c, fontSize: "12px", fontWeight: 900 }}>{t}</div>
                <div style={{ color: "white", fontSize: "18px", fontWeight: 900, marginTop: "2px" }}>{p}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
