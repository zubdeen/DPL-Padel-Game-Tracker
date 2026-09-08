import type { Player } from "@/lib/scoring";

export type EliminatorMatch = {
  id: string;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  team1_games: number;
  team2_games: number;
  played_at: string;
};

export type EliminatorStanding = {
  playerId: string;
  matches: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  gameDiff: number;
  averageGameDiff: number;
};

export const ELIMINATOR_CATEGORY_HANDICAP: Record<string, number> = {
  M1: 4,
  m1: 4,
  M2: 3,
  m2: 3,
  Star: 2,
  star: 2,
  Core: 1,
  core: 1,
  Dev: 0,
  dev: 0,
};

type IndividualPointMatch = Pick<
  EliminatorMatch,
  | "team1_player1_id"
  | "team1_player2_id"
  | "team2_player1_id"
  | "team2_player2_id"
  | "team1_games"
  | "team2_games"
>;

function tierHandicap(tier?: string | null): number {
  return ELIMINATOR_CATEGORY_HANDICAP[String(tier ?? "Dev")] ?? 0;
}

function pairHandicap(tierByPlayerId: ReadonlyMap<string, string | null | undefined>, playerIds: string[]) {
  return playerIds.reduce((total, playerId) => total + tierHandicap(tierByPlayerId.get(playerId)), 0);
}

/**
 * Apply the shared individual-player handicap calculation.
 * Both league and eliminator matches pass the player's official tier.
 */
export function adjustedPlayerDiffs(
  match: IndividualPointMatch,
  tierByPlayerId: ReadonlyMap<string, string | null | undefined>,
) {
  const team1Ids = [match.team1_player1_id, match.team1_player2_id];
  const team2Ids = [match.team2_player1_id, match.team2_player2_id];
  const team1Handicap = pairHandicap(tierByPlayerId, team1Ids);
  const team2Handicap = pairHandicap(tierByPlayerId, team2Ids);
  const rawTeam1Diff = match.team1_games - match.team2_games;
  const handicapAdjustment = team2Handicap - team1Handicap;

  return {
    team1Diff: rawTeam1Diff + handicapAdjustment,
    team2Diff: -rawTeam1Diff - handicapAdjustment,
    team1Handicap,
    team2Handicap,
    fixtureDifficulty: Math.abs(team1Handicap - team2Handicap),
  };
}

export function adjustedEliminatorDiffs(match: EliminatorMatch, playerById: Map<string, Player>) {
  return adjustedPlayerDiffs(
    match,
    new Map(
      [...playerById.entries()].map(([playerId, player]) => [playerId, player.category ?? "Dev"]),
    ),
  );
}

export function computeEliminatorStandings(
  matches: EliminatorMatch[],
  players: Player[] = [],
): EliminatorStanding[] {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const acc = new Map<string, EliminatorStanding>();

  const ensure = (playerId: string): EliminatorStanding => {
    let standing = acc.get(playerId);
    if (!standing) {
      standing = {
        playerId,
        matches: 0,
        wins: 0,
        losses: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        gameDiff: 0,
        averageGameDiff: 0,
      };
      acc.set(playerId, standing);
    }
    return standing;
  };

  for (const match of matches) {
    const { team1Diff, team2Diff } = adjustedEliminatorDiffs(match, playerById);
    const rawTeam1Diff = match.team1_games - match.team2_games;
    const rawTeam2Diff = -rawTeam1Diff;

    for (const playerId of [match.team1_player1_id, match.team1_player2_id]) {
      const standing = ensure(playerId);
      standing.matches += 1;
      standing.gamesFor += match.team1_games;
      standing.gamesAgainst += match.team2_games;
      standing.gameDiff += team1Diff;
      if (rawTeam1Diff > 0) standing.wins += 1;
      else if (rawTeam1Diff < 0) standing.losses += 1;
    }

    for (const playerId of [match.team2_player1_id, match.team2_player2_id]) {
      const standing = ensure(playerId);
      standing.matches += 1;
      standing.gamesFor += match.team2_games;
      standing.gamesAgainst += match.team1_games;
      standing.gameDiff += team2Diff;
      if (rawTeam2Diff > 0) standing.wins += 1;
      else if (rawTeam2Diff < 0) standing.losses += 1;
    }
  }

  for (const standing of acc.values()) {
    standing.averageGameDiff = standing.matches > 0 ? standing.gameDiff / standing.matches : 0;
  }

  return [...acc.values()].sort(
    (a, b) => b.averageGameDiff - a.averageGameDiff || b.gameDiff - a.gameDiff || b.wins - a.wins,
  );
}
