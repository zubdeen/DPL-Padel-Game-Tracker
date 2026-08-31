import { Swords } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { memo, useMemo } from "react";
import type { Match, Player } from "@/lib/scoring";
import type { EliminatorMatch } from "@/lib/eliminators";
import { defaultSiteContent, getTeamLogo, useSiteContent } from "@/lib/site-content";

interface Props {
  players: Player[];
  matches: Match[];
  eliminatorMatches?: EliminatorMatch[];
}

type MatchGroup = {
  dateKey: string;
  dateLabel: string;
  fixtures: {
    key: string;
    team1: string;
    team2: string;
    matches: Match[];
  }[];
  eliminatorMatches: EliminatorMatch[];
};

function getDateMeta(playedAt: string) {
  const date = new Date(playedAt);
  const dateKey = Number.isNaN(date.getTime())
    ? playedAt.slice(0, 10)
    : date.toISOString().slice(0, 10);
  const dateLabel = Number.isNaN(date.getTime())
    ? dateKey
    : date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return { dateKey, dateLabel };
}

export const FixturesSection = memo(function FixturesSectionComponent({
  players,
  matches,
  eliminatorMatches = [],
}: Props) {
  const { data: configuredContent } = useSiteContent();
  const content = configuredContent ?? defaultSiteContent;
  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const matchGroups = useMemo<MatchGroup[]>(() => {
    const byDate = new Map<string, MatchGroup>();

    for (const match of matches) {
      const { dateKey, dateLabel } = getDateMeta(match.played_at);
      const team1 = match.team1_name ?? playerById.get(match.team1_player1_id)?.team ?? "?";
      const team2 = match.team2_name ?? playerById.get(match.team2_player1_id)?.team ?? "?";
      const fixtureKey = `${team1}__${team2}`;

      let dateGroup = byDate.get(dateKey);
      if (!dateGroup) {
        dateGroup = { dateKey, dateLabel, fixtures: [], eliminatorMatches: [] };
        byDate.set(dateKey, dateGroup);
      }

      let fixture = dateGroup.fixtures.find((f) => f.key === fixtureKey);
      if (!fixture) {
        fixture = { key: fixtureKey, team1, team2, matches: [] };
        dateGroup.fixtures.push(fixture);
      }

      fixture.matches.push(match);
    }

    for (const match of eliminatorMatches) {
      const { dateKey, dateLabel } = getDateMeta(match.played_at);
      let dateGroup = byDate.get(dateKey);
      if (!dateGroup) {
        dateGroup = { dateKey, dateLabel, fixtures: [], eliminatorMatches: [] };
        byDate.set(dateKey, dateGroup);
      }
      dateGroup.eliminatorMatches.push(match);
    }

    return [...byDate.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [matches, eliminatorMatches, playerById]);

  return (
    <SectionCard title="Match History" icon={<Swords className="h-3.5 w-3.5 text-primary/70" />}>
      <div className="space-y-2">
        {matches.length === 0 && eliminatorMatches.length === 0 && (
          <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
            No matches recorded yet.
          </p>
        )}

        {matchGroups.map((dateGroup) => (
          <div key={dateGroup.dateKey} className="space-y-2">
            <div className="px-1 pt-2 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              {dateGroup.dateLabel}
            </div>

            {dateGroup.fixtures.length > 0 ? (
              <div className="px-1 text-[9px] font-semibold uppercase tracking-widest text-primary/70">
                League
              </div>
            ) : null}

            {dateGroup.fixtures.map((fixture) => (
              <div
                key={`${dateGroup.dateKey}-${fixture.key}`}
                className="rounded-xl bg-white/[0.02] ring-1 ring-white/[0.05] p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <TeamFixtureHeading team1={fixture.team1} team2={fixture.team2} content={content} />
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground">
                    {fixture.matches.length} games
                  </span>
                </div>

                <div className="space-y-1.5">
                  {fixture.matches.map((m) => {
                    const t1Win = m.team1_games > m.team2_games;

                    return (
                      <div
                        key={m.id}
                        className="rounded-lg bg-black/10 ring-1 ring-white/[0.04] p-2"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/70">
                            {m.tie_breaker ? "Tiebreak" : "Final"}
                          </span>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <div
                            className={`text-right text-[12px] ${
                              t1Win ? "font-bold text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {playerById.get(m.team1_player1_id)?.name ?? "?"}
                            <br />
                            {playerById.get(m.team1_player2_id)?.name ?? "?"}
                          </div>

                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/60 ring-1 ring-white/5">
                            <span
                              className={`text-base font-bold tabular-nums ${
                                t1Win ? "text-primary" : "text-foreground/70"
                              }`}
                            >
                              {m.team1_games}
                            </span>
                            <span className="text-muted-foreground text-xs">-</span>
                            <span
                              className={`text-base font-bold tabular-nums ${
                                !t1Win ? "text-primary" : "text-foreground/70"
                              }`}
                            >
                              {m.team2_games}
                            </span>
                          </div>

                          <div
                            className={`text-left text-[12px] ${
                              !t1Win ? "font-bold text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {playerById.get(m.team2_player1_id)?.name ?? "?"}
                            <br />
                            {playerById.get(m.team2_player2_id)?.name ?? "?"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {dateGroup.eliminatorMatches.length > 0 ? (
              <div className="px-1 pt-1 text-[9px] font-semibold uppercase tracking-widest text-primary/70">
                Eliminators
              </div>
            ) : null}

            {dateGroup.eliminatorMatches.map((match) => {
              const team1Win = match.team1_games > match.team2_games;
              const team1 = playerById.get(match.team1_player1_id)?.team ?? "?";
              const team2 = playerById.get(match.team2_player1_id)?.team ?? "?";
              return (
                <div
                  key={match.id}
                  className="rounded-xl bg-white/[0.02] ring-1 ring-white/[0.05] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <TeamFixtureHeading team1={team1} team2={team2} content={content} />
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground">
                      1 game
                    </span>
                  </div>

                  <div className="rounded-lg bg-black/10 ring-1 ring-white/[0.04] p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/70">
                        Final
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div
                        className={`text-right text-[12px] ${team1Win ? "font-bold text-foreground" : "text-muted-foreground"}`}
                      >
                        {playerById.get(match.team1_player1_id)?.name ?? "?"}
                        <br />
                        {playerById.get(match.team1_player2_id)?.name ?? "?"}
                      </div>

                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/60 ring-1 ring-white/5">
                        <span
                          className={`text-base font-bold tabular-nums ${
                            team1Win ? "text-primary" : "text-foreground/70"
                          }`}
                        >
                          {match.team1_games}
                        </span>
                        <span className="text-muted-foreground text-xs">-</span>
                        <span
                          className={`text-base font-bold tabular-nums ${
                            !team1Win ? "text-primary" : "text-foreground/70"
                          }`}
                        >
                          {match.team2_games}
                        </span>
                      </div>

                      <div
                        className={`text-left text-[12px] ${!team1Win ? "font-bold text-foreground" : "text-muted-foreground"}`}
                      >
                        {playerById.get(match.team2_player1_id)?.name ?? "?"}
                        <br />
                        {playerById.get(match.team2_player2_id)?.name ?? "?"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </SectionCard>
  );
});

function TeamFixtureHeading({ team1, team2, content }: { team1: string; team2: string; content: typeof defaultSiteContent }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <TeamBadge team={team1} content={content} />
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">vs</span>
      <TeamBadge team={team2} content={content} />
    </div>
  );
}

function TeamBadge({ team, content }: { team: string; content: typeof defaultSiteContent }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {getTeamLogo(content, team) ? (
        <img
          src={getTeamLogo(content, team)}
          alt={team}
          className="h-5 w-5 object-contain flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="h-5 w-5 rounded-full bg-white/10 flex-shrink-0" />
      )}
      <span className="text-[10px] font-bold uppercase tracking-wide text-foreground truncate">
        {team}
      </span>
    </div>
  );
}
