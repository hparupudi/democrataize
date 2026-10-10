"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IssueRanker } from "@/components/IssueRanker";
import { useAppStore } from "@/lib/store";

export default function RankPage() {
  const router = useRouter();
  const issueRanks = useAppStore((s) => s.issueRanks);
  const setIssueRanks = useAppStore((s) => s.setIssueRanks);
  const address = useAppStore((s) => s.address);
  const userScores = useAppStore((s) => s.userScores);
  const setRaces = useAppStore((s) => s.setRaces);
  const setAddress = useAppStore((s) => s.setAddress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function calculate() {
    if (!address) {
      setError("Address is missing. Go back and enter it.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...address,
          userScores: userScores(),
          issueRanks,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Candidate lookup failed");
      setAddress({
        ...address,
        matchedAddress: data.geo?.matchedAddress,
      });
      setRaces(data.races);
      router.push("/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="panel">
      <p className="step-kicker">Priorities</p>
      <h2>Drag to rank the issues</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Rank 1 matters most. Match weight for each issue is{" "}
        <strong>10 − rank</strong> (rank 1 → weight 9, rank 9 → weight 1). We
        then take the squared distance between your stance and each candidate’s
        stance and compute a weighted average percentage match.
      </p>
      <IssueRanker ranks={issueRanks} onChange={setIssueRanks} />
      {error ? <p className="error-text">{error}</p> : null}
      <div className="cta-row" style={{ marginTop: "1.25rem" }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() => router.push("/address")}
          disabled={busy}
        >
          Back
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={calculate}
          disabled={busy}
        >
          {busy ? "Matching candidates…" : "See your matches"}
        </button>
      </div>
    </main>
  );
}
