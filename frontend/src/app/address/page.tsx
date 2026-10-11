"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { DecorativeDistrictMap } from "@/components/civic";
import { SiteFooter, StepNav } from "@/components/StepNav";
import { QUESTIONS } from "@/lib/questionnaire";
import { useAppStore } from "@/lib/store";

export default function AddressPage() {
  const router = useRouter();
  const answers = useAppStore((s) => s.answers);
  const issueRanks = useAppStore((s) => s.issueRanks);
  const userScores = useAppStore((s) => s.userScores);
  const setAddress = useAppStore((s) => s.setAddress);
  const setRaces = useAppStore((s) => s.setRaces);
  const existing = useAppStore((s) => s.address);

  const [street, setStreet] = useState(existing?.street || "");
  const [city, setCity] = useState(existing?.city || "");
  const [state, setState] = useState(existing?.state || "NC");
  const [zip, setZip] = useState(existing?.zip || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (Object.keys(answers).length < QUESTIONS.length) {
      setError("Finish all questionnaire answers before continuing.");
      return;
    }
    if (!street.trim() || !city.trim() || !zip.trim()) {
      setError("Street, city, and ZIP are required.");
      return;
    }

    const address = {
      street: street.trim(),
      city: city.trim(),
      state: state.trim() || "NC",
      zip: zip.trim(),
    };
    setAddress(address);
    setBusy(true);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <StepNav stepIndex={2} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <form
          onSubmit={onSubmit}
          className="card-civic animate-fade-up overflow-hidden"
        >
          <DecorativeDistrictMap className="h-44 rounded-none border-0 border-b" />
          <div className="p-6 sm:p-8">
            <h2 className="font-display text-3xl text-primary">
              Where do you vote?
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your residential address determines your local, state, and federal
              districts. It isn&apos;t stored on our servers.
            </p>

            <div className="relative mt-6">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
              <input
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street address"
                className="w-full rounded-xl border bg-background py-3.5 pl-12 pr-4 outline-none transition focus:border-accent focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="rounded-xl border bg-background px-4 py-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="rounded-xl border bg-background px-4 py-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
              <input
                required
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="ZIP"
                className="rounded-xl border bg-background px-4 py-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
            </div>

            {error ? <p className="error-text mt-3">{error}</p> : null}
            {busy ? (
              <div className="mt-5 flex items-center gap-3 rounded-xl bg-[var(--accent-soft)] p-4 text-sm text-primary">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <MapPin
                      key={i}
                      className="h-4 w-4 animate-bounce text-accent"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
                Mapping your districts and loading candidate matches…
              </div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/rank")}
                className="flex items-center gap-1.5 rounded-xl border bg-card px-4 py-3 text-sm font-semibold text-primary transition hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? (
                  "Researching…"
                ) : (
                  <>
                    Find my candidates <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
