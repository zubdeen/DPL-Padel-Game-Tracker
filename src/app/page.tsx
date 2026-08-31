"use client";

import { useState, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Navigation, type TabId } from "@/components/Navigation";
import { HeroSection } from "@/components/HeroSection";
import { GlobalFooter } from "@/components/GlobalFooter";
import { StandingsSection } from "@/components/sections/StandingsSection";
import { PlayersSection } from "@/components/sections/PlayersSection";
import { TeamsSection } from "@/components/sections/TeamsSection";
import { FixturesSection } from "@/components/sections/FixturesSection";
import { BankingSection } from "@/components/sections/banking-section";
import { ScheduleSection } from "@/components/sections/schedule-section";
import { RulesSection } from "@/components/sections/rules-section";
import { ScoringHelpSection } from "@/components/sections/scoring-help-section";
import { fetchEliminatorMatches } from "@/lib/eliminator-data";
import { fetchMatches } from "@/lib/match-data";
import { fetchTeamRankings } from "@/lib/team-rankings";
import type { EliminatorMatch } from "@/lib/eliminators";
import type { Match, Player } from "@/lib/scoring";
import { defaultSiteContent, useSiteContent } from "@/lib/site-content";
import { fetchPlayers } from "@/lib/player-data";

const QUERY_STALE_MS = 1000 * 60 * 5;

export default function Index() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { data: configuredContent } = useSiteContent();
  const siteContent = configuredContent ?? defaultSiteContent;
  const [activeTab, setActiveTab] = useState<TabId>("standings");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollPositions = useRef<Record<TabId, number>>({
    standings: 0,
    players: 0,
    teams: 0,
    fixtures: 0,
    admin: 0,
    schedule: 0,
    banking: 0,
    rules: 0,
    "?": 0,
  });

  const players = useQuery<Player[]>({
    queryKey: ["players"],
    staleTime: QUERY_STALE_MS,
    queryFn: fetchPlayers,
  });

  const matches = useQuery<Match[]>({
    queryKey: ["matches"],
    staleTime: QUERY_STALE_MS,
    queryFn: fetchMatches,
  });

  const teamRankings = useQuery({
    queryKey: ["team_rankings"],
    staleTime: QUERY_STALE_MS,
    queryFn: fetchTeamRankings,
  });

  const needsPlayers = ["standings", "players", "teams", "fixtures"].includes(activeTab);
  const needsMatches = ["standings", "players", "fixtures"].includes(activeTab);
  const needsEliminators = ["players", "fixtures"].includes(activeTab);

  const eliminatorMatches = useQuery<EliminatorMatch[]>({
    queryKey: ["eliminator_matches"],
    queryFn: fetchEliminatorMatches,
    enabled: needsEliminators,
    staleTime: QUERY_STALE_MS,
  });

  const handleTabChange = (newTab: TabId) => {
    if (newTab === "admin") {
      router.push("/admin");
      return;
    }
    scrollPositions.current[activeTab] = window.scrollY;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(newTab);
      setIsTransitioning(false);
      setTimeout(() => {
        window.scrollTo(0, scrollPositions.current[newTab]);
      }, 50);
    }, 150);
  };

  const ps = players.data ?? [];
  const ms = matches.data ?? [];
  const rankings = teamRankings.data ?? [];
  const ems = eliminatorMatches.data ?? [];
  const isContentLoading =
    (needsPlayers && players.isLoading) ||
    (needsMatches && matches.isLoading) ||
    (activeTab === "standings" && teamRankings.isLoading) ||
    (needsEliminators && eliminatorMatches.isLoading);

  const renderContent = (): ReactNode => {
    switch (activeTab) {
      case "players":
        return <PlayersSection players={ps} matches={ms} eliminatorMatches={ems} />;
      case "teams":
        return <TeamsSection players={ps} />;
      case "fixtures":
        return <FixturesSection players={ps} matches={ms} eliminatorMatches={ems} />;
      case "standings":
        return <StandingsSection players={ps} matches={ms} teamRankings={rankings} />;
      case "banking":
        return <BankingSection />;
      case "schedule":
        return <ScheduleSection />;
      case "rules":
        return <RulesSection />;
      case "?":
        return <ScoringHelpSection />;
      default:
        return (
          <div className="space-y-4">
            <HeroSection playerCount={ps.length} matchCount={ms.length} />
            <StandingsSection players={ps} matches={ms} teamRankings={rankings} />
            <PlayersSection players={ps} matches={ms} eliminatorMatches={ems} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <main className="w-full max-w-[420px] relative">
        <Navigation activeTab={activeTab} onTabChange={handleTabChange} showAdmin={isAdmin} labels={siteContent.navigation} />
        <div className="px-5 pb-10 pt-20">
          <div
            className={`transition-all duration-200 ease-out ${
              isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            }`}
          >
            {isContentLoading ? (
              <p className="text-center text-[11px] text-muted-foreground py-10">Loading…</p>
            ) : (
              renderContent()
            )}
          </div>
          <GlobalFooter />
        </div>
      </main>
    </div>
  );
}
