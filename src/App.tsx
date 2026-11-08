import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Keyboard, Lock, ShieldCheck, Terminal } from "lucide-react";
import Header, { type TabKey } from "@/components/Header";
import LogStream from "@/components/LogStream";
import LogParser from "@/components/LogParser";
import LogAnalytics from "@/components/LogAnalytics";
import LogExporter from "@/components/LogExporter";
import { Toast } from "@/components/ui";
import type { LogEntry, MinuteBucket } from "@/types";
import {
  buildBuckets,
  createLogEntry,
  mergeBucket,
  seedHistory,
} from "@/lib/logEngine";

const BUFFER_MAX = 400;

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "info" | "danger";
}

export default function App() {
  const history = useMemo(() => seedHistory(), []);
  const [logs, setLogs] = useState<LogEntry[]>(() => history.slice(-BUFFER_MAX));
  const [buckets, setBuckets] = useState<MinuteBucket[]>(() => buildBuckets(history));
  const [streaming, setStreaming] = useState(true);
  const [tab, setTab] = useState<TabKey>("stream");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [eps, setEps] = useState(0);
  const [volume, setVolume] = useState(() =>
    history.reduce((a, l) => a + l.bytes, 0),
  );

  const idRef = useRef<number>(
    history.length ? history[history.length - 1].id : 0,
  );
  const spikeUntilRef = useRef<number>(0);
  const nextIncidentRef = useRef<number>(Date.now() + 20_000);
  const stampsRef = useRef<number[]>([]);
  const toastIdRef = useRef(0);

  const toast = useCallback((message: string, tone: ToastItem["tone"] = "info") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      2800,
    );
  }, []);

  const push = useCallback((entries: LogEntry[]) => {
    if (!entries.length) return;
    setLogs((prev) => [...prev, ...entries].slice(-BUFFER_MAX));
    setBuckets((prev) => {
      let next = prev;
      for (const e of entries) next = mergeBucket(next, e);
      return next;
    });
    setVolume((v) => v + entries.reduce((a, e) => a + e.bytes, 0));
    const now = Date.now();
    for (const e of entries) stampsRef.current.push(e.timestamp || now);
  }, []);

  /* ------------------------------------------------------------ stream */
  useEffect(() => {
    if (!streaming) return;
    const handle = window.setInterval(() => {
      const now = Date.now();
      if (now > nextIncidentRef.current) {
        spikeUntilRef.current = now + 12_000;
        nextIncidentRef.current = spikeUntilRef.current + 55_000;
      }
      const spike = now < spikeUntilRef.current;
      const count = Math.random() < 0.4 ? 2 : 1;
      const entries: LogEntry[] = [];
      for (let i = 0; i < count; i++) {
        entries.push(
          createLogEntry(++idRef.current, { at: now - i * 120, spike }),
        );
      }
      push(entries);
    }, 1050);
    return () => window.clearInterval(handle);
  }, [streaming, push]);

  /* --------------------------------------------------------------- rate */
  useEffect(() => {
    const handle = window.setInterval(() => {
      const now = Date.now();
      stampsRef.current = stampsRef.current.filter((t) => now - t < 5000);
      setEps(stampsRef.current.length / 5);
    }, 1000);
    return () => window.clearInterval(handle);
  }, []);

  /* ------------------------------------------------------------ actions */
  const injectTraffic = useCallback(() => {
    const now = Date.now();
    const entries: LogEntry[] = [];
    const burst = 36;
    for (let i = burst; i > 0; i--) {
      entries.push(
        createLogEntry(++idRef.current, {
          at: now - Math.round((i / burst) * 95_000) + Math.round(Math.random() * 1500),
          spike: true,
          injected: true,
        }),
      );
    }
    push(entries);
    setStreaming(true);
    toast(
      `Injected ${burst} mock events — synthetic error spike applied`,
      "success",
    );
  }, [push, toast]);

  const toggleStream = useCallback(() => {
    setStreaming((prev) => {
      const next = !prev;
      toast(
        next ? "Log tailer resumed — streaming live" : "Log tailer paused — buffer frozen",
        next ? "success" : "danger",
      );
      return next;
    });
  }, [toast]);

  const clearBuffer = useCallback(() => {
    setLogs([]);
    toast("Log buffer cleared — analytics history retained", "danger");
  }, [toast]);

  /* ------------------------------------------------------------ hotkeys */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const map: Record<string, TabKey> = {
        "1": "stream",
        "2": "parser",
        "3": "analytics",
        "4": "export",
      };
      const target = map[e.key];
      if (target) {
        e.preventDefault();
        setTab(target);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const errorCount = useMemo(
    () => logs.filter((l) => l.level === "ERROR").length,
    [logs],
  );

  return (
    <div className="min-h-screen bg-obsidian text-slate-200">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-violet-600/[0.09] blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-[380px] w-[380px] rounded-full bg-emerald-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[320px] w-[320px] rounded-full bg-rose-500/[0.05] blur-[120px]" />
      </div>

      <div className="relative">
        <Header
          tab={tab}
          onTab={setTab}
          streaming={streaming}
          onInject={injectTraffic}
          onToggleStream={toggleStream}
          onClear={clearBuffer}
          bufferCount={logs.length}
          bufferMax={BUFFER_MAX}
          eps={eps}
          volume={volume}
        />

        <main className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6">
          {/* context strip */}
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/[0.05] bg-panel/40 px-4 py-2.5 backdrop-blur">
            <span className="flex items-center gap-1.5 font-terminal text-[10.5px] text-slate-400">
              <Terminal className="h-3.5 w-3.5 text-violet-400" />
              collector <span className="text-slate-200">logpulse-collector-01</span>
            </span>
            <span className="flex items-center gap-1.5 font-terminal text-[10.5px] text-slate-400">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              buffered <span className="text-slate-200">{logs.length}</span> events
            </span>
            <span className="flex items-center gap-1.5 font-terminal text-[10.5px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
              errors in buffer <span className="text-rose-300">{errorCount}</span>
            </span>
            <span className="flex items-center gap-1.5 font-terminal text-[10.5px] text-slate-400">
              <Keyboard className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-slate-200">/</span> search ·{" "}
              <span className="text-slate-200">alt+1…4</span> tabs ·{" "}
              <span className="text-slate-200">esc</span> close drawer
            </span>
          </div>

          {tab === "stream" ? <LogStream logs={logs} streaming={streaming} /> : null}
          {tab === "parser" ? <LogParser logs={logs} /> : null}
          {tab === "analytics" ? (
            <LogAnalytics buckets={buckets} logs={logs} onInject={injectTraffic} />
          ) : null}
          {tab === "export" ? <LogExporter logs={logs} onInject={injectTraffic} /> : null}

          <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] py-6 sm:flex-row">
            <p className="font-terminal text-[10.5px] text-slate-600">
              LogPulse · interactive log aggregator, pattern parser &amp; real-time tailer
            </p>
            <div className="flex items-center gap-4 font-terminal text-[10.5px] text-slate-600">
              <span>engine: browser-only simulation</span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                no data leaves this tab
              </span>
            </div>
          </footer>
        </main>
      </div>

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            tone={t.tone}
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </div>
  );
}
