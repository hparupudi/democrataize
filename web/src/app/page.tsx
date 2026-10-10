import Link from "next/link";

export default function HomePage() {
  return (
    <main className="hero">
      <p className="step-kicker">North Carolina 2026</p>
      <h1>BallotMatch NC</h1>
      <p>
        Answer nine issues with Side A, Side B, or your own words. Rank what
        matters most, enter your address, and see which candidates on your ballot
        align with you — race by race, on the map.
      </p>
      <div className="cta-row">
        <Link className="btn primary" href="/questionnaire">
          Start questionnaire
        </Link>
      </div>
    </main>
  );
}
