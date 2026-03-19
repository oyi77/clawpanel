import { api } from "./client";

export interface UsageTotals {
  totalTokens: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
}

export interface UsageMessages {
  total: number;
  user: number;
  assistant: number;
  errors: number;
}

export interface UsageTools {
  totalCalls: number;
  uniqueTools: number;
  tools: Array<{ name: string; count: number }>;
}

export interface UsageByModel {
  model: string;
  totals: UsageTotals;
  count: number;
}

export interface UsageByProvider {
  provider: string;
  totals: UsageTotals;
  count: number;
}

export interface UsageByAgent {
  agentId: string;
  totals: UsageTotals;
}

export interface UsageByChannel {
  channel: string;
  totals: UsageTotals;
}

export interface UsageDailyEntry {
  date: string;
  tokens: number;
  messages: number;
  cost: number;
}

export interface UsageSessionEntry {
  sessionId: string;
  key: string;
  agentId?: string;
  model?: string;
  modelProvider?: string;
  usage: {
    totalTokens: number;
    totalCost: number;
    messageCounts: { total: number; errors: number };
    modelUsage?: Array<{ model: string; provider: string }>;
  };
}

export interface UsageData {
  startDate: string;
  endDate: string;
  totals: UsageTotals;
  aggregates: {
    messages: UsageMessages;
    tools: UsageTools;
    byModel: UsageByModel[];
    byProvider: UsageByProvider[];
    byAgent: UsageByAgent[];
    byChannel: UsageByChannel[];
    daily: UsageDailyEntry[];
  };
  sessions: UsageSessionEntry[];
}

function dateParams(startDate: string, endDate: string, limit?: number): string {
  const params = new URLSearchParams();
  params.set("startDate", startDate);
  params.set("endDate", endDate);
  if (limit) params.set("limit", String(limit));
  return `?${params.toString()}`;
}

export const usageApi = {
  fetch: (companyId: string, startDate: string, endDate: string, limit = 20) =>
    api.get<UsageData>(
      `/companies/${companyId}/usage${dateParams(startDate, endDate, limit)}`,
    ),
};
