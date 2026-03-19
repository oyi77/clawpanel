import {
  Inbox,
  CircleDot,
  Target,
  LayoutDashboard,
  DollarSign,
  History,
  Search,
  SquarePen,
  Network,
  Settings,
  Languages,
  RefreshCcw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarProjects } from "./SidebarProjects";
import { SidebarAgents } from "./SidebarAgents";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { useLocation } from "@/lib/router";
import { heartbeatsApi } from "../api/heartbeats";
import { queryKeys } from "../lib/queryKeys";
import { useInboxBadge } from "../hooks/useInboxBadge";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const location_obj = useLocation();
  const { openNewIssue } = useDialog();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const inboxBadge = useInboxBadge(selectedCompanyId);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleSync = () => {
    // Sync triggered - can add notification here
  };

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10_000,
  });
  const liveRunCount = liveRuns?.length ?? 0;

  function openSearch() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  return (
    <aside className="w-60 h-full min-h-0 border-r border-border bg-background flex flex-col">
      {/* Top bar: Company name (bold) + Search — aligned with top sections (no visible border) */}
      <div className="flex items-center gap-1 px-3 h-12 shrink-0">
        {selectedCompany?.brandColor && (
          <div
            className="w-4 h-4 rounded-sm shrink-0 ml-1"
            style={{ backgroundColor: selectedCompany.brandColor }}
          />
        )}
         <span className="flex-1 text-sm font-bold text-foreground truncate pl-1">
           {selectedCompany?.name ?? t("common_selectCompany")}
         </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground shrink-0"
          onClick={openSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-auto-hide flex flex-col gap-4 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          {/* New Issue button aligned with nav items */}
          <button
            onClick={() => openNewIssue()}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("nav_newIssue")}</span>
          </button>
           <SidebarNavItem to="/dashboard" label={t("nav_dashboard")} icon={LayoutDashboard} liveCount={liveRunCount} />
          <SidebarNavItem
            to="/inbox"
            label={t("nav_inbox")}
            icon={Inbox}
            badge={inboxBadge.inbox}
            badgeTone={inboxBadge.failedRuns > 0 ? "danger" : "default"}
            alert={inboxBadge.failedRuns > 0}
          />
        </div>

        <SidebarSection label={t("nav_work")}>
           <SidebarNavItem to="/issues" label={t("nav_issues")} icon={CircleDot} />
           <SidebarNavItem to="/goals" label={t("nav_goals")} icon={Target} />
        </SidebarSection>

        <SidebarProjects />

        <SidebarAgents />

        <SidebarSection label={t("nav_company")}>
           <SidebarNavItem to="/org" label={t("nav_org")} icon={Network} />
           <SidebarNavItem to="/costs" label={t("nav_costs")} icon={DollarSign} />
           <SidebarNavItem to="/activity" label={t("nav_activity")} icon={History} />
           <SidebarNavItem to="/workflow" label={t("nav_workflowCenter")} icon={RefreshCcw} />
           <SidebarNavItem to="/company/settings" label={t("nav_settings")} icon={Settings} />
        </SidebarSection>

        {/* Modular Workflow & Update */}
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4 px-1">
          <button
            onClick={handleSync}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors w-full"
          >
            <RefreshCcw className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("nav_update")} / {t("nav_sync")}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground">
            <Languages className="h-3.5 w-3.5" />
            <select
              onChange={(e) => changeLanguage(e.target.value)}
              value={i18n.language}
              className="bg-transparent border-none outline-none cursor-pointer hover:text-foreground transition-colors uppercase font-bold"
            >
              <option value="en">EN</option>
              <option value="id">ID</option>
              <option value="zh">CN</option>
              <option value="ru">RU</option>
            </select>
          </div>
        </div>
      </nav>
    </aside>
  );
}
