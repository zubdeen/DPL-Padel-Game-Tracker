"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarDays, Check, LockKeyhole, RefreshCw, ShieldCheck, Users } from "lucide-react";
import type { Player } from "@/lib/scoring";
import { fetchPlayers } from "@/lib/player-data";
import {
  SEASON5_REQUIRED_ACTIVE,
  SEASON5_REQUIRED_ROSTER,
  SEASON5_TIERS,
  generateSeason5Lineup,
  getCurrentSitOutPriority,
  getSeason5TierCounts,
  normalizeSeason5Tier,
  selectSeason5SitOutPlayer,
  sortSeason5Players,
  validateSeason5Lineup,
  validateSeason5Roster,
  type Season5LedgerEntry,
  type Season5LineupPlayer,
  type Season5Tier,
} from "@/lib/season5";

const QUERY_STALE_MS = 1000 * 60 * 5;

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    const details = "details" in error && typeof error.details === "string" ? ` ${error.details}` : "";
    const hint = "hint" in error && typeof error.hint === "string" ? ` ${error.hint}` : "";
    return `${error.message}${details}${hint}`;
  }
  return "Unable to save the night.";
}

function getNightlyTierOptions(officialTier: Season5Tier): Season5Tier[] {
  switch (officialTier) {
    case "M1":
      return ["M1"];
    case "M2":
      return ["M2", "M1"];
    case "Star":
      return ["Star", "M2"];
    case "Core":
      return ["Core", "Star"];
    case "Dev":
      return ["Dev", "Core"];
  }
}

type LineupNight = {
  id: string;
  team: string;
  night_date: string;
  status: "DRAFT" | "LOCKED" | "COMPLETED";
  exception_reason: string | null;
  locked_at: string | null;
  completed_at: string | null;
};

type LineupRecord = Season5LineupPlayer & { lineup_id: string };

export function Season5Panel() {
  const queryClient = useQueryClient();
  const players = useQuery<Player[]>({
    queryKey: ["players"],
    staleTime: QUERY_STALE_MS,
    queryFn: fetchPlayers,
  });

  const teams = useMemo(
    () => Array.from(new Set((players.data ?? []).flatMap((player) => (player.team ? [player.team] : [])))).sort(),
    [players.data],
  );
  const [selectedTeam, setSelectedTeam] = useState("");
  const [nightDate, setNightDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sitOutOverride, setSitOutOverride] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [manualNightlyTiers, setManualNightlyTiers] = useState<Record<string, Season5Tier>>({});
  const [busy, setBusy] = useState<"complete" | null>(null);

  const activeTeam = selectedTeam || teams[0] || "";
  const roster = useMemo(() => (players.data ?? []).filter((player) => player.team === activeTeam), [activeTeam, players.data]);
  const rosterIssues = useMemo(() => validateSeason5Roster(roster), [roster]);
  const tierCounts = useMemo(() => getSeason5TierCounts(roster), [roster]);

  const ledger = useQuery<Season5LedgerEntry[]>({
    queryKey: ["season5_ledger", activeTeam],
    enabled: Boolean(activeTeam),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("season5_sit_out_ledger")
        .select("player_id, team, official_tier, total_sit_outs, previous_sit_out_night, current_sit_out_priority")
        .eq("team", activeTeam)
        .order("total_sit_outs")
        .order("previous_sit_out_night", { ascending: true, nullsFirst: true })
        .order("player_id");
      if (error) throw error;
      return (data ?? []) as unknown as Season5LedgerEntry[];
    },
  });

  const night = useQuery<LineupNight | null>({
    queryKey: ["season5_lineup_night", activeTeam, nightDate],
    enabled: Boolean(activeTeam && nightDate),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("season5_lineup_nights")
        .select("id, team, night_date, status, exception_reason, locked_at, completed_at")
        .eq("team", activeTeam)
        .eq("night_date", nightDate)
        .maybeSingle();
      if (error) throw error;
      return (data as LineupNight | null) ?? null;
    },
  });

  const lineupPlayers = useQuery<LineupRecord[]>({
    queryKey: ["season5_lineup_players", night.data?.id],
    enabled: Boolean(night.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("season5_lineup_players")
        .select("lineup_id, player_id, official_tier, nightly_playing_tier, lineup_status, promotion_source_tier, sort_order")
        .eq("lineup_id", night.data!.id)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as LineupRecord[];
    },
  });

  const playerById = useMemo(() => new Map(roster.map((player) => [player.id, player])), [roster]);
  const ledgerByPlayer = useMemo(() => new Map((ledger.data ?? []).map((entry) => [entry.player_id, entry])), [ledger.data]);
  const priority = useMemo(() => getCurrentSitOutPriority(roster, ledger.data ?? []), [ledger.data, roster]);
  const recommendedSitOut = useMemo(() => {
    if (!roster.length) return null;
    try {
      return selectSeason5SitOutPlayer(roster, ledger.data ?? []);
    } catch {
      return null;
    }
  }, [ledger.data, roster]);
  const selectedSitOutId = sitOutOverride || recommendedSitOut?.id || "";
  useEffect(() => {
    if (!selectedSitOutId || rosterIssues.length) {
      setManualNightlyTiers({});
      return;
    }
    try {
      const source = lineupPlayers.data?.length
        ? lineupPlayers.data
        : generateSeason5Lineup(roster, selectedSitOutId).players;
      const nextDraft = Object.fromEntries(
        source
          .filter((player) => player.lineup_status === "ACTIVE")
          .map((player) => [player.player_id, player.nightly_playing_tier]),
      ) as Record<string, Season5Tier>;
      setManualNightlyTiers(nextDraft);
    } catch {
      setManualNightlyTiers({});
    }
  }, [lineupPlayers.data, roster, rosterIssues.length, selectedSitOutId]);
  const previewPlayers = useMemo(() => {
    if (!selectedSitOutId || rosterIssues.length) return [];
    try {
      return generateSeason5Lineup(
        roster,
        selectedSitOutId,
        new Map(Object.entries(manualNightlyTiers) as [string, Season5Tier][]),
      ).players;
    } catch {
      return [];
    }
  }, [manualNightlyTiers, roster, rosterIssues.length, selectedSitOutId]);
  const rolePreviewPlayers = useMemo(() => {
    if (!selectedSitOutId || rosterIssues.length) return [];
    try {
      const basePlayers = generateSeason5Lineup(roster, selectedSitOutId).players;
      return basePlayers.map((player) => player.lineup_status === "ACTIVE"
        ? { ...player, nightly_playing_tier: manualNightlyTiers[player.player_id] ?? player.nightly_playing_tier }
        : player);
    } catch {
      return [];
    }
  }, [manualNightlyTiers, roster, rosterIssues.length, selectedSitOutId]);
  const selectedLedger = ledgerByPlayer.get(selectedSitOutId);
  const hasUnservedPlayer = roster.some((player) => (ledgerByPlayer.get(player.id)?.total_sit_outs ?? 0) === 0);
  const needsException = Boolean(selectedLedger && selectedLedger.total_sit_outs >= 2 && hasUnservedPlayer);
  const activePreviewPlayers = rolePreviewPlayers.filter((player) => player.lineup_status === "ACTIVE");
  const sitOutPreviewPlayer = rolePreviewPlayers.find((player) => player.lineup_status === "SIT_OUT");
  const updateNightlyTier = (playerId: string, nightlyTier: Season5Tier) => {
    setManualNightlyTiers((current) => ({ ...current, [playerId]: nightlyTier }));
  };

  const refreshSeason5 = () => {
    void queryClient.invalidateQueries({ queryKey: ["season5_ledger", activeTeam] });
    void queryClient.invalidateQueries({ queryKey: ["season5_lineup_night", activeTeam, nightDate] });
    void queryClient.invalidateQueries({ queryKey: ["season5_lineup_players"] });
  };

  const ensureLedger = async () => {
    const rows = roster.map((player) => ({
      team: activeTeam,
      player_id: player.id,
      official_tier: normalizeSeason5Tier(player.category) ?? "Dev",
      total_sit_outs: ledgerByPlayer.get(player.id)?.total_sit_outs ?? 0,
      previous_sit_out_night: ledgerByPlayer.get(player.id)?.previous_sit_out_night ?? null,
      current_sit_out_priority: priority.get(player.id) ?? 1,
    }));
    const { error } = await supabase.from("season5_sit_out_ledger").upsert(rows as never, { onConflict: "team,player_id" });
    if (error) throw error;
  };

  const saveNight = async () => {
    if (!activeTeam) return toast.error("Choose a team first.");
    if (rosterIssues.length) return toast.error("Fix the roster structure before generating a lineup.");
    if (!selectedSitOutId) return toast.error("Choose a sit-out player.");
    if (needsException && !exceptionReason.trim()) return toast.error("An authorized exception reason is required for a third sit-out.");
    if (night.data?.status === "LOCKED" || night.data?.status === "COMPLETED") return toast.error("This night is already locked.");

    let lineupId = night.data?.id;
    setBusy("complete");
    try {
      const generated = generateSeason5Lineup(
        roster,
        selectedSitOutId,
        new Map(Object.entries(manualNightlyTiers) as [string, Season5Tier][]),
      );
      const lineupIssues = validateSeason5Lineup(generated.players);
      if (lineupIssues.length > 0) {
        throw new Error(`Adjust Nightly Playing Roles before completing the night: ${lineupIssues.join(" ")}`);
      }
      await ensureLedger();
      if (!lineupId) {
        const { data, error } = await supabase
          .from("season5_lineup_nights")
          .insert({ team: activeTeam, night_date: nightDate, status: "DRAFT", exception_reason: exceptionReason.trim() || null })
          .select("id")
          .single();
        if (error) throw error;
        lineupId = data.id;
      } else {
        const { error } = await supabase
          .from("season5_lineup_nights")
          .update({ status: "DRAFT", exception_reason: exceptionReason.trim() || null })
          .eq("id", lineupId);
        if (error) throw error;
        const { error: deleteError } = await supabase.from("season5_lineup_players").delete().eq("lineup_id", lineupId);
        if (deleteError) throw deleteError;
      }
      if (!lineupId) throw new Error("Unable to create or load the lineup night.");
      const finalLineupId = lineupId;
      const { error } = await supabase.from("season5_lineup_players").insert(
        generated.players.map((player) => ({ ...player, lineup_id: finalLineupId })),
      );
      if (error) throw error;
      const { error: lockError } = await supabase.from("season5_lineup_nights").update({ status: "LOCKED" }).eq("id", lineupId);
      if (lockError) throw lockError;
      const { error: completeError } = await supabase.rpc("complete_season5_lineup", { target_lineup_id: lineupId });
      if (completeError) throw completeError;
      toast.success("Night completed and sit-out ledger updated");
      refreshSeason5();
    } catch (error) {
      toast.error(getSaveErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Season 5 Lineup Control" icon={<ShieldCheck className="h-4 w-4 text-primary" />}>
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Season 5 uses an 8-player official roster. One player sits out each night; the remaining seven keep the exact M1 / M2 / 2 Star / 2 Core / Dev structure through temporary one-tier promotions. Official tiers never change.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Team</Label><Select value={activeTeam} onValueChange={(value) => { setSelectedTeam(value); setSitOutOverride(""); setManualNightlyTiers({}); }}><SelectTrigger className="h-9 bg-background/40 text-[11px]"><SelectValue placeholder="Choose team" /></SelectTrigger><SelectContent>{teams.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">League night</Label><Input type="date" value={nightDate} onChange={(event) => setNightDate(event.target.value)} className="h-9 bg-background/40 text-[11px]" /></div>
          </div>
          {!activeTeam ? <p className="py-5 text-center text-[11px] text-muted-foreground">Add team assignments in the roster manager to begin.</p> : null}
        </div>
      </SectionCard>

      {activeTeam ? <>
        <SectionCard title="Official Roster Check" icon={<Users className="h-4 w-4 text-primary" />}>
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-1.5">{SEASON5_TIERS.map((tier) => <div key={tier} className={`rounded-lg p-2 text-center ring-1 ${tierCounts[tier] === SEASON5_REQUIRED_ROSTER[tier] ? "bg-emerald-400/10 ring-emerald-400/20" : "bg-amber-400/10 ring-amber-400/20"}`}><p className="text-[9px] font-bold uppercase text-muted-foreground">{tier}</p><p className="mt-0.5 text-[14px] font-bold tabular-nums text-foreground">{tierCounts[tier]}<span className="text-[9px] text-muted-foreground">/{SEASON5_REQUIRED_ROSTER[tier]}</span></p></div>)}</div>
            {rosterIssues.length ? <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3"><p className="text-[10px] font-semibold text-amber-200">Generation is disabled until this roster is valid:</p><ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed text-muted-foreground">{rosterIssues.map((issue) => <li key={issue}>• {issue}</li>)}</ul></div> : <p className="text-[10px] text-emerald-300">Valid 8-player roster. Official tiers are ready for nightly generation.</p>}
            <div className="space-y-2">{sortSeason5Players(roster).map((player) => <div key={player.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2.5 py-2 ring-1 ring-white/[0.05]"><div className="min-w-0"><p className="truncate text-[11px] text-foreground">{player.name}</p><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Official {normalizeSeason5Tier(player.category) ?? "Unassigned"}</p></div><span className="text-[9px] text-muted-foreground">{ledgerByPlayer.get(player.id)?.total_sit_outs ?? 0} sit-outs</span></div>)}</div>
          </div>
        </SectionCard>

        <SectionCard title="Sit-Out Rotation" icon={<RefreshCw className="h-4 w-4 text-primary" />}>
          <div className="space-y-3">
            <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]"><p className="text-[10px] leading-relaxed text-muted-foreground">The recommended player is selected deterministically from the lowest sit-out count, then the oldest previous sit-out, then ranking and name. A third sit-out is blocked while any teammate has not sat once unless an administrator records an exception.</p></div>
            <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Sit-out player</Label><Select value={selectedSitOutId} onValueChange={setSitOutOverride}><SelectTrigger className="h-9 bg-background/40 text-[11px]"><SelectValue placeholder="Choose sit-out" /></SelectTrigger><SelectContent>{sortSeason5Players(roster).map((player) => <SelectItem key={player.id} value={player.id}>{player.name} · {ledgerByPlayer.get(player.id)?.total_sit_outs ?? 0} sit-outs{player.id === recommendedSitOut?.id ? " · recommended" : ""}</SelectItem>)}</SelectContent></Select></div>
            {selectedSitOutId ? <p className="text-[10px] text-primary">Current priority: {priority.get(selectedSitOutId) ?? 1}</p> : null}
            {needsException ? <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-amber-200">Authorized exception reason</Label><Textarea value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} placeholder="Explain why this player must receive a third sit-out before every rostered player has received one." className="min-h-20 bg-background/40 text-[10px]" /></div> : null}
            {ledger.data?.length ? (
              <div className="space-y-2 rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sit-out history</p>
                <div className="space-y-1.5">
                  {ledger.data.map((entry) => {
                    const player = playerById.get(entry.player_id);
                    return (
                      <div key={entry.player_id} className="flex items-center justify-between gap-3 rounded-lg bg-black/10 px-2.5 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] text-foreground">{player?.name ?? "Unknown player"}</p>
                          <p className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">
                            Official {entry.official_tier} · Last sat {entry.previous_sit_out_night ? new Date(entry.previous_sit_out_night).toLocaleDateString() : "never"}
                          </p>
                        </div>
                        <span className="text-[9px] text-primary">{entry.total_sit_outs} sit-outs</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Nightly Playing Roles" icon={<CalendarDays className="h-4 w-4 text-primary" />}>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{night.data ? `${night.data.status} · ${nightDate}` : "No lineup saved"}</p><p className="mt-1 text-[10px] text-muted-foreground">Adjust the active players and nightly tiers below, then complete the night to save changes.</p></div>{night.data?.status === "LOCKED" || night.data?.status === "COMPLETED" ? <LockKeyhole className="h-4 w-4 text-amber-300" /> : null}</div>
            <div className="space-y-2">
              {rolePreviewPlayers.length ? rolePreviewPlayers.map((lineupPlayer) => { const player = playerById.get(lineupPlayer.player_id); const isSitOut = lineupPlayer.lineup_status === "SIT_OUT"; const options = getNightlyTierOptions(lineupPlayer.official_tier); return <div key={lineupPlayer.player_id} className={`flex items-center gap-2 rounded-lg p-2.5 ring-1 ${isSitOut ? "bg-amber-400/[0.08] ring-amber-400/20" : "bg-white/[0.02] ring-white/[0.05]"}`}><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-foreground">{player?.name ?? "Unknown player"}</p><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Current tier: {lineupPlayer.official_tier} · {isSitOut ? "SIT OUT" : `Nightly ${lineupPlayer.nightly_playing_tier}`}</p></div>{isSitOut ? <span className="text-[9px] font-semibold uppercase text-amber-200">SIT OUT</span> : <Select value={manualNightlyTiers[lineupPlayer.player_id] ?? lineupPlayer.nightly_playing_tier} onValueChange={(value) => updateNightlyTier(lineupPlayer.player_id, value as Season5Tier)}><SelectTrigger className="h-8 w-[150px] bg-background/40 text-[10px]"><SelectValue /></SelectTrigger><SelectContent>{options.map((tier) => <SelectItem key={tier} value={tier}>{player?.name ?? "Player"} · {tier}</SelectItem>)}</SelectContent></Select>}</div>; }) : <p className="rounded-xl border border-dashed border-white/[0.12] px-3 py-7 text-center text-[10px] text-muted-foreground">Pick a team and sit-out player to build the night&apos;s lineup.</p>}
            </div>
            {rolePreviewPlayers.length ? <div className="grid grid-cols-5 gap-1.5">{SEASON5_TIERS.map((tier) => <div key={tier} className="rounded-lg bg-primary/[0.06] p-2 text-center ring-1 ring-primary/10"><p className="text-[9px] uppercase text-muted-foreground">{tier}</p><p className="text-[12px] font-bold text-foreground">{activePreviewPlayers.filter((player) => player.nightly_playing_tier === tier).length}<span className="text-[9px] text-muted-foreground">/{SEASON5_REQUIRED_ACTIVE[tier]}</span></p></div>)}</div> : null}
            {sitOutPreviewPlayer ? <p className="text-[10px] text-muted-foreground">Current sit-out preview: <span className="text-foreground">{playerById.get(sitOutPreviewPlayer.player_id)?.name ?? "Unknown"} · {sitOutPreviewPlayer.official_tier}</span></p> : null}
            <Button className="w-full gap-2" onClick={saveNight} disabled={busy !== null || rosterIssues.length > 0 || !activeTeam || night.data?.status === "LOCKED" || night.data?.status === "COMPLETED"}><Check className="h-4 w-4" /> {busy === "complete" ? "Saving…" : "Complete night"}</Button>
          </div>
        </SectionCard>
      </> : null}
    </div>
  );
}
