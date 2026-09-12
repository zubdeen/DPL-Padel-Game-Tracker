// Verification script for the scoring logic.
// Run with: bun run src/lib/scoring.verify.ts
import {
  computePlayerStandings,
  computeTeamStandings,
  teamPointsFor,
  type Match,
  type Player,
} from "./scoring";
import {
  adjustedEliminatorDiffs,
  computeEliminatorStandings,
  type EliminatorMatch,
} from "./eliminators";

const players: Player[] = [
  { id: "p1", name: "Alice", team: "T1" },
  { id: "p2", name: "Bob", team: "T1" },
  { id: "p3", name: "Carol", team: "T2" },
  { id: "p4", name: "Dan", team: "T2" },
  { id: "p5", name: "Eve", team: "T3" },
];

const matches: Match[] = [
  // Match 1: T1 wins 5-2 (normal) -> T1 +3, T2 +0; players A/B +3 each, C/D -3
  {
    id: "m1",
    team1_player1_id: "p1",
    team1_player2_id: "p2",
    team2_player1_id: "p3",
    team2_player2_id: "p4",
    team1_games: 5,
    team2_games: 2,
    tie_breaker: false,
    played_at: "2025-01-01T00:00:00Z",
  },
  // Match 2: T1 loses 2-5 -> T2 +3, T1 +0; A/B -3, C/D +3
  {
    id: "m2",
    team1_player1_id: "p1",
    team1_player2_id: "p2",
    team2_player1_id: "p3",
    team2_player2_id: "p4",
    team1_games: 2,
    team2_games: 5,
    tie_breaker: false,
    played_at: "2025-01-02T00:00:00Z",
  },
  // Match 3: T1 wins 5-0 (bonus) -> T1 +4, T2 +0
  {
    id: "m3",
    team1_player1_id: "p1",
    team1_player2_id: "p2",
    team2_player1_id: "p3",
    team2_player2_id: "p4",
    team1_games: 5,
    team2_games: 0,
    tie_breaker: false,
    played_at: "2025-01-03T00:00:00Z",
  },
  // Match 4: tiebreak, T2 wins 5-4 -> T2 +2, T1 +1
  {
    id: "m4",
    team1_player1_id: "p1",
    team1_player2_id: "p2",
    team2_player1_id: "p3",
    team2_player2_id: "p4",
    team1_games: 4,
    team2_games: 5,
    tie_breaker: true,
    played_at: "2025-01-04T00:00:00Z",
  },
];

function assertEq(label: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(
    `${ok ? "PASS" : "FAIL"} ${label}: got=${JSON.stringify(got)} expected=${JSON.stringify(expected)}`,
  );
  if (!ok) process.exitCode = 1;
}

assertEq("teamPointsFor 5-1", teamPointsFor(5, 1, false), [3, 0]);
assertEq("teamPointsFor 5-2", teamPointsFor(5, 2, false), [3, 0]);
assertEq("teamPointsFor 5-3", teamPointsFor(5, 3, false), [3, 0]);
assertEq("teamPointsFor 5-0 bonus", teamPointsFor(5, 0, false), [4, 0]);
assertEq("teamPointsFor tiebreak", teamPointsFor(5, 4, true), [2, 1]);

const ts = computeTeamStandings(players, matches);
const t1 = ts.find((t) => t.team === "T1")!;
const t2 = ts.find((t) => t.team === "T2")!;
// T1 points: +3 (m1) +0 (m2) +4 (m3) +1 (m4 tb loss) = 8
// T2 points: +0 +3 +0 +2 = 5
assertEq("Team T1 points", t1.points, 8);
assertEq("Team T2 points", t2.points, 5);
assertEq("Team T1 W-L", [t1.wins, t1.losses], [2, 2]);

// Player points: each match night is averaged, then the nights are added
// A,B: +3 -3 +5 -1 = 4
// C,D: -3 +3 -5 +1 = -4
const ps = computePlayerStandings(players, matches);
assertEq("Alice points", ps.find((s) => s.player.id === "p1")!.points, 4);
assertEq("Carol points", ps.find((s) => s.player.id === "p3")!.points, -4);

const matchNightAverageMatches: Match[] = [
  {
    id: "n1",
    team1_player1_id: "p1",
    team1_player2_id: "p2",
    team2_player1_id: "p3",
    team2_player2_id: "p4",
    team1_games: 5,
    team2_games: 3,
    tie_breaker: false,
    played_at: "2025-02-01T00:00:00Z",
  },
  {
    id: "n2",
    team1_player1_id: "p1",
    team1_player2_id: "p2",
    team2_player1_id: "p3",
    team2_player2_id: "p4",
    team1_games: 5,
    team2_games: 2,
    tie_breaker: false,
    played_at: "2025-02-01T00:00:00Z",
  },
  {
    id: "n3",
    team1_player1_id: "p1",
    team1_player2_id: "p2",
    team2_player1_id: "p3",
    team2_player2_id: "p4",
    team1_games: 5,
    team2_games: 3,
    tie_breaker: false,
    played_at: "2025-02-08T00:00:00Z",
  },
  {
    id: "n4",
    team1_player1_id: "p1",
    team1_player2_id: "p2",
    team2_player1_id: "p3",
    team2_player2_id: "p4",
    team1_games: 5,
    team2_games: 4,
    tie_breaker: false,
    played_at: "2025-02-08T00:00:00Z",
  },
];
const matchNightAverage = computePlayerStandings(players, matchNightAverageMatches);
assertEq(
  "Average game difference across matches",
  matchNightAverage.find((s) => s.player.id === "p1")!.points,
  2,
);

const tieredPlayers: Player[] = [
  { id: "tier-m1", name: "Official M1", category: "M1" },
  { id: "tier-star", name: "Official Star", category: "Star" },
  { id: "tier-core", name: "Official Core", category: "Core" },
  { id: "tier-dev", name: "Official Dev", category: "Dev" },
];
const tieredMatch: Match = {
  id: "tiered-match",
  team1_player1_id: "tier-m1",
  team1_player2_id: "tier-star",
  team2_player1_id: "tier-core",
  team2_player2_id: "tier-dev",
  team1_games: 5,
  team2_games: 3,
  tie_breaker: false,
  played_at: "2025-02-15T00:00:00Z",
};
const officialTierStandings = computePlayerStandings(tieredPlayers, [tieredMatch]);
// Raw difference is +2. Official handicaps are M1 + Star = 6 versus Core + Dev = 1,
// so the active pair receives -3, regardless of any nightly promotion.
assertEq(
  "League scores use official player tiers",
  officialTierStandings.find((s) => s.player.id === "tier-m1")!.points,
  -3,
);
assertEq(
  "Opposing league scores use official player tiers",
  officialTierStandings.find((s) => s.player.id === "tier-core")!.points,
  3,
);

const substitutionMatches: Match[] = [
  {
    id: "s1",
    team1_name: "T1",
    team2_name: "T2",
    team1_player1_id: "p5",
    team1_player2_id: "p2",
    team2_player1_id: "p3",
    team2_player2_id: "p4",
    team1_games: 5,
    team2_games: 3,
    tie_breaker: false,
    played_at: "2025-01-05T00:00:00Z",
  },
];
const subst = computeTeamStandings(players, substitutionMatches);
assertEq("Substitute counts for selected team", subst.find((t) => t.team === "T1")!.points, 3);
assertEq(
  "Substitute's roster team does not get match",
  subst.find((t) => t.team === "T3")!.matches,
  0,
);

const eliminatorPlayers: Player[] = [
  { id: "m1", name: "M1", category: "M1" },
  { id: "m2", name: "M2", category: "M2" },
  { id: "star", name: "Star", category: "Star" },
  { id: "dev", name: "Dev", category: "Dev" },
];
const eliminatorMatch: EliminatorMatch = {
  id: "e1",
  team1_player1_id: "m1",
  team1_player2_id: "m2",
  team2_player1_id: "star",
  team2_player2_id: "dev",
  team1_games: 5,
  team2_games: 3,
  played_at: "2025-03-01T00:00:00Z",
};
const eliminatorById = new Map(eliminatorPlayers.map((p) => [p.id, p]));
const eliminatorDiffs = adjustedEliminatorDiffs(eliminatorMatch, eliminatorById);
assertEq("Eliminator stronger pair adjustment", eliminatorDiffs.team1Diff, -3);
assertEq("Eliminator weaker pair adjustment", eliminatorDiffs.team2Diff, 3);

const combinedStandings = computePlayerStandings(eliminatorPlayers, [], [eliminatorMatch]);
assertEq(
  "Eliminators feed overall player standings",
  combinedStandings.find((s) => s.player.id === "m1")!.points,
  -3,
);
const leagueEquivalentStandings = computePlayerStandings(eliminatorPlayers, [eliminatorMatch]);
assertEq(
  "League and eliminator individual scoring share the same calculation",
  leagueEquivalentStandings.find((s) => s.player.id === "m1")!.points,
  -3,
);

const eliminatorStandings = computeEliminatorStandings([eliminatorMatch], eliminatorPlayers);
assertEq(
  "Eliminator standings use adjusted points",
  eliminatorStandings.find((s) => s.playerId === "star")!.gameDiff,
  3,
);

const forfeitedMatch: Match = {
  id: "forfeit-1",
  team1_name: "T1",
  team2_name: "T2",
  team1_player1_id: "p1",
  team1_player2_id: "p2",
  team2_player1_id: "p3",
  team2_player2_id: "p4",
  team1_games: 5,
  team2_games: 0,
  tie_breaker: false,
  forfeited: true,
  played_at: "2025-04-01T00:00:00Z",
};
const forfeitTeamStandings = computeTeamStandings(players, [forfeitedMatch]);
assertEq("Forfeit winner gets team points", forfeitTeamStandings.find((s) => s.team === "T1")!.points, 4);
assertEq("Forfeit loser gets no team points", forfeitTeamStandings.find((s) => s.team === "T2")!.points, 0);
const forfeitPlayerStandings = computePlayerStandings(players, [forfeitedMatch]);
assertEq("Forfeit does not count for player matches", forfeitPlayerStandings.find((s) => s.player.id === "p1")!.matches, 0);
assertEq("Forfeit does not change player rating", forfeitPlayerStandings.find((s) => s.player.id === "p1")!.points, 0);
