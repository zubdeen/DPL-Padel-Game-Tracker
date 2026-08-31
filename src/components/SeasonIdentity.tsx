"use client";

import { Trophy } from "lucide-react";
import { useSiteContent, getLeagueTitle } from "@/lib/site-content";

interface SeasonIdentityProps {
  playerCount: number;
  teamCount: number;
  matchNightCount: number;
}

export function SeasonIdentity({ playerCount, teamCount, matchNightCount }: SeasonIdentityProps) {
  const { data: content = undefined } = useSiteContent();
  const fallback = content;
  if (!fallback) return null;
  const { accent, remainder } = getLeagueTitle(fallback);
  const imageUrl = fallback.brand.heroImageUrl.trim();

  return (
    <section className="relative overflow-hidden rounded-[1.35rem] border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-card to-card shadow-2xl shadow-black/30">
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={fallback.brand.heroImageAlt || fallback.brand.name}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/70 via-background/45 to-background/80" />
        </>
      ) : (
        <>
          <div className="absolute -right-16 -top-14 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        </>
      )}

      <div className="relative px-4 pb-4 pt-5 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/35 bg-background/45 p-2 shadow-lg shadow-black/20 backdrop-blur-sm">
          {fallback.brand.logoUrl ? (
            <img src={fallback.brand.logoUrl} alt={`${fallback.brand.name} logo`} className="h-full w-full object-contain" />
          ) : (
            <div className="h-8 w-8 rotate-45 rounded bg-primary" />
          )}
        </div>

        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/45 px-2.5 py-1 backdrop-blur-sm">
          <Trophy className="h-3 w-3 text-primary" />
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">{fallback.brand.statusLabel}</span>
        </div>

        <h1 className="text-[25px] font-bold leading-none tracking-tight text-foreground">
          <span className="text-primary">{accent}</span>{accent && remainder ? " " : ""}{remainder}
        </h1>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/85">{fallback.brand.seasonLabel}</p>
        <p className="mx-auto mt-3 max-w-[260px] text-[11px] leading-relaxed text-muted-foreground">{fallback.brand.tagline}</p>

        <div className="mx-auto my-4 flex max-w-[180px] items-center justify-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/60" />
          <span className="h-1.5 w-1.5 rotate-45 rounded-[1px] bg-primary" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/60" />
        </div>

        <div className="grid grid-cols-3 divide-x divide-primary/15 rounded-xl border border-white/[0.05] bg-background/30 py-3 backdrop-blur-sm">
          <Stat value={playerCount} label={fallback.home.playerLabel} />
          <Stat value={teamCount} label={fallback.home.teamLabel} primary />
          <Stat value={matchNightCount} label={fallback.home.nightLabel} />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label, primary }: { value: number; label: string; primary?: boolean }) {
  return (
    <div className="px-1 text-center">
      <p className={`text-lg font-bold leading-none tabular-nums ${primary ? "text-primary" : "text-foreground"}`}>{value}</p>
      <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</p>
    </div>
  );
}
