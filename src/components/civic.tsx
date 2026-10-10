import { MapPin } from "lucide-react";
import { ISSUES } from "@/lib/issues";

export function LogoMark() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
      <MapPin className="h-5 w-5" strokeWidth={2.2} />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-highlight ring-2 ring-background" />
    </span>
  );
}

/** Donut ring visualising a % match. */
export function MatchRing({ pct, size = 84 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} className="fill-none stroke-muted" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="fill-none stroke-accent transition-[stroke-dashoffset] duration-1000 ease-out"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl leading-none text-primary">{v}%</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">match</span>
      </div>
    </div>
  );
}

/** Per-issue comparison: you (navy) vs candidate (teal) on the -2..2 scale. */
export function IssueCompare({ user, cand }: { user: Record<string, number>; cand: Record<string, number> }) {
  const x = (v: number) => `${((v + 2) / 4) * 100}%`;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-end gap-4 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> You</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" /> Candidate</span>
      </div>
      {ISSUES.map((i) => {
        const u = user[i.id] ?? 0;
        const k = cand[i.id] ?? 0;
        const lo = Math.min(u, k);
        const hi = Math.max(u, k);
        return (
          <div key={i.id} className="grid grid-cols-[8.5rem_1fr] items-center gap-3 text-xs">
            <span className="truncate text-muted-foreground">{i.title}</span>
            <div className="relative h-5">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
              {[-2, -1, 0, 1, 2].map((t) => (
                <span key={t} className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-border" style={{ left: x(t) }} />
              ))}
              <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-secondary" style={{ left: x(lo), right: `calc(100% - ${x(hi)})` }} />
              <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-accent shadow-card" style={{ left: x(k) }} />
              <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary shadow-card" style={{ left: x(u) }} />
            </div>
          </div>
        );
      })}
      <div className="grid grid-cols-[8.5rem_1fr] gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span />
        <div className="flex justify-between"><span>Side A</span><span>Neutral</span><span>Side B</span></div>
      </div>
    </div>
  );
}

/** Stylised district map with a pulsing location pin. Decorative. */
export function DistrictMap({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-secondary ${className}`}>
      <svg viewBox="0 0 320 200" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g className="fill-card stroke-border" strokeWidth="1.5">
          <path d="M10 20 L110 12 L128 70 L60 96 L14 80 Z" />
          <path d="M110 12 L210 18 L220 64 L128 70 Z" />
          <path d="M210 18 L310 26 L304 92 L220 64 Z" />
          <path d="M14 80 L60 96 L72 170 L8 186 Z" />
          <path d="M60 96 L128 70 L170 120 L150 180 L72 170 Z" />
          <path d="M220 64 L304 92 L310 188 L220 178 L200 130 Z" />
          <path d="M150 180 L170 120 L200 130 L220 178 Z" />
        </g>
        <path d="M128 70 L220 64 L200 130 L170 120 Z" className="fill-accent-soft stroke-accent" strokeWidth="2" />
        <path d="M0 140 C60 120 120 160 180 140 S280 110 320 130" className="fill-none stroke-primary-soft" strokeOpacity="0.35" strokeWidth="3" />
        <path d="M90 0 L100 200 M250 0 L240 200" className="stroke-muted-foreground" strokeOpacity="0.2" strokeDasharray="3 5" />
      </svg>
      <div className="absolute left-[54%] top-[44%] -translate-x-1/2 -translate-y-full">
        <span className="absolute left-1/2 top-full h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent animate-pulse-ring" />
        <MapPin className="relative h-8 w-8 fill-primary text-card animate-pin-drop" strokeWidth={1.5} />
      </div>
    </div>
  );
}

/** Hero illustration: map tiles with pins connected by routes. */
export function HeroMap() {
  const pins = [
    { x: 22, y: 30, d: 0 },
    { x: 62, y: 22, d: 150 },
    { x: 78, y: 62, d: 300 },
    { x: 38, y: 70, d: 450 },
  ];
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl glass-chip">
      <svg viewBox="0 0 100 75" className="absolute inset-0 h-full w-full" aria-hidden>
        <g fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="0.4">
          <path d="M0 18 L30 14 L48 30 L70 20 L100 26" />
          <path d="M0 44 L24 40 L40 52 L66 44 L100 52" />
          <path d="M30 0 L34 75 M70 0 L64 75" strokeDasharray="1 1.5" />
        </g>
        <path d="M22 30 L62 22 L78 62 L38 70 Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.35" strokeDasharray="1.2 1" />
      </svg>
      {pins.map((p, i) => (
        <div key={i} className="absolute -translate-x-1/2 -translate-y-full animate-pin-drop" style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}ms` }}>
          <MapPin className={`h-7 w-7 ${i === 2 ? "fill-highlight text-primary" : "fill-accent text-primary"}`} strokeWidth={1.5} />
        </div>
      ))}
      <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-card p-3 text-card-foreground shadow-lift">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span>Your ballot, matched</span>
          <span className="text-accent">9 issues</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {[86, 64, 41].map((w, i) => (
            <div key={w} className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full animate-grow-x" style={{ width: `${w}%`, backgroundImage: "var(--gradient-match)", animationDelay: `${400 + i * 150}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
