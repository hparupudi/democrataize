"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Loader2, Megaphone } from "lucide-react";
import { QUESTIONS, scoreLabel } from "@/lib/questionnaire";
import { MatchBar } from "./MatchBar";
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
    <article className="candidate-card">
      <header className="candidate-head">
        <div className="candidate-identity">
          {candidate.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={candidate.photoUrl}
              alt={candidate.fullName}
              className="candidate-photo"
            />
          ) : (
            <div className="candidate-photo placeholder">
              {candidate.nameOnBallot.slice(0, 1)}
            </div>
          )}
          <div>
            <h4>{candidate.nameOnBallot}</h4>
            <p>
              {candidate.partyName} · {candidate.districtLabel || "Statewide"}
            </p>
          </div>
        </div>
        <MatchBar percent={candidate.matchPercent} />
      </header>

      <button
        type="button"
        className="dropdown-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        Compare stances
        <ChevronDown className={open ? "rotated" : ""} size={18} />
      </button>

      {open ? (
        <div className="stance-panel">
          {QUESTIONS.map((q) => {
            const u = userScores[q.id] ?? 0;
            const c = candidate.scores[q.id] ?? 0;
            return (
              <div key={q.id} className="stance-row">
                <div className="stance-title">{q.title}</div>
                <div className="stance-scale">
                  <span className="side-label">A</span>
                  <div className="scale-track">
                    <span
                      className="dot you"
                      style={{ left: `${((u + 2) / 4) * 100}%` }}
                      title={`You: ${scoreLabel(u)} (${u})`}
                    />
                    <span
                      className="dot them"
                      style={{ left: `${((c + 2) / 4) * 100}%` }}
                      title={`${candidate.nameOnBallot}: ${scoreLabel(c)} (${c})`}
                    />
                  </div>
                  <span className="side-label">B</span>
                </div>
                <div className="stance-meta">
                  You {u >= 0 ? `+${u}` : u} · Candidate {c >= 0 ? `+${c}` : c}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="btn secondary"
            onClick={loadExplain}
            disabled={loadingExplain}
          >
            {loadingExplain ? (
              <Loader2 className="spin" size={16} />
            ) : null}
            AI explanation of similarities & differences
          </button>
          {error ? <p className="error-text">{error}</p> : null}
          {explain ? (
            <div className="explain-box">
              <p>{explain.summary}</p>
              <h5>Similarities</h5>
              <ul>
                {explain.similarities?.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <h5>Differences</h5>
              <ul>
                {explain.differences?.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <button
                type="button"
                className="btn ghost"
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

      <details className="grassroots">
        <summary>
          <Megaphone size={16} /> Connect to grassroots campaigning
        </summary>
        <div className="grassroots-body">
          {candidate.campaignWebsite ? (
            <a href={candidate.campaignWebsite} target="_blank" rel="noreferrer">
              Campaign website <ExternalLink size={14} />
            </a>
          ) : null}
          {candidate.wikipediaUrl ? (
            <a href={candidate.wikipediaUrl} target="_blank" rel="noreferrer">
              Wikipedia / wiki <ExternalLink size={14} />
            </a>
          ) : null}
          {candidate.email ? (
            <a href={`mailto:${candidate.email}`}>Email campaign: {candidate.email}</a>
          ) : null}
          {candidate.phone ? (
            <a href={`tel:${candidate.phone}`}>Call / text: {candidate.phone}</a>
          ) : null}
          {candidate.socialLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
              {link.platform} <ExternalLink size={14} />
            </a>
          ))}
          {!candidate.campaignWebsite &&
          !candidate.email &&
          !candidate.phone &&
          !candidate.socialLinks.length ? (
            <p>No campaign contact links are stored for this candidate yet.</p>
          ) : null}
        </div>
      </details>
    </article>
  );
}
