"use client";

import { matchBarColor } from "@/lib/match";

export function MatchBar({ percent }: { percent: number }) {
  const color = matchBarColor(percent);
  return (
    <div className="match-bar-wrap">
      <div className="match-bar-track">
        <div
          className="match-bar-fill"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      <span className="match-pct" style={{ color }}>
        {percent.toFixed(1)}%
      </span>
    </div>
  );
}
