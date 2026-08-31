import type { Player } from "@/lib/scoring";

export const SEASON5_TIERS = ["M1", "M2", "Star", "Core", "Dev"] as const;
export type Season5Tier = (typeof SEASON5_TIERS)[number];
export type LineupStatus = "ACTIVE" | "SIT_OUT";

export const SEASON5_REQUIRED_ROSTER: Record<Season5Tier, number> = {
  M1: 1,
  M2: 1,
  Star: 2,
  Core: 2,
  Dev: 2,
};

export const SEASON5_REQUIRED_ACTIVE: Record<Season5Tier, number> = {
  M1: 1,
  M2: 1,
  Star: 2,
  Core: 2,
  Dev: 1,
};

const TIER_INDEX = new Map<Season5Tier, number>(SEASON5_TIERS.map((tier, index) => [tier, index]));

export type Season5LedgerEntry = {
  player_id: string;
  team: string;
  official_tier: Season5Tier;
  total_sit_outs: number;
  previous_sit_out_night: string | null;
  current_sit_out_priority: number;
};

export type Season5LineupPlayer = {
  player_id: string;
  official_tier: Season5Tier;
  nightly_playing_tier: Season5Tier;
  lineup_status: LineupStatus;
  promotion_source_tier: Season5Tier | null;
  sort_order: number;
};

export type Season5LineupResult = {
  sitOutPlayerId: string;
  players: Season5LineupPlayer[];
};

export function normalizeSeason5Tier(value: string | null | undefined): Season5Tier | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "m1") return "M1";
  if (normalized === "m2") return "M2";
  if (normalized === "star" || normalized === "stars") return "Star";
  if (normalized === "core" || normalized === "cores") return "Core";
  if (normalized === "dev" || normalized === "developing") return "Dev";
  return null;
}

export function sortSeason5Players(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) =>
      (TIER_INDEX.get(normalizeSeason5Tier(a.category) ?? "Dev") ?? 99) -
        (TIER_INDEX.get(normalizeSeason5Tier(b.category) ?? "Dev") ?? 99) ||
      (a.ranking ?? 99) - (b.ranking ?? 99) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
}

export function getSeason5TierCounts(players: Player[]): Record<Season5Tier, number> {
  const counts = { M1: 0, M2: 0, Star: 0, Core: 0, Dev: 0 } satisfies Record<Season5Tier, number>;
  for (const player of players) {
    const tier = normalizeSeason5Tier(player.category);
    if (tier) counts[tier] += 1;
  }
  return counts;
}

export function validateSeason5Roster(players: Player[]): string[] {
  const issues: string[] = [];
  if (players.length !== 8) issues.push(`Roster must contain exactly 8 players; currently has ${players.length}.`);
  const counts = getSeason5TierCounts(players);
  for (const tier of SEASON5_TIERS) {
    if (counts[tier] !== SEASON5_REQUIRED_ROSTER[tier]) {
      issues.push(`${tier}: ${SEASON5_REQUIRED_ROSTER[tier]} required, ${counts[tier]} assigned.`);
    }
  }
  if (players.some((player) => !normalizeSeason5Tier(player.category))) {
    issues.push("Every player must have an official Season 5 tier.");
  }
  return issues;
}

function compareSitOutPriority(a: Player, b: Player, ledgerByPlayer: Map<string, Season5LedgerEntry>): number {
  const aLedger = ledgerByPlayer.get(a.id);
  const bLedger = ledgerByPlayer.get(b.id);
  const sitOutDifference = (aLedger?.total_sit_outs ?? 0) - (bLedger?.total_sit_outs ?? 0);
  if (sitOutDifference !== 0) return sitOutDifference;

  const aPrevious = aLedger?.previous_sit_out_night ? Date.parse(aLedger.previous_sit_out_night) : Number.NEGATIVE_INFINITY;
  const bPrevious = bLedger?.previous_sit_out_night ? Date.parse(bLedger.previous_sit_out_night) : Number.NEGATIVE_INFINITY;
  if (aPrevious !== bPrevious) return aPrevious - bPrevious;

  return (a.ranking ?? 99) - (b.ranking ?? 99) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

export function selectSeason5SitOutPlayer(players: Player[], ledger: Season5LedgerEntry[]): Player {
  if (players.length === 0) throw new Error("Cannot select a sit-out player from an empty roster.");
  const ledgerByPlayer = new Map(ledger.map((entry) => [entry.player_id, entry]));
  return [...players].sort((a, b) => compareSitOutPriority(a, b, ledgerByPlayer))[0]!;
}

export function getCurrentSitOutPriority(players: Player[], ledger: Season5LedgerEntry[]): Map<string, number> {
  const ledgerByPlayer = new Map(ledger.map((entry) => [entry.player_id, entry]));
  const highestSitOutCount = Math.max(0, ...players.map((player) => ledgerByPlayer.get(player.id)?.total_sit_outs ?? 0));
  return new Map(
    players.map((player) => [
      player.id,
      highestSitOutCount + 1 - (ledgerByPlayer.get(player.id)?.total_sit_outs ?? 0),
    ]),
  );
}

export function generateSeason5Lineup(players: Player[], sitOutPlayerId: string): Season5LineupResult {
  const rosterIssues = validateSeason5Roster(players);
  if (rosterIssues.length > 0) throw new Error(rosterIssues.join(" "));
  if (!players.some((player) => player.id === sitOutPlayerId)) throw new Error("The selected sit-out player is not on this team.");

  const sitOutPlayer = players.find((player) => player.id === sitOutPlayerId)!;
  const sitOutTier = normalizeSeason5Tier(sitOutPlayer.category)!;
  const activePlayers = players.filter((player) => player.id !== sitOutPlayerId);
  const assignments = new Map<string, { nightlyTier: Season5Tier; promotionSourceTier: Season5Tier | null }>();

  for (const player of activePlayers) {
    assignments.set(player.id, {
      nightlyTier: normalizeSeason5Tier(player.category)!,
      promotionSourceTier: null,
    });
  }

  const sitOutIndex = TIER_INDEX.get(sitOutTier)!;
  for (let targetIndex = sitOutIndex; targetIndex < SEASON5_TIERS.length - 1; targetIndex += 1) {
    const sourceTier = SEASON5_TIERS[targetIndex + 1]!;
    const targetTier = SEASON5_TIERS[targetIndex]!;
    const candidate = sortSeason5Players(
      activePlayers.filter((player) => normalizeSeason5Tier(player.category) === sourceTier && assignments.get(player.id)?.nightlyTier === sourceTier),
    )[0];
    if (!candidate) throw new Error(`No ${sourceTier} player is available to promote into ${targetTier}.`);
    assignments.set(candidate.id, { nightlyTier: targetTier, promotionSourceTier: sourceTier });
  }

  const lineupPlayers: Season5LineupPlayer[] = [
    {
      player_id: sitOutPlayer.id,
      official_tier: sitOutTier,
      nightly_playing_tier: sitOutTier,
      lineup_status: "SIT_OUT",
      promotion_source_tier: null,
      sort_order: 0,
    },
    ...sortSeason5Players(activePlayers).map((player, index) => {
      const assignment = assignments.get(player.id)!;
      return {
        player_id: player.id,
        official_tier: normalizeSeason5Tier(player.category)!,
        nightly_playing_tier: assignment.nightlyTier,
        lineup_status: "ACTIVE" as const,
        promotion_source_tier: assignment.promotionSourceTier,
        sort_order: index + 1,
      };
    }),
  ];

  const lineupIssues = validateSeason5Lineup(lineupPlayers);
  if (lineupIssues.length > 0) throw new Error(lineupIssues.join(" "));
  return { sitOutPlayerId, players: lineupPlayers };
}

export function validateSeason5Lineup(players: Season5LineupPlayer[]): string[] {
  const issues: string[] = [];
  if (players.length !== 8) issues.push("Nightly lineup must contain all 8 rostered players.");
  if (players.filter((player) => player.lineup_status === "SIT_OUT").length !== 1) issues.push("Exactly one player must be marked SIT OUT.");
  if (players.filter((player) => player.lineup_status === "ACTIVE").length !== 7) issues.push("Exactly seven players must be active.");

  const activeCounts = { M1: 0, M2: 0, Star: 0, Core: 0, Dev: 0 } satisfies Record<Season5Tier, number>;
  for (const player of players.filter((entry) => entry.lineup_status === "ACTIVE")) activeCounts[player.nightly_playing_tier] += 1;
  for (const tier of SEASON5_TIERS) {
    if (activeCounts[tier] !== SEASON5_REQUIRED_ACTIVE[tier]) {
      issues.push(`Active ${tier} count must be ${SEASON5_REQUIRED_ACTIVE[tier]}; found ${activeCounts[tier]}.`);
    }
  }

  for (const player of players) {
    if (player.lineup_status === "SIT_OUT" && player.nightly_playing_tier !== player.official_tier) {
      issues.push("The sit-out player cannot receive a nightly promotion.");
    }
    if (player.promotion_source_tier) {
      const sourceIndex = TIER_INDEX.get(player.promotion_source_tier);
      const targetIndex = TIER_INDEX.get(player.nightly_playing_tier);
      if (sourceIndex === undefined || targetIndex === undefined || sourceIndex - targetIndex !== 1) {
        issues.push("Every promotion must move up exactly one tier.");
      }
    }
  }
  return issues;
}
