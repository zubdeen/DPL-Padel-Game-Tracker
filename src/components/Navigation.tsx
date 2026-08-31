import {
  Trophy,
  Users,
  Users2,
  Swords,
  ShieldCheck,
  Calendar,
  Book,
  Wallet,
  CircleHelp,
} from "lucide-react";
import type { NavigationLabels } from "@/lib/site-content";

export type TabId =
  | "standings"
  | "players"
  | "teams"
  | "fixtures"
  | "schedule"
  | "admin"
  | "banking"
  | "rules"
  | "?";

interface NavItem {
  id: TabId;
  icon: typeof Users;
  label: string;
}

const navItems: NavItem[] = [
  { id: "standings", icon: Trophy, label: "Standings" },
  { id: "players", icon: Users, label: "Players" },
  { id: "teams", icon: Users2, label: "Teams" },
  { id: "fixtures", icon: Swords, label: "Fixtures" },
  { id: "schedule", icon: Calendar, label: "Schedule" },
  { id: "banking", icon: Wallet, label: "Banking" },
  { id: "rules", icon: Book, label: "Rules" },
  { id: "?", icon: CircleHelp, label: "?" },
];

interface NavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  showAdmin?: boolean;
  labels?: NavigationLabels;
}

export function Navigation({ activeTab, onTabChange, showAdmin, labels }: NavigationProps) {
  const items: NavItem[] = showAdmin
    ? [...navItems, { id: "admin" as TabId, icon: ShieldCheck, label: "Admin" }]
    : navItems;

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/30">
      <div className="flex items-center justify-center gap-0.5 py-1.5 px-2 overflow-x-auto scrollbar-hide">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const labelKey = item.id === "?" ? "help" : item.id;
          const itemLabel = labels?.[labelKey as keyof NavigationLabels] ?? item.label;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-label={itemLabel}
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 flex-shrink-0 ${
                isActive
                  ? "bg-primary/90 text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <item.icon className="h-4 w-4" strokeWidth={isActive ? 2.25 : 1.75} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
