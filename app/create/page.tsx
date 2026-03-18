"use client";

import Background from "@/components/Background";
import { Avatar, Button, Container, GlassCard, Input, Logo, ProgressBar } from "@/components/ui";
import { make6DigitCode, getOrCreateLocalId } from "@/lib/game";
import { getSupabaseBrowserClient, isSupabaseConfigured, type QuizQuestion } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_SLIDES = 20;

function emptyQuestion(): QuizQuestion {
  return { question: "", options: ["", "", "", ""], correctIndex: 0 };
}

export default function CreatePage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [title, setTitle] = useState("My Quiz");
  const [slides, setSlides] = useState<QuizQuestion[]>([emptyQuestion()]);
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = slides[idx] ?? emptyQuestion();
  const slideCount = slides.length;

  function updateCurrent(partial: Partial<QuizQuestion>) {
    setSlides((prev) => {
      const next = [...prev];
      const existing = next[idx] ?? emptyQuestion();
      next[idx] = { ...existing, ...partial };
      return next;
    });
  }

  function updateOption(optIdx: 0 | 1 | 2 | 3, value: string) {
    const options = [...current.options] as QuizQuestion["options"];
    options[optIdx] = value;
    updateCurrent({ options });
  }

  function addSlide() {
    if (slides.length >= MAX_SLIDES) return;
    setSlides((prev) => [...prev, emptyQuestion()]);
    setIdx(slides.length);
  }

  function validateAll(qs: QuizQuestion[]) {
    const cleaned = qs
      .map((q) => ({
        ...q,
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()) as QuizQuestion["options"],
      }))
      .filter((q) => q.question.length > 0);

    if (cleaned.length === 0) return { ok: false as const, message: "Add at least 1 question." };
    for (let i = 0; i < cleaned.length; i++) {
      const q = cleaned[i];
      if (q.options.some((o) => o.length === 0)) {
        return { ok: false as const, message: `Slide ${i + 1}: fill all 4 options.` };
      }
    }
    return { ok: true as const, questions: cleaned };
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      if (!isSupabaseConfigured() || !supabase) {
        setError("Supabase is not configured. Update .env.local and restart the dev server.");
        return;
      }
      const hostId = getOrCreateLocalId("qb:hostId");
      const result = validateAll(slides);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      let code = make6DigitCode();
      // retry a couple times if collision
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: insertErr } = await supabase.from("quizzes").insert({
          code,
          title: title.trim() || null,
          host_id: hostId,
          questions: result.questions,
        });
        if (!insertErr) break;
        if (insertErr.message?.toLowerCase().includes("duplicate") || insertErr.code === "23505") {
          code = make6DigitCode();
          continue;
        }
        throw insertErr;
      }

      router.push(`/lobby/${code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save quiz.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Background />
      <Container>
        <div className="relative py-10">
          <div className="flex items-center justify-between gap-4">
            <Logo size="sm" />
            <div className="flex items-center gap-3 text-sm font-bold text-white/70">
              <Avatar name="Host" />
              <div className="hidden md:block">Build a quiz like slides</div>
            </div>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
            <GlassCard accent="amber" className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">
                    Slide {idx + 1} of {MAX_SLIDES}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-white">Quiz Builder</div>
                </div>
                <div className="w-56">
                  <ProgressBar value={idx + 1} max={MAX_SLIDES} />
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <div>
                  <div className="mb-2 text-sm font-extrabold text-white/80">Quiz title</div>
                  <Input value={title} onChange={setTitle} placeholder="e.g., Science Sprint" />
                </div>

                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="grid gap-4"
                >
                  <div>
                    <div className="mb-2 text-sm font-extrabold text-white/80">Question</div>
                    <Input
                      value={current.question}
                      onChange={(v) => updateCurrent({ question: v })}
                      placeholder="Type your question..."
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {(["A", "B", "C", "D"] as const).map((label, optionIndex) => {
                      const optIdx = optionIndex as 0 | 1 | 2 | 3;
                      const isCorrect = current.correctIndex === optIdx;
                      return (
                        <div key={label} className="qb-glass rounded-2xl p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-extrabold uppercase tracking-widest text-white/55">
                              Option {label}
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 text-xs font-extrabold text-white/70">
                              <input
                                type="radio"
                                name="correct"
                                checked={isCorrect}
                                onChange={() => updateCurrent({ correctIndex: optIdx })}
                                className="accent-qb-green"
                              />
                              Correct
                            </label>
                          </div>
                          <div className="mt-2">
                            <Input
                              value={current.options[optIdx]}
                              onChange={(v) => updateOption(optIdx, v)}
                              placeholder={`Answer ${label}...`}
                              className={isCorrect ? "ring-qb-green/60 focus:ring-qb-green" : ""}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {error ? (
                  <div className="rounded-2xl bg-qb-red/15 p-4 text-sm font-bold text-qb-red ring-1 ring-qb-red/25">
                    {error}
                  </div>
                ) : null}

                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      tone="ghost"
                      onClick={() => setIdx((v) => Math.max(0, v - 1))}
                      disabled={idx === 0}
                      className="h-12"
                    >
                      Previous
                    </Button>
                    <Button
                      tone="ghost"
                      onClick={() => setIdx((v) => Math.min(slides.length - 1, v + 1))}
                      disabled={idx >= slides.length - 1}
                      className="h-12"
                    >
                      Next
                    </Button>
                    <Button tone="ghost" onClick={addSlide} disabled={slides.length >= MAX_SLIDES} className="h-12">
                      + New Slide
                    </Button>
                  </div>

                  <Button tone="amber" onClick={save} disabled={saving} className="h-12">
                    {saving ? "Saving..." : "Save & Get Code"}
                  </Button>
                </div>
              </div>
            </GlassCard>

            <GlassCard accent="cyan" className="p-6">
              <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/55">Slide List</div>
              <div className="mt-2 text-lg font-extrabold text-white">Your deck</div>
              <div className="mt-4 grid gap-2">
                {Array.from({ length: MAX_SLIDES }).map((_, i) => {
                  const filled = (slides[i]?.question?.trim()?.length ?? 0) > 0;
                  const active = i === idx;
                  return (
                    <button
                      key={i}
                      onClick={() => setIdx(Math.min(i, slides.length - 1))}
                      className={`qb-focus flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                        active ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5 ring-1 ring-white/10"
                      }`}
                    >
                      <div className="text-sm font-extrabold text-white">
                        Slide {i + 1}
                        <span className="ml-2 text-xs font-bold text-white/50">
                          {filled ? "Ready" : i < slides.length ? "Draft" : "Empty"}
                        </span>
                      </div>
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          filled ? "bg-qb-green" : i < slides.length ? "bg-qb-amber" : "bg-white/20"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 text-sm font-semibold text-white/55">
                Tip: keep questions short, options punchy — like KBC.
              </div>
              <div className="mt-3 text-sm font-semibold text-white/55">
                Slides used: <span className="text-white/85">{slideCount}</span> / {MAX_SLIDES}
              </div>
            </GlassCard>
          </div>
        </div>
      </Container>
    </main>
  );
}

