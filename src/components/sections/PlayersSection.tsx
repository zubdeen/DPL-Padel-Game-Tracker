"use client";

import { memo, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Crown, Search, TrendingUp, Users, X } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { computePlayerStandings, type Match, type PlayerStanding } from "@/lib/scoring";
import type { EliminatorMatch } from "@/lib/eliminators";
import { defaultSiteContent, getTeamLogo, useSiteContent, type SiteContent } from "@/lib/site-content";

interface Props {
  players: import("@/lib/scoring").Player[];
  matches: Match[];
  eliminatorMatches?: EliminatorMatch[];
}

const CATEGORY_ORDER = ["M1", "M2", "Star", "Core", "Dev"];
const CATEGORIES = [
  { id: "all", label: "All" }, { id: "M1", label: "M1" }, { id: "M2", label: "M2" },
  { id: "Star", label: "Star" }, { id: "Core", label: "Core" }, { id: "Dev", label: "Dev" },
];
const CATEGORY_COLORS: Record<string, string> = { M1: "from-yellow-500/15 to-transparent ring-yellow-500/30", M2: "from-blue-500/15 to-transparent ring-blue-500/30", Star: "from-purple-500/15 to-transparent ring-purple-500/30", Core: "from-green-500/15 to-transparent ring-green-500/30", Dev: "from-orange-500/15 to-transparent ring-orange-500/30" };

function getInitials(name: string): string { return name.split(/[\s.]+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "?"; }
function formatPoints(points: number): string { const rounded = Math.round(points * 10) / 10; return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1); }

export const PlayersSection = memo(function PlayersSectionComponent({ players, matches, eliminatorMatches = [] }: Props) {
  const { data: configuredContent } = useSiteContent();
  const content = configuredContent ?? defaultSiteContent;
  const router = useRouter();
  const standings = useMemo(() => computePlayerStandings(players, matches, eliminatorMatches), [players, matches, eliminatorMatches]);
  const leagueStandings = useMemo(() => computePlayerStandings(players, matches), [players, matches]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const normalizedSearch = search.trim().toLowerCase();

  const filteredStandings = useMemo(() => standings.filter((standing) => (normalizedSearch.length === 0 || standing.player.name.toLowerCase().includes(normalizedSearch) || (standing.player.team ?? "").toLowerCase().includes(normalizedSearch)) && (activeCategory === "all" || standing.player.category === activeCategory)), [standings, normalizedSearch, activeCategory]);
  const sortedGroups = useMemo(() => {
    const groups = new Map<string, typeof standings>();
    for (const standing of filteredStandings) { const category = standing.player.category ?? "Dev"; if (!groups.has(category)) groups.set(category, []); groups.get(category)!.push(standing); }
    return Array.from(groups.entries()).sort((a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]));
  }, [filteredStandings]);
  const selectedStanding = standings.find((standing) => standing.player.id === selectedPlayerId) ?? null;
  const selectedLeagueStanding = leagueStandings.find((standing) => standing.player.id === selectedPlayerId) ?? null;

  return <div className="space-y-4">
    <div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search players or teams..." className="h-10 w-full rounded-xl border-0 bg-zinc-900/50 pl-9 pr-3 text-sm text-foreground ring-1 ring-white/[0.06] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-900/50 p-1 ring-1 ring-white/[0.04] scrollbar-hide">{CATEGORIES.map((category) => <button key={category.id} type="button" onClick={() => setActiveCategory(category.id)} className={`min-w-[52px] flex-1 rounded-lg px-2 py-2 text-[9px] font-semibold uppercase tracking-wide transition-all ${activeCategory === category.id ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"}`}>{category.label}</button>)}</div>
    <SectionCard title="Player Rankings" icon={<Users className="h-3.5 w-3.5 text-primary/70" />}>
      <div className="space-y-3">
        {filteredStandings.length === 0 ? <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">No players found.</p> : null}
        {sortedGroups.map(([category, categoryStandings]) => <div key={category}><div className={`space-y-1.5 rounded-lg bg-gradient-to-r p-3 ring-1 ${CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Dev}`}><div className="mb-2 flex items-center justify-between"><h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground">{category}</h3><span className="text-[9px] text-muted-foreground">{categoryStandings.length} players</span></div>{categoryStandings.map((standing, index) => <RankingRow key={standing.player.id} standing={standing} index={index} content={content} onClick={() => router.push(`/players/${standing.player.id}`)} />)}</div></div>)}
        <p className="pt-1 text-center text-[9px] text-muted-foreground/60">Select a player for their full ranking profile. Rating = average game difference per game.</p>
      </div>
    </SectionCard>
    {selectedStanding ? <PlayerProfile standing={selectedStanding} leagueStanding={selectedLeagueStanding} content={content} onClose={() => setSelectedPlayerId(null)} /> : null}
  </div>;
});

function RankingRow({ standing, index, content, onClick }: { standing: PlayerStanding; index: number; content: SiteContent; onClick: () => void }) {
  const leader = index === 0 && standing.matches > 0;
  const avatar = standing.player.avatar_url;
  const logo = standing.player.team ? getTeamLogo(content, standing.player.team) : "";
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-white/[0.12] ${leader ? "bg-white/10 ring-1 ring-white/20" : "bg-white/[0.03] ring-1 ring-white/[0.08]"}`}>
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[9px] font-bold ${leader ? "bg-yellow-500/30 text-yellow-300" : "bg-white/10 text-muted-foreground"}`}>{leader ? <Crown className="h-3.5 w-3.5" /> : index + 1}</div>
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-900/80 ring-1 ring-white/[0.08]">{avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : logo ? <img src={logo} alt="" className="h-full w-full object-contain p-0.5" /> : <span className="text-[9px] font-medium text-foreground">{getInitials(standing.player.name)}</span>}</div>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-[12px] font-medium text-foreground">{standing.player.name}</p><span className="rounded bg-primary/15 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-primary">{standing.player.category ?? "—"}</span>{standing.player.is_captain ? <span className="rounded bg-yellow-500/15 px-1 py-0.5 text-[7px] font-bold uppercase text-yellow-300">C</span> : null}</div><p className="mt-0.5 truncate text-[9px] text-muted-foreground"><span className="uppercase tracking-wider">{standing.player.team ?? "—"}</span> · {standing.matches}G · {standing.wins}W–{standing.losses}L</p></div>
    <div className="flex flex-col items-end"><span className={`text-sm font-bold tabular-nums ${standing.points > 0 ? "text-emerald-400" : standing.points < 0 ? "text-red-400" : "text-foreground"}`}>{standing.points > 0 ? "+" : ""}{formatPoints(standing.points)}</span><span className="text-[8px] uppercase tracking-wider text-muted-foreground">Rating</span></div>
  </button>;
}

function PlayerProfile({ standing, leagueStanding, content, onClose }: { standing: PlayerStanding; leagueStanding: PlayerStanding | null; content: SiteContent; onClose: () => void }) {
  const { player } = standing;
  const avatar = player.avatar_url;
  const logo = player.team ? getTeamLogo(content, player.team) : "";
  const winRate = standing.matches ? (standing.wins / standing.matches) * 100 : 0;
  const gameDifference = standing.gamesFor - standing.gamesAgainst;
  const leagueRecord = leagueStanding ? `${leagueStanding.wins}–${leagueStanding.losses}` : "0–0";
  const metrics = [
    ["Games played", String(standing.matches)], ["Wins", String(standing.wins)], ["Losses", String(standing.losses)],
    ["Win %", `${winRate.toFixed(1)}%`], ["League record", leagueRecord], ["Game difference", `${gameDifference > 0 ? "+" : ""}${gameDifference}`],
    ["Games for", String(standing.gamesFor)], ["Games against", String(standing.gamesAgainst)], ["Avg rating", formatPoints(standing.points)],
  ];
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"><div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-[420px] overflow-y-auto rounded-3xl bg-card p-4 shadow-2xl ring-1 ring-white/[0.12]"><div className="mb-4 flex justify-end"><button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground" aria-label="Close player profile"><X className="h-4 w-4" /></button></div><div className="flex flex-col items-center text-center"><div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-background/70 ring-2 ring-primary/35">{avatar ? <img src={avatar} alt={player.name} className="h-full w-full object-cover" /> : logo ? <img src={logo} alt="" className="h-full w-full object-contain p-2" /> : <span className="text-lg font-bold text-foreground">{getInitials(player.name)}</span>}</div><h2 className="text-lg font-bold text-foreground">{player.name}</h2><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-primary">{player.team ?? "Unassigned"} · {player.category ?? "No level"}</p></div><div className="mt-5 grid grid-cols-3 gap-2">{metrics.map(([label, value]) => <div key={label} className="rounded-xl bg-white/[0.03] p-2 text-center ring-1 ring-white/[0.06]"><p className="text-[13px] font-bold tabular-nums text-foreground">{value}</p><p className="mt-0.5 text-[8px] uppercase tracking-wide text-muted-foreground">{label}</p></div>)}</div><div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.06] p-3"><div className="mb-1.5 flex items-center gap-1.5 text-primary"><BarChart3 className="h-3.5 w-3.5" /><p className="text-[10px] font-bold uppercase tracking-widest">How rating is calculated</p></div><p className="text-[10px] leading-relaxed text-muted-foreground">For every game, the player earns their team&apos;s game difference. For example, a 6–3 win contributes +3 and a 3–6 loss contributes −3. The average rating is the total game difference divided by all games played. Eliminator game adjustments are included in the overall rating.</p></div><div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground"><TrendingUp className="h-3 w-3 text-primary" /> League record counts league fixtures only; overall metrics include eliminators.</div></div></div>;
}
