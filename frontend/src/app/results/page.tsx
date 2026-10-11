"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CandidatePanel } from "@/components/CandidatePanel";
import { officeLabel } from "@/lib/jurisdiction";
import { useAppStore } from "@/lib/store";

const DistrictMap = dynamic(
  () => import("@/components/DistrictMap").then((m) => m.DistrictMap),
  { ssr: false },
);

export default function ResultsPage() {
  const router = useRouter();
  const races = useAppStore((s) => s.races);
  const address = useAppStore((s) => s.address);
  const userScores = useAppStore((s) => s.userScores);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!races.length) {
      router.replace("/questionnaire");
    }
  }, [races.length, router]);

  const active = races[selected] || null;
  const scores = useMemo(() => userScores(), [userScores]);

  if (!active) {
    return (
      <main className="panel">
        <p>Loading matches…</p>
      </main>
    );
  }

  return (
    <main>
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <p className="step-kicker">Your ballot</p>
        <h2>Races for {address?.matchedAddress || "your address"}</h2>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Sorted from highest to lowest jurisdiction. Select a race to zoom the
          map to that district and inspect candidate matches.
        </p>
      </div>

      <div className="results-layout">
        <section className="race-list">
          {races.map((race, idx) => {
            const scored = race.candidates.filter(
              (c) => !c.insufficientInformation && c.matchPercent !== null,
            );
            const top = scored[0];
            const allInsufficient =
              race.candidates.length > 0 && scored.length === 0;
            return (
              <div key={race.contestName}>
                <button
                  type="button"
                  className={`race-btn ${idx === selected ? "active" : ""}`}
                  onClick={() => setSelected(idx)}
                >
                  <h3>{race.contestName}</h3>
                  <p>
                    {officeLabel(race.officeType)}
                    {race.districtLabel ? ` · ${race.districtLabel}` : ""}
                    {allInsufficient
                      ? " · insufficient candidate information"
                      : top
                        ? ` · top match ${top.matchPercent!.toFixed(1)}% (${top.nameOnBallot})`
                        : ""}
                  </p>
                </button>
                {idx === selected ? (
                  <div className="panel" style={{ marginTop: "0.65rem" }}>
                    {allInsufficient ? (
                      <p className="insufficient-note race-level">
                        Insufficient candidate information
                      </p>
                    ) : null}
                    {race.candidates.map((c) => (
                      <CandidatePanel
                        key={c.candidateId}
                        candidate={c}
                        userScores={scores}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        <aside>
          <DistrictMap geojson={active.boundaryGeojson} />
        </aside>
      </div>
    </main>
  );
}
