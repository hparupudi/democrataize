import { useState } from "react";
import { CircleArrowRight, X } from "lucide-react";
import { askAboutIssue } from "@/lib/candidates.functions";

const LABELS: Record<number, string> = { [-2]: "Strongly A", [-1]: "Somewhat A", 0: "Neutral", 1: "Somewhat B", 2: "Strongly B" };
type Msg = { role: "user" | "assistant"; content: string; suggested?: number | null };

export function IssueHelperButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close help" : "Ask AI about this question"}
      title="Not sure? Ask AI"
      className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-4 shadow-card text-sm font-semibold text-primary transition-colors hover:border-accent hover:text-accent"
    >
      {open ? <X className="h-7 w-7 rounded-full border-2 border-primary p-1" /> : <CircleArrowRight className="h-7 w-7" strokeWidth={1.75} />}
      {open ? "Close help" : "Not sure? Ask AI"}
    </button>
  );
}

export function IssueHelperPanel({ issueId, onPick }: { issueId: string; onPick: (v: number) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q || loading) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setText("");
    setLoading(true);
    setError("");
    try {
      const r = await askAboutIssue({ data: { issueId, history: next.map(({ role, content }) => ({ role, content })) } });
      setMsgs([...next, { role: "assistant", content: r.explanation, suggested: r.suggestedScore }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get an answer. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 animate-fade-up rounded-2xl border bg-secondary/60 p-4">
      <p className="text-sm font-semibold text-primary">Not sure about this one? Ask anything.</p>
      <div className="mt-3 space-y-3">
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <p key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">{m.content}</p>
          ) : (
            <div key={i} className="max-w-[95%] text-sm">
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.suggested !== undefined && m.suggested !== null && (
                <button type="button" onClick={() => onPick(m.suggested as number)} className="mt-2 rounded-full bg-accent px-3.5 py-1.5 shadow-card transition hover:opacity-90 text-xs font-semibold text-accent-foreground">
                  Pick "{LABELS[m.suggested]}"
                </button>
              )}
            </div>
          ),
        )}
        {loading && <p className="text-sm text-muted-foreground">Thinking…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="e.g. What do tariffs actually do? I care most about keeping prices low."
          className="flex-1 rounded-xl border bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
        />
        <button disabled={loading || !text.trim()} className="rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Ask</button>
      </form>
    </div>
  );
}
