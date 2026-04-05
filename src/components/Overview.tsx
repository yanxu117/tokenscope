import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { fmt, fmtCost, getAllSessions, getSkillStats } from "../data";
import { useRecalculatedData, usePricingConfig } from "../PricingContext";
import { useLang, useTranslations } from "../i18n";
import {
  MessageSquare,
  Coins,
  Database,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const COLORS = [
  "hsl(220, 70%, 55%)",
  "hsl(160, 65%, 45%)",
  "hsl(30, 85%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(45, 85%, 50%)",
  "hsl(330, 60%, 50%)",
];

export default function Overview() {
  const data = useRecalculatedData();
  const { currencySymbol } = usePricingConfig();
  const navigate = useNavigate();
  const { lang } = useLang();
  const tr = useTranslations(lang);
  const [sourceFilter, setSourceFilter] = useState<"all" | "claude" | "codex">("all");
  const allSessions = getAllSessions(data);
  const sources = data.sources ?? [];

  // Filter by source
  const sessions = sourceFilter === "all"
    ? allSessions
    : allSessions.filter((s) => s.source === sourceFilter);

  const gt = data.grand_total;

  // Group sessions by project (filtered)
  const projectMap: Record<string, { total: number; cost: number; sessions: number }> = {};
  for (const s of sessions) {
    const p = s.project;
    if (!projectMap[p]) projectMap[p] = { total: 0, cost: 0, sessions: 0 };
    projectMap[p].total += s.stats.total;
    projectMap[p].cost += s.stats.cost;
    projectMap[p].sessions += 1;
  }
  const treemapData = Object.entries(projectMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, v], i) => ({
      name: name.split("/").pop() || name,
      fullName: name,
      size: v.total,
      cost: v.cost,
      sessions: v.sessions,
      color: COLORS[i % COLORS.length],
    }));

  // Token breakdown pie
  const pieData = [
    { name: tr.input, value: gt.input, color: COLORS[0] },
    { name: tr.output, value: gt.output, color: COLORS[1] },
    { name: tr.cacheReadLabel, value: gt.cache_read, color: COLORS[2] },
    { name: tr.cacheWriteLabel, value: gt.cache_write, color: COLORS[3] },
  ];

  // Top sessions
  const topSessions = sessions.slice(0, 12).map((s) => ({
    name: `${s.project.split("/").pop()}/${s.sid}`,
    fullName: `${s.project} (${s.date})`,
    total: s.stats.total,
    cost: s.stats.cost,
    sessionKey: s.sessionKey,
    msgs: s.stats.msgs,
  }));

  // Daily trend
  const dayMap: Record<string, number> = {};
  for (const s of sessions) {
    const day = s.date;
    dayMap[day] = (dayMap[day] || 0) + s.stats.total;
  }
  const trendData = Object.entries(dayMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, total]) => ({ date: date.slice(5), total }));

  // Compute trend direction (last 2 days)
  const lastTwo = trendData.slice(-2);
  const trendPct =
    lastTwo.length === 2
      ? ((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100
      : 0;
  const trendUp = trendPct >= 0;

  // Token by Skill
  const skillStats = getSkillStats(data);
  const skillTotal = skillStats.reduce((s, sk) => s + sk.total, 0);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Source Filter */}
          {sources.length > 1 && (
            <div className="flex items-center gap-2 px-4 lg:px-6">
              <span className="text-xs text-muted-foreground">{tr.sourceFilter}:</span>
              {(["all", "claude", "codex"] as const).map((src) => {
                if (src !== "all" && !sources.includes(src)) return null;
                const label = src === "all" ? tr.allSources : src === "claude" ? tr.claudeCode : tr.codexCli;
                return (
                  <button
                    key={src}
                    onClick={() => setSourceFilter(src)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      sourceFilter === src
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Section Cards */}
          <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>{tr.totalTokens}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {fmt(gt.total)}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    {trendUp ? (
                      <ArrowUpRight className="size-3" />
                    ) : (
                      <ArrowDownRight className="size-3" />
                    )}
                    {trendUp ? "+" : ""}
                    {trendPct.toFixed(1)}%
                  </Badge>
                </CardAction>
              </CardHeader>
            </Card>

            <Card className="@container/card">
              <CardHeader>
                <CardDescription>{tr.cacheRead}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {fmt(gt.cache_read)}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <Database className="size-3" />
                    {((gt.cache_read / gt.total) * 100).toFixed(0)}%
                  </Badge>
                </CardAction>
              </CardHeader>
            </Card>

            <Card className="@container/card">
              <CardHeader>
                <CardDescription>{tr.sessions}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {sessions.length}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <MessageSquare className="size-3" />
                    {Object.keys(projectMap).length} {tr.projects}
                  </Badge>
                </CardAction>
              </CardHeader>
            </Card>

            <Card className="@container/card">
              <CardHeader>
                <CardDescription>{tr.estCost}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {fmtCost(gt.cost, currencySymbol)}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <Coins className="size-3" />
                    {tr.basedOnPricing}
                  </Badge>
                </CardAction>
              </CardHeader>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 lg:px-6">
            {/* Project Treemap */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {tr.tokenByProject}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5 h-[280px] items-stretch">
                  {treemapData.map((item) => {
                    const pct = (item.size / gt.total) * 100;
                    return (
                      <button
                        key={item.fullName}
                        onClick={() => {
                          const sessionsOfProject = allSessions.filter(
                            (s) => s.project === item.fullName
                          );
                          if (sessionsOfProject.length > 0) {
                            navigate(
                              `/session/${encodeURIComponent(sessionsOfProject[0].sessionKey)}`
                            );
                          }
                        }}
                        className="relative rounded-md flex flex-col items-center justify-center p-2 overflow-hidden transition-all hover:opacity-80 hover:scale-105 cursor-pointer"
                        style={{
                          backgroundColor: item.color,
                          minWidth: `${Math.max(pct * 3.5, 60)}px`,
                          flex: `${Math.max(pct / 20, 0.5)} 1 0`,
                        }}
                      >
                        <span className="text-white text-xs font-medium truncate w-full text-center">
                          {item.name}
                        </span>
                        <span className="text-white/80 text-[10px]">
                          {fmt(item.size)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Token Breakdown Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {tr.tokenBreakdown}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                            <p className="font-medium">{d.name}</p>
                            <p className="text-muted-foreground">{fmt(d.value)}</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-muted-foreground">
                        {d.name}: {fmt(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trend */}
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {tr.dailyUsage}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="fillTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="hsl(220, 70%, 55%)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(220, 70%, 55%)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v: number) => fmt(v)}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                            <p className="font-medium">{d.date}</p>
                            <p>{fmt(d.total)}</p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(220, 70%, 55%)"
                      fill="url(#fillTokens)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Token by Skill */}
          {skillStats.length > 0 && (
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {tr.tokenBySkill}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {skillStats.slice(0, 15).map((sk) => {
                      const pct = (sk.total / skillTotal) * 100;
                      return (
                        <div key={sk.name} className="flex items-center gap-3">
                          <span className="text-xs font-medium w-32 truncate shrink-0" title={sk.name}>
                            {sk.name}
                          </span>
                          <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                            <div
                              className="h-full rounded-sm transition-all"
                              style={{
                                width: `${Math.max(pct, 1)}%`,
                                backgroundColor: sk.color,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-16 text-right tabular-nums shrink-0">
                            {fmt(sk.total)}
                          </span>
                          <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Sessions Table */}
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {tr.topSessions}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {topSessions.map((s, i) => (
                    <button
                      key={s.sessionKey}
                      onClick={() =>
                        navigate(
                          `/session/${encodeURIComponent(s.sessionKey)}`
                        )
                      }
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left group"
                    >
                      <span className="text-xs text-muted-foreground w-6">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {s.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.msgs} {tr.msgs}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{fmt(s.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtCost(s.cost, currencySymbol)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        #{i + 1}
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
