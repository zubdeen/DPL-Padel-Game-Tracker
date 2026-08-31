import { supabase } from "@/integrations/supabase/client";
import type { Player } from "@/lib/scoring";

const FULL_PLAYER_FIELDS = "id, name, avatar_url, team, ranking, category, is_captain";
const LEGACY_PLAYER_FIELDS = "id, name, team, ranking, category, is_captain";

export function isMissingPlayerAvatarColumn(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(
    error &&
      (error.code === "42703" || /column .*avatar_url.* does not exist/i.test(error.message ?? "")),
  );
}

export async function fetchPlayers(): Promise<Player[]> {
  const full = await supabase
    .from("players")
    .select(FULL_PLAYER_FIELDS)
    .order("team")
    .order("ranking", { ascending: true, nullsFirst: false })
    .order("name");

  if (!full.error) return (full.data ?? []) as unknown as Player[];
  if (!isMissingPlayerAvatarColumn(full.error)) throw full.error;

  const legacy = await supabase
    .from("players")
    .select(LEGACY_PLAYER_FIELDS)
    .order("team")
    .order("ranking", { ascending: true, nullsFirst: false })
    .order("name");
  if (legacy.error) throw legacy.error;
  return ((legacy.data ?? []) as unknown as Player[]).map((player) => ({ ...player, avatar_url: null }));
}
