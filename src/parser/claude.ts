import * as fs from "fs";
import * as path from "path";
import type { ParsedSession, PricingTriple } from "./types";

const CLAUDE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".claude",
  "projects"
);

const PRICING: Record<string, PricingTriple> = {
  "glm-5.1": { input: 4.0, output: 18.0, cacheRead: 1.0 },
  "glm-4.5-air": { input: 0.8, output: 3.0, cacheRead: 0.08 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0, cacheRead: 0.3 },
  "claude-opus-4-20250514": { input: 15.0, output: 75.0, cacheRead: 1.5 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0, cacheRead: 0.08 },
};

function getPrice(model: string): PricingTriple {
  for (const [k, v] of Object.entries(PRICING)) {
    if (model.includes(k)) return v;
  }
  return { input: 0, output: 0, cacheRead: 0 };
}

function extractUserText(msg: Record<string, unknown>): string {
  const content = msg.content;
  if (typeof content === "string") return content.slice(0, 100);
  if (Array.isArray(content)) {
    for (const c of content) {
      if (
        typeof c === "object" &&
        c !== null &&
        (c as Record<string, unknown>).type === "text"
      ) {
        return String((c as Record<string, unknown>).text ?? "").slice(0, 100);
      }
    }
  }
  return "";
}

interface RawLine {
  type: string;
  message?: Record<string, unknown>;
  timestamp?: string;
}

export function parseClaudeSessions(
  claudeDir?: string
): ParsedSession[] {
  const dir = claudeDir ?? CLAUDE_DIR;
  if (!fs.existsSync(dir)) return [];

  const sessions: ParsedSession[] = [];

  for (const projDir of fs.readdirSync(dir).sort()) {
    const projPath = path.join(dir, projDir);
    if (!fs.statSync(projPath).isDirectory()) continue;

    const parts = projDir.split("-");
    const short =
      parts.length > 2 ? parts.slice(2).join("/") : projDir;

    for (const f of fs.readdirSync(projPath).sort()) {
      if (!f.endsWith(".jsonl")) continue;

      const sid = f.slice(0, 8);
      const filePath = path.join(projPath, f);
      const lines: RawLine[] = [];

      for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          lines.push(JSON.parse(trimmed));
        } catch {
          // skip malformed
        }
      }

      // Build turns: group user text + following assistant messages
      let currentUserText = "";
      let currentAssistantMsgs: {
        model: string;
        input: number;
        output: number;
        cache_read: number;
        cache_write: number;
        total: number;
        cost: number;
        timestamp: string;
      }[] = [];

      const flushTurn = (): void => {
        if (currentAssistantMsgs.length === 0) return;
        const tIn = currentAssistantMsgs.reduce((s, a) => s + a.input, 0);
        const tOut = currentAssistantMsgs.reduce((s, a) => s + a.output, 0);
        const tCR = currentAssistantMsgs.reduce(
          (s, a) => s + a.cache_read,
          0
        );
        const tCW = currentAssistantMsgs.reduce(
          (s, a) => s + a.cache_write,
          0
        );
        const tTot = currentAssistantMsgs.reduce((s, a) => s + a.total, 0);
        const tCost = currentAssistantMsgs.reduce((s, a) => s + a.cost, 0);
        const ts =
          currentAssistantMsgs[0]?.timestamp ?? "";

        // Group by model — pick the first model for the session
        const model = currentAssistantMsgs[0]?.model ?? "unknown";

        turns.push({
          user: currentUserText.slice(0, 200),
          time: ts,
          input: tIn,
          output: tOut,
          cache_read: tCR,
          cache_write: tCW,
          total: tTot,
          cost: Math.round(tCost * 10000) / 10000,
        });

        // Aggregate per-model stats
        const key = model;
        if (!modelStats[key]) {
          modelStats[key] = {
            input: 0,
            output: 0,
            cache_read: 0,
            cache_write: 0,
            total: 0,
            cost: 0,
            msgs: 0,
          };
        }
        const ms = modelStats[key];
        ms.input += tIn;
        ms.output += tOut;
        ms.cache_read += tCR;
        ms.cache_write += tCW;
        ms.total += tTot;
        ms.cost += tCost;
        ms.msgs += currentAssistantMsgs.length;
      };

      const turns: ParsedSession["turns"] = [];
      const modelStats: Record<
        string,
        ParsedSession["stats"]
      > = {};

      for (const d of lines) {
        if (d.type === "user") {
          const msg = (d.message ?? {}) as Record<string, unknown>;
          const text = extractUserText(msg);
          if (
            text &&
            !text.startsWith("[{") &&
            !text.startsWith("Continue from")
          ) {
            flushTurn();
            currentUserText = text;
            currentAssistantMsgs = [];
          }
        } else if (d.type === "assistant") {
          const msg = (d.message ?? {}) as Record<string, unknown>;
          const u = (msg.usage ?? {}) as Record<string, number>;
          const inp = u.input_tokens ?? 0;
          const out = u.output_tokens ?? 0;
          const cr = u.cache_read_input_tokens ?? 0;
          const cw = u.cache_creation_input_tokens ?? 0;
          if (inp === 0 && out === 0 && cr === 0 && cw === 0) continue;

          const model = String(msg.model ?? "unknown");
          const ts = String(d.timestamp ?? "");
          const price = getPrice(model);
          const cost =
            (inp * price.input +
              out * price.output +
              cr * price.cacheRead) /
            1_000_000;

          currentAssistantMsgs.push({
            model,
            input: inp,
            output: out,
            cache_read: cr,
            cache_write: cw,
            total: inp + out + cr + cw,
            cost,
            timestamp: ts,
          });
        }
      }
      flushTurn();

      // For simplicity: each session file → one ParsedSession per dominant model
      const dominantModel =
        Object.entries(modelStats).sort(
          (a, b) => b[1].cost - a[1].cost
        )[0]?.[0] ?? "unknown";
      const ms = modelStats[dominantModel];
      if (!ms || ms.msgs === 0) continue;

      sessions.push({
        source: "claude",
        project: short,
        sid,
        date: turns[0]?.time?.slice(0, 10) ?? "",
        first_ts: turns[0]?.time ?? "",
        model: dominantModel,
        stats: {
          ...ms,
          cost: Math.round(ms.cost * 10000) / 10000,
        },
        turns,
      });
    }
  }

  return sessions;
}
