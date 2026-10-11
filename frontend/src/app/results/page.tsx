"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { CandidatePanel } from "@/components/CandidatePanel";
import { SiteFooter, StepNav } from "@/components/StepNav";
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
  const candidateCount = races.reduce((n, r) => n + r.candidates.length, 0);

  if (!active) {
    return (
      <div className="flex min-h-screen flex-col">
        <StepNav stepIndex={3} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
          <p className="text-muted-foreground">Loading matches…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <StepNav stepIndex={3} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="space-y-6">
          <div className="card-civic animate-fade-up grid overflow-hidden sm:grid-cols-[1fr_1.1fr]">
            <div className="p-6">
              <span className="eyebrow">Your ballot</span>
              <h2 className="mt-1 font-display text-2xl text-primary">
                {address?.matchedAddress || address?.street || "Your address"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {candidateCount} candidates across {races.length} races, ranked
                by how closely their documented record matches your positions.
              </p>
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Researched by AI from primary sources. Always confirm with your
                official sample ballot.
              </p>
            </div>
            <div className="min-h-48 border-t sm:border-l sm:border-t-0">
              <DistrictMap geojson={active.boundaryGeojson} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <section className="space-y-2">
              {races.map((race, idx) => {
                const scored = race.candidates.filter(
                  (c) =>
                    !c.insufficientInformation && c.matchPercent !== null,
                );
                const top = scored[0];
                const allInsufficient =
                  race.candidates.length > 0 && scored.length === 0;
                return (
                  <button
                    key={race.contestName}
                    type="button"
                    onClick={() => setSelected(idx)}
                    className={`card-civic w-full p-4 text-left transition ${
                      idx === selected
                        ? "border-primary shadow-[var(--shadow-lift)]"
                        : "card-lift"
                    }`}
                  >
                    <h3 className="font-display text-lg text-primary">
                      {race.contestName}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {officeLabel(race.officeType)}
                      {race.districtLabel ? ` · ${race.districtLabel}` : ""}
                      {allInsufficient
                        ? " · insufficient candidate information"
                        : top
                          ? ` · top match ${top.matchPercent!.toFixed(1)}% (${top.nameOnBallot})`
                          : ""}
                    </p>
                  </button>
                );
              })}
            </section>

            <section className="space-y-4">
              {(() => {
                const scored = active.candidates.filter(
                  (c) =>
                    !c.insufficientInformation && c.matchPercent !== null,
                );
                const allInsufficient =
                  active.candidates.length > 0 && scored.length === 0;
                return (
                  <>
                    {allInsufficient ? (
                      <p className="insufficient-note">
                        Insufficient candidate information
                      </p>
                    ) : null}
                    {active.candidates.map((c) => (
                      <CandidatePanel
                        key={c.candidateId}
                        candidate={c}
                        userScores={scores}
                      />
                    ))}
                  </>
                );
              })()}
            </section>
          </div>

          <button
            type="button"
            onClick={() => router.push("/questionnaire")}
            className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" /> Retake survey
          </button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
