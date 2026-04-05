# TokenScope

Token usage dashboard for **Claude Code** and **Codex CLI** — visualize your AI coding costs.

## Features

- **Multi-source**: Supports both Claude Code (`~/.claude/projects/`) and Codex CLI (`~/.codex/sessions/`)
- **Token breakdown**: Input, output, cache read/write per model
- **Cost estimation**: Configurable pricing for 20+ models (Anthropic, OpenAI, Google, Zhipu, DeepSeek)
- **Per-session detail**: Drill into individual sessions to see turn-by-turn usage
- **Skill analysis**: See which Claude Code skills consume the most tokens
- **i18n**: Chinese / English UI toggle
- **Zero config**: Auto-detects installed tools and parses all available data

## Quick Start

```bash
git clone https://github.com/yanxuwang/tokenscope.git
cd tokenscope

npm install

# Build & preview (ships with sample data)
npm run build && npm run preview
```

Open `http://localhost:4173` in your browser — you'll see sample data.

**To use your own data:**

```bash
# Parse your Claude Code + Codex CLI data (overwrites sample data.json)
npm run parse

# Rebuild & preview with your data
npm run build && npm run preview
```

## CLI Options

```bash
# Parse both sources (default)
npm run parse

# Only Claude Code data
node --experimental-strip-types src/cli.ts --claude

# Only Codex CLI data
node --experimental-strip-types src/cli.ts --codex

# Export data.json only, don't serve
node --experimental-strip-types src/cli.ts --json-only
```

## Development

```bash
npm run dev        # Vite dev server with hot reload
npm run build      # Type check + production build
npm run preview    # Preview production build
npm run lint       # ESLint
```

## How It Works

1. **Parser** (`src/parser/`) reads raw JSONL session files from local disk
   - `claude.ts` — parses `~/.claude/projects/**/*.jsonl`
   - `codex.ts` — parses `~/.codex/sessions/**/*.jsonl`
2. **Orchestrator** merges sessions into unified `public/data.json`
3. **Dashboard** (React + Vite) reads `data.json` and renders interactive charts

## Pricing Configuration

Click the gear icon in the dashboard header to configure model pricing. The dashboard ships with pricing for common models, but you can:

- Map detected models to known pricing entries
- Set custom pricing per model
- Switch between USD and CNY

## Requirements

- Node.js 22+ (for `--experimental-strip-types`)
- Claude Code and/or Codex CLI installed with session history

## License

MIT
