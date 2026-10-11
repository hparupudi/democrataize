"use client";

import { useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  Megaphone,
} from "lucide-react";
import { IssueCompare, MatchRing } from "./civic";
import type { CandidateView } from "@/lib/store";
import { playTts } from "./VoiceControls";

export function CandidatePanel({
  candidate,
  userScores,
}: {
  candidate: CandidateView;
  userScores: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [explain, setExplain] = useState<{
    summary: string;
    similarities: string[];
    differences: string[];
  } | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insufficient =
    candidate.insufficientInformation ||
    candidate.matchPercent === null ||
    Object.keys(candidate.scores).length === 0;

  async function loadExplain() {
    setLoadingExplain(true);
    setError(null);
    try {
      const rationales: Record<string, string> = {};
      for (const [id, detail] of Object.entries(candidate.scoreDetails)) {
        rationales[id] = detail.rationale || "";
      }
      const resp = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: candidate.fullName,
          userScores,
          candidateScores: candidate.scores,
          candidateRationales: rationales,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Explanation failed");
      setExplain(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Explanation failed");
    } finally {
      setLoadingExplain(false);
    }
  }

  return (
    <article className="card-civic card-lift animate-fade-up p-6">
      <div className="flex items-start gap-4">
        {candidate.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.photoUrl}
            alt={candidate.fullName}
            className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-[var(--shadow-card)] ring-1 ring-border"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-2xl text-primary">
            {candidate.nameOnBallot.slice(0, 2)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl leading-tight text-primary">
            {candidate.nameOnBallot}
            {candidate.isIncumbent ? " (Incumbent)" : ""}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {candidate.partyName} · {candidate.districtLabel || "Statewide"}
          </p>
        </div>
        {insufficient ? (
          <p className="insufficient-note max-w-[12rem] text-sm">
            Insufficient candidate information
          </p>
        ) : (
          <MatchRing pct={candidate.matchPercent ?? 0} />
        )}
      </div>

      {insufficient ? null : (
        <>
          <button
            type="button"
            className="mt-5 flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm font-semibold text-primary transition hover:bg-muted"
            onClick={() => setOpen((v) => !v)}
          >
            Compare stances
            <ChevronDown className={open ? "rotate-180" : ""} size={18} />
          </button>

          {open ? (
            <div className="mt-4 rounded-xl border bg-muted/60 p-4">
              <IssueCompare user={userScores} cand={candidate.scores} />
              <button
                type="button"
                className="mt-4 flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-muted disabled:opacity-60"
                onClick={loadExplain}
                disabled={loadingExplain}
              >
                {loadingExplain ? (
                  <Loader2 className="spin" size={16} />
                ) : null}
                AI explanation of similarities & differences
              </button>
              {error ? <p className="error-text mt-2">{error}</p> : null}
              {explain ? (
                <div className="mt-4 space-y-2 text-sm">
                  <p>{explain.summary}</p>
                  <h5 className="font-semibold text-primary">Similarities</h5>
                  <ul className="list-disc space-y-1 pl-5">
                    {explain.similarities?.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <h5 className="font-semibold text-primary">Differences</h5>
                  <ul className="list-disc space-y-1 pl-5">
                    {explain.differences?.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary"
                    onClick={() =>
                      playTts(
                        `${explain.summary} Similarities: ${explain.similarities?.join(". ")}. Differences: ${explain.differences?.join(". ")}`,
                      )
                    }
                  >
                    Read explanation aloud
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <details className="mt-5 border-t pt-4">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
          <Megaphone size={16} /> Connect to grassroots campaigning
        </summary>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {candidate.campaignWebsite ? (
            <a
              href={candidate.campaignWebsite}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-semibold text-primary transition hover:bg-[var(--accent-soft)]"
            >
              Campaign website <ExternalLink size={14} />
            </a>
          ) : null}
          {candidate.email ? (
            <a
              href={`mailto:${candidate.email}`}
              className="rounded-full bg-secondary px-3 py-1.5 font-semibold text-primary"
            >
              Email: {candidate.email}
            </a>
          ) : null}
          {candidate.phone ? (
            <a
              href={`tel:${candidate.phone}`}
              className="rounded-full bg-secondary px-3 py-1.5 font-semibold text-primary"
            >
              Call / text: {candidate.phone}
            </a>
          ) : null}
          {candidate.socialLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-semibold text-primary"
            >
              {link.platform} <ExternalLink size={14} />
            </a>
          ))}
          {candidate.introducedLegislation?.length ? (
            <div className="w-full pt-2">
              <strong className="text-primary">Introduced legislation</strong>
              <ul className="mt-1 space-y-1">
                {candidate.introducedLegislation.map((bill) => (
                  <li key={`${bill.billId || bill.title}-${bill.url || ""}`}>
                    {bill.url ? (
                      <a
                        href={bill.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-border underline-offset-2 hover:text-accent"
                      >
                        {bill.billId ? `${bill.billId}: ` : ""}
                        {bill.title}
                      </a>
                    ) : (
                      <span>
                        {bill.billId ? `${bill.billId}: ` : ""}
                        {bill.title}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {!candidate.campaignWebsite &&
          !candidate.email &&
          !candidate.phone &&
          !candidate.socialLinks.length &&
          !candidate.introducedLegislation?.length ? (
            <p className="text-muted-foreground">
              No campaign contact links are stored for this candidate yet.
            </p>
          ) : null}
        </div>
      </details>
    </article>
  );
}
