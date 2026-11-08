import { useMemo, useState } from "react";
import {
  Check,
  ClipboardList,
  Copy,
  Download,
  FileBraces,
  FileCode,
  FileText,
  Table,
  Zap,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Badge, Button, Card, CardHeader, EmptyState, Stat } from "@/components/ui";
import { LEVELS, LEVEL_STYLES, type LogEntry, type LogLevel } from "@/types";
import { formatIso, humanBytes } from "@/lib/logEngine";

type Format = "ndjson" | "json" | "csv" | "raw" | "markdown";
type Scope = "buffer" | "errors" | "warn+" | "level";

const ALL_FIELDS = [
  "timestamp",
  "level",
  "service",
  "env",
  "host",
  "region",
  "ip_address",
  "method",
  "path",
  "query",
  "status_code",
  "response_time_ms",
  "bytes",
  "user_agent",
  "trace_id",
  "span_id",
  "request_id",
  "error_type",
  "message",
  "raw",
  "stack",
] as const;

type FieldKey = (typeof ALL_FIELDS)[number];

const DEFAULT_FIELDS: FieldKey[] = [
  "timestamp",
  "level",
  "service",
  "ip_address",
  "method",
  "path",
  "status_code",
  "response_time_ms",
  "user_agent",
  "trace_id",
  "message",
];

const FORMATS: { key: Format; label: string; ext: string; icon: typeof FileText; hint: string }[] = [
  { key: "ndjson", label: "NDJSON", ext: "ndjson", icon: FileBraces, hint: "One JSON object per line — the standard for shippers like Filebeat / Vector." },
  { key: "json", label: "JSON Array", ext: "json", icon: FileBraces, hint: "A single JSON document containing every event." },
  { key: "csv", label: "CSV", ext: "csv", icon: Table, hint: "Spreadsheet friendly, columns follow your field selection." },
  { key: "raw", label: "Raw lines", ext: "log", icon: FileText, hint: "The original unparsed log line, exactly as tailed." },
  { key: "markdown", label: "Markdown", ext: "md", icon: FileCode, hint: "Incident report table you can paste into a ticket." },
];

function project(log: LogEntry, fields: Field[]) {
  const obj: Record<string, unknown> = {};
  for (const f of fields) {
    if (f === "timestamp") obj.timestamp = formatIso(log.timestamp);
    else if (f === "stack") {
      if (log.stack) obj.stack = log.stack.join(" | ");
    } else if (f === "error_type") {
      if (log.error_type) obj.error_type = log.error_type;
    } else {
      const v = (log as unknown as Record<string, unknown>)[f];
      if (v !== undefined && v !== "") obj[f] = v;
    }
  }
  return obj;
}

type Field = FieldKey;

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function LogExporter({
  logs,
  onInject,
}: {
  logs: LogEntry[];
  onInject: () => void;
}) {
  const [format, setFormat] = useState<Format>("ndjson");
  const [scope, setScope] = useState<Scope>("buffer");
  const [levelScope, setLevelScope] = useState<LogLevel>("ERROR");
  const [fields, setFields] = useState<Set<Field>>(new Set(DEFAULT_FIELDS));
  const [limit, setLimit] = useState(200);
  const [pretty, setPretty] = useState(true);
  const [copied, setCopied] = useState(false);

  const selected = useMemo(() => {
    let base = logs;
    if (scope === "errors") base = logs.filter((l) => l.level === "ERROR");
    else if (scope === "warn+")
      base = logs.filter((l) => l.level === "ERROR" || l.level === "WARN");
    else if (scope === "level") base = logs.filter((l) => l.level === levelScope);
    const newest = [...base].reverse().slice(0, Math.max(1, limit));
    return newest;
  }, [logs, scope, levelScope, limit]);

  const payload = useMemo(() => {
    const fieldList = ALL_FIELDS.filter((f) => fields.has(f));
    if (format === "raw") return selected.map((l) => l.raw).join("\n");
    if (format === "ndjson")
      return selected.map((l) => JSON.stringify(project(l, fieldList))).join("\n");
    if (format === "json")
      return JSON.stringify(selected.map((l) => project(l, fieldList)), null, pretty ? 2 : 0);
    if (format === "csv") {
      const rows = selected.map((l) => {
        const o = project(l, fieldList);
        return fieldList.map((f) => csvEscape(o[f])).join(",");
      });
      return [fieldList.join(","), ...rows].join("\n");
    }
    const head = `| ${fieldList.join(" | ")} |`;
    const rule = `| ${fieldList.map(() => "---").join(" | ")} |`;
    const body = selected.map((l) => {
      const o = project(l, fieldList);
      return `| ${fieldList.map((f) => String(o[f] ?? "").replace(/\|/g, "\\|").slice(0, 60)).join(" | ")} |`;
    });
    return [`# LogPulse export · ${selected.length} events`, "", head, rule, ...body].join("\n");
  }, [selected, format, fields, pretty]);

  const previewLines = useMemo(() => payload.split("\n"), [payload]);
  const size = new Blob([payload]).size;
  const errorCount = selected.filter((l) => l.level === "ERROR").length;

  const activeFormat = FORMATS.find((f) => f.key === format)!;

  const toggleField = (f: Field) =>
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const download = () => {
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logpulse-${scope === "level" ? levelScope.toLowerCase() : scope}-${Date.now()}.${activeFormat.ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const copy = () => {
    navigator.clipboard?.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Rows exported" value={selected.length} unit="events" accent="amber" icon={<ClipboardList className="h-4 w-4" />} />
        <Stat label="Payload size" value={humanBytes(size).split(" ")[0]} unit={humanBytes(size).split(" ")[1]} accent="violet" icon={<FileCode className="h-4 w-4" />} />
        <Stat label="Errors included" value={errorCount} unit={`/ ${selected.length}`} accent="rose" icon={<Zap className="h-4 w-4" />} />
        <Stat label="Columns" value={fields.size} unit={`/ ${ALL_FIELDS.length}`} accent="emerald" icon={<Table className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-5">
          <Card className="overflow-hidden">
            <CardHeader
              icon={<Download className="h-4 w-4" />}
              accent="amber"
              title="Export shape"
              subtitle="Pick a destination format and the slice of the buffer to ship"
            />
            <div className="space-y-5 p-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Format
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                  {FORMATS.map((f) => {
                    const Icon = f.icon;
                    const active = f.key === format;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFormat(f.key)}
                        title={f.hint}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition",
                          active
                            ? "border-amber-400/40 bg-amber-500/[0.1] text-amber-200"
                            : "border-white/[0.07] bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200",
                        )}
                      >
                        <Icon className={cn("h-4 w-4", active ? "text-amber-300" : "text-slate-500")} />
                        <span className="font-terminal text-[10.5px] font-bold uppercase tracking-wide">
                          {f.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 font-terminal text-[10px] leading-relaxed text-slate-600">
                  {activeFormat.hint}
                </p>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Scope
                </p>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["buffer", "Whole buffer"],
                    ["errors", "Errors only"],
                    ["warn+", "WARN + ERROR"],
                    ["level", "By level"],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setScope(key)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition",
                        scope === key
                          ? "border-violet-400/40 bg-violet-500/[0.12] text-violet-200"
                          : "border-white/[0.07] bg-white/[0.02] text-slate-400 hover:text-slate-200",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {scope === "level" ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setLevelScope(lvl)}
                        className={cn(
                          "rounded-md border px-2 py-1 font-terminal text-[10px] font-bold uppercase tracking-wider transition",
                          levelScope === lvl
                            ? LEVEL_STYLES[lvl].chip
                            : "border-white/[0.07] bg-white/[0.02] text-slate-500",
                        )}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Row limit
                  </p>
                  <input
                    type="range"
                    min={10}
                    max={400}
                    step={10}
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="h-1.5 w-40 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-violet-500"
                  />
                  <span className="ml-2 font-terminal text-[10.5px] text-violet-300">
                    {limit} rows
                  </span>
                </div>
                {format === "json" ? (
                  <button
                    type="button"
                    onClick={() => setPretty((p) => !p)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 font-terminal text-[10.5px] transition",
                      pretty
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-white/[0.07] bg-white/[0.02] text-slate-500",
                    )}
                  >
                    {pretty ? "{ pretty: 2 }" : "{ minified }"}
                  </button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              icon={<ClipboardList className="h-4 w-4" />}
              accent="violet"
              title="Field selection"
              subtitle="Only the checked attributes are written to the payload"
              actions={
                <>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => setFields(new Set(DEFAULT_FIELDS))}
                  >
                    default
                  </Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => setFields(new Set<Field>([...ALL_FIELDS]))}
                  >
                    all
                  </Button>
                </>
              }
            />
            <div className="grid grid-cols-2 gap-1 p-4 sm:grid-cols-3 xl:grid-cols-2">
              {ALL_FIELDS.map((f) => {
                const on = fields.has(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleField(f)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2 py-1.5 font-terminal text-[10.5px] transition",
                      on
                        ? "border-violet-400/30 bg-violet-500/[0.08] text-violet-200"
                        : "border-white/[0.06] bg-white/[0.02] text-slate-600 hover:text-slate-400",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                        on ? "border-violet-400 bg-violet-500/70" : "border-white/15",
                      )}
                    >
                      {on ? <Check className="h-2.5 w-2.5 text-white" /> : null}
                    </span>
                    {f}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-7">
          <Card className="flex h-full flex-col overflow-hidden">
            <CardHeader
              icon={<FileCode className="h-4 w-4" />}
              accent="emerald"
              title="Payload preview"
              subtitle={`${previewLines.length} lines · ${humanBytes(size)} · .${activeFormat.ext}`}
              actions={
                <>
                  <Button size="sm" variant="ghost" onClick={copy}>
                    <Copy className="h-3 w-3" />
                    {copied ? "copied!" : "Copy"}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={download}
                    disabled={!selected.length}
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                </>
              }
            />
            {selected.length === 0 ? (
              <EmptyState
                icon={<Download className="h-6 w-6" />}
                title="Nothing to export in this scope"
                body="Widen the scope, raise the row limit, or inject mock traffic to fill the buffer first."
                action={
                  <Button size="sm" variant="primary" onClick={onInject}>
                    <Zap className="h-3 w-3" />
                    Inject mock traffic
                  </Button>
                }
              />
            ) : (
              <div className="relative min-h-0 flex-1">
                <div className="pointer-events-none absolute inset-0 grid-noise opacity-30" />
                <div className="scroll-slim relative h-[520px] overflow-auto bg-obsidian/70">
                  <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/[0.07] bg-obsidian-2/95 px-4 py-2 backdrop-blur">
                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                      {activeFormat.label}
                    </Badge>
                    <span className="font-terminal text-[10px] text-slate-500">
                      {scope === "level" ? `level == ${levelScope}` : scope}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-all p-4 font-terminal text-[10.5px] leading-relaxed text-slate-300">
                    {previewLines.slice(0, 120).join("\n")}
                  </pre>
                  {previewLines.length > 120 ? (
                    <p className="border-t border-white/[0.06] px-4 py-3 font-terminal text-[10.5px] text-slate-500">
                      … {previewLines.length - 120} more lines in the downloaded file
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
