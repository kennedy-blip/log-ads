import { useMemo, useRef, useState } from "react";
import {
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Library,
  Plus,
  Regex,
  Save,
  Sparkles,
  Terminal,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Badge, Button, Card, CardHeader, EmptyState, Toggle } from "@/components/ui";
import {
  compilePattern,
  fieldsToJson,
  GROK_PATTERNS,
  PRESETS,
  runMatch,
  type MatchResult,
} from "@/lib/grok";
import type { LogEntry } from "@/types";

const QUICK_FIELDS: { label: string; snippet: string }[] = [
  { label: "timestamp", snippet: "%{TIMESTAMP_ISO8601:timestamp}" },
  { label: "level", snippet: "%{LOGLEVEL:level}" },
  { label: "client_ip", snippet: "%{IP:client_ip}" },
  { label: "status_code:int", snippet: "%{INT:status_code:int}" },
  { label: "response_time_ms:int", snippet: "%{INT:response_time_ms:int}" },
  { label: "user_agent", snippet: '%{DATA:user_agent}' },
  { label: "path", snippet: "%{URIPATHPARAM:request}" },
  { label: "trace_id", snippet: "%{NOTSPACE:trace_id}" },
  { label: "message", snippet: "%{GREEDYDATA:message}" },
  { label: "uuid", snippet: "%{UUID:event_id}" },
];

interface SavedRule {
  id: string;
  name: string;
  mode: "grok" | "regex";
  anchor: boolean;
  pattern: string;
}

function HighlightedLine({
  line,
  result,
}: {
  line: string;
  result: MatchResult;
}) {
  if (!result.matched) {
    return <span className="text-rose-300/80 line-through decoration-rose-500/40">{line}</span>;
  }
  const before = line.slice(0, result.start);
  const hit = line.slice(result.start, result.end);
  const after = line.slice(result.end);
  return (
    <>
      <span className="text-slate-500">{before}</span>
      <mark className="rounded bg-violet-500/25 px-0.5 text-violet-100 shadow-[0_0_0_1px_rgba(139,92,246,0.35)]">
        {hit}
      </mark>
      <span className="text-slate-500">{after}</span>
    </>
  );
}

export default function LogParser({ logs }: { logs: LogEntry[] }) {
  const [mode, setMode] = useState<"grok" | "regex">("grok");
  const [pattern, setPattern] = useState(PRESETS[0].pattern);
  const [anchor, setAnchor] = useState(true);
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [sampleDraft, setSampleDraft] = useState(PRESETS[0].samples.join("\n"));
  const [rules, setRules] = useState<SavedRule[]>([]);
  const [ruleName, setRuleName] = useState("legacy-shim-v1");
  const [showLib, setShowLib] = useState(false);
  const [libQuery, setLibQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const patternRef = useRef<HTMLTextAreaElement | null>(null);

  const compiled = useMemo(
    () => compilePattern(pattern, { mode, anchor, caseInsensitive }),
    [pattern, mode, anchor, caseInsensitive],
  );

  const activeSamples = useMemo(
    () => sampleDraft.split("\n").filter((l) => l.trim().length > 0),
    [sampleDraft],
  );

  const results = useMemo(
    () =>
      activeSamples.map((line) => ({
        line,
        result: runMatch(compiled.regex, line, compiled.fields),
      })),
    [activeSamples, compiled],
  );

  const matchedCount = results.filter((r) => r.result.matched).length;
  const coverage = results.length ? (matchedCount / results.length) * 100 : 0;

  const library = useMemo(() => {
    const q = libQuery.trim().toLowerCase();
    const entries = Object.entries(GROK_PATTERNS).filter(
      ([k, v]) => !q || k.toLowerCase().includes(q) || v.toLowerCase().includes(q),
    );
    return entries.slice(0, 60);
  }, [libQuery]);

  const insert = (snippet: string) => {
    const el = patternRef.current;
    if (!el) {
      setPattern((p) => (p ? `${p} ${snippet}` : snippet));
      return;
    }
    const start = el.selectionStart ?? pattern.length;
    const end = el.selectionEnd ?? pattern.length;
    const next = `${pattern.slice(0, start)}${snippet}${pattern.slice(end)}`;
    setPattern(next);
    window.requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const pullFromStream = () => {
    const fresh = logs
      .slice(-12)
      .map((l) => l.raw)
      .slice(-3);
    if (!fresh.length) return;
    const next = [...activeSamples, ...fresh];
    setSampleDraft(next.join("\n"));
  };

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setMode(p.mode);
    setPattern(p.pattern);
    setAnchor(p.anchor ?? true);
    setSampleDraft(p.samples.join("\n"));
  };

  const flash = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1300);
  };

  const copyAllJson = () => {
    const payload = results
      .filter((r) => r.result.matched)
      .map((r) => fieldsToJson(r.result.fields));
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    flash("all");
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* Builder -------------------------------------------------- */}
      <div className="space-y-4 xl:col-span-7">
        <Card className="overflow-hidden">
          <CardHeader
            icon={<Regex className="h-4 w-4" />}
            title="Pattern Parser Core"
            subtitle="Compose a grok expression or raw regex — it compiles live as you type"
            accent="violet"
            actions={
              <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-obsidian/60 p-1">
                {(["grok", "regex"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 font-terminal text-[10.5px] font-bold uppercase tracking-wider transition",
                      mode === m
                        ? "bg-violet-500/20 text-violet-200 shadow-[0_0_0_1px_rgba(139,92,246,0.3)]"
                        : "text-slate-500 hover:text-slate-300",
                    )}
                  >
                    {m === "grok" ? "%{grok}" : "/regex/"}
                  </button>
                ))}
              </div>
            }
          />

          <div className="space-y-4 p-4">
            {/* presets */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Load a starting point
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    title={p.hint}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-violet-400/30 hover:bg-violet-500/[0.08] hover:text-violet-200"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* editor */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {mode === "grok" ? "Grok expression" : "Raw regular expression"}
                </p>
                <span className="font-terminal text-[10px] text-slate-600">
                  {compiled.fields.length} capture
                  {compiled.fields.length === 1 ? "" : "s"}
                </span>
              </div>
              <textarea
                ref={patternRef}
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                spellCheck={false}
                rows={mode === "grok" ? 6 : 4}
                className={cn(
                  "scroll-slim w-full resize-y rounded-xl border bg-obsidian/80 p-3 font-terminal text-[11.5px] leading-relaxed text-slate-200 focus:outline-none focus:ring-2",
                  compiled.ok
                    ? "border-violet-500/30 focus:ring-violet-500/20"
                    : "border-rose-500/40 focus:ring-rose-500/20",
                )}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <Toggle
                    checked={anchor}
                    onChange={setAnchor}
                    label="Anchor ^ $"
                    hint="Require the pattern to match the entire line"
                    accent="violet"
                  />
                  <Toggle
                    checked={caseInsensitive}
                    onChange={setCaseInsensitive}
                    label="Ignore case"
                    accent="amber"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="subtle" onClick={() => setPattern("")}>
                    <X className="h-3 w-3" />
                    clear
                  </Button>
                </div>
              </div>
            </div>

            {/* quick insert */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Sparkles className="h-3 w-3 text-violet-400" />
                Insert named capture
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_FIELDS.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => insert(q.snippet)}
                    className="rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-terminal text-[10px] text-slate-400 transition hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-200"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 font-terminal text-[10px] leading-relaxed text-slate-600">
                syntax:{" "}
                <span className="text-violet-300">%{"{PATTERN:field:type}"}</span> ·
                types: <span className="text-emerald-300">int</span> ·{" "}
                <span className="text-emerald-300">float</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Sample lines */}
        <Card className="overflow-hidden">
          <CardHeader
            icon={<Terminal className="h-4 w-4" />}
            title="Sample log lines"
            subtitle="Paste unstructured legacy lines to validate the rule"
            accent="emerald"
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={pullFromStream}>
                  <Zap className="h-3 w-3" />
                  Pull from stream
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const next = [...activeSamples, ""];
                    setSampleDraft(next.join("\n"));
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Add line
                </Button>
              </>
            }
          />
          <div className="p-4">
            <textarea
              value={sampleDraft}
              onChange={(e) => setSampleDraft(e.target.value)}
              spellCheck={false}
              rows={5}
              placeholder="2026-02-14T09:12:41.318Z INFO  [api-gateway] 10.2.118.44 GET /v1/accounts 200 ..."
              className="scroll-slim w-full resize-y rounded-xl border border-white/[0.07] bg-obsidian/80 p-3 font-terminal text-[11px] leading-relaxed text-slate-300 placeholder:text-slate-700 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3 font-terminal text-[10.5px] text-slate-500">
              <span>{activeSamples.length} lines under test</span>
              <span className="text-slate-700">|</span>
              <span
                className={cn(
                  matchedCount === activeSamples.length && activeSamples.length > 0
                    ? "text-emerald-300"
                    : "text-amber-300",
                )}
              >
                {matchedCount}/{activeSamples.length} matched ({coverage.toFixed(0)}%
                coverage)
              </span>
              <span className="text-slate-700">|</span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${coverage}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Library */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLib((v) => !v)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
          >
            {showLib ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
            <Library className="h-4 w-4 text-violet-300" />
            <span className="flex-1 text-[15px] font-semibold tracking-tight text-slate-100">
              Built-in pattern library
            </span>
            <Badge className="border-white/10 bg-white/[0.04] text-slate-400">
              {Object.keys(GROK_PATTERNS).length} patterns
            </Badge>
          </button>
          {showLib ? (
            <div className="animate-fade-up border-t border-white/[0.06] p-4">
              <input
                value={libQuery}
                onChange={(e) => setLibQuery(e.target.value)}
                placeholder="filter patterns — ip, iso8601, syslog, quoted…"
                className="mb-3 w-full rounded-lg border border-white/[0.07] bg-obsidian/70 px-3 py-2 font-terminal text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-violet-500/40 focus:outline-none"
              />
              <div className="scroll-slim max-h-72 space-y-px overflow-y-auto rounded-xl border border-white/[0.05]">
                {library.map(([name, def]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => insert(`%{${name}}`)}
                    className="flex w-full items-center gap-3 border-b border-white/[0.04] px-3 py-1.5 text-left last:border-0 hover:bg-violet-500/[0.06]"
                  >
                    <span className="w-[150px] shrink-0 font-terminal text-[10.5px] font-semibold text-violet-300">
                      {name}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-terminal text-[10px] text-slate-500">
                      {def}
                    </span>
                    <Plus className="h-3 w-3 shrink-0 text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      {/* Results -------------------------------------------------- */}
      <div className="space-y-4 xl:col-span-5">
        <Card
          className={cn(
            "overflow-hidden",
            compiled.ok ? "border-emerald-500/20" : "border-rose-500/25",
          )}
        >
          <CardHeader
            icon={compiled.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            accent={compiled.ok ? "emerald" : "rose"}
            title={compiled.ok ? "Pattern compiled successfully" : "Compilation error"}
            subtitle={
              compiled.ok
                ? `${compiled.fields.length} named captures · ${compiled.usedPatterns.length} built-in patterns resolved`
                : "Fix the expression below to see extracted fields"
            }
            actions={
              compiled.ok ? (
                <Button size="sm" variant="ghost" onClick={copyAllJson}>
                  <Copy className="h-3 w-3" />
                  {copied === "all" ? "copied!" : "Copy all JSON"}
                </Button>
              ) : null
            }
          />
          <div className="p-4">
            {!compiled.ok ? (
              <pre className="scroll-slim overflow-x-auto whitespace-pre-wrap rounded-xl border border-rose-500/25 bg-rose-950/25 p-3 font-terminal text-[11px] leading-relaxed text-rose-200">
                {compiled.error}
              </pre>
            ) : (
              <>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Compiled regular expression
                </p>
                <pre className="scroll-slim max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/[0.07] bg-obsidian/80 p-3 font-terminal text-[10.5px] leading-relaxed text-violet-200/80">
                  {compiled.source}
                </pre>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {compiled.fields.map((f) => (
                    <span
                      key={f.name}
                      className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.08] px-2 py-1 font-terminal text-[10px] text-emerald-200"
                    >
                      {f.name}
                      <span className="text-emerald-500/70">:{f.type}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* per line results */}
        <Card className="overflow-hidden">
          <CardHeader
            icon={<Wand2 className="h-4 w-4" />}
            accent="violet"
            title="Extraction results"
            subtitle="Matched span is highlighted inside each sample line"
            actions={
              <div className="flex items-center gap-2">
                <input
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="rule name"
                  className="w-32 rounded-lg border border-white/[0.07] bg-obsidian/70 px-2 py-1.5 font-terminal text-[10.5px] text-slate-200 placeholder:text-slate-600 focus:border-violet-500/40 focus:outline-none"
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    setRules((r) => [
                      { id: crypto.randomUUID?.() ?? String(Date.now()), name: ruleName || "untitled", mode, anchor, pattern },
                      ...r,
                    ])
                  }
                >
                  <Save className="h-3 w-3" />
                  Save
                </Button>
              </div>
            }
          />

          {rules.length ? (
            <div className="flex flex-wrap gap-2 border-b border-white/[0.06] px-4 py-3">
              {rules.map((r) => (
                <span
                  key={r.id}
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-violet-500/25 bg-violet-500/[0.08] px-2 py-1 font-terminal text-[10px] text-violet-200"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMode(r.mode);
                      setAnchor(r.anchor);
                      setPattern(r.pattern);
                    }}
                    className="hover:underline"
                  >
                    {r.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRules((prev) => prev.filter((x) => x.id !== r.id))}
                    className="text-violet-400/60 hover:text-rose-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="scroll-slim max-h-[560px] overflow-y-auto divide-y divide-white/[0.05]">
            {results.length === 0 ? (
              <EmptyState
                icon={<Braces className="h-6 w-6" />}
                title="No sample lines"
                body="Add a line manually or pull the three newest events straight out of the live stream."
              />
            ) : (
              results.map(({ line, result }, i) => (
                <div key={i} className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge
                      className={cn(
                        result.matched
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-300",
                      )}
                    >
                      {result.matched ? "match" : "no match"}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {result.matched ? (
                        <span className="font-terminal text-[10px] text-slate-600">
                          {result.end - result.start}/{line.length} chars
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setSampleDraft(
                            activeSamples.filter((_, idx) => idx !== i).join("\n"),
                          );
                        }}
                        className="rounded p-1 text-slate-600 transition hover:text-rose-300"
                        title="Remove line"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <pre className="scroll-slim mb-3 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-white/[0.06] bg-obsidian/70 px-3 py-2 font-terminal text-[10.5px] leading-relaxed">
                    <HighlightedLine line={line} result={result} />
                  </pre>

                  {result.matched ? (
                    <div className="overflow-hidden rounded-lg border border-white/[0.06]">
                      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_54px] bg-white/[0.03] px-3 py-1.5 font-terminal text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <span>field</span>
                        <span>value</span>
                        <span className="text-right">type</span>
                      </div>
                      {result.fields.map((f) => (
                        <div
                          key={f.name}
                          className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_54px] items-start border-t border-white/[0.04] px-3 py-1.5"
                        >
                          <span className="font-terminal text-[10.5px] text-violet-300">
                            {f.name}
                          </span>
                          <span
                            className={cn(
                              "min-w-0 break-all font-terminal text-[10.5px]",
                              f.value === null
                                ? "text-slate-600 italic"
                                : f.coerceError
                                  ? "text-amber-300"
                                  : "text-slate-200",
                            )}
                          >
                            {f.value === null
                              ? "null / not captured"
                              : String(f.value)}
                          </span>
                          <span
                            className={cn(
                              "text-right font-terminal text-[10px]",
                              f.type === "string"
                                ? "text-slate-500"
                                : "text-emerald-400",
                            )}
                          >
                            {f.type}
                          </span>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(
                            JSON.stringify(fieldsToJson(result.fields), null, 2),
                          );
                          flash(String(i));
                        }}
                        className="flex w-full items-center justify-center gap-1.5 border-t border-white/[0.05] bg-white/[0.02] py-1.5 font-terminal text-[10px] text-slate-500 transition hover:bg-violet-500/10 hover:text-violet-200"
                      >
                        <Copy className="h-3 w-3" />
                        {copied === String(i) ? "copied to clipboard" : "copy as json"}
                      </button>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-rose-500/20 bg-rose-950/20 px-3 py-2 font-terminal text-[10.5px] text-rose-200/80">
                      {result.note}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
