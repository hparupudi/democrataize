import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ISSUES, matchPercent } from "@/lib/issues";
import { IssueHelperButton, IssueHelperPanel } from "@/components/IssueHelper";
import { CandidateChat } from "@/components/CandidateChat";
import { LogoMark, MatchRing, IssueCompare, DistrictMap, HeroMap } from "@/components/civic";
import { MapPin, ArrowRight, ArrowLeft, ShieldCheck, Globe, BookOpen, RotateCcw } from "lucide-react";
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
  const [userScores, setUserScores] = useState<Record<string, number>>({});

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
      setUserScores(user);
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const answered = ISSUES.filter((i) => answers[i.id] !== undefined).length;
  const stepIdx = ["quiz", "address", "results"].indexOf(step);
  const go = (s: typeof step) => { setStep(s); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="min-h-screen map-texture">
      <nav className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-xl text-primary">Democratize</span>
          </div>
          <ol className="flex items-center gap-1 text-xs font-semibold sm:gap-2">
            {["Issues", "Address", "Matches"].map((s, i) => (
              <li key={s} className="flex items-center gap-1 sm:gap-2">
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors ${i === stepIdx ? "bg-primary text-primary-foreground" : i < stepIdx ? "bg-accent-soft text-accent" : "text-muted-foreground"}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${i === stepIdx ? "bg-primary-foreground text-primary" : i < stepIdx ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{i + 1}</span>
                  <span className="hidden sm:inline">{s}</span>
                </span>
                {i < 2 && <span className="h-px w-3 bg-border sm:w-6" />}
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {step === "quiz" && (
        <header className="hero-surface">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold glass-chip">
                <span className="h-1.5 w-1.5 rounded-full bg-highlight" /> Nonpartisan ballot guide
              </span>
              <h1 className="mt-5 font-display text-4xl leading-[1.05] sm:text-5xl md:text-6xl">
                Understand your <span className="text-highlight">local</span> civic landscape.
              </h1>
              <p className="mt-5 max-w-md text-base opacity-80">
                Share where you stand on nine issues. We map your address to the races on your ballot and show how closely each candidate's record matches yours.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-80">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Primary sources only</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Based on your district</span>
              </div>
            </div>
            <div className="animate-fade-up [animation-delay:150ms]"><HeroMap /></div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-3xl px-5 py-10">
        {step === "quiz" && (
          <div className="space-y-6">
            <div className="sticky top-[61px] z-20 -mx-1 rounded-2xl border bg-card/90 px-4 py-3 shadow-card backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-primary">Your positions</span>
                <span className="text-muted-foreground">{answered} of {ISSUES.length} answered</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${(answered / ISSUES.length) * 100}%`, backgroundImage: "var(--gradient-match)" }} />
              </div>
            </div>

            {ISSUES.map((issue, idx) => {
              const val = answers[issue.id];
              return (
                <section key={issue.id} className="card-civic card-lift animate-fade-up p-6 sm:p-7" style={{ animationDelay: `${Math.min(idx, 4) * 60}ms` }}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition-colors ${val !== undefined ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>{idx + 1}</span>
                    <h2 className="font-display text-2xl text-card-foreground">{issue.title}</h2>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className={`rounded-xl border p-4 text-sm leading-relaxed transition-colors ${val !== undefined && val < 0 && val !== OTHER ? "border-primary bg-secondary" : "bg-muted"}`}>
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-primary">Side A</span>{issue.a}
                    </div>
                    <div className={`rounded-xl border p-4 text-sm leading-relaxed transition-colors ${val !== undefined && val > 0 && val !== OTHER ? "border-accent bg-accent-soft" : "bg-muted"}`}>
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-accent">Side B</span>{issue.b}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="relative grid grid-cols-5">
                      <div className="absolute left-[10%] right-[10%] top-[11px] h-0.5 rounded-full bg-border" />
                      {SCALE.map((s) => {
                        const on = val === s.v;
                        return (
                          <button key={s.v} onClick={() => setAnswers({ ...answers, [issue.id]: s.v })} className="group relative flex flex-col items-center gap-2">
                            <span className={`h-6 w-6 rounded-full border-2 transition-all duration-200 ${on ? "scale-110 border-primary bg-primary shadow-lift ring-4 ring-secondary" : "border-input bg-card group-hover:border-accent group-hover:scale-105"}`} />
                            <span className={`text-center text-[11px] font-semibold leading-tight sm:text-xs ${on ? "text-primary" : "text-muted-foreground"}`}>{s.l}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex justify-center">
                      <button onClick={() => setAnswers({ ...answers, [issue.id]: OTHER })} className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${val === OTHER ? "border-highlight bg-highlight text-highlight-foreground" : "bg-card text-muted-foreground hover:border-accent hover:text-accent"}`}>
                        Neither fits — write my own
                      </button>
                    </div>
                  </div>

                  {val === OTHER && (
                    <textarea
                      value={others[issue.id] ?? ""}
                      onChange={(e) => setOthers({ ...others, [issue.id]: e.target.value })}
                      maxLength={500}
                      rows={3}
                      placeholder="Describe your own position in a sentence or two — AI will place it on the same scale."
                      className="mt-4 w-full animate-fade-up rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                    />
                  )}

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <label className="flex items-center gap-3 text-sm text-muted-foreground">
                      Importance
                      <input type="range" min={1} max={3} value={weights[issue.id] ?? 2} onChange={(e) => setWeights({ ...weights, [issue.id]: +e.target.value })} className="w-24 accent-accent" />
                      <span className="w-14 font-semibold text-primary">{["Low", "Medium", "High"][(weights[issue.id] ?? 2) - 1]}</span>
                    </label>
                    <IssueHelperButton open={!!helpOpen[issue.id]} onClick={() => setHelpOpen({ ...helpOpen, [issue.id]: !helpOpen[issue.id] })} />
                  </div>
                  {helpOpen[issue.id] && <IssueHelperPanel issueId={issue.id} onPick={(v) => setAnswers({ ...answers, [issue.id]: v })} />}
                </section>
              );
            })}
            <button disabled={!done} onClick={() => go("address")} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-semibold text-primary-foreground shadow-lift transition hover:bg-primary/90 disabled:opacity-40 disabled:shadow-none">
              {done ? <>Continue to your address <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></> : `Answer all issues (${answered}/${ISSUES.length})`}
            </button>
          </div>
        )}

        {step === "address" && (
          <form onSubmit={submit} className="card-civic animate-fade-up overflow-hidden">
            <DistrictMap className="h-44 rounded-none border-0 border-b" />
            <div className="p-6 sm:p-8">
              <h2 className="font-display text-3xl text-primary">Where do you vote?</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Your residential address determines your local, state and federal districts. It isn't stored.</p>
              <div className="relative mt-6">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
                <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State ZIP" className="w-full rounded-xl border bg-background py-3.5 pl-12 pr-4 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft" />
              </div>
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
              {loading && (
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-accent-soft p-4 text-sm text-primary">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => <MapPin key={i} className="h-4 w-4 animate-bounce text-accent" style={{ animationDelay: `${i * 150}ms` }} />)}
                  </span>
                  Mapping your districts and reviewing official records… up to a minute.
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => go("quiz")} className="flex items-center gap-1.5 rounded-xl border bg-card px-4 py-3 text-sm font-semibold text-primary transition hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Back</button>
                <button disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lift transition hover:bg-primary/90 disabled:opacity-60">
                  {loading ? "Researching…" : <>Find my candidates <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          </form>
        )}

        {step === "results" && (
          <div className="space-y-6">
            <div className="card-civic animate-fade-up grid overflow-hidden sm:grid-cols-[1fr_1.1fr]">
              <div className="p-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Your ballot</span>
                <h2 className="mt-1 font-display text-2xl text-primary">{location || address}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{results.length} candidates ranked by how closely their documented record matches your positions.</p>
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  Researched by AI from primary sources (voting records, official sites). Always confirm with your official sample ballot.
                </p>
              </div>
              <DistrictMap className="min-h-48 rounded-none border-0" />
            </div>

            {results.map((c, idx) => (
              <article key={c.name} className="card-civic card-lift animate-fade-up p-6" style={{ animationDelay: `${Math.min(idx, 5) * 80}ms` }}>
                <div className="flex items-start gap-4">
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-card ring-1 ring-border" />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-2xl text-primary">
                      {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {idx === 0 && <span className="mb-1 inline-block rounded-full bg-highlight px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-highlight-foreground">Closest match</span>}
                    <h3 className="font-display text-2xl leading-tight text-primary">{c.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{c.office} · {c.party}</p>
                  </div>
                  <MatchRing pct={c.pct} />
                </div>

                <p className="mt-5 text-sm leading-relaxed">{c.summary}</p>

                <div className="mt-5 rounded-xl border bg-muted/60 p-4">
                  <p className="text-sm">
                    <b className="text-primary">Why this match: </b>
                    {c.agree.length ? <>You agree on {c.agree.join(", ")}.</> : "Few areas of close agreement."}{" "}
                    {c.differ.length > 0 && <>You differ most on {c.differ.join(", ")}.</>}
                  </p>
                  <div className="mt-4"><IssueCompare user={userScores} cand={c.scores} /></div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-3">
                  <List title="Record" items={c.accomplishments} />
                  <List title="Plans" items={c.plans} />
                  <List title="Get involved" items={c.getInvolved} />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4 text-sm">
                  {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-semibold text-primary transition hover:bg-accent-soft"><Globe className="h-3.5 w-3.5" /> Campaign site</a>}
                  {c.wikipediaUrl && <a href={c.wikipediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-semibold text-primary transition hover:bg-accent-soft"><BookOpen className="h-3.5 w-3.5" /> Wikipedia</a>}
                  {c.sources.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Sources:{" "}
                      {c.sources.map((u, j) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer" className="mr-2 underline decoration-border underline-offset-2 hover:text-accent">[{j + 1}] {u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</a>
                      ))}
                    </span>
                  )}
                </div>
                <CandidateChat name={c.name} office={c.office} party={c.party} matchPct={c.pct} agree={c.agree} differ={c.differ} />
              </article>
            ))}
            <button onClick={() => go("quiz")} className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-muted"><RotateCcw className="h-4 w-4" /> Retake survey</button>
          </div>
        )}
      </main>

      <footer className="border-t bg-card/70">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><LogoMark /> Nonpartisan. Not affiliated with any campaign or party.</span>
          <span>Information from primary sources only.</span>
        </div>
      </footer>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-accent">{title}</h4>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((x) => (
          <li key={x} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-soft" />{x}</li>
        ))}
      </ul>
    </div>
  );
}
