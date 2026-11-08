import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ChevronRight,
  Search,
  Terminal,
  WrapText,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button, Card, EmptyState, Pill, Toggle } from "@/components/ui";
import LogInspector from "@/components/LogInspector";
import { LEVELS, LEVEL_STYLES, type LogEntry, type LogLevel } from "@/types";
import { formatClock } from "@/lib/logEngine";

const RENDER_LIMIT = 300;

function matchesQuery(log: LogEntry, q: string) {
  if (!q.trim()) return true;
  const tokens = q.trim().toLowerCase().split(/\s+/);
  return tokens.every((token) => {
    const neg = token.startsWith("!");
    const raw = neg ? token.slice(1) : token;
    if (!raw) return true;
    let hit: boolean;
    if (raw.startsWith("level:")) hit = log.level.toLowerCase() === raw.slice(6);
    else if (raw.startsWith("service:"))
      hit = log.service.toLowerCase().includes(raw.slice(8));
    else if (raw.startsWith("status:")) hit = String(log.status_code) === raw.slice(7);
    else if (raw.startsWith("trace:")) hit = log.trace_id.includes(raw.slice(6));
    else if (raw.startsWith("ip:")) hit = log.ip_address.includes(raw.slice(3));
    else
      hit = `${log.raw} ${log.message} ${log.user_agent}`.toLowerCase().includes(raw);
    return neg ? !hit : hit;
  });
}

function statusTone(code: number) {
  if (code >= 500) return "text-rose-400";
  if (code >= 400) return "text-amber-400";
  if (code >= 300) return "text-cyan-400";
  return "text-emerald-400";
}

export default function LogStream({
  logs,
  streaming,
}: {
  logs: LogEntry[];
  streaming: boolean;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<LogLevel>>(new Set(LEVELS));
  const [follow, setFollow] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [compact, setCompact] = useState(false);
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [pulse, setPulse] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const queryMatched = useMemo(
    () => logs.filter((l) => matchesQuery(l, query)),
    [logs, query],
  );

  const counts = useMemo(() => {
    const c: Record<LogLevel, number> = { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 };
    for (const l of queryMatched) c[l.level] += 1;
    return c;
  }, [queryMatched]);

  const visible = useMemo(
    () =>
      queryMatched
        .filter((l) => active.has(l.level))
        .slice(-RENDER_LIMIT)
        .reverse(),
    [queryMatched, active],
  );

  const newestId = visible.length ? visible[0].id : 0;

  useEffect(() => {
    if (!follow) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [visible.length, follow]);

  useEffect(() => {
    if (!visible.length) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 420);
    return () => window.clearTimeout(t);
  }, [visible.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atTop = el.scrollTop < 24;
    if (atTop !== follow) setFollow(atTop);
  };

  const toggleLevel = (lvl: LogLevel) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  const totalDist = Math.max(1, queryMatched.length);

  return (
    <div className="space-y-4">
      {/* Toolbar ------------------------------------------------------- */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search buffer — try  timeout  ·  level:error  ·  !level:debug  ·  status:500  ·  ip:10."
                className="w-full rounded-xl border border-white/[0.08] bg-obsidian/70 py-2.5 pl-9 pr-20 font-terminal text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-px font-terminal text-[10px] text-slate-500">
                /
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {LEVELS.map((lvl) => (
                <Pill
                  key={lvl}
                  active={active.has(lvl)}
                  count={counts[lvl]}
                  onClick={() => toggleLevel(lvl)}
                  className={cn(active.has(lvl) && LEVEL_STYLES[lvl].chip)}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      active.has(lvl) ? LEVEL_STYLES[lvl].dot : "bg-slate-600",
                    )}
                  />
                  {lvl}
                </Pill>
              ))}
              <button
                type="button"
                onClick={() =>
                  setActive((p) => (p.size === 1 ? new Set(LEVELS) : new Set<LogLevel>(["ERROR"])))
                }
                className="rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-2.5 py-1 font-terminal text-[10.5px] font-semibold uppercase tracking-wider text-rose-300 transition hover:bg-rose-500/15"
              >
                errors only
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-2 min-w-[140px] flex-1 overflow-hidden rounded-full bg-white/[0.05] lg:max-w-xs">
                {LEVELS.map((lvl) => {
                  const pct = (counts[lvl] / totalDist) * 100;
                  if (!pct) return null;
                  return (
                    <div
                      key={lvl}
                      title={`${lvl}: ${counts[lvl]}`}
                      className={cn("h-full", LEVEL_STYLES[lvl].dot)}
                      style={{ width: `${pct}%` }}
                    />
                  );
                })}
              </div>
              <span className="font-terminal text-[10.5px] text-slate-500">
                {queryMatched.length} match
                {queryMatched.length === 1 ? "" : "es"} ·{" "}
                {logs.length - queryMatched.length} filtered out
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Toggle
                checked={follow}
                onChange={setFollow}
                label={follow ? "Auto-scroll ON" : "Auto-scroll OFF"}
                hint="Follow the tail of the stream"
                accent="emerald"
              />
              <Toggle
                checked={wrap}
                onChange={setWrap}
                label="Wrap lines"
                accent="violet"
              />
              <Toggle
                checked={compact}
                onChange={setCompact}
                label="Compact rows"
                accent="amber"
              />
              {query ? (
                <Button size="sm" variant="subtle" onClick={() => setQuery("")}>
                  <X className="h-3 w-3" />
                  reset
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Terminal --------------------------------------------------- */}
        <div className="relative border-t border-white/[0.06]">
          <div className="pointer-events-none absolute inset-0 grid-noise opacity-40" />
          {streaming && follow ? (
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
          ) : null}

          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="scroll-slim relative h-[58vh] min-h-[380px] overflow-y-auto bg-obsidian/70"
          >
            {/* column header */}
            <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-white/[0.07] bg-obsidian-2/95 px-3 py-2 backdrop-blur">
              <span className="w-[86px] shrink-0 font-terminal text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                timestamp
              </span>
              <span className="w-[48px] shrink-0 font-terminal text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                level
              </span>
              <span className="hidden w-[124px] shrink-0 font-terminal text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600 md:block">
                service
              </span>
              <span className="hidden w-[180px] shrink-0 font-terminal text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600 lg:block">
                route
              </span>
              <span className="hidden w-[46px] shrink-0 font-terminal text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600 sm:block">
                code
              </span>
              <span className="hidden w-[62px] shrink-0 text-right font-terminal text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600 md:block">
                dur
              </span>
              <span className="min-w-0 flex-1 font-terminal text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                message
              </span>
            </div>

            {visible.length === 0 ? (
              <EmptyState
                icon={<Terminal className="h-6 w-6" />}
                title="No log lines match this filter"
                body="Loosen the severity pills or clear the search query. If the buffer is empty, inject mock traffic or resume the tailer from the header."
              />
            ) : (
              <div className={cn(compact ? "py-0" : "py-1")}>
                {visible.map((log) => {
                  const s = LEVEL_STYLES[log.level];
                  const isNew = log.id > newestId - 6;
                  return (
                    <button
                      key={log.id}
                      type="button"
                      onClick={() => setSelected(log)}
                      className={cn(
                        "group flex w-full items-start gap-2 border-l-2 px-3 text-left transition-colors duration-100",
                        compact ? "py-[3px]" : "py-[6px]",
                        log.level === "ERROR"
                          ? "border-l-rose-500/70 hover:bg-rose-500/[0.06]"
                          : log.level === "WARN"
                            ? "border-l-amber-500/60 hover:bg-amber-500/[0.06]"
                            : "border-l-transparent hover:border-l-violet-500/50 hover:bg-violet-500/[0.05]",
                        isNew && pulse ? "animate-blip" : "",
                        selected?.id === log.id ? "bg-violet-500/[0.09]" : "",
                      )}
                    >
                      <span className="w-[86px] shrink-0 font-terminal text-[10.5px] leading-5 tabular-nums text-slate-500">
                        {formatClock(log.timestamp)}
                      </span>
                      <span
                        className={cn(
                          "w-[48px] shrink-0 font-terminal text-[10px] font-bold leading-5",
                          s.text,
                        )}
                      >
                        {log.level}
                      </span>
                      <span className="hidden w-[124px] shrink-0 truncate font-terminal text-[10.5px] leading-5 text-violet-300/80 md:block">
                        {log.service}
                      </span>
                      <span
                        className={cn(
                          "hidden w-[180px] shrink-0 truncate font-terminal text-[10.5px] leading-5 lg:block",
                          wrap ? "whitespace-normal break-all" : "",
                        )}
                      >
                        <span className="text-cyan-300/90">{log.method}</span>{" "}
                        <span className="text-slate-300">{log.path}</span>
                        <span className="text-slate-600">{log.query}</span>
                      </span>
                      <span
                        className={cn(
                          "hidden w-[46px] shrink-0 font-terminal text-[10.5px] font-semibold leading-5 tabular-nums sm:block",
                          statusTone(log.status_code),
                        )}
                      >
                        {log.status_code}
                      </span>
                      <span
                        className={cn(
                          "hidden w-[62px] shrink-0 text-right font-terminal text-[10.5px] leading-5 tabular-nums md:block",
                          log.response_time_ms > 1000
                            ? "text-rose-400"
                            : log.response_time_ms > 400
                              ? "text-amber-400"
                              : "text-slate-500",
                        )}
                      >
                        {log.response_time_ms}ms
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 font-terminal text-[10.5px] leading-5 text-slate-400",
                          wrap
                            ? "whitespace-pre-wrap break-all"
                            : "truncate",
                          log.level === "ERROR" && "text-rose-200/90",
                          log.level === "WARN" && "text-amber-200/80",
                        )}
                      >
                        {log.message}
                        {log.error_type ? (
                          <span className="ml-2 rounded border border-rose-500/25 bg-rose-500/10 px-1 py-px font-terminal text-[9px] uppercase tracking-wide text-rose-300">
                            {log.error_type}
                          </span>
                        ) : null}
                      </span>
                      <ChevronRight className="mt-[3px] h-3.5 w-3.5 shrink-0 text-slate-700 transition group-hover:text-violet-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] bg-obsidian-2/60 px-4 py-2">
            <span className="font-terminal text-[10.5px] text-slate-500">
              showing newest {visible.length} of {queryMatched.length} matched ·{" "}
              {wrap ? (
                <span className="inline-flex items-center gap-1 text-violet-300">
                  <WrapText className="h-3 w-3" /> wrapping
                </span>
              ) : (
                "truncated"
              )}
            </span>
            <span className="font-terminal text-[10.5px] text-slate-600">
              click a row → inspector drawer
            </span>
          </div>
        </div>
      </Card>

      {!follow && visible.length ? (
        <button
          type="button"
          onClick={() => {
            setFollow(true);
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
          }}
          className="animate-fade-up fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 font-terminal text-[11px] font-semibold text-emerald-200 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.6)] backdrop-blur-xl hover:bg-emerald-500/25"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          resume live tail
        </button>
      ) : null}

      {selected ? (
        <LogInspector
          log={selected}
          logs={logs}
          onClose={() => setSelected(null)}
          onSelect={setSelected}
        />
      ) : null}
    </div>
  );
}
