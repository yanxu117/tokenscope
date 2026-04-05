import * as fs from "fs";
import * as path from "path";
import type { ParsedSession, PricingTriple } from "./types";

const CODEX_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".codex"
);

const PRICING: Record<string, PricingTriple> = {
  "gpt-5.4": { input: 2.5, output: 10.0, cacheRead: 1.25 },
  "gpt-4o": { input: 2.5, output: 10.0, cacheRead: 1.25 },
  "o3": { input: 2.0, output: 8.0, cacheRead: 0.2 },
  "o4-mini": { input: 0.75, output: 4.5, cacheRead: 0.075 },
  "o3-mini": { input: 1.1, output: 4.4, cacheRead: 0 },
};

function getPrice(model: string): PricingTriple {
  for (const [k, v] of Object.entries(PRICING)) {
    if (model.includes(k)) return v;
  }
  return { input: 0, output: 0, cacheRead: 0 };
}

interface TurnBuilder {
  userText: string;
  startTime: string;
  model: string;
  tokenCalls: { input: number; output: number; cached: number; reasoning: number }[];
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDir(full));
    } else if (full.endsWith(".jsonl")) {
      results.push(full);
    }
  }
  return results;
}

function readJsonl(filePath: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { results.push(JSON.parse(trimmed)); } catch { /* skip */ }
  }
  return results;
}

export function parseCodexSessions(codexDir?: string): ParsedSession[] {
  const dir = codexDir ?? CODEX_DIR;
  const sessionsDir = path.join(dir, "sessions");
  if (!fs.existsSync(sessionsDir)) return [];

  const sessions: ParsedSession[] = [];
  const files = walkDir(sessionsDir);

  for (const filePath of files) {
    const lines = readJsonl(filePath);

    // Extract session metadata
    let cwd = "";
    let sessionId = "";
    let defaultModel = "unknown";

    for (const d of lines) {
      if (d.type === "session_meta" && d.payload) {
        const p = d.payload as Record<string, unknown>;
        cwd = String(p.cwd ?? "");
        sessionId = String(p.id ?? "");
      }
      if (d.type === "turn_context" && d.payload) {
        const p = d.payload as Record<string, unknown>;
        if (p.model) defaultModel = String(p.model);
      }
    }

    // Build turns: user_message starts a turn, collect token_counts until next user_message
    const turnBuilders: TurnBuilder[] = [];
    let current: TurnBuilder | null = null;

    for (const d of lines) {
      if (d.type !== "event_msg" || !d.payload) continue;
      const payload = d.payload as Record<string, unknown>;
      const pt = String(payload.type ?? "");

      if (pt === "user_message") {
        if (current) turnBuilders.push(current);
        current = {
          userText: String(payload.message ?? "").slice(0, 200),
          startTime: String(d.timestamp ?? ""),
          model: defaultModel,
          tokenCalls: [],
        };
      } else if (pt === "turn_context" && current) {
        const m = (d.payload as Record<string, unknown>).model;
        if (m) current.model = String(m);
      } else if (pt === "token_count" && payload.info && current) {
        const info = payload.info as Record<string, unknown>;
        const last = info.last_token_usage as Record<string, number> | undefined;
        if (last) {
          current.tokenCalls.push({
            input: last.input_tokens ?? 0,
            output: last.output_tokens ?? 0,
            cached: last.cached_input_tokens ?? 0,
            reasoning: last.reasoning_output_tokens ?? 0,
          });
        }
      }
    }
    if (current) turnBuilders.push(current);

    if (turnBuilders.length === 0) continue;

    // Determine project from cwd
    const project = cwd ? cwd.split("/").pop() || "unknown" : "unknown";
    const sid = sessionId.slice(0, 8) || path.basename(filePath).slice(0, 8);
    const date = turnBuilders[0].startTime.slice(0, 10);
    const model = turnBuilders[0].model;
    const price = getPrice(model);

    let totalInput = 0;
    let totalOutput = 0;
    let totalCR = 0;
    let totalCost = 0;
    let totalMsgs = 0;

    const parsedTurns = turnBuilders.map((t) => {
      const tIn = t.tokenCalls.reduce((s, c) => s + c.input, 0);
      const tOut = t.tokenCalls.reduce((s, c) => s + c.output + c.reasoning, 0);
      const tCR = t.tokenCalls.reduce((s, c) => s + c.cached, 0);
      const tTot = tIn + tOut + tCR;
      const tCost = (tIn * price.input + tOut * price.output + tCR * price.cacheRead) / 1_000_000;

      totalInput += tIn;
      totalOutput += tOut;
      totalCR += tCR;
      totalCost += tCost;
      totalMsgs += t.tokenCalls.length;

      return {
        user: t.userText,
        time: t.startTime,
        input: tIn,
        output: tOut,
        cache_read: tCR,
        cache_write: 0,
        total: tTot,
        cost: Math.round(tCost * 10000) / 10000,
      };
    });

    sessions.push({
      source: "codex",
      project,
      sid,
      date,
      first_ts: turnBuilders[0].startTime,
      model,
      stats: {
        input: totalInput,
        output: totalOutput,
        cache_read: totalCR,
        cache_write: 0,
        total: totalInput + totalOutput + totalCR,
        cost: Math.round(totalCost * 10000) / 10000,
        msgs: totalMsgs,
      },
      turns: parsedTurns,
    });
  }

  return sessions;
}
