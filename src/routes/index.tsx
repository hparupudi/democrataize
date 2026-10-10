import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ISSUES, matchPercent } from "@/lib/issues";
import { IssueHelperButton, IssueHelperPanel } from "@/components/IssueHelper";
import aeroBg from "@/assets/aero-bg.jpg";
import { Globe2, MapPin, Leaf, Vote } from "lucide-react";
import { CandidateChat } from "@/components/CandidateChat";
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
  const [helpOpen, setHelpOpen] = useState<Record<string, boolean>>({});
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
            const diffs = ISSUES.map((i) => ({ t: i.title, d: Math.abs((user[i.id] ?? 0) - (c.scores[i.id] ?? 0)) }));
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
    <div className="relative min-h-screen overflow-hidden">
      <img src={aeroBg} alt="" width={1920} height={1088} className="fixed inset-0 -z-20 h-full w-full object-cover" />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-background/30 to-background/70" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        {[8, 22, 37, 55, 68, 81, 93].map((l, i) => (
          <span key={l} className="bubble" style={{ left: `${l}%`, bottom: "-60px", width: 18 + (i % 3) * 16, height: 18 + (i % 3) * 16, animationDuration: `${14 + i * 3}s`, animationDelay: `${i * 2.3}s` }} />
        ))}
      </div>
      <header className="mx-auto max-w-3xl px-5 pt-8">
        <nav className="glass flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="btn-aero flex h-9 w-9 items-center justify-center"><Globe2 className="relative h-5 w-5" /></span>
            <span className="font-display text-xl font-black text-foreground">Democratize</span>
          </div>
          <span className="hidden items-center gap-1 text-xs font-semibold text-muted-foreground sm:flex"><Leaf className="h-4 w-4 text-leaf" /> Nonpartisan · Community-powered</span>
        </nav>
        <div className="rise-in mt-10 text-center">
          <p className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary shadow-sm"><Vote className="h-4 w-4" /> Your ballot, clearly</p>
          <h1 className="mt-4 font-display text-5xl font-black tracking-tight text-primary-foreground drop-shadow-[0_2px_8px_oklch(0.45_0.12_240/0.6)] sm:text-6xl">The future of voting<br />is crystal clear.</h1>
          <p className="mx-auto mt-3 max-w-md font-semibold text-primary-foreground drop-shadow-[0_1px_4px_oklch(0.45_0.12_240/0.7)]">Rate the issues, share your address, and meet the candidates who match you.</p>
          <ol className="mt-6 flex flex-wrap justify-center gap-2 text-sm font-bold">
            {["Issues", "Address", "Matches"].map((s, i) => {
              const active = ["quiz", "address", "results"].indexOf(step) >= i;
              return (
                <li key={s} className={`px-4 py-1.5 ${active ? "btn-aero" : "chip-aero text-muted-foreground"}`}>
                  <span className="relative">{i + 1}. {s}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 pb-24">
        {step === "quiz" && (
          <div className="space-y-8">
            {ISSUES.map((issue, idx) => (
              <section key={issue.id} className="glass rise-in p-6" style={{ animationDelay: `${idx * 60}ms` }}>
                <h2 className="flex items-center gap-3 font-display text-2xl font-extrabold text-card-foreground"><span className="btn-aero flex h-9 w-9 shrink-0 items-center justify-center text-base"><span className="relative">{idx + 1}</span></span>{issue.title}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <p className="rounded-2xl border border-aqua/40 bg-secondary/70 p-3 text-sm"><b>A:</b> {issue.a}</p>
                  <p className="rounded-2xl border border-leaf/40 bg-secondary/70 p-3 text-sm"><b>B:</b> {issue.b}</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {[...SCALE, { v: OTHER, l: "Other…" }].map((s) => (
                    <button
                      key={s.v}
                      onClick={() => setAnswers({ ...answers, [issue.id]: s.v })}
                      className={`px-1 py-2 text-xs font-bold ${answers[issue.id] === s.v ? "btn-aero" : "chip-aero"}`}
                    >
                      <span className="relative">{s.l}</span>
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
                    className="field-aero mt-3 w-full px-3 py-2 text-sm"
                  />
                )}
                <label className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                  How important?
                  <input type="range" min={1} max={3} value={weights[issue.id] ?? 2} onChange={(e) => setWeights({ ...weights, [issue.id]: +e.target.value })} className="accent-primary" />
                  <span>{["Low", "Medium", "High"][(weights[issue.id] ?? 2) - 1]}</span>
                </label>
                <IssueHelperButton open={!!helpOpen[issue.id]} onClick={() => setHelpOpen({ ...helpOpen, [issue.id]: !helpOpen[issue.id] })} />
                {helpOpen[issue.id] && <IssueHelperPanel issueId={issue.id} onPick={(v) => setAnswers({ ...answers, [issue.id]: v })} />}
              </section>
            ))}
            <button disabled={!done} onClick={() => setStep("address")} className="btn-aero btn-leaf w-full py-3.5 text-lg font-extrabold">
              <span className="relative">{done ? "Continue" : `Answer all issues (${Object.keys(answers).length}/${ISSUES.length})`}</span>
            </button>
          </div>
        )}

        {step === "address" && (
          <form onSubmit={submit} className="glass rise-in p-8">
            <span className="float btn-aero mb-4 flex h-14 w-14 items-center justify-center"><MapPin className="relative h-7 w-7" /></span>
            <h2 className="font-display text-3xl font-extrabold">Where do you vote?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Used to find your local, state, and federal races.</p>
            <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State ZIP" className="field-aero mt-4 w-full px-4 py-3" />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setStep("quiz")} className="chip-aero px-5 py-2 font-bold">Back</button>
              <button disabled={loading} className="btn-aero flex-1 py-2.5 font-extrabold">
                <span className="relative">{loading ? "Researching your candidates… (up to a minute)" : "Find my candidates"}</span>
              </button>
            </div>
          </form>
        )}

        {step === "results" && (
          <div className="space-y-6">
            <p className="glass px-5 py-3 text-sm text-muted-foreground">
              <MapPin className="mr-1 inline h-4 w-4 text-primary" />Races for <b className="text-foreground">{location || address}</b>. Researched by AI using primary sources only (voting records, official sites) — double-check with your official sample ballot.
            </p>
            {results.map((c, idx) => (
              <article key={c.name} className="glass rise-in p-6" style={{ animationDelay: `${idx * 80}ms` }}>
                <div className="flex gap-4">
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="h-24 w-20 shrink-0 rounded-2xl border-2 border-card object-cover shadow-md" />
                  ) : (
                    <div className="btn-aero flex h-24 w-20 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-black">
                      {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-xl font-extrabold">{c.name}</h3>
                        <p className="text-sm text-muted-foreground">{c.office} · {c.party}</p>
                      </div>
                      <span className="font-display text-4xl font-black text-primary">{c.pct}%</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-secondary shadow-inner"><div className="btn-aero btn-leaf h-3" style={{ width: `${Math.max(0, c.pct)}%` }} /></div>
                  </div>
                </div>
                <p className="mt-4 text-sm">{c.summary}</p>
                <div className="mt-4 rounded-2xl border border-aqua/40 bg-secondary/70 p-3 text-sm">
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
                {c.sources.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Primary sources:{" "}
                    {c.sources.map((u, j) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer" className="mr-2 underline">[{j + 1}] {u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</a>
                    ))}
                  </p>
                )}
                <CandidateChat name={c.name} office={c.office} party={c.party} matchPct={c.pct} agree={c.agree} differ={c.differ} />
              </article>
            ))}
            <button onClick={() => setStep("quiz")} className="chip-aero px-5 py-2 font-bold">Retake</button>
          </div>
        )}
      </main>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
        {items.map((x) => <li key={x}>{x}</li>)}
      </ul>
    </div>
  );
}
