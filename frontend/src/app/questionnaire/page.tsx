"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import { QUESTIONS } from "@/lib/questionnaire";
import { useAppStore, type AnswerRecord } from "@/lib/store";
import { HeroMap } from "@/components/civic";
import { SiteFooter, StepNav } from "@/components/StepNav";
import { VoiceControls, playTts } from "@/components/VoiceControls";

const SCALE = [
  { v: -2, l: "Strongly A" },
  { v: -1, l: "Somewhat A" },
  { v: 0, l: "Neutral" },
  { v: 1, l: "Somewhat B" },
  { v: 2, l: "Strongly B" },
];

const OTHER = 99;

export default function QuestionnairePage() {
  const router = useRouter();
  const setAnswer = useAppStore((s) => s.setAnswer);
  const saved = useAppStore((s) => s.answers);

  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const [id, a] of Object.entries(saved)) {
      init[id] = a.choice === "C" ? OTHER : a.score;
    }
    return init;
  });
  const [others, setOthers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [id, a] of Object.entries(saved)) {
      if (a.customText) init[id] = a.customText;
    }
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answered = QUESTIONS.filter((i) => answers[i.id] !== undefined).length;
  const done = QUESTIONS.every(
    (i) =>
      answers[i.id] !== undefined &&
      (answers[i.id] !== OTHER || (others[i.id] ?? "").trim()),
  );

  const speakText = useMemo(
    () =>
      `There are ${QUESTIONS.length} issues. For each, choose Strongly Side A through Strongly Side B, Neutral, or write your own position.`,
    [],
  );

  async function continueNext() {
    if (!done) return;
    setBusy(true);
    setError(null);
    try {
      for (const q of QUESTIONS) {
        const val = answers[q.id];
        let score = val;
        let choice: AnswerRecord["choice"] = "neutral";
        let strength: AnswerRecord["strength"];
        let customText: string | undefined;

        if (val === OTHER) {
          choice = "C";
          customText = (others[q.id] ?? "").trim();
          const resp = await fetch("/api/score-custom", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ issueId: q.id, customText }),
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || "Custom scoring failed");
          score = data.score;
        } else if (val < 0) {
          choice = "A";
          strength = val === -2 ? "strong" : "somewhat";
        } else if (val > 0) {
          choice = "B";
          strength = val === 2 ? "strong" : "somewhat";
        }

        setAnswer({
          issueId: q.id,
          choice,
          strength,
          customText,
          score: score === OTHER ? 0 : score,
          spokenTranscript: customText || String(score),
        });
      }
      await playTts("Positions saved. Next, rank your priorities.");
      router.push("/rank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save answers");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <StepNav stepIndex={0} />

      <header className="hero-surface">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-highlight">
              <Star className="h-3.5 w-3.5 fill-highlight" /> A nonpartisan
              guide for every North Carolina voter
            </span>
            <h1 className="mt-5 font-display text-4xl leading-[1.05] sm:text-5xl md:text-6xl">
              Know your ballot.{" "}
              <em className="font-normal italic text-highlight">Know</em> who
              represents you.
            </h1>
            <p className="mt-5 max-w-md text-base opacity-80">
              Share where you stand on nine issues. We map your address to the
              races on your ballot and show how closely each candidate&apos;s
              record matches yours.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-80">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Primary sources only
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> Based on your district
              </span>
            </div>
          </div>
          <div className="animate-fade-up [animation-delay:150ms]">
            <HeroMap />
          </div>
        </div>
        <div className="stripe-band h-1.5 opacity-90" />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <div className="mb-6">
          <VoiceControls
            speakText={speakText}
            onTranscript={(t) => {
              // Voice can fill the first unanswered custom box if needed.
              const open = QUESTIONS.find((q) => answers[q.id] === OTHER);
              if (open) setOthers({ ...others, [open.id]: t });
            }}
          />
        </div>

        <div className="space-y-6">
          <div className="sticky top-[61px] z-20 -mx-1 rounded-2xl border bg-card/90 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-primary">Your positions</span>
              <span className="text-muted-foreground">
                {answered} of {QUESTIONS.length} answered
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${(answered / QUESTIONS.length) * 100}%`,
                  backgroundImage: "var(--gradient-match)",
                }}
              />
            </div>
          </div>

          {QUESTIONS.map((issue, idx) => {
            const val = answers[issue.id];
            return (
              <section
                key={issue.id}
                className="card-civic card-lift animate-fade-up p-6 sm:p-7"
                style={{ animationDelay: `${Math.min(idx, 4) * 60}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                      val !== undefined
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <h2 className="font-display text-2xl text-card-foreground">
                    {issue.title}
                  </h2>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div
                    className={`rounded-xl border p-4 text-sm leading-relaxed transition-colors ${
                      val !== undefined && val < 0 && val !== OTHER
                        ? "border-primary bg-secondary"
                        : "bg-muted"
                    }`}
                  >
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-primary">
                      Side A
                    </span>
                    {issue.side_a}
                  </div>
                  <div
                    className={`rounded-xl border p-4 text-sm leading-relaxed transition-colors ${
                      val !== undefined && val > 0 && val !== OTHER
                        ? "border-accent bg-[var(--accent-soft)]"
                        : "bg-muted"
                    }`}
                  >
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-accent">
                      Side B
                    </span>
                    {issue.side_b}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="relative grid grid-cols-5">
                    <div className="absolute left-[10%] right-[10%] top-[11px] h-0.5 rounded-full bg-border" />
                    {SCALE.map((s) => {
                      const on = val === s.v;
                      return (
                        <button
                          key={s.v}
                          type="button"
                          onClick={() =>
                            setAnswers({ ...answers, [issue.id]: s.v })
                          }
                          className="group relative flex flex-col items-center gap-2"
                        >
                          <span
                            className={`h-6 w-6 rounded-full border-2 transition-all duration-200 ${
                              on
                                ? "scale-110 border-primary bg-primary shadow-[var(--shadow-lift)] ring-4 ring-secondary"
                                : "border-input bg-card group-hover:scale-105 group-hover:border-accent"
                            }`}
                          />
                          <span
                            className={`text-center text-[11px] font-semibold leading-tight sm:text-xs ${
                              on ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {s.l}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setAnswers({ ...answers, [issue.id]: OTHER })
                      }
                      className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                        val === OTHER
                          ? "border-highlight bg-highlight text-[var(--highlight-foreground)]"
                          : "bg-card text-muted-foreground hover:border-accent hover:text-accent"
                      }`}
                    >
                      Neither fits — write my own
                    </button>
                  </div>
                </div>

                {val === OTHER ? (
                  <textarea
                    value={others[issue.id] ?? ""}
                    onChange={(e) =>
                      setOthers({ ...others, [issue.id]: e.target.value })
                    }
                    maxLength={500}
                    rows={3}
                    placeholder="Describe your own position — AI will place it on the same scale."
                    className="mt-4 w-full animate-fade-up rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-[var(--accent-soft)]"
                  />
                ) : null}
              </section>
            );
          })}

          {error ? <p className="error-text">{error}</p> : null}

          <button
            type="button"
            disabled={!done || busy}
            onClick={continueNext}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:bg-primary/90 disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? (
              "Saving…"
            ) : done ? (
              <>
                Continue to rank priorities{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            ) : (
              `Answer all issues (${answered}/${QUESTIONS.length})`
            )}
          </button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
