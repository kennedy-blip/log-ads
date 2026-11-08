import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Flame,
  Gauge,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button, Card, CardHeader, Stat, EmptyState } from "@/components/ui";
import {
  ERROR_TYPES,
  ERROR_TYPE_STYLES,
  LEVEL_STYLES,
  type LogEntry,
  type MinuteBucket,
} from "@/types";
import { formatMinute, percentile } from "@/lib/logEngine";

const PRIMARY_TYPES = ERROR_TYPES.slice(0, 3);

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 24}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-24">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function LogAnalytics({
  buckets,
  logs,
  onInject,
}: {
  buckets: MinuteBucket[];
  logs: LogEntry[];
  onInject: () => void;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(() => {
    const visibleTypes = PRIMARY_TYPES.filter((t) => !hidden.has(t));
    const counts = buckets.map((b) =>
      visibleTypes.reduce((acc, t) => acc + (b.byType[t] ?? 0), 0),
    );
    const otherTypes = ERROR_TYPES.slice(3).filter((t) => !hidden.has(t));
    const other = buckets.map((b) =>
      otherTypes.reduce((acc, t) => acc + (b.byType[t] ?? 0), 0),
    );
    return { visibleTypes, otherTypes, counts, other };
  }, [buckets, hidden]);

  const totals = useMemo(() => {
    const errors = buckets.reduce((a, b) => a + b.errors, 0);
    const requests = buckets.reduce((a, b) => a + b.total, 0);
    const warns = buckets.reduce((a, b) => a + b.warns, 0);
    const byType: Record<string, number> = {};
    for (const b of buckets)
      for (const [k, v] of Object.entries(b.byType)) byType[k] = (byType[k] ?? 0) + v;
    return { errors, requests, warns, byType };
  }, [buckets]);

  const peak = useMemo(() => {
    let best = { idx: -1, value: 0 };
    series.counts.forEach((v, i) => {
      if (v > best.value) best = { idx: i, value: v };
    });
    return best;
  }, [series.counts]);

  const recentErrors = useMemo(
    () => logs.filter((l) => l.level === "ERROR"),
    [logs],
  );

  const p95 = useMemo(
    () => percentile(buckets.map((b) => b.maxLatency), 95),
    [buckets],
  );
  const avgLatency = useMemo(
    () =>
      buckets.length
        ? buckets.reduce((a, b) => a + b.latencySum, 0) /
          Math.max(1, buckets.reduce((a, b) => a + b.latencyCount, 0))
        : 0,
    [buckets],
  );

  const nonPeak = series.counts.filter((_, i) => i !== peak.idx);
  const median = nonPeak.length
    ? [...nonPeak].sort((a, b) => a - b)[Math.floor(nonPeak.length / 2)]
    : 0;
  const spikeRatio = median > 0 ? peak.value / median : peak.value > 3 ? 4 : 1;
  const spikeDetected = spikeRatio >= 2 && peak.value >= 3;

  const maxStack = Math.max(1, ...series.counts.map((v, i) => v + series.other[i]));

  const topEndpoints = useMemo(() => {
    const map = new Map<string, { count: number; latency: number; code: number }>();
    for (const l of recentErrors) {
      const key = `${l.method} ${l.path}`;
      const cur = map.get(key) ?? { count: 0, latency: 0, code: l.status_code };
      cur.count += 1;
      cur.latency += l.response_time_ms;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([k, v]) => ({
        route: k,
        count: v.count,
        avg: Math.round(v.latency / v.count),
        code: v.code,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [recentErrors]);

  const toggleType = (t: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const hasData = totals.requests > 0;

  return (
    <div className="space-y-4">
      {/* KPIs ------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Errors · 15m"
          value={totals.errors}
          unit={`/ ${totals.requests}`}
          accent="rose"
          icon={<AlertTriangle className="h-4 w-4" />}
          delta={{
            dir: spikeDetected ? "up" : "flat",
            text: spikeDetected ? `spike ${spikeRatio.toFixed(1)}× baseline` : "stable",
            good: false,
          }}
        />
        <Stat
          label="Error rate"
          value={`${((totals.errors / Math.max(1, totals.requests)) * 100).toFixed(1)}`}
          unit="%"
          accent="amber"
          icon={<Gauge className="h-4 w-4" />}
          footer={
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
                style={{
                  width: `${Math.min(100, (totals.errors / Math.max(1, totals.requests)) * 100 * 4)}%`,
                }}
              />
            </div>
          }
        />
        <Stat
          label="p95 latency"
          value={Math.round(p95)}
          unit="ms"
          accent="violet"
          icon={<Clock className="h-4 w-4" />}
          delta={{
            dir: p95 > 1200 ? "up" : "down",
            text: p95 > 1200 ? "degraded" : "within SLO",
            good: p95 <= 1200,
          }}
        />
        <Stat
          label="Avg latency"
          value={Math.round(avgLatency)}
          unit="ms"
          accent="emerald"
          icon={<Activity className="h-4 w-4" />}
          delta={{
            dir: "flat",
            text: `${totals.warns} warn events · 15m`,
          }}
        />
      </div>

      {/* Chart ----------------------------------------------------- */}
      <Card className="overflow-hidden">
        <CardHeader
          icon={<BarChart3 className="h-4 w-4" />}
          accent="rose"
          title="Error frequency · last 15 minutes"
          subtitle="Stacked per-minute error counts, broken down by error classification"
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={onInject}>
                <Zap className="h-3 w-3" />
                Simulate spike
              </Button>
              {hidden.size ? (
                <Button size="sm" variant="subtle" onClick={() => setHidden(new Set())}>
                  reset series
                </Button>
              ) : null}
            </>
          }
        />

        <div className="p-4 sm:p-5">
          {/* legend */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {ERROR_TYPES.map((t) => {
              const st = ERROR_TYPE_STYLES[t];
              const off = hidden.has(t);
              const value = totals.byType[t] ?? 0;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition",
                    off
                      ? "border-white/[0.06] bg-transparent text-slate-600"
                      : cn(st.border, st.bg, st.text),
                  )}
                >
                  <span
                    className={cn("h-2.5 w-2.5 rounded-sm", off ? "bg-slate-700" : st.bar)}
                  />
                  {t}
                  <span className="font-terminal text-[10px] tabular-nums opacity-70">
                    {value}
                  </span>
                </button>
              );
            })}
          </div>

          {!hasData ? (
            <EmptyState
              icon={<BarChart3 className="h-6 w-6" />}
              title="No telemetry in this window"
              body="Inject mock traffic from the header to generate an error spike and watch the buckets fill in."
            />
          ) : (
            <>
              {/* plot */}
              <div className="relative">
                {/* gridlines */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2"
                      style={{ top: `${(i / 3) * 100}%` }}
                    >
                      <span className="w-6 shrink-0 text-right font-terminal text-[9px] tabular-nums text-slate-600">
                        {Math.round(maxStack - (i / 3) * maxStack)}
                      </span>
                      <span className="h-px flex-1 bg-white/[0.05]" />
                    </div>
                  ))}
                </div>

                <div className="ml-8 flex h-[230px] items-end gap-1 sm:gap-1.5">
                  {buckets.map((b, i) => {
                    const primary = series.counts[i];
                    const other = series.other[i];
                    const isPeak = i === peak.idx && peak.value > 0;
                    const isNow = i === buckets.length - 1;
                    return (
                      <div
                        key={b.start}
                        className="group relative flex h-full flex-1 flex-col justify-end"
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                      >
                        {isPeak && spikeDetected ? (
                          <Flame className="absolute -top-1 left-1/2 h-3.5 w-3.5 -translate-x-1/2 text-rose-400" />
                        ) : null}
                        <div
                          className={cn(
                            "relative flex w-full flex-col-reverse overflow-hidden rounded-t-[3px] transition-all duration-300",
                            hover === i ? "brightness-125" : "",
                          )}
                          style={{
                            height: `${Math.max(
                              primary + other > 0 ? 3 : 0,
                              ((primary + other) / maxStack) * 100,
                            )}%`,
                          }}
                        >
                          {series.otherTypes.map((t) => {
                            const v = b.byType[t] ?? 0;
                            if (!v) return null;
                            return (
                              <div
                                key={t}
                                className={ERROR_TYPE_STYLES[t].bar}
                                style={{ height: `${(v / Math.max(1, primary + other)) * 100}%` }}
                                title={`${t}: ${v}`}
                              />
                            );
                          })}
                          {series.visibleTypes.map((t) => {
                            const v = b.byType[t] ?? 0;
                            if (!v) return null;
                            return (
                              <div
                                key={t}
                                className={ERROR_TYPE_STYLES[t].bar}
                                style={{ height: `${(v / Math.max(1, primary + other)) * 100}%` }}
                                title={`${t}: ${v}`}
                              />
                            );
                          })}
                        </div>
                        <div
                          className={cn(
                            "mt-1 h-[3px] w-full rounded-full transition-colors",
                            isNow ? "bg-emerald-400/70" : "bg-white/[0.07]",
                            hover === i && "bg-violet-400",
                          )}
                        />
                        {hover === i ? (
                          <div className="animate-fade-up pointer-events-none absolute bottom-full left-1/2 z-20 w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-obsidian/95 p-2.5 shadow-2xl backdrop-blur-xl">
                            <p className="mb-1.5 font-terminal text-[10px] font-bold text-slate-200">
                              {formatMinute(b.start)}
                              {isNow ? (
                                <span className="ml-1.5 text-emerald-400">now</span>
                              ) : null}
                            </p>
                            <div className="space-y-1">
                              {ERROR_TYPES.filter((t) => (b.byType[t] ?? 0) > 0).map((t) => (
                                <div
                                  key={t}
                                  className="flex items-center justify-between gap-2 font-terminal text-[10px]"
                                >
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <span
                                      className={cn(
                                        "h-2 w-2 rounded-sm",
                                        ERROR_TYPE_STYLES[t].bar,
                                      )}
                                    />
                                    {t.split(" ")[0]}
                                  </span>
                                  <span className="tabular-nums text-slate-200">
                                    {b.byType[t]}
                                  </span>
                                </div>
                              ))}
                              <div className="mt-1 border-t border-white/[0.07] pt-1 font-terminal text-[10px] text-slate-500">
                                <div className="flex justify-between">
                                  <span>total events</span>
                                  <span className="text-slate-300">{b.total}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>avg resp</span>
                                  <span className="text-slate-300">
                                    {Math.round(b.latencySum / Math.max(1, b.latencyCount))}ms
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="ml-8 mt-2 flex gap-1 sm:gap-1.5">
                  {buckets.map((b, i) => (
                    <span
                      key={b.start}
                      className={cn(
                        "flex-1 text-center font-terminal text-[8.5px] tabular-nums",
                        i === buckets.length - 1 ? "text-emerald-400" : "text-slate-600",
                      )}
                    >
                      {i % 3 === 0 || i === buckets.length - 1
                        ? `-${buckets.length - 1 - i}m`
                        : ""}
                    </span>
                  ))}
                </div>
              </div>

              {/* latency overlay */}
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-obsidian/50 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Max response time per minute
                  </p>
                  <span className="font-terminal text-[10px] text-violet-300">
                    peak {Math.round(Math.max(...buckets.map((b) => b.maxLatency), 0))}ms
                  </span>
                </div>
                <Sparkline
                  values={buckets.map((b) => b.maxLatency)}
                  color="#8b5cf6"
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Breakdown + hotspots ------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader
            icon={<AlertTriangle className="h-4 w-4" />}
            accent="rose"
            title="Error classification breakdown"
            subtitle="Share of total errors in the current 15 minute window"
          />
          <div className="divide-y divide-white/[0.05]">
            {ERROR_TYPES.map((t) => {
              const st = ERROR_TYPE_STYLES[t];
              const value = totals.byType[t] ?? 0;
              const share = (value / Math.max(1, totals.errors)) * 100;
              const lastIdx = [...buckets]
                .reverse()
                .findIndex((b) => (b.byType[t] ?? 0) > 0);
              const lastSeen =
                lastIdx === -1
                  ? "—"
                  : `${formatMinute(buckets[buckets.length - 1 - lastIdx].start)}`;
              const prevHalf = buckets
                .slice(0, 7)
                .reduce((a, b) => a + (b.byType[t] ?? 0), 0);
              const recentHalf = buckets
                .slice(7)
                .reduce((a, b) => a + (b.byType[t] ?? 0), 0);
              const trendUp = recentHalf > prevHalf;
              return (
                <div key={t} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", st.bar)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate font-terminal text-[11.5px] font-semibold", st.text)}>
                      {t}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", st.bar)}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-terminal text-[13px] font-bold tabular-nums text-slate-100">
                      {value}
                    </p>
                    <p className="font-terminal text-[10px] text-slate-500">
                      {share.toFixed(0)}% · {lastSeen}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "hidden shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-terminal text-[9.5px] font-semibold sm:flex",
                      trendUp
                        ? "bg-rose-500/12 text-rose-300"
                        : "bg-emerald-500/12 text-emerald-300",
                    )}
                  >
                    {trendUp ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {trendUp ? "rising" : "cooling"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            icon={<Flame className="h-4 w-4" />}
            accent="amber"
            title="Top failing routes"
            subtitle="Highest error volume endpoints in the buffer"
          />
          {topEndpoints.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-6 w-6" />}
              title="No errors in the current buffer"
              body="Everything is green. Inject mock traffic to introduce a realistic incident window."
            />
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {topEndpoints.map((e) => (
                <div key={e.route} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-1.5 py-0.5 font-terminal text-[10px] font-bold",
                      e.code >= 500
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-300",
                    )}
                  >
                    {e.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-terminal text-[11.5px] text-slate-200">
                      {e.route}
                    </p>
                    <p className="font-terminal text-[10px] text-slate-500">
                      avg {e.avg}ms response
                    </p>
                  </div>
                  <span className="shrink-0 font-terminal text-[13px] font-bold tabular-nums text-slate-100">
                    {e.count}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-terminal text-[10px] uppercase tracking-wider text-slate-500">
                severity mix
              </span>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                {(["ERROR", "WARN", "INFO", "DEBUG"] as const).map((lvl) => {
                  const n = logs.filter((l) => l.level === lvl).length;
                  if (!n) return null;
                  return (
                    <div
                      key={lvl}
                      className={LEVEL_STYLES[lvl].dot}
                      style={{ width: `${(n / logs.length) * 100}%` }}
                      title={`${lvl}: ${n}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
