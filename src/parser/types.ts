export interface ParsedTurn {
  user: string;
  time: string;
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
  total: number;
  cost: number;
}

export interface ParsedSession {
  source: "claude" | "codex";
  project: string;
  sid: string;
  date: string;
  first_ts: string;
  model: string;
  stats: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
    total: number;
    cost: number;
    msgs: number;
  };
  turns: ParsedTurn[];
}

export interface PricingTriple {
  input: number;
  output: number;
  cacheRead: number;
}
