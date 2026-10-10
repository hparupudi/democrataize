"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS } from "@/lib/questionnaire";
import { useAppStore } from "@/lib/store";
import { VoiceControls, playTts } from "@/components/VoiceControls";

type Side = "A" | "B" | "C" | "neutral";

export default function QuestionnairePage() {
  const router = useRouter();
  const setAnswer = useAppStore((s) => s.setAnswer);
  const saved = useAppStore((s) => s.answers);
  const [index, setIndex] = useState(0);
  const [side, setSide] = useState<Side | null>(null);
  const [strength, setStrength] = useState<"strong" | "somewhat">("somewhat");
  const [customText, setCustomText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = QUESTIONS[index];
  const progress = ((index + 1) / QUESTIONS.length) * 100;

  const speakText = useMemo(() => {
    return `Issue ${index + 1} of ${QUESTIONS.length}: ${question.title}. Side A: ${question.side_a} Side B: ${question.side_b}. You may choose Side A, Side B, Neutral, or give a custom response.`;
  }, [index, question]);

  function presetScore(): number {
    if (side === "neutral") return 0;
    if (side === "A") return strength === "strong" ? -2 : -1;
    if (side === "B") return strength === "strong" ? 2 : 1;
    return 0;
  }

  async function continueNext() {
    setError(null);
    if (!side) {
      setError("Select Side A, Side B, Neutral, or Custom.");
      return;
    }

    setBusy(true);
    try {
      let score = presetScore();
      let spoken = "";
      if (side === "C") {
        if (!customText.trim()) {
          throw new Error("Enter a custom response or speak one into the mic.");
        }
        const resp = await fetch("/api/score-custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issueId: question.id,
            customText: customText.trim(),
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Custom scoring failed");
        score = data.score;
        spoken = customText.trim();
        await playTts(
          `Your custom answer was scored ${score} on the negative two to positive two scale.`,
        );
      } else {
        const label =
          side === "neutral"
            ? "neutral"
            : `${strength === "strong" ? "strongly" : "somewhat"} Side ${side}`;
        spoken = label;
        await playTts(`You selected ${label}.`);
      }

      setAnswer({
        issueId: question.id,
        choice: side,
        strength: side === "A" || side === "B" ? strength : undefined,
        customText: side === "C" ? customText.trim() : undefined,
        score,
        spokenTranscript: spoken,
      });

      if (index < QUESTIONS.length - 1) {
        setIndex((i) => i + 1);
        const existing = saved[QUESTIONS[index + 1]?.id];
        setSide(existing?.choice || null);
        setStrength(existing?.strength || "somewhat");
        setCustomText(existing?.customText || "");
      } else {
        router.push("/address");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save answer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="panel">
      <p className="step-kicker">
        Question {index + 1} of {QUESTIONS.length}
      </p>
      <h2>{question.title}</h2>
      <div className="progress-line">
        <span style={{ width: `${progress}%` }} />
      </div>

      <VoiceControls
        speakText={speakText}
        onTranscript={(text) => {
          setSide("C");
          setCustomText(text);
        }}
      />

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
        <button
          type="button"
          className={`side-option ${side === "A" ? "selected" : ""}`}
          onClick={() => setSide("A")}
        >
          <strong>A — Side A</strong>
          {question.side_a}
        </button>
        <button
          type="button"
          className={`side-option ${side === "B" ? "selected" : ""}`}
          onClick={() => setSide("B")}
        >
          <strong>B — Side B</strong>
          {question.side_b}
        </button>
        <button
          type="button"
          className={`side-option ${side === "neutral" ? "selected" : ""}`}
          onClick={() => setSide("neutral")}
        >
          <strong>Neutral</strong>
          Not sure / no strong preference on this issue.
        </button>
        <button
          type="button"
          className={`side-option ${side === "C" ? "selected" : ""}`}
          onClick={() => setSide("C")}
        >
          <strong>C — Custom response</strong>
          Write or speak your own position. Gemini will score it from -2 to 2 in
          0.5 steps.
        </button>
      </div>

      {side === "A" || side === "B" ? (
        <div className="strength-row">
          <button
            type="button"
            className={strength === "somewhat" ? "selected" : ""}
            onClick={() => setStrength("somewhat")}
          >
            Somewhat
          </button>
          <button
            type="button"
            className={strength === "strong" ? "selected" : ""}
            onClick={() => setStrength("strong")}
          >
            Strongly
          </button>
        </div>
      ) : null}

      {side === "C" ? (
        <div style={{ marginTop: "0.9rem" }}>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Describe your position in your own words…"
          />
        </div>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      <div className="cta-row" style={{ marginTop: "1.25rem" }}>
        <button
          type="button"
          className="btn ghost"
          disabled={index === 0 || busy}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Back
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={continueNext}
        >
          {index === QUESTIONS.length - 1 ? "Next: address" : "Next"}
        </button>
      </div>
    </main>
  );
}
