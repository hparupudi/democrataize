import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ISSUES, matchPercent } from "@/lib/issues";
import { findCandidates, type CandidateResult } from "@/lib/candidates.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Democratize — Find candidates who match your views" },
      { name: "description", content: "Rate where you stand on key issues and see your % match with real candidates on your ballot." },
      { property: "og:title", content: "Democratize — Candidate match" },
      { property: "og:description", content: "Rate key issues and see your % match with real candidates on your ballot." },
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
const OTHER = 99;

type Result = CandidateResult & { pct: number; agree: string[]; differ: string[] };

function Index() {
  const [step, setStep] = useState<"quiz" | "address" | "results">("quiz");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [others, setOthers] = useState<Record<string, string>>({});
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  const done = ISSUES.every((i) => answers[i.id] !== undefined && (answers[i.id] !== OTHER || (others[i.id] ?? "").trim()));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const otherList = ISSUES.filter((i) => answers[i.id] === OTHER).map((i) => ({ issue: i.id, text: others[i.id] }));
      const res = await findCandidates({ data: { address, others: otherList } });
      const user = { ...answers };
      for (const o of otherList) user[o.issue] = res.otherScores[o.issue] ?? 0;
      setLocation(res.location);
      setResults(
        res.candidates
          .map((c) => {
            const diffs = ISSUES.map((i) => ({ t: i.title, d: Math.abs(user[i.id] - (c.scores[i.id] ?? 0)) }));
            return {
              ...c,
              pct: matchPercent(user, weights, c.scores),
              agree: diffs.filter((x) => x.d <= 1).map((x) => x.t),
              differ: diffs.filter((x) => x.d >= 3).map((x) => x.t),
            };
          })
          .sort((a, b) => b.pct - a.pct),
      );
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-primary">
        <div className="mx-auto max-w-3xl px-5 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Ballot guide</p>
          <h1 className="font-display text-5xl text-foreground">Democratize</h1>
          <p className="mt-2 text-muted-foreground">Rate the issues, enter your address, see who matches you.</p>
          <ol className="mt-6 flex flex-wrap gap-2 text-sm">
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
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {[...SCALE, { v: OTHER, l: "Other…" }].map((s) => (
                    <button
                      key={s.v}
                      onClick={() => setAnswers({ ...answers, [issue.id]: s.v })}
                      className={`rounded-md border px-1 py-2 text-xs font-medium transition-colors ${answers[issue.id] === s.v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
                {answers[issue.id] === OTHER && (
                  <textarea
                    value={others[issue.id] ?? ""}
                    onChange={(e) => setOthers({ ...others, [issue.id]: e.target.value })}
                    maxLength={500}
                    rows={3}
                    placeholder="Neither fits? Describe your own position in a sentence or two — AI will place it on the same scale."
                    className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                )}
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
          <form onSubmit={submit} className="rounded-lg border bg-card p-6">
            <h2 className="font-display text-2xl">Your residential address</h2>
            <p className="mt-1 text-sm text-muted-foreground">Used to find your local, state, and federal races.</p>
            <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State ZIP" className="mt-4 w-full rounded-md border bg-background px-3 py-2" />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setStep("quiz")} className="rounded-md border px-4 py-2">Back</button>
              <button disabled={loading} className="flex-1 rounded-md bg-primary py-2 font-semibold text-primary-foreground disabled:opacity-60">
                {loading ? "Researching your candidates… (up to a minute)" : "Find my candidates"}
              </button>
            </div>
          </form>
        )}

        {step === "results" && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Races for <b className="text-foreground">{location || address}</b>. Researched by AI from public records — double-check with your official sample ballot.
            </p>
            {results.map((c) => (
              <article key={c.name} className="rounded-lg border bg-card p-5">
                <div className="flex gap-4">
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="h-24 w-20 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-md bg-muted font-display text-2xl text-muted-foreground">
                      {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-xl">{c.name}</h3>
                        <p className="text-sm text-muted-foreground">{c.office} · {c.party}</p>
                      </div>
                      <span className="font-display text-3xl text-primary">{c.pct}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0, c.pct)}%` }} /></div>
                  </div>
                </div>
                <p className="mt-4 text-sm">{c.summary}</p>
                <div className="mt-4 rounded-md bg-muted p-3 text-sm">
                  <b>Why this match:</b>{" "}
                  {c.agree.length ? <>You agree on {c.agree.join(", ")}.</> : "Few areas of close agreement."}{" "}
                  {c.differ.length > 0 && <>You differ most on {c.differ.join(", ")}.</>}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <List title="What they've done" items={c.accomplishments} />
                  <List title="What they plan to do" items={c.plans} />
                  <List title="Get involved" items={c.getInvolved} />
                </div>
                <div className="mt-4 flex gap-4 text-sm">
                  {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">Campaign site</a>}
                  {c.wikipediaUrl && <a href={c.wikipediaUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">Wikipedia</a>}
                </div>
              </article>
            ))}
            <button onClick={() => setStep("quiz")} className="rounded-md border px-4 py-2">Retake</button>
          </div>
        )}
      </main>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-accent">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
        {items.map((x) => <li key={x}>{x}</li>)}
      </ul>
    </div>
  );
}
