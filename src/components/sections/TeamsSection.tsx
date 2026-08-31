import { Shield, Star } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { memo, useMemo } from "react";
import type { Player } from "@/lib/scoring";
import { defaultSiteContent, getTeamLogo, useSiteContent } from "@/lib/site-content";

interface Props {
  players: Player[];
}

const CATEGORY_ORDER: Record<string, number> = {
  M1: 1,
  M2: 2,
  Star: 3,
  Core: 4,
  Dev: 5,
};

export const TeamsSection = memo(function TeamsSectionComponent({ players }: Props) {
  const { data: configuredContent } = useSiteContent();
  const content = configuredContent ?? defaultSiteContent;
  const teamList = useMemo(() => {

    const teams = new Map<string, Player[]>();

    for (const p of players) {
      if (!p.team) continue;

      if (!teams.has(p.team)) {
        teams.set(p.team, []);
      }

      teams.get(p.team)!.push(p);
    }

    return [...teams.entries()]
      .map(([name, list]) => ({
        name,
        players: list.sort(
          (a, b) =>
            (CATEGORY_ORDER[String(a.category)] ?? 99) -
              (CATEGORY_ORDER[String(b.category)] ?? 99) ||
            (a.ranking ?? 99) - (b.ranking ?? 99)
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  return (
      <SectionCard
        title="Teams & Rosters"
        icon={<Shield className="h-3.5 w-3.5 text-primary/70" />}
      >
        <div className="space-y-3">
          {teamList.length === 0 && (
            <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
              No teams configured.
            </p>
          )}

          {teamList.map((team) => (
            <div
              key={team.name}
              className="rounded-xl p-3 bg-white/[0.02] ring-1 ring-white/[0.05]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  {getTeamLogo(content, team.name) ? (
                    <div className="relative h-8 w-8 rounded-lg bg-zinc-900/80 ring-1 ring-white/[0.08] overflow-hidden flex-shrink-0">
                      <img
                        src={getTeamLogo(content, team.name)}
                        alt={team.name}
                        loading="lazy"
                        decoding="async"
                        className="object-contain p-0.5 w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-zinc-800/80 ring-1 ring-white/[0.08] flex items-center justify-center flex-shrink-0">
                      <span className="text-[7px] font-bold text-muted-foreground">
                        {team.name.substring(0, 2)}
                      </span>
                    </div>
                  )}
                  <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground">
                    {team.name}
                  </h3>
                </div>

                <span className="text-[9px] text-muted-foreground">
                  {team.players.length} players
                </span>
              </div>

              <div className="space-y-1">
                {team.players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-foreground/90 flex items-center gap-1">
                      {p.name}

                      {p.is_captain ? (
                        <Star className="h-3 w-3 text-primary fill-primary" />
                      ) : null}
                    </span>

                    <span className="text-[9px] uppercase tracking-wider text-primary/70">
                      {p.category ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
  );
});
