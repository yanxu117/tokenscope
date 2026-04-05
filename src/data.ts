import type { DashboardData, SessionData } from "./types";
import data from "../public/data.json" with { type: "json" };

export function useData(): DashboardData {
  return data as DashboardData;
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function fmtCost(cost: number, symbol = "$"): string {
  if (cost >= 1) return `${symbol}${cost.toFixed(2)}`;
  if (cost >= 0.01) return `${symbol}${cost.toFixed(3)}`;
  return `${symbol}${cost.toFixed(4)}`;
}

export function fmtPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

const COLORS = [
  "hsl(220, 70%, 50%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(45, 80%, 50%)",
  "hsl(330, 60%, 50%)",
];

export function projectColor(index: number): string {
  return COLORS[index % COLORS.length];
}

export interface SkillStat {
  name: string;
  total: number;
  cost: number;
  turns: number;
  color: string;
}

export function getSkillStats(data: DashboardData): SkillStat[] {
  const map = new Map<string, { total: number; cost: number; turns: number }>();
  for (const modelData of Object.values(data.models)) {
    for (const sessionData of Object.values(modelData.sessions)) {
      for (const turn of sessionData.turns) {
        const m = turn.user.match(/skills\/([^/\s]+)/);
        if (!m) continue;
        const name = m[1];
        const cur = map.get(name) ?? { total: 0, cost: 0, turns: 0 };
        cur.total += turn.total;
        cur.cost += turn.cost;
        cur.turns += 1;
        map.set(name, cur);
      }
    }
  }
  return Array.from(map.entries())
    .map(([name, v], i) => ({ name, ...v, color: COLORS[i % COLORS.length] }))
    .sort((a, b) => b.total - a.total);
}

export function getAllSessions(data: DashboardData): (SessionData & { model: string; sessionKey: string })[] {
  const sessions: (SessionData & { model: string; sessionKey: string })[] = [];
  for (const [modelName, modelData] of Object.entries(data.models)) {
    for (const [sessionKey, sessionData] of Object.entries(modelData.sessions)) {
      sessions.push({ ...sessionData, model: modelName, sessionKey });
    }
  }
  return sessions.sort((a, b) => b.stats.total - a.stats.total);
}

export function getSources(data: DashboardData): ("claude" | "codex")[] {
  if (data.sources?.length) return data.sources;
  // Auto-detect: if any session has source field, collect unique values
  const found = new Set<"claude" | "codex">();
  for (const modelData of Object.values(data.models)) {
    for (const sessionData of Object.values(modelData.sessions)) {
      if (sessionData.source) found.add(sessionData.source);
    }
  }
  return found.size > 0 ? Array.from(found) : ["claude"]; // default to claude for legacy data
}

