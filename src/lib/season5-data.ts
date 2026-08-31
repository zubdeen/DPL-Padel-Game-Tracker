import { supabase } from "@/integrations/supabase/client";
import type { Season5LineupPlayer } from "@/lib/season5";

export type LockedSeason5Lineup = {
  id: string;
  team: string;
  night_date: string;
  status: "LOCKED" | "COMPLETED";
  players: Season5LineupPlayer[];
};

export async function fetchLockedSeason5Lineup(team: string, nightDate: string): Promise<LockedSeason5Lineup | null> {
  const { data: night, error: nightError } = await supabase
    .from("season5_lineup_nights")
    .select("id, team, night_date, status")
    .eq("team", team)
    .eq("night_date", nightDate)
    .in("status", ["LOCKED", "COMPLETED"])
    .maybeSingle();
  if (nightError) {
    if (nightError.code === "PGRST205") return null;
    throw nightError;
  }
  if (!night) return null;

  const { data: players, error: playerError } = await supabase
    .from("season5_lineup_players")
    .select("player_id, official_tier, nightly_playing_tier, lineup_status, promotion_source_tier, sort_order")
    .eq("lineup_id", night.id)
    .order("sort_order");
  if (playerError) {
    if (playerError.code === "PGRST205") return null;
    throw playerError;
  }

  return {
    id: night.id,
    team: night.team,
    night_date: night.night_date,
    status: night.status as LockedSeason5Lineup["status"],
    players: (players ?? []) as unknown as Season5LineupPlayer[],
  };
}
