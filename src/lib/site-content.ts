"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dplLogo, teamLogos as defaultTeamLogos } from "@/lib/team-logos";

export type NavigationLabels = Record<
  "standings" | "players" | "teams" | "fixtures" | "schedule" | "banking" | "rules" | "help" | "admin",
  string
>;

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  court: string;
  notes: string;
}

export interface SiteContent {
  brand: {
    name: string;
    accentWord: string;
    seasonLabel: string;
    statusLabel: string;
    tagline: string;
    location: string;
    logoUrl: string;
    heroImageUrl: string;
    heroImageAlt: string;
  };
  home: {
    overviewTitle: string;
    standingsTitle: string;
    leagueTabLabel: string;
    championshipTabLabel: string;
    playerLabel: string;
    teamLabel: string;
    nightLabel: string;
  };
  navigation: NavigationLabels;
  banking: {
    title: string;
    intro: string;
  };
  schedule: {
    title: string;
    intro: string;
    leaguePhaseLabel: string;
    championshipLabel: string;
    awardsLabel: string;
    leagueEvents: ScheduleEvent[];
    eliminatorEvents: ScheduleEvent[];
  };
  rules: {
    cardTitle: string;
    subtitle: string;
    footer: string;
  };
  footer: {
    trackerLabel: string;
  };
  teamLogos: Record<string, string>;
}

export const defaultSiteContent: SiteContent = {
  brand: {
    name: "Diamond Padel League",
    accentWord: "Diamond",
    seasonLabel: "Season 5",
    statusLabel: "New Season",
    tagline: "A new chapter. The same championship standard.",
    location: "Gaborone, Botswana",
    logoUrl: dplLogo,
    heroImageUrl: "",
    heroImageAlt: "Diamond Padel League season artwork",
  },
  home: {
    overviewTitle: "Season Overview",
    standingsTitle: "Team Standings",
    leagueTabLabel: "League Phase",
    championshipTabLabel: "Championship Ranking",
    playerLabel: "Players",
    teamLabel: "Teams",
    nightLabel: "Match Nights",
  },
  navigation: {
    standings: "Standings",
    players: "Players",
    teams: "Teams",
    fixtures: "Fixtures",
    schedule: "Schedule",
    banking: "Banking",
    rules: "Rules",
    help: "Help",
    admin: "Admin",
  },
  banking: {
    title: "Payments & Wallet",
    intro: "Official DPL registration and participation payments",
  },
  schedule: {
    title: "Season Schedule",
    intro: "Fixtures, dates, and times will be published by the tournament administrator.",
    leaguePhaseLabel: "League",
    championshipLabel: "Eliminators",
    awardsLabel: "Awards Ceremony",
    leagueEvents: [],
    eliminatorEvents: [],
  },
  rules: {
    cardTitle: "Official Rulebook",
    subtitle: "Season 5 Official Rules & Regulations",
    footer: "Diamond Padel League — Gaborone, Botswana",
  },
  footer: {
    trackerLabel: "Padel Tournament Tracker",
  },
  teamLogos: defaultTeamLogos,
};

function mergeContent(content: unknown): SiteContent {
  if (!content || typeof content !== "object" || Array.isArray(content)) return defaultSiteContent;
  const raw = content as Partial<SiteContent>;
  return {
    ...defaultSiteContent,
    ...raw,
    brand: { ...defaultSiteContent.brand, ...(raw.brand ?? {}) },
    home: { ...defaultSiteContent.home, ...(raw.home ?? {}) },
    navigation: { ...defaultSiteContent.navigation, ...(raw.navigation ?? {}) },
    banking: { ...defaultSiteContent.banking, ...(raw.banking ?? {}) },
    schedule: {
      ...defaultSiteContent.schedule,
      ...(raw.schedule ?? {}),
      leagueEvents: Array.isArray(raw.schedule?.leagueEvents) ? raw.schedule.leagueEvents : defaultSiteContent.schedule.leagueEvents,
      eliminatorEvents: Array.isArray(raw.schedule?.eliminatorEvents) ? raw.schedule.eliminatorEvents : defaultSiteContent.schedule.eliminatorEvents,
    },
    rules: { ...defaultSiteContent.rules, ...(raw.rules ?? {}) },
    footer: { ...defaultSiteContent.footer, ...(raw.footer ?? {}) },
    teamLogos: { ...defaultTeamLogos, ...(raw.teamLogos ?? {}) },
  };
}

export function useSiteContent() {
  return useQuery({
    queryKey: ["site_content"],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<SiteContent> => {
      const { data, error } = await supabase
        .from("site_content" as never)
        .select("content" as never)
        .eq("id" as never, "season")
        .maybeSingle();

      if (error) {
        // Existing deployments remain usable until the companion migration is applied.
        if (error.code === "42P01" || /site_content/i.test(error.message)) return defaultSiteContent;
        throw error;
      }
      return mergeContent((data as { content?: unknown } | null)?.content);
    },
  });
}

export async function saveSiteContent(content: SiteContent) {
  return supabase.from("site_content" as never).upsert(
    {
      id: "season",
      content,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "id" },
  );
}

export function getTeamLogo(content: SiteContent | undefined, team: string) {
  return content?.teamLogos?.[team] ?? defaultTeamLogos[team];
}

export function getLeagueTitle(content: SiteContent) {
  const accent = content.brand.accentWord.trim();
  const remainder = content.brand.name.replace(new RegExp(`^${accent}\\s*`, "i"), "").trim();
  return { accent, remainder: remainder || content.brand.name };
}

export function contentAsJson(content: SiteContent) {
  return JSON.stringify(content, null, 2);
}

export function parseSiteContent(raw: string): SiteContent {
  return mergeContent(JSON.parse(raw));
}
