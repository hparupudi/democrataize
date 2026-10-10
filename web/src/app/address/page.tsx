"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { QUESTIONS } from "@/lib/questionnaire";

export default function AddressPage() {
  const router = useRouter();
  const answers = useAppStore((s) => s.answers);
  const setAddress = useAppStore((s) => s.setAddress);
  const existing = useAppStore((s) => s.address);
  const [street, setStreet] = useState(existing?.street || "");
  const [city, setCity] = useState(existing?.city || "");
  const [state, setState] = useState(existing?.state || "NC");
  const [zip, setZip] = useState(existing?.zip || "");
  const [error, setError] = useState<string | null>(null);

  function onNext() {
    setError(null);
    if (Object.keys(answers).length < QUESTIONS.length) {
      setError("Finish all questionnaire answers before continuing.");
      return;
    }
    if (!street.trim() || !city.trim() || !zip.trim()) {
      setError("Street, city, and ZIP are required.");
      return;
    }
    setAddress({
      street: street.trim(),
      city: city.trim(),
      state: state.trim() || "NC",
      zip: zip.trim(),
    });
    router.push("/rank");
  }

  return (
    <main className="panel">
      <p className="step-kicker">Your ballot location</p>
      <h2>Enter your North Carolina street address</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        We use the Census GeoCoder and TigerData to find the candidates on your
        ballot for US House, US Senate, NC House, NC Senate, and statewide
        offices.
      </p>
      <div className="form-grid">
        <label className="full">
          Street address
          <input
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="16 W Jones Street"
          />
        </label>
        <label>
          City
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Raleigh"
          />
        </label>
        <label>
          State
          <input value={state} onChange={(e) => setState(e.target.value)} />
        </label>
        <label className="full">
          ZIP
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="27601"
          />
        </label>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="cta-row" style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn ghost" onClick={() => router.push("/questionnaire")}>
          Back
        </button>
        <button type="button" className="btn primary" onClick={onNext}>
          Next: rank issues
        </button>
      </div>
    </main>
  );
}
