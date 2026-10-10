import { useState } from "react";
import { CircleArrowRight, X } from "lucide-react";
import { askAboutCandidate } from "@/lib/candidates.functions";

type Msg = { role: "user" | "assistant"; content: string; sources?: string[] };

export function CandidateChat(props: { name: string; office: string; party: string; matchPct: number; agree: string[]; differ: string[] }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(q: string) {
    q = q.trim();
    if (!q || loading) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setText("");
    setLoading(true);
    setError("");
    try {
      const r = await askAboutCandidate({
        data: {
          candidate: { name: props.name, office: props.office, party: props.party, matchPct: props.matchPct },
          agree: props.agree,
          differ: props.differ,
          history: next.map(({ role, content }) => ({ role, content })),
        },
      });
      setMsgs([...next, { role: "assistant", content: r.answer, sources: r.sources }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get an answer. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 chip-aero py-1 pl-1 pr-4 text-sm font-bold text-primary"
      >
        {open ? <X className="h-7 w-7 rounded-full border-2 border-primary p-1" /> : <CircleArrowRight className="h-7 w-7" strokeWidth={1.75} />}
        {open ? "Close" : `Ask AI about ${props.name.split(" ")[0]}`}
      </button>
      {open && (
        <div className="mt-3 rounded-3xl border border-aqua/50 bg-secondary/70 p-4 shadow-inner">
          {msgs.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {[`Why ${props.name}?`, "What's their voting record on my top issues?", "Where do we disagree?"].map((q) => (
                <button key={q} type="button" onClick={() => ask(q)} className="chip-aero px-3 py-1 text-xs font-semibold">
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <p key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow">{m.content}</p>
              ) : (
                <div key={i} className="text-sm">
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {!!m.sources?.length && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Sources:{" "}
                      {m.sources.map((u, j) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer" className="mr-2 underline">
                          [{j + 1}] {new URL(u).hostname.replace("www.", "")}
                        </a>
                      ))}
                    </p>
                  )}
                </div>
              ),
            )}
            {loading && <p className="text-sm text-muted-foreground">Checking primary sources…</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="mt-3 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Ask anything about this candidate…" className="field-aero flex-1 px-3 py-2 text-sm" />
            <button disabled={loading || !text.trim()} className="btn-aero px-5 text-sm font-bold"><span className="relative">Ask</span></button>
          </form>
        </div>
      )}
    </div>
  );
}
