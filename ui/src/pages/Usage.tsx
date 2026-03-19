import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usageApi } from "../api/usage";
import type {
  UsageData,
  UsageByModel,
  UsageByProvider,
  UsageByAgent,
  UsageByChannel,
} from "../api/usage";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { formatTokens } from "../lib/utils";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  MessageSquare,
  Wrench,
  AlertTriangle,
  Coins,
  DollarSign,
  MonitorDot,
  RefreshCw,
} from "lucide-react";

type DaysPreset = 1 | 7 | 30;

function fmtCost(n: number | null | undefined): string {
  return n != null && n > 0 ? `$${n.toFixed(4)}` : "$0";
}

function fmtRate(errors: number, total: number): string {
  if (!total) return "—";
  return `${((errors / total) * 100).toFixed(1)}%`;
}

function computeDateRange(days: DaysPreset): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const startDate = new Date(now.getTime() - (days - 1) * 86400000)
    .toISOString()
    .slice(0, 10);
  return { startDate, endDate };
}

export function Usage() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [days, setDays] = useState<DaysPreset>(7);

  useEffect(() => {
    setBreadcrumbs([{ label: t("usage_title") }]);
  }, [setBreadcrumbs, t]);

  const { startDate, endDate } = useMemo(() => computeDateRange(days), [days]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.usage(selectedCompanyId!, startDate, endDate),
    queryFn: () => usageApi.fetch(selectedCompanyId!, startDate, endDate),
    enabled: !!selectedCompanyId,
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={BarChart3} message={t("usage_selectCompany")} />;
  }

  if (isLoading) {
    return <PageSkeleton variant="usage" />;
  }

  const presets: Array<{ value: DaysPreset; label: string }> = [
    { value: 1, label: t("usage_today") },
    { value: 7, label: t("usage_7days") },
    { value: 30, label: t("usage_30days") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <Button
            key={p.value}
            variant={days === p.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setDays(p.value)}
          >
            {p.label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          {t("usage_refresh")}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {data && <UsageContent data={data} t={t} />}

      {!data && !error && !isLoading && (
        <EmptyState icon={BarChart3} message={t("usage_noData")} />
      )}
    </div>
  );
}

interface UsageContentProps {
  data: UsageData;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function UsageContent({ data, t }: UsageContentProps) {
  const totals = data.totals;
  const agg = data.aggregates;
  const msgs = agg.messages;
  const tools = agg.tools;

  return (
    <>
      <OverviewCards
        msgs={msgs}
        tools={tools}
        totals={totals}
        sessionCount={(data.sessions ?? []).length}
        dateRange={`${data.startDate} ~ ${data.endDate}`}
        t={t}
      />

      <TopRankings agg={agg} tools={tools} t={t} />

      <TokenBreakdown totals={totals} t={t} />

      {agg.daily?.length > 0 && <DailyChart daily={agg.daily} t={t} />}

      {data.sessions?.length > 0 && (
        <SessionList sessions={data.sessions} t={t} />
      )}
    </>
  );
}

interface OverviewCardsProps {
  msgs: UsageData["aggregates"]["messages"];
  tools: UsageData["aggregates"]["tools"];
  totals: UsageData["totals"];
  sessionCount: number;
  dateRange: string;
  t: (key: string) => string;
}

function OverviewCards({ msgs, tools, totals, sessionCount, dateRange, t }: OverviewCardsProps) {
  const cards = [
    {
      icon: MessageSquare,
      label: t("usage_messages"),
      value: msgs.total || 0,
      meta: `${msgs.user || 0} ${t("usage_userMessages")} · ${msgs.assistant || 0} ${t("usage_assistantMessages")}`,
    },
    {
      icon: Wrench,
      label: t("usage_toolCalls"),
      value: tools.totalCalls || 0,
      meta: `${tools.uniqueTools || 0} ${t("usage_uniqueTools")}`,
    },
    {
      icon: AlertTriangle,
      label: t("usage_errors"),
      value: msgs.errors || 0,
      meta: `${t("usage_errorRate")} ${fmtRate(msgs.errors, msgs.total)}`,
    },
    {
      icon: Coins,
      label: t("usage_totalTokens"),
      value: formatTokens(totals.totalTokens || 0),
      meta: `${formatTokens(totals.input || 0)} ${t("usage_inputTokens")} · ${formatTokens(totals.output || 0)} ${t("usage_outputTokens")}`,
    },
    {
      icon: DollarSign,
      label: t("usage_cost"),
      value: fmtCost(totals.totalCost),
      meta: `${fmtCost(totals.inputCost)} ${t("usage_inputCost")} · ${fmtCost(totals.outputCost)} ${t("usage_outputCost")}`,
    },
    {
      icon: MonitorDot,
      label: t("usage_sessions"),
      value: sessionCount,
      meta: dateRange,
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-1 sm:gap-2">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {card.value}
                </p>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  {card.label}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                  {card.meta}
                </p>
              </div>
              <card.icon className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface TopRankingsProps {
  agg: UsageData["aggregates"];
  tools: UsageData["aggregates"]["tools"];
  t: (key: string) => string;
}

function TopRankings({ agg, tools, t }: TopRankingsProps) {
  const sections: Array<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }> = [];

  if (agg.byModel?.length) {
    sections.push({
      title: t("usage_topModels"),
      items: agg.byModel.slice(0, 5).map((m: UsageByModel) => ({
        label: m.model || t("usage_unknown"),
        value: `${fmtCost(m.totals?.totalCost)} · ${formatTokens(m.totals?.totalTokens || 0)}`,
      })),
    });
  }

  if (agg.byProvider?.length) {
    sections.push({
      title: t("usage_topProviders"),
      items: agg.byProvider.slice(0, 5).map((p: UsageByProvider) => ({
        label: p.provider || t("usage_unknown"),
        value: `${fmtCost(p.totals?.totalCost)} · ${p.count} ${t("usage_calls")}`,
      })),
    });
  }

  if (tools.tools?.length) {
    sections.push({
      title: t("usage_topTools"),
      items: tools.tools.slice(0, 5).map((tool) => ({
        label: tool.name,
        value: `${tool.count} ${t("usage_calls")}`,
      })),
    });
  }

  if (agg.byAgent?.length) {
    sections.push({
      title: t("usage_topAgents"),
      items: agg.byAgent.slice(0, 5).map((a: UsageByAgent) => ({
        label: a.agentId || "main",
        value: fmtCost(a.totals?.totalCost),
      })),
    });
  }

  if (agg.byChannel?.length) {
    sections.push({
      title: t("usage_topChannels"),
      items: agg.byChannel.slice(0, 5).map((c: UsageByChannel) => ({
        label: c.channel || "webchat",
        value: fmtCost(c.totals?.totalCost),
      })),
    });
  }

  if (sections.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {sections.map((section) => (
        <Card key={section.title}>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">{section.title}</h3>
            <div className="space-y-0">
              {section.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0"
                >
                  <span className="text-sm font-medium truncate mr-2">
                    {item.label}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono shrink-0">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface TokenBreakdownProps {
  totals: UsageData["totals"];
  t: (key: string) => string;
}

const TOKEN_CATEGORIES = [
  { key: "output" as const, colorClass: "bg-red-400", labelKey: "usage_output" },
  { key: "input" as const, colorClass: "bg-blue-400", labelKey: "usage_input" },
  { key: "cacheRead" as const, colorClass: "bg-green-400", labelKey: "usage_cacheRead" },
  { key: "cacheWrite" as const, colorClass: "bg-amber-400", labelKey: "usage_cacheWrite" },
] as const;

function TokenBreakdown({ totals, t }: TokenBreakdownProps) {
  const total = (totals.input || 0) + (totals.output || 0) + (totals.cacheRead || 0) + (totals.cacheWrite || 0);

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">{t("usage_tokenBreakdown")}</h3>

        {total > 0 && (
          <div className="h-2.5 rounded-full overflow-hidden flex mb-4">
            {TOKEN_CATEGORIES.map((cat) => {
              const val = totals[cat.key] || 0;
              const pct = (val / total) * 100;
              if (pct < 0.5) return null;
              return (
                <div
                  key={cat.key}
                  className={`${cat.colorClass} transition-[width] duration-300`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {TOKEN_CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-center gap-1.5 text-sm">
              <span className={`inline-block w-2.5 h-2.5 rounded-sm ${cat.colorClass}`} />
              <span className="text-muted-foreground">
                {t(cat.labelKey)} {formatTokens(totals[cat.key] || 0)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface DailyChartProps {
  daily: UsageData["aggregates"]["daily"];
  t: (key: string) => string;
}

function DailyChart({ daily, t }: DailyChartProps) {
  const maxTokens = Math.max(...daily.map((d) => d.tokens || 0), 1);

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">{t("usage_dailyUsage")}</h3>
        <div className="flex items-end gap-1 h-32">
          {daily.map((d) => {
            const pct = Math.max(2, Math.round(((d.tokens || 0) / maxTokens) * 100));
            const dateLabel = (d.date || "").slice(5);
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
                title={`${d.date}: ${formatTokens(d.tokens)} ${t("usage_tokens")} · ${d.messages || 0} ${t("usage_msgs")}`}
              >
                <div
                  className="w-full rounded-t bg-blue-400/80 hover:bg-blue-400 transition-colors min-h-[2px]"
                  style={{ height: `${pct}%` }}
                />
                <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                  {dateLabel}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface SessionListProps {
  sessions: UsageData["sessions"];
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function SessionList({ sessions, t }: SessionListProps) {
  const visible = sessions.slice(0, 10);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold">{t("usage_sessionDetails")}</h3>
          <span className="text-xs text-muted-foreground">
            {t("usage_recentN", { count: visible.length })}
          </span>
        </div>
        <div className="divide-y divide-border">
          {visible.map((s) => {
            const u = s.usage;
            const key = (s.key || "").replace(/^agent:main:/, "");
            const model = s.model || u.modelUsage?.[0]?.model || "";
            const provider = u.modelUsage?.[0]?.provider || s.modelProvider || "";

            return (
              <div key={s.sessionId} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate max-w-[200px]" title={s.key}>
                    {key || s.sessionId?.slice(0, 12) || "—"}
                  </span>
                  {s.agentId && <Badge variant="secondary">{s.agentId}</Badge>}
                  {model && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {model}
                    </Badge>
                  )}
                  {provider && <Badge variant="secondary">{provider}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTokens(u.totalTokens || 0)} {t("usage_tokens")}
                  {" · "}
                  {fmtCost(u.totalCost)}
                  {" · "}
                  {u.messageCounts?.total || 0} {t("usage_msgs")}
                  {(u.messageCounts?.errors ?? 0) > 0 && (
                    <span className="text-destructive">
                      {" · "}
                      {u.messageCounts.errors} {t("usage_err")}
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
