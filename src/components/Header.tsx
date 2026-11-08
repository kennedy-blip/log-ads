import {
  Activity,
  BarChart3,
  Download,
  Pause,
  Play,
  Radio,
  Regex,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui";
import { humanBytes } from "@/lib/logEngine";

export type TabKey = "stream" | "parser" | "analytics" | "export";

export const TABS: {
  key: TabKey;
  label: string;
  short: string;
  icon: typeof Terminal;
  accent: string;
}[] = [
  {
    key: "stream",
    label: "Live Log Stream",
    short: "Stream",
    icon: Terminal,
    accent: "text-emerald-300",
  },
  {
    key: "parser",
    label: "Pattern Parser Studio",
    short: "Parser",
    icon: Regex,
    accent: "text-violet-300",
  },
  {
    key: "analytics",
    label: "Error Analytics",
    short: "Analytics",
    icon: BarChart3,
    accent: "text-rose-300",
  },
  {
    key: "export",
    label: "Log Exporter",
    short: "Export",
    icon: Download,
    accent: "text-amber-300",
  },
];

export default function Header({
  tab,
  onTab,
  streaming,
  onInject,
  onToggleStream,
  onClear,
  bufferCount,
  bufferMax,
  eps,
  volume,
}: {
  tab: TabKey;
  onTab: (t: TabKey) => void;
  streaming: boolean;
  onInject: () => void;
  onToggleStream: () => void;
  onClear: () => void;
  bufferCount: number;
  bufferMax: number;
  eps: number;
  volume: number;
}) {
  const fill = Math.min(100, (bufferCount / bufferMax) * 100);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-obsidian/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        {/* Brand + status */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-violet-500/40 blur-lg" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/40 bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-700">
              <Terminal className="h-5 w-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
            </div>
            {streaming ? (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-obsidian bg-emerald-400 animate-pulse-ring" />
            ) : (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-obsidian bg-amber-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-terminal text-lg font-bold tracking-tight text-slate-50">
                Log<span className="text-violet-400 text-glow-violet">Pulse</span>
              </h1>
              <span className="hidden rounded border border-white/10 px-1.5 py-px font-terminal text-[9px] uppercase tracking-widest text-slate-500 sm:inline">
                v2.4.0
              </span>
            </div>
          <p className="hidden truncate text-[11px] text-slate-500 lg:block">
            log aggregator · grok pattern parser · real-time tailer
          </p>
          </div>

          <div
            className={cn(
              "ml-1 flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 sm:ml-2 sm:px-3",
              streaming
                ? "border-emerald-500/30 bg-emerald-500/[0.08]"
                : "border-amber-500/30 bg-amber-500/[0.08]",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                streaming ? "bg-emerald-400 animate-pulse-ring" : "bg-amber-400",
              )}
            />
            <span
              className={cn(
                "font-terminal text-[10.5px] font-semibold uppercase tracking-wider",
                streaming ? "text-emerald-300" : "text-amber-300",
              )}
            >
              <span className="hidden sm:inline">
                {streaming ? "Log Tailer: Active (Streaming)" : "Log Tailer: Paused"}
              </span>
              <span className="sm:hidden">
                {streaming ? "Streaming" : "Paused"}
              </span>
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 hidden flex-col items-end lg:flex">
            <span className="font-terminal text-[11px] font-semibold tabular-nums text-slate-300">
              {eps.toFixed(1)} <span className="text-slate-500">ev/s</span>
            </span>
            <span className="font-terminal text-[10px] text-slate-600">
              {humanBytes(volume)} tailed
            </span>
          </div>
          <Button variant="primary" size="sm" onClick={onInject} title="Inject a burst of mock traffic including an error spike">
            <Zap className="h-3.5 w-3.5" />
            Inject Mock Traffic
          </Button>
          <Button
            size="sm"
            variant={streaming ? "ghost" : "success"}
            onClick={onToggleStream}
            title={streaming ? "Pause the log stream" : "Resume the log stream"}
          >
            {streaming ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {streaming ? "Pause Stream" : "Resume Stream"}
          </Button>
          <Button variant="danger" size="sm" onClick={onClear} title="Clear the in-memory log buffer">
            <Trash2 className="h-3.5 w-3.5" />
            Clear Buffer
          </Button>
        </div>
      </div>

      {/* Tabs + buffer meter */}
      <div className="mx-auto flex max-w-[1680px] flex-col gap-3 px-4 pb-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <nav className="scroll-slim -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
          {TABS.map((t) => {
            const active = t.key === tab;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onTab(t.key)}
                className={cn(
                  "group relative flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                  active
                    ? "border-violet-400/30 bg-violet-500/[0.12] text-white glow-violet"
                    : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/12 hover:bg-white/[0.05] hover:text-slate-200",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    active ? t.accent : "text-slate-500 group-hover:text-slate-300",
                  )}
                />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
                {active ? (
                  <span className="absolute -bottom-[13px] left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 shrink-0 text-slate-600" />
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.06] sm:w-40">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  fill > 88
                    ? "bg-rose-500"
                    : fill > 65
                      ? "bg-amber-400"
                      : "bg-emerald-500",
                )}
                style={{ width: `${Math.max(3, fill)}%` }}
              />
            </div>
            <span className="font-terminal text-[10px] tabular-nums text-slate-500">
              {bufferCount}/{bufferMax} buf
            </span>
          </div>
          <span className="hidden items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 font-terminal text-[10px] text-slate-500 sm:flex">
            <Radio className="h-3 w-3 text-violet-400" />
            ingest://logpulse-collector-01
          </span>
        </div>
      </div>
    </header>
  );
}
