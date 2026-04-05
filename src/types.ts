export interface TurnData {
  user: string;
  time: string;
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
  total: number;
  cost: number;
}

export interface SessionData {
  source?: "claude" | "codex";
  project: string;
  sid: string;
  date: string;
  first_ts: string;
  stats: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
    total: number;
    cost: number;
    msgs: number;
  };
  turns: TurnData[];
}

export interface ModelData {
  stats: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
    total: number;
    cost: number;
    msgs: number;
  };
  sessions: Record<string, SessionData>;
}

export interface DashboardData {
  generated: string;
  sources?: ("claude" | "codex")[];
  models: Record<string, ModelData>;
  grand_total: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
    total: number;
    cost: number;
    msgs: number;
  };
}
