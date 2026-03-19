import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  skillsApi,
  type Skill,
  type SkillInstallOption,
  type StoreSkill,
} from "../api/skills";
import { queryKeys } from "../lib/queryKeys";
import { useToast } from "../context/ToastContext";
import { PageSkeleton } from "../components/PageSkeleton";
import { EmptyState } from "../components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Puzzle,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
  Ban,
  PauseCircle,
  Download,
  Terminal,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SkillStatus = "eligible" | "missing" | "disabled" | "blocked";

function classifySkills(skills: Skill[]) {
  const eligible = skills.filter((s) => s.eligible && !s.disabled);
  const missing = skills.filter(
    (s) => !s.eligible && !s.disabled && !s.blockedByAllowlist,
  );
  const disabled = skills.filter((s) => s.disabled);
  const blocked = skills.filter(
    (s) => s.blockedByAllowlist && !s.disabled,
  );
  return { eligible, missing, disabled, blocked };
}

function statusForSkill(skill: Skill): SkillStatus {
  if (skill.disabled) return "disabled";
  if (skill.blockedByAllowlist) return "blocked";
  if (skill.eligible) return "eligible";
  return "missing";
}

export function Skills() {
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const [mainTab, setMainTab] = useState<"installed" | "store">("installed");
  const [filterText, setFilterText] = useState("");
  const [detailSkillName, setDetailSkillName] = useState<string | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<string | null>(null);
  const [installSource, setInstallSource] = useState<"skillhub" | "clawhub">(
    "skillhub",
  );
  const [storeQuery, setStoreQuery] = useState("");
  const [storeSearchTerm, setStoreSearchTerm] = useState("");

  const {
    data: skillsData,
    isLoading,
    error: listError,
    refetch: refetchSkills,
  } = useQuery({
    queryKey: queryKeys.skills.list,
    queryFn: skillsApi.list,
  });

  const { data: detailSkill, isLoading: detailLoading } = useQuery({
    queryKey: queryKeys.skills.info(detailSkillName ?? ""),
    queryFn: () => skillsApi.info(detailSkillName!),
    enabled: !!detailSkillName,
  });

  const { data: skillHubStatus } = useQuery({
    queryKey: queryKeys.skills.skillHubStatus,
    queryFn: skillsApi.skillHubCheck,
    enabled: mainTab === "store",
  });

  const {
    data: storeResults,
    isFetching: storeSearching,
    error: storeError,
  } = useQuery({
    queryKey: queryKeys.skills.storeSearch(installSource, storeSearchTerm),
    queryFn: () =>
      installSource === "skillhub"
        ? skillsApi.skillHubSearch(storeSearchTerm)
        : skillsApi.clawHubSearch(storeSearchTerm),
    enabled: !!storeSearchTerm,
  });

  const installDepMutation = useMutation({
    mutationFn: ({
      kind,
      spec,
    }: {
      kind: string;
      spec: SkillInstallOption;
      skillName: string;
    }) => skillsApi.installDep(kind, spec),
    onSuccess: (_data, vars) => {
      pushToast({
        title: t("skills_depInstalled", { name: vars.skillName }),
        tone: "success",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.list });
    },
    onError: (err: Error) => {
      pushToast({
        title: t("skills_installFailed", { error: err.message }),
        tone: "error",
      });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (name: string) => skillsApi.uninstall(name),
    onSuccess: (_data, name) => {
      pushToast({
        title: t("skills_uninstalled_success", { name }),
        tone: "success",
      });
      setUninstallTarget(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.list });
    },
    onError: (err: Error) => {
      pushToast({
        title: t("skills_uninstallFailed", { error: err.message }),
        tone: "error",
      });
    },
  });

  const storeInstallMutation = useMutation({
    mutationFn: ({
      slug,
      source,
    }: {
      slug: string;
      source: "skillhub" | "clawhub";
    }) =>
      source === "skillhub"
        ? skillsApi.skillHubInstall(slug)
        : skillsApi.clawHubInstall(slug),
    onSuccess: (_data, vars) => {
      pushToast({
        title: t("skills_installed_success", { name: vars.slug }),
        tone: "success",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.list });
    },
    onError: (err: Error) => {
      pushToast({
        title: t("skills_installFailed", { error: err.message }),
        tone: "error",
      });
    },
  });

  const skillHubSetupMutation = useMutation({
    mutationFn: skillsApi.skillHubSetup,
    onSuccess: () => {
      pushToast({ title: t("skills_cliInstallSuccess"), tone: "success" });
      queryClient.invalidateQueries({
        queryKey: queryKeys.skills.skillHubStatus,
      });
    },
    onError: (err: Error) => {
      pushToast({
        title: t("skills_cliInstallFailed", { error: err.message }),
        tone: "error",
      });
    },
  });

  const skills = skillsData?.skills ?? [];
  const cliAvailable = skillsData?.cliAvailable !== false;
  const groups = useMemo(() => classifySkills(skills), [skills]);

  const filteredSkills = useMemo(() => {
    if (!filterText) return null;
    const q = filterText.toLowerCase();
    return skills.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q),
    );
  }, [skills, filterText]);

  const handleStoreSearch = useCallback(() => {
    const q = storeQuery.trim();
    if (q) setStoreSearchTerm(q);
  }, [storeQuery]);

  const browseUrl =
    installSource === "skillhub"
      ? "https://skillhub.tencent.com"
      : "https://clawhub.ai/skills";

  if (isLoading && mainTab === "installed") {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTab(v as "installed" | "store")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line">
            <TabsTrigger value="installed">{t("skills_installed")}</TabsTrigger>
            <TabsTrigger value="store">{t("skills_store")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="installed" className="space-y-4 mt-4">
          <InstalledTab
            skills={skills}
            cliAvailable={cliAvailable}
            groups={groups}
            filterText={filterText}
            filteredSkills={filteredSkills}
            listError={listError}
            t={t}
            onFilterChange={setFilterText}
            onRefresh={() => refetchSkills()}
            onShowDetail={setDetailSkillName}
            onUninstall={setUninstallTarget}
            onInstallDep={(kind, spec, skillName) =>
              installDepMutation.mutate({ kind, spec, skillName })
            }
            installDepPending={installDepMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="store" className="space-y-4 mt-4">
          <StoreTab
            installSource={installSource}
            storeQuery={storeQuery}
            storeResults={storeResults ?? null}
            storeSearching={storeSearching}
            storeError={storeError}
            skillHubInstalled={!!skillHubStatus?.installed}
            skillHubVersion={skillHubStatus?.version}
            t={t}
            browseUrl={browseUrl}
            onSourceChange={setInstallSource}
            onQueryChange={setStoreQuery}
            onSearch={handleStoreSearch}
            onInstall={(slug) =>
              storeInstallMutation.mutate({ slug, source: installSource })
            }
            onSetupCli={() => skillHubSetupMutation.mutate()}
            installPending={storeInstallMutation.isPending}
            installingSlug={
              storeInstallMutation.isPending
                ? (storeInstallMutation.variables?.slug ?? null)
                : null
            }
            cliSetupPending={skillHubSetupMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      <SkillDetailDialog
        skill={detailSkill ?? null}
        loading={detailLoading}
        open={!!detailSkillName}
        onClose={() => setDetailSkillName(null)}
        t={t}
      />

      <UninstallConfirmDialog
        name={uninstallTarget}
        open={!!uninstallTarget}
        pending={uninstallMutation.isPending}
        onClose={() => setUninstallTarget(null)}
        onConfirm={() => {
          if (uninstallTarget) uninstallMutation.mutate(uninstallTarget);
        }}
        t={t}
      />
    </div>
  );
}

function InstalledTab({
  skills,
  cliAvailable,
  groups,
  filterText,
  filteredSkills,
  listError,
  t,
  onFilterChange,
  onRefresh,
  onShowDetail,
  onUninstall,
  onInstallDep,
  installDepPending,
}: {
  skills: Skill[];
  cliAvailable: boolean;
  groups: ReturnType<typeof classifySkills>;
  filterText: string;
  filteredSkills: Skill[] | null;
  listError: Error | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onFilterChange: (v: string) => void;
  onRefresh: () => void;
  onShowDetail: (name: string) => void;
  onUninstall: (name: string) => void;
  onInstallDep: (kind: string, spec: SkillInstallOption, skillName: string) => void;
  installDepPending: boolean;
}) {
  if (listError) {
    return (
      <div className="flex flex-col items-center py-12 text-center gap-3">
        <p className="text-sm text-destructive">
          {t("skills_loadFailed", { error: listError.message })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("skills_loadFailedHint")}
        </p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          {t("skills_retry")}
        </Button>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <EmptyState
        icon={Puzzle}
        message={t("skills_noSkills")}
      />
    );
  }

  const renderGroup = (
    groupSkills: Skill[],
    status: SkillStatus,
  ) => {
    if (groupSkills.length === 0) return null;

    const filtered = filteredSkills
      ? groupSkills.filter((s) => filteredSkills.includes(s))
      : groupSkills;
    if (filtered.length === 0) return null;

    const config = groupConfig[status];

    return (
      <div key={status} className="space-y-2">
        <div className="flex items-center gap-2">
          <config.icon className={cn("h-4 w-4", config.iconColor)} />
          <span className={cn("text-sm font-medium", config.textColor)}>
            {t(config.labelKey)} ({filtered.length})
          </span>
          {status === "missing" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                window.location.hash = "#/assistant";
              }}
            >
              {t("skills_aiAssist")}
            </Button>
          )}
        </div>
        <div className="border border-border">
          {filtered.map((skill) => (
            <SkillRow
              key={skill.name}
              skill={skill}
              status={status}
              t={t}
              onShowDetail={onShowDetail}
              onUninstall={onUninstall}
              onInstallDep={onInstallDep}
              installDepPending={installDepPending}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder={t("skills_filter")}
          value={filterText}
          onChange={(e) => onFilterChange(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {t("skills_refresh")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://clawhub.ai/skills"
              target="_blank"
              rel="noopener noreferrer"
            >
              ClawHub
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {t("skills_summary", {
            available: groups.eligible.length,
            missing: groups.missing.length,
            disabled: groups.disabled.length,
          })}
        </span>
        {!cliAvailable && (
          <Badge variant="outline" className="text-amber-600 border-amber-600/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {t("skills_cliUnavailable")}
          </Badge>
        )}
      </div>

      <div className="space-y-6">
        {renderGroup(groups.eligible, "eligible")}
        {renderGroup(groups.missing, "missing")}
        {renderGroup(groups.disabled, "disabled")}
        {renderGroup(groups.blocked, "blocked")}
      </div>
    </>
  );
}

const groupConfig: Record<
  SkillStatus,
  {
    icon: typeof CheckCircle2;
    iconColor: string;
    textColor: string;
    labelKey: string;
  }
> = {
  eligible: {
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
    labelKey: "skills_available",
  },
  missing: {
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
    labelKey: "skills_missingDeps",
  },
  disabled: {
    icon: PauseCircle,
    iconColor: "text-muted-foreground",
    textColor: "text-muted-foreground",
    labelKey: "skills_disabled",
  },
  blocked: {
    icon: Ban,
    iconColor: "text-destructive",
    textColor: "text-destructive",
    labelKey: "skills_blocked",
  },
};

const statusBadgeConfig: Record<
  SkillStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  eligible: { variant: "default", label: "skills_available" },
  missing: { variant: "outline", label: "skills_missingDeps" },
  disabled: { variant: "secondary", label: "skills_disabled" },
  blocked: { variant: "destructive", label: "skills_blocked" },
};

function SkillRow({
  skill,
  status,
  t,
  onShowDetail,
  onUninstall,
  onInstallDep,
  installDepPending,
}: {
  skill: Skill;
  status: SkillStatus;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onShowDetail: (name: string) => void;
  onUninstall: (name: string) => void;
  onInstallDep: (kind: string, spec: SkillInstallOption, skillName: string) => void;
  installDepPending: boolean;
}) {
  const missingBins = skill.missing?.bins ?? [];
  const missingEnv = skill.missing?.env ?? [];
  const missingConfig = skill.missing?.config ?? [];
  const installOpts = skill.install ?? [];
  const badgeCfg = statusBadgeConfig[status];

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{skill.emoji || "📦"}</span>
          <span className="text-sm font-medium truncate">{skill.name}</span>
          <span className="text-xs text-muted-foreground">
            {skill.bundled ? t("skills_bundled") : (skill.source || t("skills_custom"))}
          </span>
          {skill.homepage && (
            <a
              href={skill.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline hidden sm:inline"
            >
              <ExternalLink className="h-3 w-3 inline" />
            </a>
          )}
        </div>
        {skill.description && (
          <p className="text-xs text-muted-foreground truncate">
            {skill.description}
          </p>
        )}

        {missingBins.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("skills_missingBins")}{" "}
            {missingBins.map((b) => (
              <code key={b} className="mx-0.5 px-1 py-0.5 bg-muted rounded text-[11px]">
                {b}
              </code>
            ))}
          </p>
        )}
        {missingEnv.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("skills_missingEnv")}{" "}
            {missingEnv.map((e) => (
              <code key={e} className="mx-0.5 px-1 py-0.5 bg-muted rounded text-[11px]">
                {e}
              </code>
            ))}
            <span className="text-muted-foreground ml-1">
              — {t("skills_missingEnvHint")}
            </span>
          </p>
        )}
        {missingConfig.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("skills_missingConfig")}{" "}
            {missingConfig.map((c) => (
              <code key={c} className="mx-0.5 px-1 py-0.5 bg-muted rounded text-[11px]">
                {c}
              </code>
            ))}
            <span className="text-muted-foreground ml-1">
              — {t("skills_missingConfigHint")}
            </span>
          </p>
        )}

        {status === "missing" && installOpts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {installOpts.map((opt) => (
              <Button
                key={opt.label}
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={installDepPending}
                onClick={() => onInstallDep(opt.kind, opt, skill.name)}
              >
                {installDepPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Download className="h-3 w-3 mr-1" />
                )}
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        {status === "missing" &&
          installOpts.length === 0 &&
          missingBins.length > 0 &&
          missingEnv.length === 0 &&
          missingConfig.length === 0 && (
            <p className="text-[11px] text-muted-foreground pt-1">
              {t("skills_noAutoInstall")}{" "}
              {missingBins.map((b) => (
                <code key={b} className="mx-0.5 px-1 py-0.5 bg-muted rounded">
                  brew install {b}
                </code>
              ))}
            </p>
          )}
      </div>

      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onShowDetail(skill.name)}
        >
          <Info className="h-3.5 w-3.5 mr-1" />
          {t("skills_details")}
        </Button>
        {!skill.bundled && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={() => onUninstall(skill.name)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {t("skills_uninstall")}
          </Button>
        )}
        <Badge variant={badgeCfg.variant} className="text-[11px]">
          {t(badgeCfg.label)}
        </Badge>
      </div>
    </div>
  );
}

function StoreTab({
  installSource,
  storeQuery,
  storeResults,
  storeSearching,
  storeError,
  skillHubInstalled,
  skillHubVersion,
  t,
  browseUrl,
  onSourceChange,
  onQueryChange,
  onSearch,
  onInstall,
  onSetupCli,
  installPending,
  installingSlug,
  cliSetupPending,
}: {
  installSource: "skillhub" | "clawhub";
  storeQuery: string;
  storeResults: StoreSkill[] | null;
  storeSearching: boolean;
  storeError: Error | null;
  skillHubInstalled: boolean;
  skillHubVersion?: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  browseUrl: string;
  onSourceChange: (v: "skillhub" | "clawhub") => void;
  onQueryChange: (v: string) => void;
  onSearch: () => void;
  onInstall: (slug: string) => void;
  onSetupCli: () => void;
  installPending: boolean;
  installingSlug: string | null;
  cliSetupPending: boolean;
}) {
  const isRateLimit =
    storeError && /rate.?limit|429|too many/i.test(storeError.message);

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={installSource}
          onValueChange={(v) => onSourceChange(v as "skillhub" | "clawhub")}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skillhub">{t("skills_skillhub")}</SelectItem>
            <SelectItem value="clawhub">{t("skills_clawhub")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-1 items-center gap-2">
          <Input
            placeholder={t("skills_searchPlaceholder")}
            value={storeQuery}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearch();
              }
            }}
            className="flex-1"
          />
          <Button size="sm" onClick={onSearch} disabled={storeSearching}>
            {storeSearching ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5 mr-1" />
            )}
            {t("skills_search")}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {installSource === "skillhub" && !skillHubInstalled && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSetupCli}
              disabled={cliSetupPending}
            >
              {cliSetupPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Terminal className="h-3.5 w-3.5 mr-1" />
              )}
              {t("skills_setupCli")}
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <a href={browseUrl} target="_blank" rel="noopener noreferrer">
              {t("skills_browse")}
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {installSource === "skillhub" && skillHubInstalled && skillHubVersion && (
          <Badge variant="outline" className="text-emerald-600 border-emerald-600/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("skills_cliVersion", { version: skillHubVersion })}
          </Badge>
        )}
        {installSource === "skillhub" && !skillHubInstalled && (
          <Badge variant="outline" className="text-amber-600 border-amber-600/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {t("skills_cliMissing")}
          </Badge>
        )}
      </div>

      <div className="border border-border min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto">
        {!storeResults && !storeSearching && !storeError && (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            {t("skills_searchEmpty")}
          </div>
        )}

        {storeSearching && (
          <div className="flex items-center justify-center h-48 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common_loading")}
          </div>
        )}

        {storeError && !storeSearching && (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
            {isRateLimit ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <p className="text-sm text-amber-600">{t("skills_rateLimited")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("skills_rateLimitHint")}
                </p>
              </>
            ) : (
              <p className="text-sm text-destructive">
                {t("skills_searchFailed", { error: storeError.message })}
              </p>
            )}
          </div>
        )}

        {installSource === "skillhub" &&
          !skillHubInstalled &&
          storeResults === null &&
          !storeSearching && (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-amber-600">
                {t("skills_cliNotInstalled")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("skills_cliNotInstalledHint")}
              </p>
              <Button
                size="sm"
                onClick={onSetupCli}
                disabled={cliSetupPending}
              >
                {cliSetupPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Terminal className="h-3.5 w-3.5 mr-1" />
                )}
                {t("skills_setupCli")}
              </Button>
            </div>
          )}

        {storeResults && !storeSearching && storeResults.length === 0 && (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            {t("skills_searchNoResults")}
          </div>
        )}

        {storeResults &&
          !storeSearching &&
          storeResults.length > 0 &&
          storeResults.map((item) => {
            const slug = item.slug || item.name || "";
            const isInstalling = installPending && installingSlug === slug;
            return (
              <div
                key={slug}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors border-b border-border last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{slug}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description || item.summary || ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs shrink-0"
                  disabled={isInstalling}
                  onClick={() => onInstall(slug)}
                >
                  {isInstalling ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1" />
                  )}
                  {isInstalling
                    ? t("skills_installing")
                    : t("skills_install")}
                </Button>
              </div>
            );
          })}
      </div>
    </>
  );
}

function SkillDetailDialog({
  skill,
  loading,
  open,
  onClose,
  t,
}: {
  skill: Skill | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const reqs = skill?.requirements ?? {};
  const miss = skill?.missing ?? {};

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {loading
              ? t("common_loading")
              : `${skill?.emoji || "📦"} ${skill?.name || ""}`}
          </DialogTitle>
          {skill?.description && (
            <DialogDescription>{skill.description}</DialogDescription>
          )}
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {skill && !loading && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                {t("skills_source")} {skill.source || "—"}
              </p>
              {skill.filePath && (
                <p>
                  {t("skills_path")}{" "}
                  <code className="px-1 py-0.5 bg-muted rounded text-[11px]">
                    {skill.filePath}
                  </code>
                </p>
              )}
              {skill.homepage && (
                <a
                  href={skill.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {skill.homepage}
                </a>
              )}
            </div>

            {(reqs.bins?.length || reqs.env?.length) && (
              <Card className="py-3">
                <CardContent className="space-y-2">
                  <p className="text-xs font-medium">{t("skills_requirements")}</p>
                  {reqs.bins && reqs.bins.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {reqs.bins.map((b) => {
                        const ok = !(miss.bins ?? []).includes(b);
                        return (
                          <code
                            key={b}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[11px]",
                              ok
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {ok ? "✓" : "✗"} {b}
                          </code>
                        );
                      })}
                    </div>
                  )}
                  {reqs.env && reqs.env.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {reqs.env.map((e) => {
                        const ok = !(miss.env ?? []).includes(e);
                        return (
                          <code
                            key={e}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[11px]",
                              ok
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {ok ? "✓" : "✗"} {e}
                          </code>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {skill.install &&
              skill.install.length > 0 &&
              !skill.eligible && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">
                    {t("skills_installOptions")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skill.install.map((opt) => (
                      <span
                        key={opt.label}
                        className="text-xs text-muted-foreground"
                      >
                        → {opt.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function UninstallConfirmDialog({
  name,
  open,
  pending,
  onClose,
  onConfirm,
  t,
}: {
  name: string | null;
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("skills_uninstall")}</DialogTitle>
          <DialogDescription>
            {t("skills_uninstallConfirm", { name: name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("common_cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 mr-1" />
            )}
            {pending ? t("skills_uninstalling") : t("skills_uninstall")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
