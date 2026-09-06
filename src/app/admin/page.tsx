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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchMatches,
  isMissingMatchTeamNameColumn,
  withoutMatchTeamNames,
} from "@/lib/match-data";
import { fetchEliminatorMatches } from "@/lib/eliminator-data";
import { computeEliminatorStandings, type EliminatorMatch } from "@/lib/eliminators";
import { teamLogos } from "@/lib/team-logos";
import {
  contentAsJson,
  defaultSiteContent,
  getTeamLogo,
  parseSiteContent,
  saveSiteContent,
  useSiteContent,
  type SiteContent,
  type ScheduleEvent,
} from "@/lib/site-content";
import {
  fetchTeamRankings,
  TEAM_RANKING_STATUS_LABELS,
  type TeamRankingStatus,
} from "@/lib/team-rankings";
import {
  Pencil,
  Trash2,
  ShieldCheck,
  Users,
  Swords,
  ArrowLeft,
  Crown,
  Star,
  Trophy,
  ListOrdered,
  ImagePlus,
  LayoutDashboard,
  RotateCcw,
  Save,
  Settings2,
  CalendarDays,
  Plus,
} from "lucide-react";
import type { Match, Player } from "@/lib/scoring";
import { fetchPlayers } from "@/lib/player-data";
import { fetchLockedSeason5Lineup, type LockedSeason5Lineup } from "@/lib/season5-data";
import { Season5Panel } from "@/components/Season5Panel";

const CATEGORY_ORDER: Record<string, number> = {
  M1: 1,
  M2: 2,
  Star: 3,
  Core: 4,
  Dev: 5,
};
const QUERY_STALE_MS = 1000 * 60 * 5;

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [adminPanel, setAdminPanel] = useState<"content" | "schedule" | "league" | "eliminators" | "rankings" | "season5">("content");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  if (loading) {
    return (
      <Shell>
        <p className="text-center text-[11px] text-muted-foreground py-10">Loading…</p>
      </Shell>
    );
  }
  if (!user) return null;

  return (
    <Shell>
      <div className="py-5 text-center mb-4">
        <div className="flex justify-center mb-3">
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent ring-1 ring-primary/30 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground uppercase">
          Admin Dashboard
        </h1>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">{user.email}</p>
      </div>

      {!isAdmin ? (
        <ClaimAdminCard />
      ) : (
        <div className="space-y-4">
          <ViewAllPlayersCard />
          <AdminPanelSwitch value={adminPanel} onChange={setAdminPanel} />
          {adminPanel === "content" ? (
            <ContentManagerPanel />
          ) : adminPanel === "schedule" ? (
            <ScheduleManagerPanel />
          ) : adminPanel === "league" ? (
            <>
              <MatchEntryPanel />
              <MatchListPanel />
            </>
          ) : adminPanel === "eliminators" ? (
            <EliminatorsPanel />
          ) : adminPanel === "season5" ? (
            <Season5Panel />
          ) : (
            <TeamRankingsPanel />
          )}
        </div>
      )}
    </Shell>
  );
}

function ViewAllPlayersCard() {
  const router = useRouter();

  return (
    <SectionCard title="Roster Administration" icon={<Users className="h-4 w-4 text-primary" />}>
      <p className="text-[10px] text-muted-foreground leading-relaxed mb-3">
        Add, edit, delete, and organize players and team assignments from the roster manager.
      </p>
      <Button className="w-full" onClick={() => router.push("/roster")}>
        Open roster manager
      </Button>
    </SectionCard>
  );
}

function AdminPanelSwitch({
  value,
  onChange,
}: {
  value: "content" | "schedule" | "league" | "eliminators" | "rankings" | "season5";
  onChange: (value: "content" | "schedule" | "league" | "eliminators" | "rankings" | "season5") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-1">
      <button
        type="button"
        onClick={() => onChange("content")}
        className={`rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition ${
          value === "content"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Content Studio
      </button>
      <button
        type="button"
        onClick={() => onChange("schedule")}
        className={`rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition ${
          value === "schedule"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Fixture Schedule
      </button>
      <button
        type="button"
        onClick={() => onChange("league")}
        className={`rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition ${
          value === "league"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Record League Match
      </button>
      <button
        type="button"
        onClick={() => onChange("eliminators")}
        className={`rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition ${
          value === "eliminators"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Eliminator Results
      </button>
      <button
        type="button"
        onClick={() => onChange("rankings")}
        className={`rounded-lg px-2 py-2 text-[9px] font-semibold uppercase tracking-wider transition ${
          value === "rankings"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Team Standings
      </button>
      <button
        type="button"
        onClick={() => onChange("season5")}
        className={`rounded-lg px-2 py-2 text-[9px] font-semibold uppercase tracking-wider transition ${
          value === "season5"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Season 5 Lineups
      </button>
    </div>
  );
}

type SchedulePhaseKey = "leagueEvents" | "eliminatorEvents";

function emptyScheduleEvent(phase: SchedulePhaseKey): ScheduleEvent {
  return {
    id: `${phase}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: phase === "leagueEvents" ? "League Match Night" : "Eliminator Round",
    date: "",
    time: "",
    homeTeam: "",
    awayTeam: "",
    court: "",
    notes: "",
  };
}

function ScheduleManagerPanel() {
  const queryClient = useQueryClient();
  const players = usePlayers();
  const { data: content, isLoading } = useSiteContent();
  const [phase, setPhase] = useState<SchedulePhaseKey>("leagueEvents");
  const [draft, setDraft] = useState<SiteContent>(defaultSiteContent);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (content) setDraft(content);
  }, [content]);

  const teams = useMemo(
    () => Array.from(new Set((players.data ?? []).flatMap((player) => (player.team ? [player.team] : [])))).sort(),
    [players.data],
  );
  const events = draft.schedule[phase];
  const updateSchedule = (patch: Partial<SiteContent["schedule"]>) => {
    setDraft((current) => ({ ...current, schedule: { ...current.schedule, ...patch } }));
  };
  const updateEvent = (id: string, patch: Partial<ScheduleEvent>) => {
    updateSchedule({ [phase]: events.map((event) => (event.id === id ? { ...event, ...patch } : event)) });
  };
  const addEvent = () => updateSchedule({ [phase]: [...events, emptyScheduleEvent(phase)] });
  const removeEvent = (id: string) => updateSchedule({ [phase]: events.filter((event) => event.id !== id) });

  const save = async () => {
    setSaving(true);
    const { error } = await saveSiteContent(draft);
    setSaving(false);
    if (error) {
      const migrationHint = /site_content|relation/i.test(error.message)
        ? " Apply the site-content migration before publishing the schedule."
        : "";
      toast.error(`${error.message}${migrationHint}`);
      return;
    }
    queryClient.setQueryData(["site_content"], draft);
    toast.success("Schedule published");
  };

  return (
    <SectionCard title="Manage Schedule" icon={<CalendarDays className="h-4 w-4 text-primary" />}>
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Nothing in the public schedule is permanent. Add, edit, reorder, or remove league and eliminator fixtures here; the dates, times, teams, courts, and notes publish to the schedule tab.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
          <button type="button" onClick={() => setPhase("leagueEvents")} className={`rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition ${phase === "leagueEvents" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>League</button>
          <button type="button" onClick={() => setPhase("eliminatorEvents")} className={`rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition ${phase === "eliminatorEvents" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Eliminators</button>
        </div>

        {isLoading ? <p className="py-4 text-center text-[11px] text-muted-foreground">Loading schedule…</p> : null}
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={event.id} className="space-y-3 rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{phase === "leagueEvents" ? `League fixture ${index + 1}` : `Eliminator fixture ${index + 1}`}</p>
                <button type="button" onClick={() => removeEvent(event.id)} className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-destructive/85 hover:text-destructive"><Trash2 className="h-3 w-3" /> Remove</button>
              </div>
              <ContentField label="Fixture title" value={event.title} onChange={(title) => updateEvent(event.id, { title })} hint="For example: Match Night 1, Qualifier, or Semi-final." />
              <div className="grid grid-cols-2 gap-2">
                <ScheduleInput label="Date" type="date" value={event.date} onChange={(date) => updateEvent(event.id, { date })} />
                <ScheduleInput label="Time" type="time" value={event.time} onChange={(time) => updateEvent(event.id, { time })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ScheduleTeamSelect label="Home team" value={event.homeTeam} teams={teams} onChange={(homeTeam) => updateEvent(event.id, { homeTeam })} />
                <ScheduleTeamSelect label="Away team" value={event.awayTeam} teams={teams} onChange={(awayTeam) => updateEvent(event.id, { awayTeam })} />
              </div>
              <ScheduleInput label="Court / venue" value={event.court} onChange={(court) => updateEvent(event.id, { court })} placeholder="Court 1" />
              <ContentField label="Notes" value={event.notes} onChange={(notes) => updateEvent(event.id, { notes })} multiline />
            </div>
          ))}
          {events.length === 0 ? <p className="rounded-xl border border-dashed border-white/[0.12] px-3 py-7 text-center text-[10px] leading-relaxed text-muted-foreground">No fixtures have been published for this phase yet. Add the first one when the dates are confirmed.</p> : null}
        </div>

        <Button type="button" variant="secondary" className="w-full gap-1.5" onClick={addEvent}><Plus className="h-4 w-4" /> Add {phase === "leagueEvents" ? "league" : "eliminator"} fixture</Button>
        <Button type="button" className="w-full gap-2" onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Publishing…" : "Publish schedule"}</Button>
      </div>
    </SectionCard>
  );
}

function ScheduleInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date" | "time"; placeholder?: string }) {
  return <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 bg-background/40 text-[11px]" /></div>;
}

function ScheduleTeamSelect({ label, value, teams, onChange }: { label: string; value: string; teams: string[]; onChange: (value: string) => void }) {
  return <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label><Select value={value || "tbc"} onValueChange={(next) => onChange(next === "tbc" ? "" : next)}><SelectTrigger className="h-9 bg-background/40 text-[11px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tbc">TBC</SelectItem>{teams.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}</SelectContent></Select></div>;
}

type ContentEditorTab = "brand" | "sections" | "images" | "advanced";

function ContentManagerPanel() {
  const queryClient = useQueryClient();
  const players = usePlayers();
  const { data: content, isLoading, error } = useSiteContent();
  const [tab, setTab] = useState<ContentEditorTab>("brand");
  const [draft, setDraft] = useState<SiteContent>(defaultSiteContent);
  const [rawContent, setRawContent] = useState(contentAsJson(defaultSiteContent));
  const [saving, setSaving] = useState(false);
  const [uploadingTeam, setUploadingTeam] = useState<string | null>(null);

  useEffect(() => {
    if (!content) return;
    setDraft(content);
    setRawContent(contentAsJson(content));
  }, [content]);

  const update = <K extends keyof SiteContent>(section: K, patch: Partial<SiteContent[K]>) => {
    setDraft((current) => ({
      ...current,
      [section]: { ...(current[section] as object), ...patch },
    }));
  };

  const save = async () => {
    setSaving(true);
    const { error: saveError } = await saveSiteContent(draft);
    setSaving(false);
    if (saveError) {
      const migrationHint = /site_content|relation/i.test(saveError.message)
        ? " The site-content migration still needs to be applied."
        : "";
      toast.error(`${saveError.message}${migrationHint}`);
      return;
    }
    queryClient.setQueryData(["site_content"], draft);
    setRawContent(contentAsJson(draft));
    toast.success("Frontend content published");
  };

  const applyJson = () => {
    try {
      const parsed = parseSiteContent(rawContent);
      setDraft(parsed);
      setRawContent(contentAsJson(parsed));
      toast.success("JSON applied to the editor");
    } catch {
      toast.error("That JSON is not valid. Fix the formatting and try again.");
    }
  };

  const restoreDefaults = () => {
    setDraft(defaultSiteContent);
    setRawContent(contentAsJson(defaultSiteContent));
    toast.success("Default new-season copy restored in the editor");
  };

  const uploadTeamLogo = async (team: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be 5 MB or smaller.");
      return;
    }
    setUploadingTeam(team);
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeTeam = team.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const path = `teams/${safeTeam}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("dpl-media").upload(path, file, { upsert: true, contentType: file.type });
    setUploadingTeam(null);
    if (uploadError) {
      toast.error(`${uploadError.message} Apply the admin-content-media migration if the bucket is missing.`);
      return;
    }
    const { data } = supabase.storage.from("dpl-media").getPublicUrl(path);
    update("teamLogos", { [team]: data.publicUrl });
    toast.success("Team logo uploaded. Publish frontend changes to use it.");
  };

  const teamNames = Array.from(
    new Set([
      ...Object.keys(draft.teamLogos),
      ...(players.data ?? []).flatMap((player) => (player.team ? [player.team] : [])),
    ]),
  ).sort();

  return (
    <SectionCard title="Frontend Content Studio" icon={<LayoutDashboard className="h-4 w-4 text-primary" />}>
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
          <div className="flex items-start gap-2">
            <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Update the season-facing copy and image URLs here. Save once to publish the changes across the public tracker. The advanced editor is available for a complete export or bulk update.
            </p>
          </div>
        </div>

        {isLoading ? <p className="text-center text-[11px] text-muted-foreground">Loading frontend content…</p> : null}
        {error ? <p className="text-[10px] leading-relaxed text-amber-300">Using local defaults while content settings are unavailable.</p> : null}

        <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
          <ContentTabButton active={tab === "brand"} onClick={() => setTab("brand")} label="Brand" />
          <ContentTabButton active={tab === "sections"} onClick={() => setTab("sections")} label="Copy" />
          <ContentTabButton active={tab === "images"} onClick={() => setTab("images")} label="Images" />
          <ContentTabButton active={tab === "advanced"} onClick={() => setTab("advanced")} label="JSON" />
        </div>

        {tab === "brand" ? (
          <div className="space-y-3">
            <ContentField label="League name" value={draft.brand.name} onChange={(value) => update("brand", { name: value })} />
            <ContentField label="Highlighted name word" value={draft.brand.accentWord} onChange={(value) => update("brand", { accentWord: value })} hint="This word receives the season accent colour." />
            <div className="grid grid-cols-2 gap-2">
              <ContentField label="Season label" value={draft.brand.seasonLabel} onChange={(value) => update("brand", { seasonLabel: value })} />
              <ContentField label="Status badge" value={draft.brand.statusLabel} onChange={(value) => update("brand", { statusLabel: value })} />
            </div>
            <ContentField label="Season tagline" value={draft.brand.tagline} onChange={(value) => update("brand", { tagline: value })} multiline />
            <ContentField label="Location" value={draft.brand.location} onChange={(value) => update("brand", { location: value })} />
            <ContentField label="League logo URL" value={draft.brand.logoUrl} onChange={(value) => update("brand", { logoUrl: value })} type="url" hint="Paste a public HTTPS image URL." />
            <ContentField label="Hero image URL" value={draft.brand.heroImageUrl} onChange={(value) => update("brand", { heroImageUrl: value })} type="url" hint="Optional. A landscape image is best; leave blank for the new gradient treatment." />
            <ContentField label="Hero image alt text" value={draft.brand.heroImageAlt} onChange={(value) => update("brand", { heroImageAlt: value })} />
          </div>
        ) : null}

        {tab === "sections" ? (
          <div className="space-y-5">
            <ContentGroup title="Standings">
              <ContentField label="Standings card title" value={draft.home.standingsTitle} onChange={(value) => update("home", { standingsTitle: value })} />
              <div className="grid grid-cols-2 gap-2">
                <ContentField label="League tab" value={draft.home.leagueTabLabel} onChange={(value) => update("home", { leagueTabLabel: value })} />
                <ContentField label="Championship tab" value={draft.home.championshipTabLabel} onChange={(value) => update("home", { championshipTabLabel: value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <ContentField label="Players label" value={draft.home.playerLabel} onChange={(value) => update("home", { playerLabel: value })} />
                <ContentField label="Teams label" value={draft.home.teamLabel} onChange={(value) => update("home", { teamLabel: value })} />
                <ContentField label="Nights label" value={draft.home.nightLabel} onChange={(value) => update("home", { nightLabel: value })} />
              </div>
            </ContentGroup>

            <ContentGroup title="Schedule, rules, and payments">
              <ContentField label="Schedule title" value={draft.schedule.title} onChange={(value) => update("schedule", { title: value })} />
              <ContentField label="Schedule intro" value={draft.schedule.intro} onChange={(value) => update("schedule", { intro: value })} />
              <div className="grid grid-cols-2 gap-2">
                <ContentField label="League phase label" value={draft.schedule.leaguePhaseLabel} onChange={(value) => update("schedule", { leaguePhaseLabel: value })} />
                <ContentField label="Championship label" value={draft.schedule.championshipLabel} onChange={(value) => update("schedule", { championshipLabel: value })} />
              </div>
              <ContentField label="Awards label" value={draft.schedule.awardsLabel} onChange={(value) => update("schedule", { awardsLabel: value })} />
              <ContentField label="Payments title" value={draft.banking.title} onChange={(value) => update("banking", { title: value })} />
              <ContentField label="Payments intro" value={draft.banking.intro} onChange={(value) => update("banking", { intro: value })} />
              <ContentField label="Rules card title" value={draft.rules.cardTitle} onChange={(value) => update("rules", { cardTitle: value })} />
              <ContentField label="Rules subtitle" value={draft.rules.subtitle} onChange={(value) => update("rules", { subtitle: value })} />
              <ContentField label="Rules footer" value={draft.rules.footer} onChange={(value) => update("rules", { footer: value })} />
              <ContentField label="Footer caption" value={draft.footer.trackerLabel} onChange={(value) => update("footer", { trackerLabel: value })} />
            </ContentGroup>

            <ContentGroup title="Navigation labels">
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(draft.navigation) as [keyof SiteContent["navigation"], string][]).map(([key, value]) => (
                  <ContentField key={key} label={key} value={value} onChange={(next) => update("navigation", { [key]: next })} />
                ))}
              </div>
            </ContentGroup>
          </div>
        ) : null}

        {tab === "images" ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]">
              <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-[10px] leading-relaxed text-muted-foreground">Upload a transparent team logo to Supabase or paste a public image URL. Square PNG, WebP, or SVG-style images display best in standings, players, fixtures, and schedules.</p>
            </div>
            {teamNames.map((team) => (
              <div key={team} className="flex items-center gap-2 rounded-xl bg-white/[0.02] p-2 ring-1 ring-white/[0.05]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/70 p-1 ring-1 ring-white/[0.06]">
                  {getTeamLogo(draft, team) ? <img src={getTeamLogo(draft, team)} alt="" className="h-full w-full object-contain" /> : <span className="text-[8px] font-bold text-muted-foreground">{team.slice(0, 3)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-foreground">{team}</p>
                  <div className="space-y-1.5"><Input value={draft.teamLogos[team] ?? ""} onChange={(event) => update("teamLogos", { [team]: event.target.value })} className="h-8 bg-background/40 text-[10px]" placeholder="https://…" /><Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingTeam === team} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadTeamLogo(team, file); }} className="h-8 bg-background/40 text-[9px]" />{uploadingTeam === team ? <p className="text-[9px] text-primary">Uploading logo…</p> : null}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "advanced" ? (
          <div className="space-y-3">
            <p className="text-[10px] leading-relaxed text-muted-foreground">This export is the complete content model used by the public interface. It is useful for bulk edits, duplicating a season, or keeping a copy of your configuration. Apply the JSON before saving it.</p>
            <Textarea value={rawContent} onChange={(event) => setRawContent(event.target.value)} className="min-h-[390px] bg-background/40 font-mono text-[9px] leading-relaxed" spellCheck={false} />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={applyJson}>Apply JSON</Button>
              <Button type="button" variant="outline" onClick={restoreDefaults} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Reset draft</Button>
            </div>
          </div>
        ) : null}

        <Button type="button" onClick={save} disabled={saving} className="w-full gap-2">
          <Save className="h-4 w-4" /> {saving ? "Publishing…" : "Publish frontend changes"}
        </Button>
      </div>
    </SectionCard>
  );
}

function ContentTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-1 py-2 text-[9px] font-semibold uppercase tracking-wide transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>;
}

function ContentGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3 rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{title}</p>{children}</div>;
}

function ContentField({ label, value, onChange, hint, multiline = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; hint?: string; multiline?: boolean; type?: "text" | "url" }) {
  return <div className="space-y-1.5"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>{multiline ? <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-20 bg-background/40 text-[11px]" /> : <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 bg-background/40 text-[11px]" />}{hint ? <p className="text-[9px] leading-relaxed text-muted-foreground/80">{hint}</p> : null}</div>;
}

function TeamRankingsPanel() {
  const qc = useQueryClient();
  const players = usePlayers();
  const rankings = useQuery({
    queryKey: ["team_rankings"],
    queryFn: fetchTeamRankings,
    staleTime: QUERY_STALE_MS,
  });
  const teams = useMemo(
    () =>
      Array.from(
        new Set((players.data ?? []).flatMap((player) => (player.team ? [player.team] : []))),
      ).sort(),
    [players.data],
  );
  const [orderedTeams, setOrderedTeams] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TeamRankingStatus | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teams.length === 0 || !rankings.isSuccess || orderedTeams.length > 0) return;
    const savedTeams = (rankings.data ?? [])
      .map((ranking) => ranking.team)
      .filter((team) => teams.includes(team));
    setOrderedTeams([...savedTeams, ...teams.filter((team) => !savedTeams.includes(team))]);
    setStatuses(
      Object.fromEntries((rankings.data ?? []).map((ranking) => [ranking.team, ranking.status])),
    );
  }, [rankings.data, rankings.isSuccess, teams, orderedTeams.length]);

  const changePosition = (position: number, team: string) => {
    setOrderedTeams((current) => {
      const next = [...current];
      const oldPosition = next.indexOf(team);
      if (oldPosition >= 0) {
        [next[position], next[oldPosition]] = [next[oldPosition], next[position]];
      } else {
        next[position] = team;
      }
      return next;
    });
  };

  const save = async () => {
    if (orderedTeams.length !== teams.length || new Set(orderedTeams).size !== teams.length) {
      toast.error("Assign every team to exactly one position.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("team_rankings").upsert(
      orderedTeams.map((team, index) => ({
        team,
        position: index + 1,
        status: statuses[team] ?? null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "team" },
    );
    setSaving(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Overall team ranking updated");
      qc.invalidateQueries({ queryKey: ["team_rankings"] });
    }
  };

  return (
    <SectionCard
      title="Overall Team Ranking"
      icon={<ListOrdered className="h-4 w-4 text-primary" />}
    >
      <p className="text-[10px] text-muted-foreground leading-relaxed mb-4">
        Choose the team in each position. This list is separate from league points and match
        results.
      </p>
      {players.isLoading || rankings.isLoading ? (
        <p className="py-6 text-center text-[11px] text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {teams.map((_, index) => {
            const selectedTeam = orderedTeams[index];
            return (
              <div
                key={index}
                className="rounded-lg bg-white/[0.02] ring-1 ring-white/[0.05] p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 text-center text-[12px] font-bold ${
                      index === 0 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {selectedTeam && teamLogos[selectedTeam] && (
                    <img src={teamLogos[selectedTeam]} alt="" className="h-6 w-6 object-contain" />
                  )}
                  <Select
                    value={selectedTeam ?? ""}
                    onValueChange={(team) => changePosition(index, team)}
                  >
                    <SelectTrigger className="flex-1 h-9 text-[10px]">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select
                  value={selectedTeam ? (statuses[selectedTeam] ?? "none") : "none"}
                  onValueChange={(status) => {
                    if (!selectedTeam) return;
                    setStatuses((current) => ({
                      ...current,
                      [selectedTeam]: status === "none" ? null : (status as TeamRankingStatus),
                    }));
                  }}
                  disabled={!selectedTeam}
                >
                  <SelectTrigger className="h-9 text-[10px]">
                    <SelectValue placeholder="Add status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No status</SelectItem>
                    {Object.entries(TEAM_RANKING_STATUS_LABELS).map(([status, label]) => (
                      <SelectItem key={status} value={status}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          <Button onClick={save} disabled={saving || teams.length === 0} className="w-full mt-3">
            {saving ? "Saving…" : "Save ranking"}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <main className="w-full max-w-[420px] relative">
        <div className="px-5 pb-10 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> Back to standings
          </Link>
          {children}
          <GlobalFooter />
        </div>
      </main>
    </div>
  );
}

function ClaimAdminCard() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const claimed = useQuery({
    queryKey: ["admin_claimed"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_claimed");
      if (error) throw error;
      return data as boolean;
    },
  });

  const claim = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("claim_admin");
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("You are now the admin");
      qc.invalidateQueries();
      window.location.reload();
    }
  };

  return (
    <SectionCard title="Admin Seat" icon={<Crown className="h-4 w-4 text-primary" />}>
      {claimed.isLoading ? (
        <p className="text-[11px] text-muted-foreground">Checking…</p>
      ) : claimed.data ? (
        <div className="rounded-xl bg-white/[0.02] ring-1 ring-white/[0.05] p-4 text-center">
          <p className="text-[12px] text-foreground font-medium">
            The admin seat is already taken.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            This tournament allows exactly one admin.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-1 ring-primary/30 p-4 text-center space-y-3">
          <p className="text-[12px] text-foreground font-medium">No admin claimed yet.</p>
          <Button onClick={claim} disabled={busy} className="w-full">
            {busy ? "Claiming…" : "Claim admin seat"}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ["players"],
    staleTime: QUERY_STALE_MS,
    queryFn: fetchPlayers,
  });
}

function useMatches() {
  return useQuery<Match[]>({
    queryKey: ["matches"],
    staleTime: QUERY_STALE_MS,
    queryFn: fetchMatches,
  });
}

function sortPlayers(players: Player[]) {
  return [...players].sort(
    (a, b) =>
      (CATEGORY_ORDER[String(a.category)] ?? 99) - (CATEGORY_ORDER[String(b.category)] ?? 99) ||
      (a.ranking ?? 99) - (b.ranking ?? 99) ||
      a.name.localeCompare(b.name),
  );
}

type MatchForm = {
  team1: string;
  team2: string;
  team1_substitute: boolean;
  team2_substitute: boolean;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  team1_games: string;
  team2_games: string;
  tie_breaker: boolean;
  played_at: string;
};

const emptyForm = (): MatchForm => ({
  team1: "",
  team2: "",
  team1_substitute: false,
  team2_substitute: false,
  team1_player1_id: "",
  team1_player2_id: "",
  team2_player1_id: "",
  team2_player2_id: "",
  team1_games: "",
  team2_games: "",
  tie_breaker: false,
  played_at: new Date().toISOString().slice(0, 10),
});

function validateForm(f: MatchForm): string | null {
  if (!f.team1 || !f.team2) return "Pick both teams.";
  if (f.team1 === f.team2) return "Teams must be different.";
  const ids = [f.team1_player1_id, f.team1_player2_id, f.team2_player1_id, f.team2_player2_id];
  if (ids.some((id) => !id)) return "Select two players for each team.";
  if (new Set(ids).size !== 4) return "A player can't be picked twice.";
  const g1 = parseInt(f.team1_games, 10);
  const g2 = parseInt(f.team2_games, 10);
  if (!Number.isFinite(g1) || !Number.isFinite(g2) || g1 < 0 || g2 < 0)
    return "Enter valid game scores.";
  if (g1 === g2) return "Game scores can't be tied.";
  if (!f.played_at) return "Pick a date.";
  return null;
}

function MatchEntryPanel() {
  const qc = useQueryClient();
  const players = usePlayers();
  const [form, setForm] = useState<MatchForm>(emptyForm);
  const team1Lineup = useQuery<LockedSeason5Lineup | null>({
    queryKey: ["season5_locked_lineup", form.team1, form.played_at],
    enabled: Boolean(form.team1 && form.played_at),
    queryFn: () => fetchLockedSeason5Lineup(form.team1, form.played_at),
  });
  const team2Lineup = useQuery<LockedSeason5Lineup | null>({
    queryKey: ["season5_locked_lineup", form.team2, form.played_at],
    enabled: Boolean(form.team2 && form.played_at),
    queryFn: () => fetchLockedSeason5Lineup(form.team2, form.played_at),
  });

  const submit = async () => {
    if (!team1Lineup.data || !team2Lineup.data) return toast.error("Lock a Season 5 lineup for both teams before recording games.");
    const err = validateForm(form);
    if (err) return toast.error(err);
    const payload = {
      team1_name: form.team1,
      team2_name: form.team2,
      team1_player1_id: form.team1_player1_id,
      team1_player2_id: form.team1_player2_id,
      team2_player1_id: form.team2_player1_id,
      team2_player2_id: form.team2_player2_id,
      team1_games: parseInt(form.team1_games, 10),
      team2_games: parseInt(form.team2_games, 10),
      tie_breaker: form.tie_breaker,
      played_at: new Date(form.played_at).toISOString(),
    };
    let { error } = await supabase.from("matches").insert(payload as never);
    const savedWithoutTeamNames = isMissingMatchTeamNameColumn(error);

    if (savedWithoutTeamNames) {
      const legacy = await supabase.from("matches").insert(withoutMatchTeamNames(payload) as never);
      error = legacy.error;
    }

    if (error) return toast.error(error.message);
    toast.success(
      savedWithoutTeamNames
        ? "Match recorded. Apply the substitution migration to save playing team names."
        : "Match recorded",
    );
    setForm(emptyForm());
    qc.invalidateQueries({ queryKey: ["matches"] });
  };

  return (
    <SectionCard title="Record Match" icon={<Swords className="h-4 w-4 text-primary" />}>
      <MatchFormFields form={form} setForm={setForm} players={players.data ?? []} team1Lineup={team1Lineup.data} team2Lineup={team2Lineup.data} lineupLoading={team1Lineup.isLoading || team2Lineup.isLoading} />
      <Button className="w-full mt-4" onClick={submit} disabled={!team1Lineup.data || !team2Lineup.data}>
        Save match
      </Button>
    </SectionCard>
  );
}

function MatchFormFields({
  form,
  setForm,
  players,
  team1Lineup,
  team2Lineup,
  lineupLoading,
}: {
  form: MatchForm;
  setForm: (f: MatchForm) => void;
  players: Player[];
  team1Lineup: LockedSeason5Lineup | null | undefined;
  team2Lineup: LockedSeason5Lineup | null | undefined;
  lineupLoading: boolean;
}) {
  const teams = useMemo(() => {
    const s = new Set<string>();
    for (const p of players) if (p.team) s.add(p.team);
    return [...s].sort();
  }, [players]);

  const set = (patch: Partial<MatchForm>) => setForm({ ...form, ...patch });

  const playerOptions = (team: string, lineup: LockedSeason5Lineup | null | undefined) => {
    if (!lineup) return [];
    const activeIds = new Set(lineup.players.filter((player) => player.lineup_status === "ACTIVE").map((player) => player.player_id));
    return sortPlayers(players.filter((player) => player.team === team && activeIds.has(player.id)));
  };
  const playingTierById = (lineup: LockedSeason5Lineup | null | undefined) => new Map((lineup?.players ?? []).map((player) => [player.player_id, player.nightly_playing_tier]));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Team 1
          </Label>
          <Select
            value={form.team1}
            onValueChange={(v) =>
              set({
                team1: v,
                team1_substitute: false,
                team1_player1_id: "",
                team1_player2_id: "",
              })
            }
          >
            <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-[12px]">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              {teams
                .filter((t) => t !== form.team2)
                .map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Team 2
          </Label>
          <Select
            value={form.team2}
            onValueChange={(v) =>
              set({
                team2: v,
                team2_substitute: false,
                team2_player1_id: "",
                team2_player2_id: "",
              })
            }
          >
            <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-[12px]">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              {teams
                .filter((t) => t !== form.team1)
                .map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.team1 ? (
        <PairBlock label={`${form.team1} active pair`}>

          <PlayerSelect
            value={form.team1_player1_id}
            onChange={(v) => set({ team1_player1_id: v })}
            players={playerOptions(form.team1, team1Lineup)}
            exclude={[form.team1_player2_id]}
            playingTeam={form.team1}
            nightlyTierById={playingTierById(team1Lineup)}
          />
          <PlayerSelect
            value={form.team1_player2_id}
            onChange={(v) => set({ team1_player2_id: v })}
            players={playerOptions(form.team1, team1Lineup)}
            exclude={[form.team1_player1_id]}
            playingTeam={form.team1}
            nightlyTierById={playingTierById(team1Lineup)}
          />
        </PairBlock>
      ) : null}

      {form.team2 ? (
        <PairBlock label={`${form.team2} active pair`}>

          <PlayerSelect
            value={form.team2_player1_id}
            onChange={(v) => set({ team2_player1_id: v })}
            players={playerOptions(form.team2, team2Lineup)}
            exclude={[form.team2_player2_id]}
            playingTeam={form.team2}
            nightlyTierById={playingTierById(team2Lineup)}
          />
          <PlayerSelect
            value={form.team2_player2_id}
            onChange={(v) => set({ team2_player2_id: v })}
            players={playerOptions(form.team2, team2Lineup)}
            exclude={[form.team2_player1_id]}
            playingTeam={form.team2}
            nightlyTierById={playingTierById(team2Lineup)}
          />
        </PairBlock>
      ) : null}

      {form.team1 && form.team2 ? <p className={`rounded-xl px-3 py-2 text-[10px] leading-relaxed ring-1 ${team1Lineup && team2Lineup ? "bg-emerald-400/[0.06] text-emerald-200 ring-emerald-400/15" : "bg-amber-400/[0.06] text-amber-200 ring-amber-400/15"}`}>{lineupLoading ? "Checking locked Season 5 lineups…" : team1Lineup && team2Lineup ? "Only active players from the locked nightly lineups can be selected. Sit-out players and top-to-bottom replacements are unavailable." : "Generate and lock a Season 5 lineup for both teams on this date before recording games."}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="T1 games"
          value={form.team1_games}
          onChange={(v) => set({ team1_games: v })}
        />
        <NumberField
          label="T2 games"
          value={form.team2_games}
          onChange={(v) => set({ team2_games: v })}
        />
      </div>

      <label className="flex items-center gap-2 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.05] px-3 py-2 cursor-pointer">
        <Checkbox
          checked={form.tie_breaker}
          onCheckedChange={(v) => set({ tie_breaker: v === true })}
        />
        <span className="text-[11px] text-foreground">Match went to a tiebreak</span>
      </label>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Date played
        </Label>
        <Input
          type="date"
          value={form.played_at}
          onChange={(e) => set({ played_at: e.target.value })}
          className="bg-white/[0.03] border-white/[0.06]"
        />
      </div>
    </div>
  );
}

function PairBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function SubstituteToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="col-span-2 flex items-center gap-2 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.05] px-3 py-2 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <span className="text-[11px] text-foreground">Substitute from any team</span>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/[0.03] border-white/[0.06] tabular-nums"
      />
    </div>
  );
}

function PlayerSelect({
  value,
  onChange,
  players,
  exclude,
  playingTeam: _playingTeam,
  nightlyTierById,
}: {
  value: string;
  onChange: (v: string) => void;
  players: Player[];
  exclude: string[];
  playingTeam: string;
  nightlyTierById?: Map<string, string>;
}) {
  const options = players.filter((p) => !exclude.includes(p.id) || p.id === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-[12px]">
        <SelectValue placeholder="Player" />
      </SelectTrigger>
      <SelectContent>
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} {nightlyTierById?.get(p.id) ? `· Nightly ${nightlyTierById.get(p.id)}` : p.category ? `· Official ${p.category}` : ""}
            {p.team && p.team !== _playingTeam ? ` (${p.team})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type EliminatorForm = {
  team1: string;
  team2: string;
  team1_substitute: boolean;
  team2_substitute: boolean;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  team1_games: string;
  team2_games: string;
  played_at: string;
};

const emptyEliminatorForm = (): EliminatorForm => ({
  team1: "",
  team2: "",
  team1_substitute: false,
  team2_substitute: false,
  team1_player1_id: "",
  team1_player2_id: "",
  team2_player1_id: "",
  team2_player2_id: "",
  team1_games: "",
  team2_games: "",
  played_at: new Date().toISOString().slice(0, 10),
});

function validateEliminatorForm(f: EliminatorForm): string | null {
  if (!f.team1 || !f.team2) return "Pick both teams.";
  if (f.team1 === f.team2) return "Teams must be different.";
  const ids = [f.team1_player1_id, f.team1_player2_id, f.team2_player1_id, f.team2_player2_id];
  if (ids.some((id) => !id)) return "Select two players for each team.";
  if (new Set(ids).size !== 4) return "A player can't be picked twice.";
  const g1 = parseInt(f.team1_games, 10);
  const g2 = parseInt(f.team2_games, 10);
  if (!Number.isFinite(g1) || !Number.isFinite(g2) || g1 < 0 || g2 < 0) {
    return "Enter valid game scores.";
  }
  if (g1 === g2) return "Game scores can't be tied.";
  if (!f.played_at) return "Pick a date.";
  return null;
}

function useEliminatorMatches() {
  return useQuery<EliminatorMatch[]>({
    queryKey: ["eliminator_matches"],
    staleTime: QUERY_STALE_MS,
    queryFn: fetchEliminatorMatches,
  });
}

function EliminatorsPanel() {
  const qc = useQueryClient();
  const players = usePlayers();
  const matches = useEliminatorMatches();
  const [form, setForm] = useState<EliminatorForm>(emptyEliminatorForm);
  const playerById = useMemo(
    () => new Map((players.data ?? []).map((p) => [p.id, p])),
    [players.data],
  );
  const standings = useMemo(
    () => computeEliminatorStandings(matches.data ?? [], players.data ?? []),
    [matches.data, players.data],
  );
  const teams = useMemo(() => {
    const s = new Set<string>();
    for (const p of players.data ?? []) if (p.team) s.add(p.team);
    return [...s].sort();
  }, [players.data]);

  const set = (patch: Partial<EliminatorForm>) => setForm({ ...form, ...patch });

  const playersOnTeam = (team: string) =>
    sortPlayers((players.data ?? []).filter((p) => p.team === team));

  const playerOptions = (team: string, substitute: boolean) =>
    substitute ? sortPlayers(players.data ?? []) : playersOnTeam(team);

  const submit = async () => {
    const err = validateEliminatorForm(form);
    if (err) return toast.error(err);

    const { error } = await supabase.from("eliminator_matches").insert({
      team1_player1_id: form.team1_player1_id,
      team1_player2_id: form.team1_player2_id,
      team2_player1_id: form.team2_player1_id,
      team2_player2_id: form.team2_player2_id,
      team1_games: parseInt(form.team1_games, 10),
      team2_games: parseInt(form.team2_games, 10),
      played_at: new Date(form.played_at).toISOString(),
    } as never);

    if (error) return toast.error(error.message);
    toast.success("Eliminator game recorded");
    setForm(emptyEliminatorForm());
    qc.invalidateQueries({ queryKey: ["eliminator_matches"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this eliminator game?")) return;
    const { error } = await supabase.from("eliminator_matches").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Eliminator game deleted");
      qc.invalidateQueries({ queryKey: ["eliminator_matches"] });
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Record Eliminator" icon={<Trophy className="h-4 w-4 text-primary" />}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Team 1
              </Label>
              <Select
                value={form.team1}
                onValueChange={(v) =>
                  set({
                    team1: v,
                    team1_substitute: false,
                    team1_player1_id: "",
                    team1_player2_id: "",
                  })
                }
              >
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-[12px]">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  {teams
                    .filter((t) => t !== form.team2)
                    .map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Team 2
              </Label>
              <Select
                value={form.team2}
                onValueChange={(v) =>
                  set({
                    team2: v,
                    team2_substitute: false,
                    team2_player1_id: "",
                    team2_player2_id: "",
                  })
                }
              >
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-[12px]">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  {teams
                    .filter((t) => t !== form.team1)
                    .map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.team1 ? (
            <PairBlock label={`${form.team1} pair`}>
              <SubstituteToggle
                checked={form.team1_substitute}
                onChange={(v) =>
                  set({
                    team1_substitute: v,
                    team1_player1_id: "",
                    team1_player2_id: "",
                  })
                }
              />
              <PlayerSelect
                value={form.team1_player1_id}
                onChange={(v) => set({ team1_player1_id: v })}
                players={playerOptions(form.team1, form.team1_substitute)}
                exclude={[form.team1_player2_id, form.team2_player1_id, form.team2_player2_id]}
                playingTeam={form.team1}
              />
              <PlayerSelect
                value={form.team1_player2_id}
                onChange={(v) => set({ team1_player2_id: v })}
                players={playerOptions(form.team1, form.team1_substitute)}
                exclude={[form.team1_player1_id, form.team2_player1_id, form.team2_player2_id]}
                playingTeam={form.team1}
              />
            </PairBlock>
          ) : null}

          {form.team2 ? (
            <PairBlock label={`${form.team2} pair`}>
              <SubstituteToggle
                checked={form.team2_substitute}
                onChange={(v) =>
                  set({
                    team2_substitute: v,
                    team2_player1_id: "",
                    team2_player2_id: "",
                  })
                }
              />
              <PlayerSelect
                value={form.team2_player1_id}
                onChange={(v) => set({ team2_player1_id: v })}
                players={playerOptions(form.team2, form.team2_substitute)}
                exclude={[form.team1_player1_id, form.team1_player2_id, form.team2_player2_id]}
                playingTeam={form.team2}
              />
              <PlayerSelect
                value={form.team2_player2_id}
                onChange={(v) => set({ team2_player2_id: v })}
                players={playerOptions(form.team2, form.team2_substitute)}
                exclude={[form.team1_player1_id, form.team1_player2_id, form.team2_player1_id]}
                playingTeam={form.team2}
              />
            </PairBlock>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="T1 games"
              value={form.team1_games}
              onChange={(v) => set({ team1_games: v })}
            />
            <NumberField
              label="T2 games"
              value={form.team2_games}
              onChange={(v) => set({ team2_games: v })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Date played
            </Label>
            <Input
              type="date"
              value={form.played_at}
              onChange={(e) => set({ played_at: e.target.value })}
              className="bg-white/[0.03] border-white/[0.06]"
            />
          </div>

          <Button className="w-full" onClick={submit}>
            Save eliminator game
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Eliminator Standings" icon={<Trophy className="h-4 w-4 text-primary" />}>
        <div className="space-y-2">
          {standings.length === 0 && (
            <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
              No eliminator games recorded yet.
            </p>
          )}
          {standings.map((standing, index) => {
            const player = playerById.get(standing.playerId);
            return (
              <div
                key={standing.playerId}
                className="flex items-center gap-2 rounded-lg bg-white/[0.02] ring-1 ring-white/[0.04] p-2"
              >
                <span className="w-5 text-center text-[10px] font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <PlayerTeamLogo player={player} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-foreground">
                    {player?.name ?? "Unknown"}
                  </p>
                  <p className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">
                    {player?.team ?? "Unassigned"} · {standing.matches}M · {standing.wins}W-
                    {standing.losses}L
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-[13px] font-bold tabular-nums ${
                      standing.averageGameDiff > 0
                        ? "text-emerald-400"
                        : standing.averageGameDiff < 0
                          ? "text-red-400"
                          : "text-foreground"
                    }`}
                  >
                    {standing.averageGameDiff > 0 ? "+" : ""}
                    {formatDecimal(standing.averageGameDiff)}
                  </p>
                  <p className="text-[8px] uppercase tracking-wider text-muted-foreground">
                    Avg Pts
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Eliminator Games" icon={<Swords className="h-4 w-4 text-primary" />}>
        <div className="space-y-2">
          {(matches.data ?? []).length === 0 && (
            <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
              No eliminator games recorded yet.
            </p>
          )}
          {(matches.data ?? []).map((match) => (
            <div key={match.id} className="rounded-lg bg-white/[0.02] ring-1 ring-white/[0.04] p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {new Date(match.played_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => remove(match.id)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="text-[11px] text-foreground">
                <span className={match.team1_games > match.team2_games ? "font-bold" : ""}>
                  {playerById.get(match.team1_player1_id)?.name} &amp;{" "}
                  {playerById.get(match.team1_player2_id)?.name}
                </span>
                <span className="mx-2 font-mono text-primary">
                  {match.team1_games} - {match.team2_games}
                </span>
                <span className={match.team2_games > match.team1_games ? "font-bold" : ""}>
                  {playerById.get(match.team2_player1_id)?.name} &amp;{" "}
                  {playerById.get(match.team2_player2_id)?.name}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <EliminatorPairLogos
                  players={[
                    playerById.get(match.team1_player1_id),
                    playerById.get(match.team1_player2_id),
                  ]}
                />
                <EliminatorPairLogos
                  players={[
                    playerById.get(match.team2_player1_id),
                    playerById.get(match.team2_player2_id),
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function EliminatorPlayerSelect({
  value,
  onChange,
  players,
  exclude,
}: {
  value: string;
  onChange: (v: string) => void;
  players: Player[];
  exclude: string[];
}) {
  const options = sortPlayers(players).filter((p) => !exclude.includes(p.id) || p.id === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-[12px]">
        <SelectValue placeholder="Player" />
      </SelectTrigger>
      <SelectContent>
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} {p.team ? `(${p.team})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PlayerTeamLogo({ player }: { player?: Player }) {
  const logo = player?.team ? teamLogos[player.team] : null;

  if (!logo) {
    return <div className="h-7 w-7 rounded-full bg-white/10 flex-shrink-0" />;
  }

  return (
    <div className="h-7 w-7 rounded-full bg-zinc-900/70 ring-1 ring-white/[0.08] overflow-hidden flex-shrink-0">
      <img
        src={logo}
        alt={player?.team ?? ""}
        className="h-full w-full object-contain p-0.5"
        loading="lazy"
      />
    </div>
  );
}

function EliminatorPairLogos({ players }: { players: Array<Player | undefined> }) {
  return (
    <div className="space-y-1 rounded-lg bg-black/10 ring-1 ring-white/[0.04] p-2">
      {players.map((player, index) => (
        <div key={player?.id ?? index} className="flex items-center gap-1.5 min-w-0">
          <PlayerTeamLogo player={player} />
          <div className="min-w-0">
            <p className="truncate text-[10px] text-foreground">{player?.name ?? "Unknown"}</p>
            <p className="truncate text-[8px] uppercase tracking-wider text-muted-foreground">
              {player?.team ?? "Unassigned"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDecimal(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

type MatchGroup = {
  dateKey: string;
  dateLabel: string;
  fixtures: {
    key: string;
    team1: string;
    team2: string;
    matches: Match[];
  }[];
};

function MatchListPanel() {
  const qc = useQueryClient();
  const players = usePlayers();
  const matches = useMatches();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<MatchForm>(emptyForm);
  const playerById = useMemo(
    () => new Map((players.data ?? []).map((p) => [p.id, p])),
    [players.data],
  );
  const editLineup1 = useQuery<LockedSeason5Lineup | null>({
    queryKey: ["season5_locked_lineup", form.team1, form.played_at],
    enabled: Boolean(editing && form.team1 && form.played_at),
    queryFn: () => fetchLockedSeason5Lineup(form.team1, form.played_at),
  });
  const editLineup2 = useQuery<LockedSeason5Lineup | null>({
    queryKey: ["season5_locked_lineup", form.team2, form.played_at],
    enabled: Boolean(editing && form.team2 && form.played_at),
    queryFn: () => fetchLockedSeason5Lineup(form.team2, form.played_at),
  });
  const matchGroups = useMemo<MatchGroup[]>(() => {
    const byDate = new Map<string, MatchGroup>();

    for (const match of matches.data ?? []) {
      const date = new Date(match.played_at);
      const dateKey = Number.isNaN(date.getTime())
        ? match.played_at.slice(0, 10)
        : date.toISOString().slice(0, 10);
      const dateLabel = Number.isNaN(date.getTime())
        ? dateKey
        : date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });
      const team1 = match.team1_name ?? playerById.get(match.team1_player1_id)?.team ?? "?";
      const team2 = match.team2_name ?? playerById.get(match.team2_player1_id)?.team ?? "?";
      const fixtureKey = `${team1}__${team2}`;

      let dateGroup = byDate.get(dateKey);
      if (!dateGroup) {
        dateGroup = { dateKey, dateLabel, fixtures: [] };
        byDate.set(dateKey, dateGroup);
      }

      let fixture = dateGroup.fixtures.find((f) => f.key === fixtureKey);
      if (!fixture) {
        fixture = { key: fixtureKey, team1, team2, matches: [] };
        dateGroup.fixtures.push(fixture);
      }

      fixture.matches.push(match);
    }

    return [...byDate.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [matches.data, playerById]);

  const startEdit = (m: Match) => {
    const t1 = m.team1_name ?? playerById.get(m.team1_player1_id)?.team ?? "";
    const t2 = m.team2_name ?? playerById.get(m.team2_player1_id)?.team ?? "";
    setEditing(m.id);
    setForm({
      team1: t1,
      team2: t2,
      team1_substitute: [m.team1_player1_id, m.team1_player2_id].some(
        (id) => playerById.get(id)?.team !== t1,
      ),
      team2_substitute: [m.team2_player1_id, m.team2_player2_id].some(
        (id) => playerById.get(id)?.team !== t2,
      ),
      team1_player1_id: m.team1_player1_id,
      team1_player2_id: m.team1_player2_id,
      team2_player1_id: m.team2_player1_id,
      team2_player2_id: m.team2_player2_id,
      team1_games: String(m.team1_games),
      team2_games: String(m.team2_games),
      tie_breaker: !!m.tie_breaker,
      played_at: new Date(m.played_at).toISOString().slice(0, 10),
    });
  };

  const saveEdit = async () => {
    if (!editLineup1.data || !editLineup2.data) return toast.error("Lock a Season 5 lineup for both teams before editing games.");
    const err = validateForm(form);
    if (err) return toast.error(err);
    if (!editing) return;
    const payload = {
      team1_name: form.team1,
      team2_name: form.team2,
      team1_player1_id: form.team1_player1_id,
      team1_player2_id: form.team1_player2_id,
      team2_player1_id: form.team2_player1_id,
      team2_player2_id: form.team2_player2_id,
      team1_games: parseInt(form.team1_games, 10),
      team2_games: parseInt(form.team2_games, 10),
      tie_breaker: form.tie_breaker,
      played_at: new Date(form.played_at).toISOString(),
    };
    let { error } = await supabase
      .from("matches")
      .update(payload as never)
      .eq("id", editing);
    const savedWithoutTeamNames = isMissingMatchTeamNameColumn(error);

    if (savedWithoutTeamNames) {
      const legacy = await supabase
        .from("matches")
        .update(withoutMatchTeamNames(payload) as never)
        .eq("id", editing);
      error = legacy.error;
    }

    if (error) return toast.error(error.message);
    toast.success(
      savedWithoutTeamNames
        ? "Match updated. Apply the substitution migration to save playing team names."
        : "Match updated",
    );
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["matches"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this match?")) return;
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Match deleted");
      qc.invalidateQueries({ queryKey: ["matches"] });
    }
  };

  return (
    <SectionCard title="Manage Matches" icon={<Swords className="h-4 w-4 text-primary" />}>
      <div className="space-y-2">
        {(matches.data ?? []).length === 0 && (
          <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">No matches yet.</p>
        )}
        {matchGroups.map((dateGroup) => (
          <div key={dateGroup.dateKey} className="space-y-2">
            <div className="px-1 pt-2 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              {dateGroup.dateLabel}
            </div>

            {dateGroup.fixtures.map((fixture) => (
              <div
                key={`${dateGroup.dateKey}-${fixture.key}`}
                className="rounded-xl bg-white/[0.02] ring-1 ring-white/[0.05] p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <TeamFixtureHeading team1={fixture.team1} team2={fixture.team2} />
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground">
                    {fixture.matches.length} games
                  </span>
                </div>

                <div className="space-y-1.5">
                  {fixture.matches.map((m) => (
                    <div key={m.id} className="rounded-lg bg-black/10 ring-1 ring-white/[0.04] p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-foreground">
                            <span className={m.team1_games > m.team2_games ? "font-bold" : ""}>
                              {playerById.get(m.team1_player1_id)?.name} &amp;{" "}
                              {playerById.get(m.team1_player2_id)?.name}
                            </span>
                            <span className="text-primary font-mono mx-2">
                              {m.team1_games} - {m.team2_games}
                            </span>
                            <span className={m.team2_games > m.team1_games ? "font-bold" : ""}>
                              {playerById.get(m.team2_player1_id)?.name} &amp;{" "}
                              {playerById.get(m.team2_player2_id)?.name}
                            </span>
                            {m.tie_breaker ? (
                              <span className="ml-1 text-[8px] text-muted-foreground">TB</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(m)}
                            className="text-muted-foreground hover:text-primary p-1"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => remove(m.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        {(matches.data ?? []).slice(0, 0).map((m) => {
          const t1 = m.team1_name ?? playerById.get(m.team1_player1_id)?.team ?? "?";
          const t2 = m.team2_name ?? playerById.get(m.team2_player1_id)?.team ?? "?";
          return (
            <div key={m.id} className="rounded-xl p-3 bg-white/[0.02] ring-1 ring-white/[0.04]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {new Date(m.played_at).toLocaleDateString()}
                  {m.tie_breaker ? " · TB" : ""}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(m)}
                    className="text-muted-foreground hover:text-primary p-1"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-foreground">
                <span className={m.team1_games > m.team2_games ? "font-bold" : ""}>{t1}</span>
                <span className="text-primary font-mono mx-2">
                  {m.team1_games}–{m.team2_games}
                </span>
                <span className={m.team2_games > m.team1_games ? "font-bold" : ""}>{t2}</span>
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                {playerById.get(m.team1_player1_id)?.name} &amp;{" "}
                {playerById.get(m.team1_player2_id)?.name} vs{" "}
                {playerById.get(m.team2_player1_id)?.name} &amp;{" "}
                {playerById.get(m.team2_player2_id)?.name}
              </div>
            </div>
          );
        })}

        {editing && (
          <div className="mt-4 rounded-xl bg-white/[0.02] ring-1 ring-primary/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-foreground">Edit match</h3>
              <button
                onClick={() => setEditing(null)}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <MatchFormFields form={form} setForm={setForm} players={players.data ?? []} team1Lineup={editLineup1.data} team2Lineup={editLineup2.data} lineupLoading={editLineup1.isLoading || editLineup2.isLoading} />
            <Button onClick={saveEdit} className="w-full" size="sm" disabled={!editLineup1.data || !editLineup2.data}>
              Save changes
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function TeamFixtureHeading({ team1, team2 }: { team1: string; team2: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <TeamBadge team={team1} />
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">vs</span>
      <TeamBadge team={team2} />
    </div>
  );
}

function TeamBadge({ team }: { team: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {teamLogos[team] ? (
        <img
          src={teamLogos[team]}
          alt={team}
          className="h-5 w-5 object-contain flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="h-5 w-5 rounded-full bg-white/10 flex-shrink-0" />
      )}
      <span className="text-[10px] font-bold uppercase tracking-wide text-foreground truncate">
        {team}
      </span>
    </div>
  );
}
