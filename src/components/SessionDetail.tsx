import { useParams, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { fmt, fmtCost, getAllSessions } from "../data";
import { useRecalculatedData, usePricingConfig } from "../PricingContext";
import { useLang, useTranslations } from "../i18n";
import { ArrowLeft, MessageSquare, Zap, Database, Coins, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";

export default function SessionDetail() {
  const { sessionKey } = useParams();
  const navigate = useNavigate();
  const data = useRecalculatedData();
  const { currencySymbol } = usePricingConfig();
  const allSessions = getAllSessions(data);
  const { lang } = useLang();
  const tr = useTranslations(lang);
  const [sortBy, setSortBy] = useState<"total" | "time" | "input" | "output" | "cache_read">("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const session = allSessions.find((s) => s.sessionKey === decodeURIComponent(sessionKey || ""));
  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{tr.sessionNotFound}</p>
        <Button variant="ghost" onClick={() => navigate("/")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> {tr.backToOverview}
        </Button>
      </div>
    );
  }

  const sortedTurns = useMemo(() => {
    const t = [...session.turns];
    const dir = sortDir === "asc" ? 1 : -1;
    t.sort((a, b) => {
      if (sortBy === "time") return a.time.localeCompare(b.time) * dir;
      return (a[sortBy] - b[sortBy]) * dir;
    });
    return t;
  }, [session.turns, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const chartData = session.turns.map((t, i) => ({
    idx: i + 1,
    input: t.input,
    output: t.output,
    cache_read: t.cache_read,
    total: t.total,
    user: t.user.slice(0, 30),
  }));

  const stats = session.stats;

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{session.project}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{tr.session} {session.sid}</span>
            <span>|</span>
            <span>{session.date}</span>
            <Badge variant="secondary">{stats.msgs} {tr.msgs}</Badge>
          </div>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          {fmt(stats.total)} {tr.tokens}
        </Badge>
      </div>

      {/* Session Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MiniStat label={tr.inputCol} value={fmt(stats.input)} icon={<Zap className="w-3 h-3" />} color="text-violet-500" />
        <MiniStat label={tr.outputCol} value={fmt(stats.output)} icon={<MessageSquare className="w-3 h-3" />} color="text-emerald-500" />
        <MiniStat label={tr.cacheRCol} value={fmt(stats.cache_read)} icon={<Database className="w-3 h-3" />} color="text-amber-500" />
        <MiniStat label={tr.cacheWriteLabel} value={fmt(stats.cache_write)} icon={<Database className="w-3 h-3" />} color="text-rose-500" />
        <MiniStat label={tr.costCol} value={fmtCost(stats.cost, currencySymbol)} icon={<Coins className="w-3 h-3" />} color="text-sky-500" />
      </div>

      {/* Turn Timeline Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{tr.tokenUsagePerTurn}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v: number) => fmt(v)} tick={{ fontSize: 10 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                      <p className="font-medium mb-1">#{d.idx}</p>
                      <p>{tr.inputCol}: {fmt(d.input)}</p>
                      <p>{tr.outputCol}: {fmt(d.output)}</p>
                      <p>{tr.cacheRCol}: {fmt(d.cache_read)}</p>
                      <p className="font-semibold mt-1">{tr.totalLabel}: {fmt(d.total)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={`hsl(220, ${40 + (i % 3) * 15}%, ${45 + (i % 4) * 8}%)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Turns Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {tr.conversationTurns} ({session.turns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium w-10">{tr.turn}</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium w-16">{tr.time}</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">{tr.message}</th>
                  <SortHeader label={tr.inputCol} col="input" sortBy={sortBy} sortDir={sortDir} onToggle={() => toggleSort("input")} />
                  <SortHeader label={tr.outputCol} col="output" sortBy={sortBy} sortDir={sortDir} onToggle={() => toggleSort("output")} />
                  <SortHeader label={tr.cacheRCol} col="cache_read" sortBy={sortBy} sortDir={sortDir} onToggle={() => toggleSort("cache_read")} />
                  <SortHeader label={tr.totalCol} col="total" sortBy={sortBy} sortDir={sortDir} onToggle={() => toggleSort("total")} />
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">{tr.costCol}</th>
                </tr>
              </thead>
              <tbody>
                {sortedTurns.map((turn, i) => {
                  const time = turn.time ? turn.time.slice(11, 16) : "";
                  const msg = turn.user || "(tool call)";
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground font-mono">{time}</td>
                      <td className="px-3 py-1.5 max-w-[300px] truncate">{msg}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs">{fmt(turn.input)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs">{fmt(turn.output)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs">{fmt(turn.cache_read)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs font-semibold">{fmt(turn.total)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs">{fmtCost(turn.cost, currencySymbol)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={color}>{icon}</div>
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
        <p className="text-sm font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function SortHeader({
  label,
  col,
  sortBy,
  sortDir,
  onToggle,
}: {
  label: string;
  col: string;
  sortBy: string;
  sortDir: string;
  onToggle: () => void;
}) {
  const active = sortBy === col;
  return (
    <th
      className="text-right px-3 py-2 text-xs text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={onToggle}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${active ? "text-primary" : "opacity-30"}`}
          style={active && sortDir === "desc" ? { transform: "rotate(180deg)" } : undefined}
        />
      </span>
    </th>
  );
}
