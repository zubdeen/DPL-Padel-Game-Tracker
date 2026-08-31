// Padel tournament scoring logic.
//
// Team points (per match):
//   - Winner gets 3 points; loser gets 0.
//   - Bonus: if the winner wins 6–0, winner gets 4 instead of 3 (loser still 0).
//   - If the match went to tiebreak: winner gets 2, loser gets 1.
//
// Player points (per match):
//   - Each player on a team gets (team_games_for − team_games_against).
//   - Total = sum across all the player's matches / Number of games played.

import { adjustedEliminatorDiffs, type EliminatorMatch } from "@/lib/eliminators";

export type PlayerCategory = "M1" | "M2" | "Star" | "Core" | "Dev";

export type Player = {
  id: string;
  name: string;
  avatar_url?: string | null;
  team?: string | null;
  ranking?: number | null;
  category?: PlayerCategory | string | null;
  is_captain?: boolean | null;
};

export type Match = {
  id: string;
  team1_name?: string | null;
  team2_name?: string | null;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  team1_games: number;
  team2_games: number;
  tie_breaker?: boolean | null;
  played_at: string;
};

export type PlayerStanding = {
  player: Player;
  matches: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  points: number; // average game difference
};

export type TeamStanding = {
  team: string;
  matches: number;
  wins: number;
  losses: number;
  points: number;
  gameDiff: number;
};

/**
 * Award team points for a single match outcome.
 * Returns [winnerPoints, loserPoints].
 */
export function teamPointsFor(
  winnerGames: number,
  loserGames: number,
  tie_breaker: boolean,
): [number, number] {
  if (tie_breaker) return [2, 1];
  if (winnerGames >= 6 && loserGames === 0) return [4, 0];
  return [3, 0];
}

export function computePlayerStandings(
  players: Player[],
  matches: Match[],
  eliminatorMatches: EliminatorMatch[] = [],
): PlayerStanding[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const acc = new Map<string, PlayerStanding>();

  const ensure = (id: string): PlayerStanding => {
    let s = acc.get(id);
    if (!s) {
      const player = byId.get(id) ?? { id, name: "Unknown" };
      s = {
        player,
        matches: 0,
        wins: 0,
        losses: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        points: 0,
      };
      acc.set(id, s);
    }
    return s;
  };

  for (const m of matches) {
    const diff = m.team1_games - m.team2_games;
    const t1 = [m.team1_player1_id, m.team1_player2_id];
    const t2 = [m.team2_player1_id, m.team2_player2_id];

    for (const pid of t1) {
      const s = ensure(pid);
      s.matches += 1;
      s.points += diff;
      s.gamesFor += m.team1_games;
      s.gamesAgainst += m.team2_games;
      if (diff > 0) s.wins += 1;
      else if (diff < 0) s.losses += 1;
    }
    for (const pid of t2) {
      const s = ensure(pid);
      s.matches += 1;
      s.points += -diff;
      s.gamesFor += m.team2_games;
      s.gamesAgainst += m.team1_games;
      if (-diff > 0) s.wins += 1;
      else if (-diff < 0) s.losses += 1;
    }
  }

  for (const m of eliminatorMatches) {
    const { team1Diff, team2Diff } = adjustedEliminatorDiffs(m, byId);
    const rawDiff = m.team1_games - m.team2_games;
    const t1 = [m.team1_player1_id, m.team1_player2_id];
    const t2 = [m.team2_player1_id, m.team2_player2_id];

    for (const pid of t1) {
      const s = ensure(pid);
      s.matches += 1;
      s.points += team1Diff;
      s.gamesFor += m.team1_games;
      s.gamesAgainst += m.team2_games;
      if (rawDiff > 0) s.wins += 1;
      else if (rawDiff < 0) s.losses += 1;
    }
    for (const pid of t2) {
      const s = ensure(pid);
      s.matches += 1;
      s.points += team2Diff;
      s.gamesFor += m.team2_games;
      s.gamesAgainst += m.team1_games;
      if (-rawDiff > 0) s.wins += 1;
      else if (-rawDiff < 0) s.losses += 1;
    }
  }

  for (const p of players) ensure(p.id);
  for (const s of acc.values()) {
    s.points = s.matches > 0 ? s.points / s.matches : 0;
  }

  return [...acc.values()].sort(
    (a, b) => b.points - a.points || b.wins - a.wins || a.player.name.localeCompare(b.player.name),
  );
}

export function computeTeamStandings(players: Player[], matches: Match[]): TeamStanding[] {
  const teamById = new Map(players.map((p) => [p.id, p.team ?? null]));
  const acc = new Map<string, TeamStanding>();

  const ensure = (team: string): TeamStanding => {
    let t = acc.get(team);
    if (!t) {
      t = { team, matches: 0, wins: 0, losses: 0, points: 0, gameDiff: 0 };
      acc.set(team, t);
    }
    return t;
  };

  // Seed every team that has players, so they show up before playing.
  for (const p of players) if (p.team) ensure(p.team);

  for (const m of matches) {
    const team1 = m.team1_name ?? teamById.get(m.team1_player1_id) ?? null;
    const team2 = m.team2_name ?? teamById.get(m.team2_player1_id) ?? null;
    if (!team1 || !team2 || team1 === team2) continue;

    const diff = m.team1_games - m.team2_games;
    const t1 = ensure(team1);
    const t2 = ensure(team2);
    t1.matches += 1;
    t2.matches += 1;
    t1.gameDiff += diff;
    t2.gameDiff += -diff;

    const tb = !!m.tie_breaker;
    if (diff > 0) {
      const [wp, lp] = teamPointsFor(m.team1_games, m.team2_games, tb);
      t1.points += wp;
      t2.points += lp;
      t1.wins += 1;
      t2.losses += 1;
    } else if (diff < 0) {
      const [wp, lp] = teamPointsFor(m.team2_games, m.team1_games, tb);
      t2.points += wp;
      t1.points += lp;
      t2.wins += 1;
      t1.losses += 1;
    }
  }

  return [...acc.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.gameDiff - a.gameDiff ||
      b.wins - a.wins ||
      a.team.localeCompare(b.team),
  );
}
