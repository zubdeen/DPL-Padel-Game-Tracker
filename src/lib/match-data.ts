import { supabase } from "@/integrations/supabase/client";
import type { Match } from "@/lib/scoring";

export const matchSelectWithTeamNames =
  "id, team1_name, team2_name, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_games, team2_games, tie_breaker, forfeited, played_at";

const matchSelectWithoutTeamNames =
  "id, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_games, team2_games, tie_breaker, forfeited, played_at";

const matchSelectWithoutForfeit =
  "id, team1_name, team2_name, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_games, team2_games, tie_breaker, played_at";

const legacyMatchSelect =
  "id, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_games, team2_games, tie_breaker, played_at";

export function isMissingMatchTeamNameColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  const message = maybeError.message ?? "";

  return (
    maybeError.code === "PGRST204" &&
    (message.includes("team1_name") || message.includes("team2_name"))
  );
}

export function isMissingMatchForfeitColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === "PGRST204" && /forfeited/i.test(maybeError.message ?? "");
}

export function withoutMatchTeamNames<T extends Record<string, unknown>>(payload: T) {
  const { team1_name: _team1Name, team2_name: _team2Name, ...legacyPayload } = payload;
  return legacyPayload;
}

export function withoutMatchForfeit<T extends Record<string, unknown>>(payload: T) {
  const { forfeited: _forfeited, ...legacyPayload } = payload;
  return legacyPayload;
}

export async function fetchMatches(): Promise<Match[]> {
  const first = await supabase
    .from("matches")
    .select(matchSelectWithTeamNames)
    .order("played_at", { ascending: false });

  if (!first.error) return (first.data ?? []) as unknown as Match[];
  if (!isMissingMatchTeamNameColumn(first.error) && !isMissingMatchForfeitColumn(first.error)) {
    throw first.error;
  }

  const fallbackSelects = [
    ...(isMissingMatchForfeitColumn(first.error) ? [matchSelectWithoutForfeit] : []),
    ...(isMissingMatchTeamNameColumn(first.error) ? [matchSelectWithoutTeamNames] : []),
    legacyMatchSelect,
  ];
  let lastError = first.error;

  for (const select of fallbackSelects) {
    const fallback = await supabase
      .from("matches")
      .select(select)
      .order("played_at", { ascending: false });
    if (!fallback.error) return (fallback.data ?? []) as unknown as Match[];
    lastError = fallback.error;
  }

  throw lastError;
}
