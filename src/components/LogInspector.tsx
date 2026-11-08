import { useEffect, useMemo, useState } from "react";
import {
  Braces,
  Copy,
  FileText,
  Layers,
  Search,
  Waypoints,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Badge, Button } from "@/components/ui";
import { LEVEL_STYLES, type LogEntry } from "@/types";
import { formatClock, formatIso, humanBytes } from "@/lib/logEngine";

type InspectTab = "attributes" | "raw" | "json" | "context";

const TABS: { key: InspectTab; label: string; icon: typeof Layers }[] = [
  { key: "attributes", label: "Attributes", icon: Layers },
  { key: "raw", label: "Raw", icon: FileText },
  { key: "json", label: "JSON", icon: Braces },
  { key: "context", label: "Context", icon: Waypoints },
];

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.04] py-[7px] last:border-0">
      <span className="w-[42%] shrink-0 font-terminal text-[10.5px] uppercase tracking-wide text-slate-500">
        {k}
      </span>
      <span className="min-w-0 flex-1 break-all font-terminal text-[11.5px] text-slate-200">
        {v}
      </span>
    </div>
  );
}

export default function LogInspector({
  log,
  logs,
  onClose,
  onSelect,
}: {
  log: LogEntry;
  logs: LogEntry[];
  onClose: () => void;
  onSelect: (l: LogEntry) => void;
}) {
  const [tab, setTab] = useState<InspectTab>("attributes");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const style = LEVEL_STYLES[log.level];

  const structured = useMemo(
    () =>
      JSON.stringify(
        {
          timestamp: formatIso(log.timestamp),
          level: log.level,
          service: log.service,
          env: log.env,
          host: log.host,
          region: log.region,
          ip_address: log.ip_address,
          method: log.method,
          path: log.path,
          query: log.query || undefined,
          status_code: log.status_code,
          response_time_ms: log.response_time_ms,
          bytes: log.bytes,
          user_agent: log.user_agent,
          trace_id: log.trace_id,
          span_id: log.span_id,
          request_id: log.request_id,
          error_type: log.error_type,
          message: log.message,
          stack: log.stack,
        },
        null,
        2,
      ),
    [log],
  );

  const context = useMemo(
    () =>
      logs
        .filter(
          (l) =>
            l.trace_id === log.trace_id ||
            (l.path === log.path && l.service === log.service),
        )
        .slice(-14)
        .reverse(),
    [logs, log],
  );

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close inspector"
        onClick={onClose}
        className="absolute inset-0 bg-obsidian/70 backdrop-blur-sm"
      />
      <aside className="animate-slide-in-right relative ml-auto flex h-full w-full max-w-[480px] flex-col border-l border-white/[0.08] bg-panel/95 shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        {/* head */}
        <div className="shrink-0 border-b border-white/[0.07] p-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    "border",
                    LEVEL_STYLES[log.level].bg,
                    LEVEL_STYLES[log.level].border,
                    LEVEL_STYLES[log.level].text,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                  {log.level}
                </Badge>
                <Badge className="border-white/10 bg-white/[0.04] text-slate-400">
                  {log.status_code}
                </Badge>
                {log.error_type ? (
                  <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-300">
                    {log.error_type}
                  </Badge>
                ) : null}
                {log.injected ? (
                  <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">
                    injected
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 break-words font-terminal text-[12.5px] leading-relaxed text-slate-200">
                {log.message}
              </p>
              <p className="mt-1.5 font-terminal text-[10.5px] text-slate-500">
                #{log.id} · {formatIso(log.timestamp)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-1 rounded-xl border border-white/[0.06] bg-obsidian/60 p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all",
                    active
                      ? "bg-violet-500/15 text-violet-200 shadow-[0_0_0_1px_rgba(139,92,246,0.25)]"
                      : "text-slate-500 hover:text-slate-300",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* body */}
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "attributes" ? (
            <div className="animate-fade-up">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Parsed attributes
              </p>
              <Row k="timestamp" v={formatIso(log.timestamp)} />
              <Row k="ip_address" v={log.ip_address} />
              <Row k="status_code" v={log.status_code} />
              <Row k="response_time_ms" v={log.response_time_ms} />
              <Row k="user_agent" v={log.user_agent} />
              <div className="my-3 h-px bg-white/[0.06]" />
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Request
              </p>
              <Row k="method" v={log.method} />
              <Row k="path" v={`${log.path}${log.query}`} />
              <Row k="bytes" v={`${log.bytes} (${humanBytes(log.bytes)})`} />
              <div className="my-3 h-px bg-white/[0.06]" />
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Emitter
              </p>
              <Row k="service" v={log.service} />
              <Row k="environment" v={log.env} />
              <Row k="host" v={log.host} />
              <Row k="region" v={log.region} />
              <div className="my-3 h-px bg-white/[0.06]" />
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Tracing
              </p>
              <Row k="trace_id" v={log.trace_id} />
              <Row k="span_id" v={log.span_id} />
              <Row k="request_id" v={log.request_id} />
            </div>
          ) : null}

          {tab === "raw" ? (
            <div className="animate-fade-up space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Raw log line
                  </p>
                  <Button size="sm" variant="subtle" onClick={() => copy(log.raw)}>
                    <Copy className="h-3 w-3" />
                    {copied ? "copied" : "copy"}
                  </Button>
                </div>
                <pre className="scroll-slim overflow-x-auto rounded-xl border border-white/[0.07] bg-obsidian/80 p-3 font-terminal text-[11px] leading-relaxed text-slate-300">
                  {log.raw}
                </pre>
              </div>
              {log.stack ? (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-400">
                    Stack trace
                  </p>
                  <pre className="scroll-slim overflow-x-auto rounded-xl border border-rose-500/20 bg-rose-950/20 p-3 font-terminal text-[11px] leading-relaxed text-rose-200/90">
                    {log.stack.join("\n")}
                  </pre>
                </div>
              ) : null}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="font-terminal text-[10.5px] text-slate-500">
                  <span className="text-violet-300">tip</span> — copy this line into
                  the Pattern Parser Studio to build a grok rule that extracts every
                  attribute above.
                </p>
              </div>
            </div>
          ) : null}

          {tab === "json" ? (
            <div className="animate-fade-up">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Structured JSON
                </p>
                <Button size="sm" variant="subtle" onClick={() => copy(structured)}>
                  <Copy className="h-3 w-3" />
                  {copied ? "copied" : "copy"}
                </Button>
              </div>
              <pre className="scroll-slim overflow-x-auto rounded-xl border border-white/[0.07] bg-obsidian/80 p-3 font-terminal text-[11px] leading-relaxed text-emerald-200/90">
                {structured}
              </pre>
            </div>
          ) : null}

          {tab === "context" ? (
            <div className="animate-fade-up">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Correlated events · trace {log.trace_id}
              </p>
              {context.length <= 1 ? (
                <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 font-terminal text-[11px] text-slate-500">
                  No sibling events found for this trace.
                </p>
              ) : (
                <div className="space-y-1">
                  {context.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => onSelect(l)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition",
                        l.id === log.id
                          ? "border-violet-500/30 bg-violet-500/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.05]",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          LEVEL_STYLES[l.level].dot,
                        )}
                      />
                      <span className="shrink-0 font-terminal text-[10px] text-slate-500">
                        {formatClock(l.timestamp)}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-terminal text-[10.5px] text-slate-300">
                        {l.message}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* foot */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.07] bg-obsidian/40 px-4 py-3">
          <span className="flex items-center gap-1.5 font-terminal text-[10px] text-slate-500">
            <Search className="h-3 w-3" />
            esc to close · {context.length} correlated
          </span>
          <Button size="sm" variant="ghost" onClick={() => copy(structured)}>
            <Copy className="h-3 w-3" />
            Copy JSON
          </Button>
        </div>
      </aside>
    </div>
  );
}
