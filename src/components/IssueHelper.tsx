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
      className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full bg-background text-primary shadow-md transition-transform hover:scale-110"
    >
      {open ? <X className="h-9 w-9 rounded-full border-2 border-primary p-1.5" /> : <CircleArrowRight className="h-9 w-9" strokeWidth={1.75} />}
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
    <div className="mt-4 rounded-md border-2 border-primary/30 bg-muted p-4">
      <p className="text-sm font-semibold text-primary">Not sure about this one? Ask anything.</p>
      <div className="mt-3 space-y-3">
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <p key={i} className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">{m.content}</p>
          ) : (
            <div key={i} className="max-w-[95%] text-sm">
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.suggested !== undefined && m.suggested !== null && (
                <button type="button" onClick={() => onPick(m.suggested as number)} className="mt-2 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
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
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button disabled={loading || !text.trim()} className="rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Ask</button>
      </form>
    </div>
  );
}
