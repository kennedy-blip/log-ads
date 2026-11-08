export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export type ErrorType =
  | "500 Internal Server Error"
  | "404 Not Found"
  | "429 Rate Limit Exceeded"
  | "502 Bad Gateway"
  | "503 Service Unavailable";

export interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  service: string;
  env: string;
  host: string;
  message: string;
  ip_address: string;
  status_code: number;
  response_time_ms: number;
  user_agent: string;
  method: string;
  path: string;
  query: string;
  trace_id: string;
  span_id: string;
  request_id: string;
  bytes: number;
  region: string;
  raw: string;
  error_type?: ErrorType;
  stack?: string[];
  injected?: boolean;
}

export interface MinuteBucket {
  start: number;
  total: number;
  errors: number;
  warns: number;
  byType: Record<string, number>;
  latencySum: number;
  latencyCount: number;
  maxLatency: number;
}

export const LEVELS: LogLevel[] = ["INFO", "WARN", "ERROR", "DEBUG"];

export const ERROR_TYPES: ErrorType[] = [
  "500 Internal Server Error",
  "404 Not Found",
  "429 Rate Limit Exceeded",
  "502 Bad Gateway",
  "503 Service Unavailable",
];

export const ERROR_TYPE_STYLES: Record<
  string,
  { text: string; bg: string; border: string; bar: string; hex: string }
> = {
  "500 Internal Server Error": {
    text: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    bar: "bg-rose-500",
    hex: "#f43f5e",
  },
  "404 Not Found": {
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    bar: "bg-amber-400",
    hex: "#f59e0b",
  },
  "429 Rate Limit Exceeded": {
    text: "text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    bar: "bg-violet-500",
    hex: "#8b5cf6",
  },
  "502 Bad Gateway": {
    text: "text-cyan-300",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    bar: "bg-cyan-400",
    hex: "#22d3ee",
  },
  "503 Service Unavailable": {
    text: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    bar: "bg-sky-400",
    hex: "#38bdf8",
  },
};

export const LEVEL_STYLES: Record<
  LogLevel,
  { text: string; bg: string; border: string; dot: string; hex: string; chip: string }
> = {
  INFO: {
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
    hex: "#10b981",
    chip: "bg-emerald-500/12 text-emerald-300 border-emerald-500/35",
  },
  WARN: {
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
    hex: "#f59e0b",
    chip: "bg-amber-500/12 text-amber-300 border-amber-500/35",
  },
  ERROR: {
    text: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-400",
    hex: "#f43f5e",
    chip: "bg-rose-500/12 text-rose-300 border-rose-500/35",
  },
  DEBUG: {
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
    hex: "#94a3b8",
    chip: "bg-slate-500/12 text-slate-300 border-slate-500/35",
  },
};
