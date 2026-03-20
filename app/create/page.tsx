"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Question = {
  question: string;
  options: [string, string, string, string];
  correct: number;
};

const COLORS = ["#7c3aed", "#f59e0b", "#06b6d4", "#10b981"];
const LABELS = ["A", "B", "C", "D"];

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState<Question>({
    question: "",
    options: ["", "", "", ""],
    correct: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...current.options] as [string, string, string, string];
    updated[index] = value;
    setCurrent({ ...current, options: updated });
  };

  const addQuestion = () => {
    if (!current.question.trim()) { setError("Please enter a question"); return; }
    if (current.options.some((o) => !o.trim())) { setError("Please fill all 4 options"); return; }
    if (questions.length >= 20) { setError("Maximum 20 questions allowed"); return; }
    setError("");
    setQuestions([...questions, current]);
    setCurrent({ question: "", options: ["", "", "", ""], correct: 0 });
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const saveQuiz = async () => {
    if (!title.trim()) { setError("Please enter a quiz title"); return; }
    if (questions.length === 0) { setError("Add at least one question"); return; }
    setSaving(true);
    setError("");
    const code = generateCode();
    const { error: err } = await supabase.from("quizzes").insert({
      code,
      title: title.trim(),
      questions,
      status: "waiting",
    });
    setSaving(false);
    if (err) { setError("Error saving quiz. Check Supabase connection."); return; }
    localStorage.setItem(`host_${code}`, "true");
    router.push(`/lobby/${code}`);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0d0d1a", fontFamily: "Nunito, sans-serif", padding: "24px 16px" }}>

      <div style={{ maxWidth: "760px", margin: "0 auto 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: "linear-gradient(145deg,#fbbf24,#f59e0b)", borderRadius: "10px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>⚡</div>
          <span style={{ fontSize: "22px", fontWeight: 900, color: "white" }}>Quiz<span style={{ color: "#f59e0b" }}>Blitz</span></span>
        </div>
        <button onClick={() => router.push("/")} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "8px 16px", color: "rgba(255,255,255,0.6)", fontSize: "13px", fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}>
          ← Back Home
        </button>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase" }}>Quiz Builder</span>
          <span style={{ color: "#f59e0b", fontSize: "13px", fontWeight: 900 }}>{questions.length} / 20 questions</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "99px", height: "8px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ height: "100%", width: `${(questions.length / 20) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#06b6d4,#f59e0b)", transition: "width 0.4s" }} />
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "5px solid #f59e0b", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "12px" }}>📝 Quiz Title</div>
          <input
            type="text"
            placeholder="e.g. Science Quiz for Class 8"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "14px 16px", color: "white", fontSize: "16px", fontWeight: 700, fontFamily: "Nunito, sans-serif", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.3)", borderLeft: "5px solid #7c3aed", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "16px" }}>
            ✏️ Question {questions.length + 1}
          </div>

          <input
            type="text"
            placeholder="Type your question here..."
            value={current.question}
            onChange={(e) => setCurrent({ ...current, question: e.target.value })}
            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "14px 16px", color: "white", fontSize: "15px", fontWeight: 700, fontFamily: "Nunito, sans-serif", outline: "none", marginBottom: "16px", boxSizing: "border-box" }}
          />

          <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
            {current.options.map((opt, i) => (
              <div
                key={i}
                onClick={() => setCurrent({ ...current, correct: i })}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  background: current.correct === i ? `${COLORS[i]}15` : "rgba(255,255,255,0.04)",
                  border: current.correct === i ? `2px solid ${COLORS[i]}` : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px", padding: "12px 14px", cursor: "pointer", transition: "all 0.2s"
                }}
              >
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: current.correct === i ? COLORS[i] : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 900, color: "white", flexShrink: 0, transition: "all 0.2s" }}>
                  {current.correct === i ? "✓" : LABELS[i]}
                </div>
                <input
                  type="text"
                  placeholder={`Option ${LABELS[i]}...`}
                  value={opt}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  style={{ flex: 1, background: "transparent", border: "none", color: "white", fontSize: "14px", fontWeight: 700, fontFamily: "Nunito, sans-serif", outline: "none" }}
                />
                {current.correct === i && (
                  <span style={{ color: COLORS[i], fontSize: "11px", fontWeight: 900, letterSpacing: "1px", flexShrink: 0 }}>CORRECT</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", fontWeight: 700, marginBottom: "16px" }}>
            💡 Click on an option row to mark it as the correct answer
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", padding: "10px 14px", color: "#ef4444", fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={addQuestion}
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", border: "none", borderRadius: "12px", padding: "13px 24px", fontSize: "14px", fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}
          >
            + Add Question
          </button>
        </div>

        {questions.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(6,182,212,0.25)", borderLeft: "5px solid #06b6d4", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "16px" }}>
              ✅ Added Questions ({questions.length})
            </div>
            <div style={{ display: "grid", gap: "10px" }}>
              {questions.map((q, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "12px 16px", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#06b6d4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, color: "white", flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <span style={{ color: "white", fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.question}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ color: "#10b981", fontSize: "11px", fontWeight: 800 }}>✓ {q.options[q.correct]}</span>
                    <button onClick={() => removeQuestion(i)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "4px 10px", color: "#ef4444", fontSize: "12px", fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={saveQuiz}
          disabled={saving || questions.length === 0}
          style={{
            width: "100%", padding: "18px", borderRadius: "16px", border: "none",
            background: questions.length === 0 ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#f59e0b,#f97316)",
            color: questions.length === 0 ? "rgba(255,255,255,0.3)" : "white",
            fontSize: "17px", fontWeight: 900, cursor: questions.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "Nunito, sans-serif", transition: "all 0.2s",
            boxShadow: questions.length > 0 ? "0 8px 24px rgba(245,158,11,0.35)" : "none"
          }}
        >
          {saving ? "⏳ Saving quiz..." : questions.length === 0 ? "Add questions to continue" : `🚀 Save Quiz & Get Join Code (${questions.length} questions)`}
        </button>

        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "12px", fontWeight: 700, marginTop: "16px", marginBottom: "32px" }}>
          After saving you'll get a 6-digit code to share with your players
        </div>

      </div>
    </main>
  );
}
