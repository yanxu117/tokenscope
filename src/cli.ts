#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { parseAllSessions, buildDashboardData } from "./parser/index.ts";
import type { ParseOptions } from "./parser/index.ts";

const args = process.argv.slice(2);
const options: ParseOptions = {};

for (const arg of args) {
  if (arg === "--claude") options.codex = true; // only claude
  else if (arg === "--codex") options.claude = true; // only codex
  else if (arg === "--json-only") options.jsonOnly = true;
  else if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  }
}

function printHelp() {
  console.log(`token-dashboard — Token usage visualization for Claude Code & Codex CLI

Usage:
  npx token-dashboard [options]

Options:
  --claude      Only parse Claude Code sessions
  --codex       Only parse Codex CLI sessions
  --json-only   Output data.json only, don't serve dashboard
  -h, --help    Show this help

By default, both Claude Code (~/.claude/projects) and Codex CLI (~/.codex/sessions)
data sources are auto-detected and parsed.`);
}

const sessions = parseAllSessions(options);
const data = buildDashboardData(sessions);

// Find output directory: package root / public
const thisDir = path.dirname(new URL(import.meta.url).pathname);
const distDir = path.resolve(thisDir, "..");
const publicDir = path.join(distDir, "public");

// Write data.json
const outPath = path.join(publicDir, "data.json");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

const claudeCount = sessions.filter((s) => s.source === "claude").length;
const codexCount = sessions.filter((s) => s.source === "codex").length;
console.log(
  `Parsed ${sessions.length} sessions (${claudeCount} Claude, ${codexCount} Codex) → ${outPath}`
);
console.log(
  `Grand total: ${(data.grand_total.total / 1_000_000).toFixed(1)}M tokens, $${data.grand_total.cost.toFixed(2)}`
);

// @ts-ignore — runtime-only flag
if (!options.jsonOnly) {
  // Try to serve the built dashboard
  const serve = async () => {
    const { createServer } = await import("http");
    const handler = (req: any, res: any) => {
      let filePath = path.join(distDir, new URL(req.url, "http://localhost").pathname.slice(1));
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, "index.html");
      }
      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";
      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    };
    const server = createServer(handler);
    const port = 3141;
    server.listen(port, () => {
      console.log(`\nDashboard: http://localhost:${port}`);
      console.log("Press Ctrl+C to stop.");
    });
  };
  serve().catch(() => {
    console.log("Run 'npm run build' first, then use --json-only to just export data.");
  });
}
