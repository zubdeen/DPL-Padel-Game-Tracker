"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/SectionCard";
import { GlobalFooter } from "@/components/GlobalFooter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultSiteContent, saveSiteContent, useSiteContent, type SiteContent } from "@/lib/site-content";
import { ELIMINATOR_CATEGORY_HANDICAP } from "@/lib/eliminators";
import { ArrowLeft, ImagePlus, Pencil, Plus, Save, Star, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import type { Player } from "@/lib/scoring";
import { fetchPlayers, isMissingPlayerAvatarColumn } from "@/lib/player-data";
import { SEASON5_REQUIRED_ROSTER, SEASON5_TIERS, getSeason5TierCounts, normalizeSeason5Tier, validateSeason5Roster } from "@/lib/season5";

const CATEGORY_ORDER: Record<string, number> = { M1: 1, M2: 2, Star: 3, Core: 4, Dev: 5 };
const CATEGORIES = ["M1", "M2", "Star", "Core", "Dev"];
type PlayerDraft = Pick<Player, "id" | "name" | "avatar_url" | "team" | "ranking" | "category" | "is_captain">;
type NewPlayerDraft = { name: string; team: string; category: string; ranking: string };

export default function RosterPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.push("/auth"); }, [loading, user, router]);

  if (loading) return <Shell><p className="py-10 text-center text-[11px] text-muted-foreground">Loading…</p></Shell>;
  if (!user) return null;
  if (!isAdmin) {
    return <Shell><SectionCard title="Admin Access Required" icon={<Users className="h-4 w-4 text-primary" />}><p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">Roster management is restricted to the tournament administrator.</p><Button className="w-full" onClick={() => router.push("/admin")}>Back to admin</Button></SectionCard></Shell>;
  }
  return <Shell><RosterManager /></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen justify-center bg-background"><main className="relative w-full max-w-[420px]"><div className="px-5 pb-10 pt-8"><Link href="/admin" className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"><ArrowLeft className="h-3 w-3" /> Back to admin</Link>{children}<GlobalFooter /></div></main></div>;
}

function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });
}

function groupByTeam(players: Player[]) {
  const map = new Map<string, Player[]>();
  for (const player of players) {
    const team = player.team ?? "Unassigned";
    if (!map.has(team)) map.set(team, []);
    map.get(team)!.push(player);
  }
  for (const list of map.values()) list.sort((a, b) => (CATEGORY_ORDER[String(a.category)] ?? 99) - (CATEGORY_ORDER[String(b.category)] ?? 99) || (a.ranking ?? 99) - (b.ranking ?? 99) || a.name.localeCompare(b.name));
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function Season5RosterSummary({ groups }: { groups: [string, Player[]][] }) {
  return <SectionCard title="Season 5 Roster Rules" icon={<Users className="h-4 w-4 text-primary" />}>
    <div className="space-y-3">
      <p className="text-[10px] leading-relaxed text-muted-foreground">Each team must have exactly 8 official players: 1 M1, 1 M2, 2 Stars, 2 Cores, and 2 Developing. Nightly promotions are temporary and do not change these official assignments.</p>
      {groups.filter(([team]) => team !== "Unassigned").map(([team, roster]) => {
        const counts = getSeason5TierCounts(roster);
        const issues = validateSeason5Roster(roster);
        return <div key={team} className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]">
          <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wider text-foreground">{team}</p><span className={`text-[9px] font-semibold uppercase ${issues.length ? "text-amber-300" : "text-emerald-300"}`}>{issues.length ? "Needs setup" : "Ready"}</span></div>
          <div className="grid grid-cols-5 gap-1">{SEASON5_TIERS.map((tier) => <div key={tier} className={`rounded-md p-1.5 text-center ring-1 ${counts[tier] === SEASON5_REQUIRED_ROSTER[tier] ? "bg-emerald-400/10 ring-emerald-400/20" : "bg-amber-400/10 ring-amber-400/20"}`}><p className="text-[8px] uppercase text-muted-foreground">{tier}</p><p className="text-[12px] font-bold tabular-nums text-foreground">{counts[tier]}<span className="text-[8px] text-muted-foreground">/{SEASON5_REQUIRED_ROSTER[tier]}</span></p></div>)}</div>
          {issues.length ? <p className="mt-2 text-[9px] leading-relaxed text-amber-200">{issues.join(" ")}</p> : null}
        </div>;
      })}
      {groups.some(([team]) => team === "Unassigned") ? <p className="text-[9px] text-amber-200">Unassigned players cannot be used in a Season 5 lineup.</p> : null}
    </div>
  </SectionCard>;
}

function AddPlayerCard({ teams, siteContent, onAdded }: { teams: string[]; siteContent: SiteContent; onAdded: () => void }) {
  const [draft, setDraft] = useState<NewPlayerDraft>({ name: "", team: teams[0] ?? "", category: "", ranking: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [teamLogo, setTeamLogo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!draft.team && teams[0]) setDraft((current) => ({ ...current, team: teams[0] }));
  }, [draft.team, teams]);

  const addPlayer = async () => {
    const name = draft.name.trim();
    const team = draft.team.trim();
    const category = normalizeSeason5Tier(draft.category);
    if (!name || !team || !category) return toast.error("Enter a name, team, and official Season 5 tier.");
    const ranking = draft.ranking.trim() ? Number(draft.ranking) : null;
    if (ranking !== null && (!Number.isInteger(ranking) || ranking < 1)) return toast.error("Ranking must be a positive whole number.");
    if (photo && (!photo.type.startsWith("image/") || photo.size > 5 * 1024 * 1024)) return toast.error("Choose an image no larger than 5 MB.");
    if (teamLogo && (!teamLogo.type.startsWith("image/") || teamLogo.size > 5 * 1024 * 1024)) return toast.error("Choose a team-logo image no larger than 5 MB.");
    setSaving(true);
    const fullInsert = await supabase.from("players").insert({ name, team, category, ranking, is_captain: false }).select("id").single();
    let playerId = fullInsert.data?.id as string | undefined;
    let insertError = fullInsert.error;
    if (isMissingPlayerAvatarColumn(fullInsert.error)) {
      const legacyInsert = await supabase.from("players").insert({ name, team, category, ranking, is_captain: false }).select("id").single();
      playerId = legacyInsert.data?.id as string | undefined;
      insertError = legacyInsert.error;
    }
    if (insertError || !playerId) {
      setSaving(false);
      return toast.error(insertError?.message ?? "Unable to save the player.");
    }

    let imageWarning = "";
    if (photo) {
      const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `players/${playerId}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("dpl-media").upload(path, photo, { upsert: true, contentType: photo.type });
      if (uploadError) {
        imageWarning = ` Player saved, but the picture could not be uploaded: ${uploadError.message}`;
      } else {
        const { data } = supabase.storage.from("dpl-media").getPublicUrl(path);
        const { error: avatarError } = await supabase.from("players").update({ avatar_url: data.publicUrl }).eq("id", playerId);
        if (avatarError) imageWarning = isMissingPlayerAvatarColumn(avatarError) ? " Player saved; apply the avatar migration to store the picture." : ` Player saved, but the picture could not be linked: ${avatarError.message}`;
      }
    }
    if (teamLogo) {
      const extension = teamLogo.name.split(".").pop()?.toLowerCase() || "png";
      const safeTeam = team.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const path = `teams/${safeTeam}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("dpl-media").upload(path, teamLogo, { upsert: true, contentType: teamLogo.type });
      if (uploadError) {
        imageWarning += ` Team logo could not be uploaded: ${uploadError.message}`;
      } else {
        const { data } = supabase.storage.from("dpl-media").getPublicUrl(path);
        const { error: contentError } = await saveSiteContent({ ...siteContent, teamLogos: { ...siteContent.teamLogos, [team]: data.publicUrl } });
        if (contentError) imageWarning += ` Team logo uploaded but could not be published: ${contentError.message}`;
      }
    }
    setSaving(false);
    setDraft({ name: "", team, category: "", ranking: "" });
    setPhoto(null);
    setTeamLogo(null);
    onAdded();
    if (imageWarning) toast.warning(`Player added to the official roster.${imageWarning}`);
    else toast.success("Player added to the official roster");
  };

  return <SectionCard title="Add Player to Roster" icon={<Plus className="h-4 w-4 text-primary" />}>
    <div className="space-y-3">
      <p className="text-[10px] leading-relaxed text-muted-foreground">Use this to add the eighth rostered player, including the second Developing slot required by Season 5. The player’s official tier remains separate from their future nightly playing tier.</p>
      <PlayerField label="Player name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Team</Label><Select value={draft.team || "none"} onValueChange={(team) => setDraft({ ...draft, team: team === "none" ? "" : team })}><SelectTrigger className="h-9 bg-background/40 text-[11px]"><SelectValue placeholder="Choose team" /></SelectTrigger><SelectContent><SelectItem value="none">Choose team</SelectItem>{teams.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}</SelectContent></Select><p className="text-[9px] leading-relaxed text-muted-foreground">Choose an existing team.</p></div>
        <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Official tier</Label><Select value={draft.category || "none"} onValueChange={(category) => setDraft({ ...draft, category: category === "none" ? "" : category })}><SelectTrigger className="h-9 bg-background/40 text-[11px]"><SelectValue placeholder="Choose tier" /></SelectTrigger><SelectContent><SelectItem value="none">Choose tier</SelectItem>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <PlayerField label="Team ranking" value={draft.ranking} onChange={(ranking) => setDraft({ ...draft, ranking })} hint="Optional positive whole number." />
      <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Player picture</Label><Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} disabled={saving} className="h-9 bg-background/40 text-[10px]" /><p className="text-[9px] text-muted-foreground">Optional JPEG, PNG, WebP, or GIF · maximum 5 MB{photo ? ` · ${photo.name}` : ""}</p></div>
      <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Team picture / logo</Label><Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setTeamLogo(event.target.files?.[0] ?? null)} disabled={saving} className="h-9 bg-background/40 text-[10px]" /><p className="text-[9px] text-muted-foreground">Optional team image · maximum 5 MB{teamLogo ? ` · ${teamLogo.name}` : ""}</p></div>
      <Button type="button" className="w-full gap-2" onClick={addPlayer} disabled={saving}><Plus className="h-4 w-4" /> {saving ? "Adding…" : "Add player"}</Button>
    </div>
  </SectionCard>;
}

function RosterManager() {
  const queryClient = useQueryClient();
  const players = usePlayers();
  const { data: siteContent } = useSiteContent();
  const [editing, setEditing] = useState<PlayerDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [renamingTeam, setRenamingTeam] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ kind: "player" | "team"; id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const groups = useMemo(() => groupByTeam(players.data ?? []), [players.data]);
  const teams = useMemo(() => Array.from(new Set((players.data ?? []).flatMap((player) => player.team ? [player.team] : []))).sort(), [players.data]);

  const savePlayer = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    const nextTeam = editing.team?.trim() || null;
    const nextCategory = normalizeSeason5Tier(editing.category);
    if (!name) return toast.error("A player name is required.");
    if (!nextCategory && nextTeam) return toast.error("Every assigned player needs an official Season 5 tier.");

    const original = (players.data ?? []).find((player) => player.id === editing.id);
    const structuralChange = Boolean(original && (original.team !== nextTeam || normalizeSeason5Tier(original.category) !== nextCategory));
    if (structuralChange) {
      const withoutPlayer = (players.data ?? []).filter((player) => player.id !== editing.id);
      const oldTeamRoster = original?.team ? withoutPlayer.filter((player) => player.team === original.team) : [];
      const newTeamRoster = nextTeam ? [...withoutPlayer.filter((player) => player.team === nextTeam), { ...editing, name, team: nextTeam, category: nextCategory }] : [];
      const oldIssues = original?.team ? validateSeason5Roster(oldTeamRoster) : [];
      const newIssues = nextTeam ? validateSeason5Roster(newTeamRoster) : [];
      if (oldIssues.length || newIssues.length) {
        const detail = [...oldIssues.map((issue) => `${original?.team}: ${issue}`), ...newIssues.map((issue) => `${nextTeam}: ${issue}`)].join(" ");
        return toast.error(`Save blocked to protect the Season 5 roster. ${detail}`);
      }
    }

    setSaving(true);
    const { error } = await supabase.from("players").update({ name, avatar_url: editing.avatar_url || null, team: nextTeam, ranking: editing.ranking ?? null, category: nextCategory, is_captain: editing.is_captain === true }).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: ["players"] });
    setEditing(null);
    toast.success("Player updated");
  };

  const uploadPlayerPhoto = async (file: File) => {
    if (!editing) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Images must be 5 MB or smaller.");
    setUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `players/${editing.id}-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("dpl-media").upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) return toast.error(`${error.message} Apply the media-storage migration if the bucket is missing.`);
    const { data } = supabase.storage.from("dpl-media").getPublicUrl(path);
    setEditing({ ...editing, avatar_url: data.publicUrl });
    toast.success("Profile picture uploaded. Save player to publish it.");
  };

  const uploadTeamLogo = async (team: string, file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file for the team logo.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Team logos must be 5 MB or smaller.");
    setUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeTeam = team.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const path = `teams/${safeTeam}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("dpl-media").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setUploading(false);
      return toast.error(`${uploadError.message} Apply the media-storage migration if the bucket is missing.`);
    }
    const { data } = supabase.storage.from("dpl-media").getPublicUrl(path);
    const { error: contentError } = await saveSiteContent({ ...(siteContent ?? defaultSiteContent), teamLogos: { ...(siteContent ?? defaultSiteContent).teamLogos, [team]: data.publicUrl } });
    setUploading(false);
    if (contentError) return toast.error(contentError.message);
    queryClient.invalidateQueries({ queryKey: ["site_content"] });
    toast.success(`${team} logo updated`);
  };

  const deletePending = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    if (pendingDelete.kind === "player") {
      const { error } = await supabase.from("players").delete().eq("id", pendingDelete.id);
      if (error) {
        setDeleting(false);
        return toast.error(`Player could not be deleted. Historical matches or locked lineups may still reference this player: ${error.message}`);
      }
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setEditing(null);
      toast.success(`${pendingDelete.label} deleted from the roster`);
    } else {
      const roster = (players.data ?? []).filter((player) => player.team === pendingDelete.id);
      if (roster.length) {
        setDeleting(false);
        return toast.error("A team must be empty before it can be removed. Reassign or delete its players first.");
      }
      const { error: rankingError } = await supabase.from("team_rankings").delete().eq("team", pendingDelete.id);
      if (rankingError) {
        setDeleting(false);
        return toast.error(`Team could not be removed: ${rankingError.message}`);
      }
      const current = siteContent ?? defaultSiteContent;
      const nextContent = { ...current, teamLogos: Object.fromEntries(Object.entries(current.teamLogos).filter(([team]) => team !== pendingDelete.id)), schedule: { ...current.schedule, leagueEvents: current.schedule.leagueEvents.filter((event) => event.homeTeam !== pendingDelete.id && event.awayTeam !== pendingDelete.id), eliminatorEvents: current.schedule.eliminatorEvents.filter((event) => event.homeTeam !== pendingDelete.id && event.awayTeam !== pendingDelete.id) } };
      const { error: contentError } = await saveSiteContent(nextContent);
      if (contentError) {
        setDeleting(false);
        return toast.error(`Team ranking removed, but saved team branding/schedule data could not be cleaned up: ${contentError.message}`);
      }
      queryClient.invalidateQueries({ queryKey: ["site_content"] });
      queryClient.invalidateQueries({ queryKey: ["team_rankings"] });
      toast.success(`${pendingDelete.label} removed`);
    }
    setDeleting(false);
    setPendingDelete(null);
  };

  const renameTeam = async () => {
    if (!renamingTeam) return;
    const next = newTeamName.trim();
    if (!next) return toast.error("Enter a new team name.");
    setRenaming(true);
    const { error } = await supabase.rpc("rename_team", { old_team: renamingTeam, new_team: next });
    setRenaming(false);
    if (error) return toast.error(`${error.message} Apply the admin-content-media migration if the function is missing.`);

    const current = siteContent ?? defaultSiteContent;
    const renamedLogos = { ...current.teamLogos };
    if (renamedLogos[renamingTeam]) {
      renamedLogos[next] = renamedLogos[renamingTeam];
      delete renamedLogos[renamingTeam];
    }
    const renameScheduleTeam = (events: typeof current.schedule.leagueEvents) => events.map((event) => ({ ...event, homeTeam: event.homeTeam === renamingTeam ? next : event.homeTeam, awayTeam: event.awayTeam === renamingTeam ? next : event.awayTeam }));
    const { error: contentError } = await saveSiteContent({ ...current, teamLogos: renamedLogos, schedule: { ...current.schedule, leagueEvents: renameScheduleTeam(current.schedule.leagueEvents), eliminatorEvents: renameScheduleTeam(current.schedule.eliminatorEvents) } });
    if (contentError) toast.warning("Team name changed. Apply the site-content migration, then republish content to update saved logos and schedules.");
    queryClient.invalidateQueries({ queryKey: ["players"] });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["team_rankings"] });
    queryClient.invalidateQueries({ queryKey: ["site_content"] });
    setRenamingTeam(null);
    setNewTeamName("");
    toast.success("Team name updated everywhere");
  };

  return <div className="space-y-4">
    <Season5RosterSummary groups={groups} />
    <AddPlayerCard teams={teams} siteContent={siteContent ?? defaultSiteContent} onAdded={() => { void queryClient.invalidateQueries({ queryKey: ["players"] }); void queryClient.invalidateQueries({ queryKey: ["site_content"] }); }} />
    <SectionCard title="Player Directory" icon={<Users className="h-4 w-4 text-primary" />}>
      <div className="space-y-3">
        <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3"><p className="text-[10px] leading-relaxed text-muted-foreground">Use the row actions to edit a player in the side panel or delete a player. Historical-match and locked-lineup safeguards remain active.</p></div>
        {players.isLoading ? <p className="py-5 text-center text-[11px] text-muted-foreground">Loading roster…</p> : null}
        {players.isError ? <p className="py-5 text-center text-[11px] text-destructive">Unable to load the roster.</p> : null}
        {groups.map(([team, list]) => <div key={team} className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]"><div className="mb-2 flex items-center justify-between"><h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{team}</h3><span className="text-[9px] text-muted-foreground">{list.length} players</span></div><div className="space-y-1.5">{list.map((player) => <div key={player.id} className="flex items-center gap-1 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.05]"><button type="button" onClick={() => setEditing({ ...player })} className="flex min-w-0 flex-1 items-center justify-between text-left"><span className="flex min-w-0 items-center gap-2 text-[11px] text-foreground/90">{player.avatar_url ? <img src={player.avatar_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-white/10" /> : <span className="h-6 w-6 shrink-0 rounded-full bg-white/10" />}<span className="truncate">{player.name}</span>{player.is_captain ? <Star className="h-3 w-3 shrink-0 fill-primary text-primary" /> : null}</span><span className="flex items-center gap-2"><span className="text-[9px] uppercase tracking-wider text-primary/75">{player.category ?? "—"}</span><Pencil className="h-3 w-3 text-muted-foreground" /></span></button><button type="button" aria-label={`Delete ${player.name}`} onClick={() => setPendingDelete({ kind: "player", id: player.id, label: player.name })} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></button></div>)}</div></div>)}
      </div>
    </SectionCard>

    <Sheet open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-white/[0.08] bg-card sm:max-w-md">
        <SheetHeader className="mb-5 pr-8 text-left"><SheetTitle className="text-base text-foreground">Edit Player</SheetTitle><SheetDescription className="text-[10px] leading-relaxed">Update roster assignment, handicap, captain status, or profile picture. Season 5 structure checks still apply.</SheetDescription></SheetHeader>
        {editing ? <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-background/60 ring-1 ring-white/[0.07]">{editing.avatar_url ? <img src={editing.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-muted-foreground">No photo</span>}</div><div className="min-w-0 flex-1"><Label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Profile picture</Label><Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPlayerPhoto(file); }} disabled={uploading} className="h-9 bg-background/40 text-[10px]" /><div className="mt-1 flex items-center justify-between gap-2"><p className="text-[9px] text-muted-foreground">{uploading ? "Uploading…" : "JPEG, PNG, WebP, or GIF · maximum 5 MB"}</p><Button type="button" variant="ghost" className="h-7 shrink-0 px-2 text-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setEditing({ ...editing, avatar_url: null })} disabled={!editing.avatar_url || uploading}>Remove picture</Button></div></div></div>
          <PlayerField label="Player name" value={editing.name} onChange={(name) => setEditing({ ...editing, name })} />
          <div className="grid grid-cols-2 gap-2"><div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Team assignment</Label><Select value={editing.team ?? "none"} onValueChange={(team) => setEditing({ ...editing, team: team === "none" ? null : team })}><SelectTrigger className="h-9 bg-background/40 text-[11px]"><SelectValue placeholder="Choose team" /></SelectTrigger><SelectContent><SelectItem value="none">No team</SelectItem>{teams.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}</SelectContent></Select><p className="text-[9px] leading-relaxed text-muted-foreground">Use team rename for a full-roster change.</p></div><div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Official tier</Label><Select value={editing.category ?? "none"} onValueChange={(value) => setEditing({ ...editing, category: value === "none" ? null : value })}><SelectTrigger className="h-9 bg-background/40 text-[11px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No tier</SelectItem>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div></div>
          <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Player handicap</Label><Input readOnly value={ELIMINATOR_CATEGORY_HANDICAP[String(editing.category ?? "Dev")] ?? 0} className="h-9 bg-background/40 text-[11px]" /><p className="text-[9px] text-muted-foreground">Calculated from the official tier for eliminator matches.</p></div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.02] px-3 py-2.5 ring-1 ring-white/[0.05]"><Checkbox checked={editing.is_captain === true} onCheckedChange={(checked) => setEditing({ ...editing, is_captain: checked === true })} /><span className="text-[11px] text-foreground">Team captain</span></label>
          <div className="grid grid-cols-2 gap-2 pt-1"><Button type="button" variant="outline" onClick={() => setEditing(null)}><X className="mr-1.5 h-3.5 w-3.5" /> Cancel</Button><Button type="button" onClick={savePlayer} disabled={saving || uploading}><Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}</Button></div>
          <Button type="button" variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setPendingDelete({ kind: "player", id: editing.id, label: editing.name })}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete player</Button>
        </div> : null}
      </SheetContent>
    </Sheet>

    <SectionCard title="Team Directory & Branding" icon={<Users className="h-4 w-4 text-primary" />}><div className="space-y-3"><p className="text-[10px] leading-relaxed text-muted-foreground">Rename teams across the competition, update their logos, or remove an empty team. Historical match records are preserved.</p><div className="space-y-2">{teams.map((team) => <div key={team} className="flex items-center gap-2 rounded-xl bg-white/[0.02] p-2.5 ring-1 ring-white/[0.05]"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background/60 ring-1 ring-white/[0.07]">{siteContent?.teamLogos?.[team] ? <img src={siteContent.teamLogos[team]} alt="" className="h-full w-full object-contain p-1" /> : <Users className="h-4 w-4 text-muted-foreground" />}</div><span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">{team}</span><label className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground" title="Upload team logo"><ImagePlus className="h-3.5 w-3.5" /><Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadTeamLogo(team, file); event.currentTarget.value = ""; }} /></label><Button type="button" variant="ghost" className="h-7 px-2 text-[9px]" onClick={() => { setRenamingTeam(team); setNewTeamName(team); }}>Rename</Button><Button type="button" variant="ghost" className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setPendingDelete({ kind: "team", id: team, label: team })} aria-label={`Delete ${team}`}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>{renamingTeam ? <div className="space-y-3 rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]"><p className="text-[10px] text-muted-foreground">Rename <span className="font-semibold text-foreground">{renamingTeam}</span> across the competition</p><PlayerField label="New team name" value={newTeamName} onChange={setNewTeamName} /><div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" onClick={() => setRenamingTeam(null)}>Cancel</Button><Button type="button" onClick={renameTeam} disabled={renaming}><Save className="mr-1.5 h-3.5 w-3.5" /> {renaming ? "Renaming…" : "Save team name"}</Button></div></div> : null}</div></SectionCard>

    <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open && !deleting) setPendingDelete(null); }}><AlertDialogContent className="border-white/[0.08] bg-card"><AlertDialogHeader><AlertDialogTitle className="text-base">Delete {pendingDelete?.kind === "team" ? "team" : "player"}?</AlertDialogTitle><AlertDialogDescription className="text-[11px] leading-relaxed">{pendingDelete?.kind === "team" ? "Only an empty team can be removed. Its saved logo, ranking row, and scheduled fixtures will also be cleaned up; historical match records remain preserved." : "This removes the player from the active roster. Historical matches and locked Season 5 lineups may prevent deletion."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void deletePending(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? "Deleting…" : `Delete ${pendingDelete?.kind === "team" ? "team" : "player"}`}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function PlayerField({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} className="h-9 bg-background/40 text-[11px]" />{hint ? <p className="text-[9px] leading-relaxed text-muted-foreground">{hint}</p> : null}</div>;
}
