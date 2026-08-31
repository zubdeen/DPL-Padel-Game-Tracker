"use client"

import { memo } from "react"
import { SectionCard } from "@/components/SectionCard"
import { defaultSiteContent, useSiteContent } from "@/lib/site-content"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Diamond,
  Users,
  Layers,
  Calendar,
  Shield,
  Trophy,
  TrendingUp,
  Medal,
  UserCheck,
  HeartPulse,
  Crown,
  Scale,
  Sparkles,
  AlertTriangle,
  Clock,
  Gavel,
  CreditCard,
  Target,
  Eye,
  MapPin,
  UserMinus,
  Megaphone,
  FileText,
  ListOrdered,
  XCircle
} from "lucide-react"

interface RuleSection {
  id: string
  icon: typeof Diamond
  title: string
  bullets: string[]
  subsections?: { label: string; items: string[] }[]
}

const rulesData: RuleSection[] = [
  {
    id: "introduction",
    icon: Diamond,
    title: "1. Introduction",
    bullets: [
      "Diamond Padel League (DPL) is a premium competitive padel league focused on:",
    ],
    subsections: [
      {
        label: "",
        items: [
          "Elite competition",
          "Tactical team play",
          "Player development",
          "Professionalism",
          "Transparency",
          "Sportsmanship",
          "Intelligent analytics-driven competition"
        ]
      }
    ]
  },
  {
    id: "league-structure",
    icon: Users,
    title: "2. League Structure",
    bullets: [
      "6 teams",
      "7-player rosters",
      "League Phase + Championship Phase",
      "Tactical tier-based deployment system",
      "Official DPL Season 5 format"
    ]
  },
  {
    id: "player-tiers",
    icon: Layers,
    title: "3. Player Tiers",
    bullets: [
      "Each team contains:",
    ],
    subsections: [
      {
        label: "Roster Composition",
        items: [
          "1 Marquee 1",
          "1 Marquee 2",
          "2 Star players",
          "2 Core players",
          "1 Dev player"
        ]
      },
      {
        label: "Tier Descriptions",
        items: [
          "Marquee 1 → Primary franchise anchor",
          "Marquee 2 → Secondary elite anchor",
          "Star → High-impact tactical players",
          "Core → Foundational depth players",
          "Dev → Development-focused players"
        ]
      }
    ]
  },
  {
    id: "match-night-structure",
    icon: Calendar,
    title: "4. Match Night Structure",
    bullets: [
      "A team will play 7 players each twice and one player will sit out each Match Night",
      "The same player cannot sit out until all other players have sat out",
    ],
    subsections: [
      {
        label: "Match Pairings",
        items: [
          "Match 1: Marquee 1 + Marquee 2",
          "Match 2: Marquee 1 + Star",
          "Match 3: Marquee 2 + Core",
          "Match 4: Star + Star",
          "Match 5: Core + Core",
          "Match 6: Star + Dev",
          "Match 7: Core + Dev"
        ]
      }
    ]
  },
  {
    id: "match-format",
    icon: Clock,
    title: "5. Match Format & Timing",
    bullets: [
      "Each official DPL match consists of 1 set",
      "Each set consists of 6 games",
      "Deuce uses sudden-death \"Star Point\"",
      "A team must win by 2 games",
      "At 6-6, a 7-point tiebreak is played"
    ],
    subsections: [
      {
        label: "Timing",
        items: [
          "Match duration: 20 minutes",
          "Warm-up: 5 minutes",
          "Total per match block: 25 minutes"
        ]
      },
      {
        label: "Total Match Night Duration",
        items: [
          "7 matches × 25 minutes",
          "Approximately 3 hours"
        ]
      }
    ]
  },
  {
    id: "officiating",
    icon: Gavel,
    title: "6. Officiating",
    bullets: [
      "Sit-out captains are responsible for assigning umpires",
      "Umpires must be announced at least 24 hours before the following Match Night",
      "Where an umpire is present, the umpire's decision is final"
    ],
    subsections: [
      {
        label: "Without an Umpire",
        items: [
          "Disputes may be resolved on court",
          "Unresolved disputes may be escalated to the League Commissioner",
          "The Commissioner's decision is final"
        ]
      }
    ]
  },
  {
    id: "scoring-system",
    icon: Trophy,
    title: "7. Scoring System",
    bullets: [
      "Official DPL scoring:"
    ],
    subsections: [
      {
        label: "Points Allocation",
        items: [
          "Set Win = 3 points (including 7-5 wins)",
          "Tiebreak Win = 2 points",
          "Tiebreak Loss = 1 point",
          "Normal Loss = 0 points",
          "Winning a set 6-0 awards +1 bonus point"
        ]
      }
    ]
  },
  {
    id: "player-ranking",
    icon: TrendingUp,
    title: "8. Player Rankings",
    bullets: [
      "Player rankings are based on match points, with game difference as a secondary metric."
    ],
    subsections: [
      {
        label: "Formula",
        items: [
          "AGD = Total Game Difference ÷ Sets Played"
        ]
      },
      {
        label: "Examples",
        items: [
          "Winning 6-2 = +4 GD",
          "Losing 4-6 = -2 GD"
        ]
      },
      {
        label: "Leaderboard Tiers",
        items: [
          "Marquee 1",
          "Marquee 2",
          "Star",
          "Core",
          "Dev"
        ]
      },
      {
        label: "Important",
        items: [
          "See ?",
          "Player handicaps apply throughout the league"
        ]
      }
    ]
  },
  {
    id: "standings-tiebreakers",
    icon: Medal,
    title: "9. Standings & Tiebreakers",
    bullets: [
      "Standings track:"
    ],
    subsections: [
      {
        label: "Metrics",
        items: [
          "MP → Match Nights Played",
          "MW → Match Nights Won",
          "ML → Match Nights Lost",
          "SW → Sets Won",
          "SL → Sets Lost",
          "BP → Bonus Points",
          "PTS → Total Points"
        ]
      },
      {
        label: "Standings Order",
        items: [
          "1. Total Points",
          "2. Set Difference",
          "3. Head-to-Head",
          "4. Bonus Points"
        ]
      }
    ]
  },
  {
    id: "attendance-eligibility",
    icon: UserCheck,
    title: "10. Attendance & Eligibility",
    bullets: [
      "No player may play more than 2 matches per Match Night",
      "Captains are responsible for legal player deployment"
    ]
  },
  {
    id: "late-arrival",
    icon: AlertTriangle,
    title: "11. Late Arrival Policy",
    bullets: [
      "Arriving 5 minutes late results in automatic forfeit",
      "Opposing team receives maximum available points (4)",
      "No AGD or individual player statistics are awarded"
    ],
    subsections: [
      {
        label: "No Exceptions Apply",
        items: [
          "Traffic",
          "Vehicle issues",
          "Personal circumstances"
        ]
      }
    ]
  },
  {
    id: "forfeits-no-shows",
    icon: XCircle,
    title: "12. Forfeits & No-Shows",
    bullets: [
      "A match may be declared forfeited if:",
    ],
    subsections: [
      {
        label: "Forfeit Conditions",
        items: [
          "A player or team fails to appear for a scheduled match",
          "A captain fails to communicate sudden changes to the League Commissioner",
          "A player is disqualified due to misconduct",
          "A player or team walks off and refuses to continue play",
          "A team fields an unapproved substitute player"
        ]
      },
      {
        label: "Important",
        items: [
          "Winning team players will not gain or lose individual ranking impact from a forfeited match",
          "AGD and individual player statistics from forfeits will not positively or negatively affect player rankings"
        ]
      }
    ]
  },
  {
    id: "injury-absence",
    icon: HeartPulse,
    title: "13. Injury & Absence Rules",
    bullets: [
      "Injury or absence exceptions may be voted on by captains",
      "Majority vote decides",
      "If tied, the League Commissioner decides"
    ]
  },
  {
    id: "substitution-ruling",
    icon: UserMinus,
    title: "14. Substitution Ruling",
    bullets: [
      "Approved Absentees:",
    ],
    subsections: [
      {
        label: "Mandatory sit outs",
        items: [
          "Players who communicate unavailability before a Match Night must plan so that it coincides with their mandatory sit out",
          "If a players’ unavailability comes unexpectedly after they have already sat out once then the matches are forfeited 5-0.",
          "There is no exception to this and no overruling, no voting among captains or no mutual consent between opposing captains or non opposing captains.",
          "If a game is played with substitute players not in the official team, the score will be disregarded and the team with the unavailable player will lose 5-0.",
          "Replacement players must come from a non-opposing/sit-out team",
          "Replacement player must belong to the same tier",
          "Where multiple eligible replacements exist, the player with the closest auction value will replace the unavailable player",
          "If all captains agree on a replacement player, the substitution is automatically approved",
          "If captains cannot agree, the governing body/league commissioner will make the final unbiased decision",
          "Substitute players score individual points for themselves and the temporary team they represent"
        ]
      },
      {
        label: "No Eligible Substitute Available",
        items: [
          "If no eligible non-opposing same-tier substitute players are available, the affected match will not be played",
          "In such cases: neither team earns points, no AGD is awarded, and no individual player statistics are recorded"
        ]
      },
      {
        label: "Match Fixing Prevention",
        items: [
          "Match fixing or intentional underperformance by substitute players is strictly prohibited",
          "Any suspicion of match fixing may result in award ineligibility and disciplinary review"
        ]
      },
      {
        label: "Permitted Substitution Reasons",
        items: [
          "Illness",
          "Injury",
          "Family emergency"
        ]
      },
      {
        label: "Important",
        items: [
          "Tactical substitutions are strictly prohibited"
        ]
      }
    ]
  },
  {
    id: "facilities-equipment",
    icon: MapPin,
    title: "15. Facilities & Equipment",
    bullets: [
      "All official DPL matches are played at Game City courts",
      "Both courts remain reserved for DPL use during the entire booking duration",
      "Wilson balls will be provided by the DPL to the captains.",
      "3 new balls will be handed to both captains and it is their joint responsibility to recover and return all 3 balls at the end of the session",
      "Non-DPL players are not permitted to use the courts during official DPL booking times",
      "Even if official matches finish early, only registered DPL Season 5 members may continue using the courts"
    ]
  },
  {
    id: "player-safety",
    icon: Shield,
    title: "16. Player Safety & Liability",
    bullets: [
      "All players participate entirely at their own risk",
      "DPL, captains, officials, organizers, and venues are not liable for injuries",
      "Players are responsible for ensuring they are medically fit to compete"
    ],
    subsections: [
      {
        label: "Emergency Contact Rule",
        items: [
          "Every player must provide their captain with an emergency contact",
          "Captains should keep emergency contacts accessible during Match Nights"
        ]
      }
    ]
  },
  {
    id: "captain-responsibilities",
    icon: Crown,
    title: "17. Captain Responsibilities",
    bullets: [
      "Captains are responsible for:"
    ],
    subsections: [
      {
        label: "Duties",
        items: [
          "Tactical deployment",
          "Star/Core assignments",
          "Lineup management",
          "Payment coordination",
          "Communication with officials",
          "Player conduct management",
          "Ensuring players do not obstruct court entrances/exits",
          "Ensuring players and spectators do not verbally abuse players during matches",
          "Maintaining order and professionalism around the courts",
          "Ensuring final team lists are submitted on time"
        ]
      },
      {
        label: "Captain Designation Does NOT Affect",
        items: [
          "Player tier",
          "Rankings",
          "Statistics"
        ]
      }
    ]
  },
  {
    id: "team-deadline-submission",
    icon: FileText,
    title: "18. Team Deadline Submission",
    bullets: [
      "League Phase submission deadlines:"
    ],
    subsections: [
      {
        label: "Friday Match Nights",
        items: [
          "Final team list must be submitted in the captains group by Thursday 2:00 PM"
        ]
      },
      {
        label: "Saturday Match Nights",
        items: [
          "Final team list must be submitted in the captains group by Friday 2:00 PM"
        ]
      },
      {
        label: "Requirements",
        items: [
          "Sit out must be clearly stated",
          "Match lineups must be submitted as Match 1 → Match 7",
          "Player tiers must be clearly labeled",
          "Abbreviations are acceptable: M1, M2, S, C, D"
        ]
      }
    ]
  },
  {
    id: "championship-submissions",
    icon: ListOrdered,
    title: "19. Championship Phase Submissions",
    bullets: [
      "Championship Phase submission rules:"
    ],
    subsections: [
      {
        label: "Submission Requirements",
        items: [
          "Final team lists must be submitted 15 minutes before Match 1",
          "Team lists must be submitted to Zeenat Abdullah",
          "Fixtures should be labeled Match 1 → Match 7"
        ]
      },
      {
        label: "Tier Restrictions",
        items: [
          "Tier restrictions no longer apply during Championship fixture arrangement",
          "Fixture pairings are automatically generated sequentially between opposing teams"
        ]
      },
      {
        label: "Important",
        items: [
          "Once fixtures are submitted, NO changes or alterations are allowed",
          "Match timing/sequencing should be coordinated with players before final submission"
        ]
      }
    ]
  },
  {
    id: "rearranging-sequence",
    icon: Sparkles,
    title: "20. Rearranging Match Sequence",
    bullets: [
      "Matches 1 → 7 should normally be played in official order",
      "Opposing captains may privately agree to resequence matches, BUT the resquence must be communicated at 2pm on the prior day when line ups are sent",
      "This will automatically ensure both captains send their games sequenced respectively.",
      "Any resequencing done after 2pm will be disregarded and the original line up still stands , if a sequenced match is overdue the no show players will forfeit the game 5-0",
      "Fixtures must then be submitted in the updated order"
    ],
    subsections: [
      {
        label: "Example Resequencing",
        items: [
          "Match 7",
          "Match 3",
          "Match 2",
          "Match 4",
          "Match 5",
          "Match 1"
        ]
      },
      {
        label: "Important",
        items: [
          "Resequencing is permitted but discouraged"
        ]
      }
    ]
  },
  {
    id: "payments-registration",
    icon: CreditCard,
    title: "21. Payments & Registration",
    bullets: [
      "Official Fees:"
    ],
    subsections: [
      {
        label: "Fee Structure",
        items: [
          "League Fee → P450",
          "Americano Entry → P100 each"
        ]
      },
      {
        label: "Payment Deadline: 31 Sep 2026",
        items: [
          "Players will be contacted by captains regarding payment",
          "Captains will share payment/eWallet details"
        ]
      }
    ]
  },
  {
    id: "team-spectators",
    icon: Megaphone,
    title: "22. Team Spectators",
    bullets: [
      "Team spectators:"
    ],
    subsections: [
      {
        label: "Permitted Conduct",
        items: [
          "May not cheer during a live point",
          "May applaud or celebrate after a point is completed",
          "May not obstruct court entry or exit points"
        ]
      },
      {
        label: "Team Spectator Misconduct",
        items: [
          "1st offence → Warning issued through the team captain",
          "2nd offence → League Commissioner notified, final warning issued"
        ]
      },
      {
        label: "Unsportsmanlike Spectator Behavior Includes",
        items: [
          "Verbal abuse toward players",
          "Repeated disruption",
          "Obstruction of movement areas"
        ]
      }
    ]
  },
  {
    id: "external-spectators",
    icon: Eye,
    title: "23. External Spectators",
    bullets: [
      "If captains or players feel uncomfortable with an outside spectator, the League Commissioner must be informed immediately",
      "The League Commissioner will resolve the situation accordingly"
    ]
  },
  {
    id: "conduct-sportsmanship",
    icon: Scale,
    title: "24. Conduct & Sportsmanship",
    bullets: [
      "Core DPL values:"
    ],
    subsections: [
      {
        label: "Values",
        items: [
          "Respect",
          "Honesty",
          "Transparency",
          "Development",
          "Competitive Integrity"
        ]
      },
      {
        label: "Unsportsmanlike Conduct Includes",
        items: [
          "Verbal abuse",
          "Persistent arguing",
          "Cheating or dishonesty",
          "Racket abuse",
          "Ball abuse",
          "Refusal to continue play"
        ]
      },
      {
        label: "Penalty Structure",
        items: [
          "1st offence → Warning",
          "2nd offence → Point penalty",
          "3rd offence → Match penalty",
          "4th offence → Match forfeit"
        ]
      },
      {
        label: "Serious or Repeat Offences May Result In",
        items: [
          "Immediate disqualification",
          "DPL committee review",
          "Suspension from league participation"
        ]
      }
    ]
  },
  {
    id: "championship-phase",
    icon: Target,
    title: "25. Championship Phase",
    bullets: [
      "Championship structure:"
    ],
    subsections: [
      {
        label: "Rounds",
        items: [
          "E1 & E2 (Eliminators)",
          "S1 & S2 (Semifinals)",
          "Grand Final"
        ]
      },
      {
        label: "Scoring",
        items: [
          "Championship Phase uses the same scoring system as the League Phase",
          "3 points for a set win (including 7-5 wins)",
          "2 points for a tiebreak win",
          "1 point for a tiebreak loss",
          "4 points for a 6-0 win"
        ]
      },
      {
        label: "",
        items: [
          "Final seeding is determined by League Phase standings"
        ]
      }
    ]
  },
  {
    id: "league-vision",
    icon: Diamond,
    title: "26. League Vision",
    bullets: [
      "The DPL aims to become:"
    ],
    subsections: [
      {
        label: "Goals",
        items: [
          "A premium competitive platform",
          "A tactical team-based league",
          "A player development ecosystem",
          "A modern intelligent sports competition model"
        ]
      },
      {
        label: "The League Combines",
        items: [
          "Strategy",
          "Analytics",
          "Professionalism",
          "Competition",
          "Innovation",
          "Community"
        ]
      }
    ]
  },
]

export const RulesSection = memo(function RulesSectionComponent() {
  const { data: configuredContent } = useSiteContent()
  const content = configuredContent ?? defaultSiteContent

  return (

    <SectionCard
            title={content.rules.cardTitle}

      icon={<Diamond className="h-4 w-4 text-primary" />}
    >
      {/* Rulebook Header */}
      <div className="px-1 pb-4 mb-3 border-b border-white/[0.06]">
        <h2 className="text-center text-lg font-bold text-foreground tracking-tight mb-1">
          {content.brand.name}
        </h2>
        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
                    {content.rules.subtitle}

        </p>
      </div>

      {/* Accordion Sections */}
      <Accordion type="single" collapsible className="space-y-2">
        {rulesData.map((section) => (
          <AccordionItem
            key={section.id}
            value={section.id}
            className="rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden data-[state=open]:border-primary/20 data-[state=open]:bg-white/[0.03] transition-all duration-200"
          >
            <AccordionTrigger className="px-3 py-3 hover:no-underline hover:bg-white/[0.02] transition-all [&[data-state=open]]:bg-transparent">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/20 flex-shrink-0">
                  <section.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-foreground text-[13px] text-left tracking-tight">
                  {section.title}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4 pt-0">
              <div className="pl-12 pr-1 space-y-3">
                {/* Main bullets */}
                {section.bullets.length > 0 && (
                  <ul className="space-y-1.5">
                    {section.bullets.map((bullet, idx) => (
                      <li
                        key={idx}
                        className="text-[11px] leading-relaxed text-muted-foreground flex items-start gap-2"
                      >
                        {!bullet.endsWith(":") && (
                          <span className="text-primary/60 mt-1">•</span>
                        )}
                        <span className={bullet.endsWith(":") ? "text-foreground/80 font-medium" : ""}>
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Subsections */}
                {section.subsections?.map((sub, subIdx) => (
                  <div key={subIdx} className="space-y-1.5">
                    {sub.label && (
                      <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider pt-1 border-t border-white/[0.04] mt-2">
                        {sub.label}
                      </p>
                    )}
                    <ul className="space-y-1">
                      {sub.items.map((item, itemIdx) => (
                        <li
                          key={itemIdx}
                          className={`text-[11px] leading-relaxed flex items-start gap-2 ${
                            item.includes("→") || item.includes("=") || item.startsWith("Match ")
                              ? "text-foreground/80 font-medium pl-2 border-l-2 border-primary/30"
                              : "text-muted-foreground"
                          }`}
                        >
                          {!item.includes("→") && !item.includes("=") && !item.startsWith("Match ") && (
                            <span className="text-primary/60 mt-0.5">•</span>
                          )}
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
        <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">
                    {content.rules.footer}

        </p>
      </div>
    </SectionCard>
  )
})
