"use client";

import Link from "next/link";
import { LogoMark } from "./civic";

const STEPS = [
  { label: "Issues", href: "/questionnaire" },
  { label: "Priorities", href: "/rank" },
  { label: "Address", href: "/address" },
  { label: "Matches", href: "/results" },
] as const;

export function StepNav({ stepIndex }: { stepIndex: number }) {
  return (
    <nav className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-md">
      <div className="stripe-band h-1" />
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <LogoMark size={40} />
          <span className="font-display text-xl font-bold text-primary">
            DemocratAIze
          </span>
        </Link>
        <ol className="flex items-center gap-1 text-xs font-semibold sm:gap-2">
          {STEPS.map((s, i) => (
            <li key={s.label} className="flex items-center gap-1 sm:gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors ${
                  i === stepIndex
                    ? "bg-primary text-primary-foreground"
                    : i < stepIndex
                      ? "bg-[var(--accent-soft)] text-accent"
                      : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    i === stepIndex
                      ? "bg-primary-foreground text-primary"
                      : i < stepIndex
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </span>
              {i < 3 ? (
                <span className="h-px w-3 bg-border sm:w-6" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="stripe-band h-1" />
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs opacity-90">
        <span className="flex items-center gap-2">
          <b className="font-display text-base">DemocratAIze</b> — Nonpartisan.
          Not affiliated with any campaign or party.
        </span>
        <span>North Carolina · Primary sources only.</span>
      </div>
    </footer>
  );
}
