import { Calculator, Swords, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";
import { SectionCard } from "@/components/SectionCard";

const handicapRows = [
  ["M1", "4"],
  ["M2", "3"],
  ["Star", "2"],
  ["Core", "1"],
  ["Dev", "0"],
];

export function ScoringHelpSection() {
  return (
    <div className="space-y-4">
      <SectionCard
        title="Scoring Help"
        icon={<Calculator className="h-3.5 w-3.5 text-primary/70" />}
      >
        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Quick guide for how league points, player rankings, and eliminator handicaps work.
          </p>

          <ScoringBlock
            icon={<Trophy className="h-3.5 w-3.5 text-primary" />}
            title="League Team Points"
          >
            <p>Normal win: winner gets 3 points.</p>
            <p>5-0 win: winner gets 4 points.</p>
            <p>Forfeit: recorded as a 5-0 team result for 4 points; player ratings are unchanged.</p>
            <p>Tiebreak match: winner gets 2, loser gets 1.</p>
            <Example text="Example: Team A wins 5-3, so Team A gets 3 points and Team B gets 0." />
          </ScoringBlock>

          <ScoringBlock
            icon={<Users className="h-3.5 w-3.5 text-primary" />}
            title="Player Rankings"
          >
            <p>Players earn the official-tier-adjusted game difference from every match they play.</p>
            <p>The ranking score is the player&apos;s average points per match.</p>
            <Example text="Example: the raw 5–3 difference is adjusted by the two pairs&apos; official tiers, then divided by the number of matches played. A temporary nightly promotion does not change the individual score tier." />
          </ScoringBlock>

          <ScoringBlock
            icon={<Swords className="h-3.5 w-3.5 text-primary" />}
            title="Eliminator Handicap"
          >
            <p>Eliminators are individual scoring only. They do not change team standings.</p>
            <div className="grid grid-cols-5 gap-1">
              {handicapRows.map(([category, value]) => (
                <div
                  key={category}
                  className="rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] px-2 py-2 text-center"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </p>
                  <p className="text-[13px] font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
            <Example text="M1 + M2 has handicap 7. Star + Dev has handicap 2. The difference between the two is the fixture difficulty of 5." />
            <Example text="If M1 + M2 win 5-3, raw difference is +2, then 2 - 5 = -3 each." />
            <Example text="If Star + Dev win 5-2, raw difference is +3, then 3 + 5 = +8 each." />
          </ScoringBlock>
        </div>
      </SectionCard>
    </div>
  );
}

function ScoringBlock({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/[0.02] ring-1 ring-white/[0.05] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          {icon}
        </div>
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground">{title}</h3>
      </div>
      <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function Example({ text }: { text: string }) {
  return (
    <p className="rounded-lg bg-zinc-900/50 ring-1 ring-white/[0.04] px-3 py-2 text-[10px] text-foreground/90">
      {text}
    </p>
  );
}
