"use client";

import { memo, useMemo, useState } from "react";
import { Calendar, Clock3, MapPin, Swords } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import {
  defaultSiteContent,
  getTeamLogo,
  useSiteContent,
  type ScheduleEvent,
} from "@/lib/site-content";

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date || "Date to be confirmed";
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const ScheduleSection = memo(function ScheduleSectionComponent() {
  const { data: configuredContent } = useSiteContent();
  const content = configuredContent ?? defaultSiteContent;
  const [phase, setPhase] = useState<"league" | "eliminator">("league");

  const events = useMemo(
    () =>
      (phase === "league" ? content.schedule.leagueEvents : content.schedule.eliminatorEvents)
        .slice()
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [content.schedule.eliminatorEvents, content.schedule.leagueEvents, phase],
  );

  return (
    <SectionCard title={content.schedule.title} icon={<Calendar className="h-3.5 w-3.5 text-primary/70" />}>
      <div className="space-y-4">
        <div className="text-center">
          <p className="mx-auto max-w-[290px] text-[10px] leading-relaxed text-muted-foreground">
            {content.schedule.intro}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.05]">
          <button
            type="button"
            onClick={() => setPhase("league")}
            className={`rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition ${
              phase === "league" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {content.schedule.leaguePhaseLabel}
          </button>
          <button
            type="button"
            onClick={() => setPhase("eliminator")}
            className={`rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition ${
              phase === "eliminator" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {content.schedule.championshipLabel}
          </button>
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.015] px-4 py-9 text-center">
            <Calendar className="mx-auto mb-2 h-5 w-5 text-primary/70" />
            <p className="text-[11px] font-medium text-foreground">Schedule to be announced</p>
            <p className="mx-auto mt-1 max-w-[240px] text-[10px] leading-relaxed text-muted-foreground">
              The tournament administrator will publish fixtures, dates, and times here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map((event) => <ScheduleCard key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </SectionCard>
  );
});

function ScheduleCard({ event }: { event: ScheduleEvent }) {
  const { data: configuredContent } = useSiteContent();
  const content = configuredContent ?? defaultSiteContent;
  const hasMatchup = Boolean(event.homeTeam || event.awayTeam);

  return (
    <article className="overflow-hidden rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06]">
      <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-primary/[0.1] via-primary/[0.03] to-transparent px-3 py-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary">{event.title || "Match Night"}</p>
          <p className="mt-1 text-[11px] font-semibold text-foreground">{formatDate(event.date)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-background/45 px-2 py-1 text-[9px] font-semibold text-foreground ring-1 ring-white/[0.05]">
          <Clock3 className="h-3 w-3 text-primary" /> {event.time || "TBC"}
        </div>
      </div>

      <div className="space-y-2 p-3">
        {hasMatchup ? (
          <div className="flex items-center justify-center gap-2.5">
            <TeamBadge team={event.homeTeam} content={content} align="right" />
            <Swords className="h-3.5 w-3.5 shrink-0 text-primary/80" />
            <TeamBadge team={event.awayTeam} content={content} />
          </div>
        ) : null}
        {event.court ? (
          <p className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary/75" /> {event.court}
          </p>
        ) : null}
        {event.notes ? <p className="rounded-lg bg-black/10 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">{event.notes}</p> : null}
      </div>
    </article>
  );
}

function TeamBadge({ team, content, align }: { team: string; content: typeof defaultSiteContent; align?: "right" }) {
  if (!team) return null;
  const logo = getTeamLogo(content, team);
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-1.5 ${align === "right" ? "justify-end text-right" : "justify-start"}`}>
      {align === "right" ? <span className="truncate text-[10px] font-bold uppercase tracking-wide text-foreground">{team}</span> : null}
      {logo ? <img src={logo} alt="" className="h-6 w-6 shrink-0 object-contain" /> : <span className="h-6 w-6 shrink-0 rounded-full bg-white/10" />}
      {align !== "right" ? <span className="truncate text-[10px] font-bold uppercase tracking-wide text-foreground">{team}</span> : null}
    </div>
  );
}
