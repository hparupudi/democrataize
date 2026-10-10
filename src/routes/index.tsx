import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ISSUES, SAMPLE_CANDIDATES, matchPercent } from "@/lib/issues";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Democratize — Find candidates who match your views" },
      { name: "description", content: "Rate where you stand on key issues and see your % match with candidates on your ballot." },
      { property: "og:title", content: "Democratize — Candidate match" },
      { property: "og:description", content: "Rate key issues and see your % match with candidates on your ballot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const SCALE = [
  { v: -2, l: "Strongly A" },
  { v: -1, l: "Somewhat A" },
  { v: 0, l: "Neutral" },
  { v: 1, l: "Somewhat B" },
  { v: 2, l: "Strongly B" },
];

function Index() {
  const [step, setStep] = useState<"quiz" | "address" | "results">("quiz");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [address, setAddress] = useState("");
  const done = ISSUES.every((i) => answers[i.id] !== undefined);

  const results = SAMPLE_CANDIDATES.map((c) => ({ ...c, pct: matchPercent(answers, weights, c.scores) })).sort((a, b) => b.pct - a.pct);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-primary">
        <div className="mx-auto max-w-3xl px-5 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Ballot guide</p>
          <h1 className="font-display text-5xl text-foreground">Democratize</h1>
          <p className="mt-2 text-muted-foreground">Rate the issues, enter your address, see who matches you.</p>
          <ol className="mt-6 flex gap-2 text-sm">
            {["Issues", "Address", "Matches"].map((s, i) => {
              const active = ["quiz", "address", "results"].indexOf(step) >= i;
              return (
                <li key={s} className={`rounded-full px-3 py-1 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}. {s}
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        {step === "quiz" && (
          <div className="space-y-8">
            {ISSUES.map((issue, idx) => (
              <section key={issue.id} className="rounded-lg border bg-card p-6">
                <h2 className="font-display text-2xl text-card-foreground">{idx + 1}. {issue.title}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <p className="rounded-md border-l-4 border-primary bg-muted p-3 text-sm"><b>A:</b> {issue.a}</p>
                  <p className="rounded-md border-l-4 border-accent bg-muted p-3 text-sm"><b>B:</b> {issue.b}</p>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {SCALE.map((s) => (
                    <button
                      key={s.v}
                      onClick={() => setAnswers({ ...answers, [issue.id]: s.v })}
                      className={`rounded-md border px-1 py-2 text-xs font-medium transition-colors ${answers[issue.id] === s.v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
                <label className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                  How important?
                  <input type="range" min={1} max={3} value={weights[issue.id] ?? 2} onChange={(e) => setWeights({ ...weights, [issue.id]: +e.target.value })} className="accent-primary" />
                  <span>{["Low", "Medium", "High"][(weights[issue.id] ?? 2) - 1]}</span>
                </label>
              </section>
            ))}
            <button disabled={!done} onClick={() => setStep("address")} className="w-full rounded-md bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-40">
              {done ? "Continue" : `Answer all issues (${Object.keys(answers).length}/${ISSUES.length})`}
            </button>
          </div>
        )}

        {step === "address" && (
          <form onSubmit={(e) => { e.preventDefault(); setStep("results"); }} className="rounded-lg border bg-card p-6">
            <h2 className="font-display text-2xl">Your residential address</h2>
            <p className="mt-1 text-sm text-muted-foreground">Used to find your local, state, and federal districts.</p>
            <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State ZIP" className="mt-4 w-full rounded-md border bg-background px-3 py-2" />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setStep("quiz")} className="rounded-md border px-4 py-2">Back</button>
              <button className="flex-1 rounded-md bg-primary py-2 font-semibold text-primary-foreground">Find my candidates</button>
            </div>
          </form>
        )}

        {step === "results" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Sample candidates for <b className="text-foreground">{address}</b> (demo data).</p>
            {results.map((c) => (
              <div key={c.name} className="rounded-lg border bg-card p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="font-display text-xl">{c.name}</h3>
                    <p className="text-sm text-muted-foreground">{c.office} · {c.party}</p>
                  </div>
                  <span className="font-display text-3xl text-primary">{c.pct}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${c.pct}%` }} /></div>
              </div>
            ))}
            <button onClick={() => setStep("quiz")} className="rounded-md border px-4 py-2">Retake</button>
          </div>
        )}
      </main>
    </div>
  );
}
