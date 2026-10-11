"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { IssueRanker } from "@/components/IssueRanker";
import { SiteFooter, StepNav } from "@/components/StepNav";
import { QUESTIONS } from "@/lib/questionnaire";
import { useAppStore } from "@/lib/store";

export default function RankPage() {
  const router = useRouter();
  const issueRanks = useAppStore((s) => s.issueRanks);
  const setIssueRanks = useAppStore((s) => s.setIssueRanks);
  const answers = useAppStore((s) => s.answers);

  if (Object.keys(answers).length < QUESTIONS.length) {
    return (
      <div className="flex min-h-screen flex-col">
        <StepNav stepIndex={1} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
          <div className="card-civic p-6">
            <h2 className="font-display text-2xl text-primary">
              Finish the issues first
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Answer all nine issues before ranking priorities.
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              onClick={() => router.push("/questionnaire")}
            >
              Back to issues
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <StepNav stepIndex={1} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="card-civic animate-fade-up p-6 sm:p-8">
          <span className="eyebrow">Priorities</span>
          <h2 className="mt-1 font-display text-3xl text-primary">
            Rank what matters most
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Rank 1 matters most. Match weight is <strong>10 − rank</strong>{" "}
            (rank 1 → weight 9 … rank 9 → weight 1).
          </p>
          <div className="mt-6">
            <IssueRanker ranks={issueRanks} onChange={setIssueRanks} />
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/questionnaire")}
              className="flex items-center gap-1.5 rounded-xl border bg-card px-4 py-3 text-sm font-semibold text-primary transition hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => router.push("/address")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:bg-primary/90"
            >
              Continue to address <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
