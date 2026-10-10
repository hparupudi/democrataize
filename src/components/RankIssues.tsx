import { useState } from "react";
import { GripVertical, ChevronUp, ChevronDown, Sparkle, ArrowRight, ArrowLeft } from "lucide-react";
import { ISSUES } from "@/lib/issues";
import { recommendRanking } from "@/lib/candidates.functions";

const STANCE: Record<number, string> = { [-2]: "Strongly Side A", [-1]: "Somewhat Side A", 0: "Neutral", 1: "Somewhat Side B", 2: "Strongly Side B" };

export function RankIssues(props: {
  order: string[];
  setOrder: (o: string[]) => void;
  answers: Record<string, number>;
  others: Record<string, string>;
  onBack: () => void;
  onNext: () => void;
}) {
  const { order, setOrder } = props;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [explanation, setExplanation] = useState("");

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setOrder(next);
  };

  async function recommend(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const positions = ISSUES.map((i) => {
        const v = props.answers[i.id];
        const stance = v === 99 ? `Own view: ${props.others[i.id] ?? ""}` : `${STANCE[v] ?? "Unanswered"} (A: ${i.a} / B: ${i.b})`;
        return { id: i.id, stance: stance.slice(0, 600) };
      });
      const r = await recommendRanking({ data: { prompt: prompt.trim(), positions } });
      setOrder(r.order);
      setExplanation(r.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get a recommendation. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <span className="eyebrow">Step two</span>
        <h2 className="mt-1 font-display text-4xl text-primary">What matters most to you?</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">Drag the issues into order. Your top issues count more when we calculate each candidate's match.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ol className="space-y-2.5">
          {order.map((id, idx) => {
            const issue = ISSUES.find((i) => i.id === id)!;
            const tier = idx < 3 ? "High" : idx < 6 ? "Medium" : "Low";
            return (
              <li
                key={id}
                draggable
                onDragStart={(e) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { e.preventDefault(); setOverId(id); }}
                onDragLeave={() => setOverId((o) => (o === id ? null : o))}
                onDrop={(e) => { e.preventDefault(); if (dragId) move(order.indexOf(dragId), idx); setDragId(null); setOverId(null); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                className={`card-civic group flex cursor-grab items-center gap-3 px-3 py-3 active:cursor-grabbing ${dragId === id ? "opacity-40" : ""} ${overId === id && dragId !== id ? "border-accent ring-2 ring-accent-soft" : ""}`}
              >
                <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-lg ${idx < 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{idx + 1}</span>
                <span className="flex-1 font-semibold text-card-foreground">{issue.title}</span>
                <span className={`hidden rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider sm:inline ${tier === "High" ? "bg-accent-soft text-accent" : tier === "Medium" ? "bg-secondary text-primary" : "bg-muted text-muted-foreground"}`}>{tier}</span>
                <span className="flex flex-col">
                  <button type="button" aria-label={`Move ${issue.title} up`} onClick={() => move(idx, idx - 1)} disabled={idx === 0} className="rounded p-0.5 text-muted-foreground hover:text-primary disabled:opacity-25"><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Move ${issue.title} down`} onClick={() => move(idx, idx + 1)} disabled={idx === order.length - 1} className="rounded p-0.5 text-muted-foreground hover:text-primary disabled:opacity-25"><ChevronDown className="h-4 w-4" /></button>
                </span>
              </li>
            );
          })}
        </ol>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <form onSubmit={recommend} className="card-civic overflow-hidden">
            <div className="stripe-band h-1.5" />
            <div className="p-5">
              <h3 className="flex items-center gap-2 font-display text-xl text-primary"><Sparkle className="h-4 w-4 text-accent" /> Need help ranking?</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">Tell us a bit about your life and what you worry about. AI will suggest an order — you can still rearrange it.</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="e.g. I'm a nurse with two kids, rent keeps going up, and I want safer streets in my neighborhood."
                className="mt-4 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              />
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              <button disabled={loading || !prompt.trim()} className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
                {loading ? "Thinking it through…" : "Suggest an order"}
              </button>
              {explanation && <p className="mt-4 animate-fade-up border-l-2 border-accent pl-3 text-sm leading-relaxed">{explanation}</p>}
            </div>
          </form>
        </aside>
      </div>

      <div className="mt-8 flex gap-3">
        <button type="button" onClick={props.onBack} className="flex items-center gap-1.5 rounded-lg border bg-card px-4 py-3 text-sm font-semibold text-primary transition hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Back</button>
        <button type="button" onClick={props.onNext} className="group flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground shadow-lift transition hover:bg-primary/90">
          Continue to your address <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
