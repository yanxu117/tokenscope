import type { ParsedSession } from "./types.ts";
import { parseClaudeSessions } from "./claude.ts";
import { parseCodexSessions } from "./codex.ts";
import type { DashboardData, ModelData, SessionData } from "../types.ts";

export { parseClaudeSessions, parseCodexSessions };

export interface ParseOptions {
  claude?: boolean;
  codex?: boolean;
  jsonOnly?: boolean;
  claudeDir?: string;
  codexDir?: string;
}

export function parseAllSessions(options: ParseOptions = {}): ParsedSession[] {
  const sessions: ParsedSession[] = [];
  const wantClaude = options.codex !== true;
  const wantCodex = options.claude !== true;

  if (wantClaude) {
    try { sessions.push(...parseClaudeSessions(options.claudeDir)); } catch { /* skip */ }
  }
  if (wantCodex) {
    try { sessions.push(...parseCodexSessions(options.codexDir)); } catch { /* skip */ }
  }

  return sessions;
}

export function buildDashboardData(sessions: ParsedSession[]): DashboardData {
  const sources = new Set<"claude" | "codex">();
  const modelsMap: Record<string, ModelData> = {};

  for (const s of sessions) {
    sources.add(s.source);
    const modelKey = s.model;
    if (!modelsMap[modelKey]) {
      modelsMap[modelKey] = {
        stats: { input: 0, output: 0, cache_read: 0, cache_write: 0, total: 0, cost: 0, msgs: 0 },
        sessions: {},
      };
    }
    const sessionKey = `${s.project}|${s.sid}`;
    const sessionData: SessionData = {
      source: s.source,
      project: s.project,
      sid: s.sid,
      date: s.date,
      first_ts: s.first_ts,
      stats: s.stats,
      turns: s.turns,
    };
    modelsMap[modelKey].sessions[sessionKey] = sessionData;
    const ms = modelsMap[modelKey].stats;
    ms.input += s.stats.input;
    ms.output += s.stats.output;
    ms.cache_read += s.stats.cache_read;
    ms.cache_write += s.stats.cache_write;
    ms.total += s.stats.total;
    ms.cost += s.stats.cost;
    ms.msgs += s.stats.msgs;
  }

  const grandTotal = { input: 0, output: 0, cache_read: 0, cache_write: 0, total: 0, cost: 0, msgs: 0 };
  for (const md of Object.values(modelsMap)) {
    grandTotal.input += md.stats.input;
    grandTotal.output += md.stats.output;
    grandTotal.cache_read += md.stats.cache_read;
    grandTotal.cache_write += md.stats.cache_write;
    grandTotal.total += md.stats.total;
    grandTotal.cost += md.stats.cost;
    grandTotal.msgs += md.stats.msgs;
  }
  grandTotal.cost = Math.round(grandTotal.cost * 10000) / 10000;

  return {
    generated: new Date().toISOString().slice(0, 16).replace("T", " "),
    sources: Array.from(sources),
    models: modelsMap,
    grand_total: grandTotal,
  };
}
