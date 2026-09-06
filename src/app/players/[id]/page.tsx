"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, CalendarDays, Crown, ShieldCheck, Star, TrendingUp, Users } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { GlobalFooter } from "@/components/GlobalFooter";
import { fetchPlayers } from "@/lib/player-data";
import { fetchMatches } from "@/lib/match-data";
import { fetchEliminatorMatches } from "@/lib/eliminator-data";
import { computePlayerStandings, type Match, type Player } from "@/lib/scoring";
import { defaultSiteContent, getTeamLogo, useSiteContent } from "@/lib/site-content";

function getInitials(name: string) {
  return name.split(/[\s.]+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function formatPoints(points: number) {
  const rounded = Math.round(points * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getMatchSide(match: Match, playerId: string) {
  if ([match.team1_player1_id, match.team1_player2_id].includes(playerId)) return 1;
  if ([match.team2_player1_id, match.team2_player2_id].includes(playerId)) return 2;
  return null;
}

function getBestPartnership(playerId: string, matches: Match[], players: Player[]) {
  const playerById = new Map(players.map((candidate) => [candidate.id, candidate]));
  const partnerships = new Map<string, { matches: number; wins: number }>();

  for (const match of matches) {
    const side = getMatchSide(match, playerId);
    if (!side) continue;
    const teammates = side === 1 ? [match.team1_player1_id, match.team1_player2_id] : [match.team2_player1_id, match.team2_player2_id];
    const partnerId = teammates.find((id) => id !== playerId);
    if (!partnerId) continue;
    const record = partnerships.get(partnerId) ?? { matches: 0, wins: 0 };
    record.matches += 1;
    if ((side === 1 && match.team1_games > match.team2_games) || (side === 2 && match.team2_games > match.team1_games)) record.wins += 1;
    partnerships.set(partnerId, record);
  }

  const best = [...partnerships.entries()].sort(([, a], [, b]) => b.wins - a.wins || b.matches - a.matches)[0];
  if (!best) return { name: "No partnership yet", record: "" };
  return { name: playerById.get(best[0])?.name ?? "Unknown player", record: `${best[1].wins}W–${best[1].matches - best[1].wins}L` };
}

function getLongestWinningStreak(playerId: string, matches: Match[]) {
  let current = 0;
  let longest = 0;
  for (const match of [...matches].filter((candidate) => getMatchSide(candidate, playerId)).sort((a, b) => a.played_at.localeCompare(b.played_at))) {
    const side = getMatchSide(match, playerId);
    const won = side === 1 ? match.team1_games > match.team2_games : match.team2_games > match.team1_games;
    current = won ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

export default function PlayerDetailsPage() {
  const params = useParams<{ id: string }>();
  const playerId = params?.id ?? "";
  const { data: content } = useSiteContent();
  const players = useQuery<Player[]>({ queryKey: ["players"], queryFn: fetchPlayers, staleTime: 5 * 60 * 1000 });
  const matches = useQuery<Match[]>({ queryKey: ["matches"], queryFn: fetchMatches, staleTime: 5 * 60 * 1000 });
  const eliminatorMatches = useQuery({ queryKey: ["eliminator_matches"], queryFn: fetchEliminatorMatches, staleTime: 5 * 60 * 1000 });
  const player = players.data?.find((candidate) => candidate.id === playerId);
  const overallStanding = useMemo(() => player ? computePlayerStandings(players.data ?? [], matches.data ?? [], eliminatorMatches.data ?? []).find((standing) => standing.player.id === playerId) : null, [eliminatorMatches.data, matches.data, player, playerId, players.data]);
  const leagueStanding = useMemo(() => player ? computePlayerStandings(players.data ?? [], matches.data ?? []).find((standing) => standing.player.id === playerId) : null, [matches.data, player, playerId, players.data]);
  const tierRanking = useMemo(() => {
    if (!player) return null;
    const tierStandings = computePlayerStandings(players.data ?? [], matches.data ?? [], eliminatorMatches.data ?? []).filter((standing) => standing.player.category === player.category);
    const position = tierStandings.findIndex((standing) => standing.player.id === playerId);
    return position >= 0 ? position + 1 : null;
  }, [eliminatorMatches.data, matches.data, player, playerId, players.data]);
  const playerMatches = useMemo(() => (matches.data ?? []).filter((match) => [match.team1_player1_id, match.team1_player2_id, match.team2_player1_id, match.team2_player2_id].includes(playerId)).sort((a, b) => b.played_at.localeCompare(a.played_at)).slice(0, 12), [matches.data, playerId]);
  const site = content ?? defaultSiteContent;
  const teamLogo = player?.team ? getTeamLogo(site, player.team) : "";
  const isLoading = players.isLoading || matches.isLoading || eliminatorMatches.isLoading;

  if (isLoading) return <PageShell><p className="py-10 text-center text-[11px] text-muted-foreground">Loading player profile…</p></PageShell>;
  if (!player || !overallStanding) return <PageShell><SectionCard title="Player Not Found" icon={<Users className="h-4 w-4 text-primary" />}><p className="text-[11px] leading-relaxed text-muted-foreground">This player is not available in the current roster.</p><Link href="/?tab=players" className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground">Back to players</Link></SectionCard></PageShell>;

  const winRate = overallStanding.matches ? (overallStanding.wins / overallStanding.matches) * 100 : 0;
  const gameDifference = overallStanding.gamesFor - overallStanding.gamesAgainst;
  const bestPartnership = getBestPartnership(playerId, matches.data ?? [], players.data ?? []);
  const longestWinningStreak = getLongestWinningStreak(playerId, matches.data ?? []);
  const metrics = [
    ["Overall games", String(overallStanding.matches)],
    ["Wins", String(overallStanding.wins)],
    ["Losses", String(overallStanding.losses)],
    ["Win rate", `${winRate.toFixed(1)}%`],
    ["Game difference", `${gameDifference > 0 ? "+" : ""}${gameDifference}`],
    ["Average rating", formatPoints(overallStanding.points)],
    ["Best partnership", bestPartnership.name],
    ["Longest winning streak", `${longestWinningStreak} match${longestWinningStreak === 1 ? "" : "es"}`],
    ["League record", leagueStanding ? `${leagueStanding.wins}–${leagueStanding.losses}` : "0–0"],
  ];

  return <PageShell>
    <SectionCard title="Player Details" icon={<ShieldCheck className="h-4 w-4 text-primary" />}>
        <div className="space-y-4">
          <div className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-primary/10 via-primary/[0.04] to-transparent p-4 text-center ring-1 ring-primary/15">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-background/70 ring-2 ring-primary/35">{player.avatar_url ? <img src={player.avatar_url} alt={player.name} className="h-full w-full object-cover" /> : teamLogo ? <img src={teamLogo} alt="" className="h-full w-full object-contain p-3" /> : <span className="text-xl font-bold text-foreground">{getInitials(player.name)}</span>}</div>
            <div className="mt-3"><div className="flex items-center justify-center gap-1.5"><h1 className="text-lg font-bold text-foreground">{player.name}</h1>{player.is_captain ? <Crown className="h-4 w-4 shrink-0 fill-primary text-primary" /> : null}</div><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-primary">{player.team ?? "Unassigned"}</p><p className="mt-1 text-[10px] text-muted-foreground">Official tier: {player.category ?? "Not assigned"}</p></div>
            <div className="mt-3 rounded-xl bg-white/[0.03] px-5 py-2.5 ring-1 ring-white/[0.06]"><p className="text-[13px] font-bold text-foreground">{tierRanking ? `#${tierRanking}` : "—"}</p><p className="mt-0.5 text-[8px] uppercase tracking-wide text-muted-foreground">Tier ranking</p></div>
          </div>
        </div>
    </SectionCard>

    <SectionCard title="Season Statistics" icon={<BarChart3 className="h-4 w-4 text-primary" />}>
      <div className="grid grid-cols-3 gap-2">{metrics.map(([label, value]) => <div key={label} className="rounded-xl bg-white/[0.03] p-2.5 text-center ring-1 ring-white/[0.06]"><p className="text-[13px] font-bold tabular-nums text-foreground">{value}</p><p className="mt-0.5 text-[8px] uppercase tracking-wide text-muted-foreground">{label}</p></div>)}</div>
      <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.06] p-3"><div className="mb-1.5 flex items-center gap-1.5 text-primary"><TrendingUp className="h-3.5 w-3.5" /><p className="text-[10px] font-bold uppercase tracking-widest">Rating method</p></div><p className="text-[10px] leading-relaxed text-muted-foreground">Rating is the average game difference per game. Official tier and nightly promoted tier are separate; promotions never change this player’s official roster tier.</p></div>
    </SectionCard>

    <SectionCard title="Recorded Match History" icon={<CalendarDays className="h-4 w-4 text-primary" />}>
      <div className="space-y-2">{playerMatches.length ? playerMatches.map((match) => <MatchHistoryRow key={match.id} match={match} player={player} />) : <p className="py-6 text-center text-[11px] text-muted-foreground">No recorded league games yet.</p>}</div>
    </SectionCard>

    <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground"><Star className="h-3 w-3 text-primary" /> Select the player from the rankings page any time to return here.</div>
  </PageShell>;
}

function MatchHistoryRow({ match, player }: { match: Match; player: Player }) {
  const isTeam1 = match.team1_player1_id === player.id || match.team1_player2_id === player.id;
  const won = isTeam1 ? match.team1_games > match.team2_games : match.team2_games > match.team1_games;
  const team = isTeam1 ? match.team1_name ?? "Team 1" : match.team2_name ?? "Team 2";
  const opponent = isTeam1 ? match.team2_name ?? "Opponent" : match.team1_name ?? "Opponent";
  const score = isTeam1 ? `${match.team1_games}–${match.team2_games}` : `${match.team2_games}–${match.team1_games}`;
  return <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] p-2.5 ring-1 ring-white/[0.06]"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold ${won ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>{won ? "W" : "L"}</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-foreground">{team} vs {opponent}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{new Date(match.played_at).toLocaleDateString()} {match.tie_breaker ? "· Tiebreak" : ""}</p></div><span className="font-mono text-[12px] font-bold text-primary">{score}</span></div>;
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background flex justify-center"><main className="w-full max-w-[420px] relative"><div className="px-5 pb-10 pt-8"><Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"><ArrowLeft className="h-3 w-3" /> Back to players</Link>{children}<GlobalFooter /></div></main></div>;
}
