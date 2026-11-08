import type {
  ErrorType,
  LogEntry,
  LogLevel,
  MinuteBucket,
} from "@/types";

/* ------------------------------------------------------------------ *
 *  Deterministic-ish pseudo random helpers
 * ------------------------------------------------------------------ */
let seed = 0x2f6e2b1;
function rnd() {
  // xorshift
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 100000) / 100000;
}
export function reseed(v: number) {
  seed = v || 1;
}
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) =>
  Math.floor(rnd() * (max - min + 1)) + min;

/* ------------------------------------------------------------------ *
 *  Vocabulary
 * ------------------------------------------------------------------ */
const SERVICES = [
  { name: "api-gateway", env: "prod", region: "us-east-1" },
  { name: "payments-svc", env: "prod", region: "us-east-1" },
  { name: "auth-svc", env: "prod", region: "eu-west-1" },
  { name: "search-indexer", env: "staging", region: "us-west-2" },
  { name: "notification-worker", env: "prod", region: "eu-central-1" },
  { name: "billing-sync", env: "prod", region: "us-east-2" },
  { name: "media-transcoder", env: "staging", region: "ap-south-1" },
];

const ROUTES = [
  "GET /v1/accounts",
  "POST /v1/charge",
  "GET /v1/users/:id",
  "PUT /v1/users/:id",
  "POST /v1/auth/token",
  "GET /v1/search",
  "POST /v1/search/reindex",
  "GET /healthz",
  "DELETE /v1/sessions/:id",
  "POST /v1/webhooks/stripe",
  "GET /v1/reports/usage",
  "POST /v1/uploads/presign",
  "GET /metrics",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  "curl/8.4.0",
  "okhttp/4.12.0",
  "PostmanRuntime/7.36.0",
  "stripe-node/14.1.0",
  "kube-probe/1.29",
  "Go-http-client/2.0",
  "aws-sdk-nodejs/3.540.0",
];

const INFO_MSGS = [
  "request completed successfully",
  "cache HIT for account shard",
  "connection pool healthy (32/64 in use)",
  "checkpoint written to wal segment 118",
  "token minted for subject sub_9f3ac2",
  "queued job 8a41df for worker pool",
  "healthcheck ok in {rt}ms",
  "response served from edge cache",
  "partition rebalanced across 6 nodes",
  "schema migration verified (v41 → v42)",
];

const DEBUG_MSGS = [
  "resolving upstream via consul catalog",
  "acquired advisory lock pg_advisory_4412",
  "trace context propagated b3=1",
  "deserializing payload (147 keys)",
  "retry budget remaining: 0.82",
  "evaluating circuit breaker state=closed",
  "gorm query planner chose idx_users_email",
  "grpc keepalive ping sent",
  "serializing avro schema id=7741",
  "skip: no active feature flags for tenant",
];

const WARN_MSGS = [
  "slow query detected — 1.4s above budget",
  "upstream latency degraded (p95 {rt}ms)",
  "retrying request after transient upstream reset",
  "connection pool saturation at 91%",
  "deprecated API version v0 used by client",
  "disk usage on /var/lib/logs at 82%",
  "token expiring within 60s, refreshing",
  "partial write acknowledged by 2/3 replicas",
];

const ERROR_MSGS: Record<string, string[]> = {
  "500 Internal Server Error": [
    "unhandled exception in payment intent handler",
    "NullPointerException at ChargeService.mapDto(ChargeService.java:214)",
    "database connection refused after 3 attempts",
    "AssertionError: expected 1 captured argument but found 0",
  ],
  "404 Not Found": [
    "resource not found: account acct_9931 no longer exists",
    "route matched no handler — possibly removed in v42",
    "object key missing in blob storage bucket",
  ],
  "429 Rate Limit Exceeded": [
    "rate limit exceeded for tenant tn_5521 (limit 100/s)",
    "throttled by upstream provider: quota exhausted",
    "token bucket empty — shedding requests",
  ],
  "502 Bad Gateway": [
    "upstream returned invalid response envelope",
    "tls handshake failed with payments upstream",
  ],
  "503 Service Unavailable": [
    "circuit breaker OPEN — failing fast",
    "no healthy upstreams available in pool",
  ],
};

const STACKS: Record<string, string[]> = {
  "500 Internal Server Error": [
    "java.lang.NullPointerException",
    "\tat com.acme.payments.ChargeService.mapDto(ChargeService.java:214)",
    "\tat com.acme.payments.ChargeController.create(ChargeController.java:88)",
    "\tat java.base/jdk.internal.reflect.Method.invoke(Method.java:568)",
    "\tat org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1072)",
  ],
  "502 Bad Gateway": [
    "io.netty.channel.ConnectTimeoutException: connection timed out",
    "\tat io.netty.channel.nio.AbstractNioChannel$AbstractNioUnsafe.finishConnect(AbstractNioChannel.java:340)",
    "\tat com.acme.gateway.UpstreamProxy.forward(UpstreamProxy.java:151)",
  ],
  "503 Service Unavailable": [
    "com.acme.resilience.CircuitOpenException: breaker[payments] open",
    "\tat com.acme.resilience.CircuitBreaker.checkState(CircuitBreaker.java:74)",
    "\tat com.acme.gateway.Router.route(Router.java:210)",
  ],
};

const STATUS_BY_LEVEL: Record<LogLevel, number[]> = {
  INFO: [200, 200, 200, 201, 202, 204, 304, 200],
  DEBUG: [200, 204, 301, 200, 200],
  WARN: [400, 401, 403, 404, 408, 429, 499, 404],
  ERROR: [500, 500, 404, 429, 502, 503],
};

const STATUS_LABEL: Record<number, string> = {
  500: "500 Internal Server Error",
  404: "404 Not Found",
  429: "429 Rate Limit Exceeded",
  502: "502 Bad Gateway",
  503: "503 Service Unavailable",
};

export function classifyError(status: number): ErrorType | undefined {
  const label = STATUS_LABEL[status];
  return label as ErrorType | undefined;
}

/* ------------------------------------------------------------------ *
 *  Formatting
 * ------------------------------------------------------------------ */
const p2 = (n: number) => String(n).padStart(2, "0");

export function formatClock(ts: number) {
  const d = new Date(ts);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${String(
    d.getMilliseconds(),
  ).padStart(3, "0")}`;
}

export function formatIso(ts: number) {
  const d = new Date(ts);
  return (
    `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}` +
    `T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}.${String(
      d.getUTCMilliseconds(),
    ).padStart(3, "0")}Z`
  );
}

export function formatMinute(ts: number) {
  const d = new Date(ts);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export function formatAgo(ts: number, now: number) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}

export function humanBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export const hex = (len: number) => {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(rnd() * 16)];
  return out;
};

/* ------------------------------------------------------------------ *
 *  Entry factory
 * ------------------------------------------------------------------ */
function makeIp(internal: boolean) {
  if (internal) return `10.${int(0, 4)}.${int(0, 255)}.${int(2, 254)}`;
  return `${int(20, 210)}.${int(1, 254)}.${int(1, 254)}.${int(1, 254)}`;
}

export interface GenOptions {
  spike?: boolean;
  at?: number;
  injected?: boolean;
}

export function createLogEntry(id: number, opts: GenOptions = {}): LogEntry {
  const at = opts.at ?? Date.now();
  const spike = !!opts.spike;

  const roll = rnd();
  let level: LogLevel;
  if (spike) {
    level =
      roll < 0.32
        ? "ERROR"
        : roll < 0.54
          ? "WARN"
          : roll < 0.9
            ? "INFO"
            : "DEBUG";
  } else {
    level =
      roll < 0.58
        ? "INFO"
        : roll < 0.76
          ? "DEBUG"
          : roll < 0.9
            ? "WARN"
            : "ERROR";
  }

  const svc = pick(SERVICES);
  const route = pick(ROUTES);
  const [method, path] = route.split(" ");
  let status = pick(STATUS_BY_LEVEL[level]);

  // During a spike, bias hard toward the headline error types.
  if (spike && level === "ERROR" && rnd() < 0.75) {
    status = pick([500, 500, 429, 404, 503, 502]);
  }

  const errorType = classifyError(status);
  const isError = level === "ERROR";
  const isWarn = level === "WARN";

  const base = isError
    ? 240 + int(0, 1800)
    : isWarn
      ? 180 + int(0, 700)
      : 12 + int(0, 180);

  const response_time_ms = spike && isError ? base + int(400, 2600) : base;

  let message = isError
    ? pick(ERROR_MSGS[errorType ?? "500 Internal Server Error"])
    : isWarn
      ? pick(WARN_MSGS)
      : level === "DEBUG"
        ? pick(DEBUG_MSGS)
        : pick(INFO_MSGS);
  message = message.replace("{rt}", String(response_time_ms));

  const trace_id = hex(8) + hex(8);
  const span_id = hex(8);
  const request_id = `req_${hex(12)}`;
  const user_agent = pick(USER_AGENTS);
  const ip_address = makeIp(rnd() < 0.45);
  const query = rnd() < 0.28 ? `?${pick(["page", "limit", "trace", "shard"])}=${int(1, 99)}` : "";
  const bytes = isError ? int(180, 1400) : int(240, 42000);
  const host = `${svc.name.split("-")[0]}-${hex(4)}-${svc.region}`;

  const raw =
    `${formatIso(at)} ${level.padEnd(5, " ")} [${svc.name}] ` +
    `${ip_address} ${method} ${path}${query} ${status} ${response_time_ms}ms ` +
    `${(bytes / 1024).toFixed(2)}kB "${user_agent}" trace=${trace_id} - ${message}`;

  return {
    id,
    timestamp: at,
    level,
    service: svc.name,
    env: svc.env,
    host,
    region: svc.region,
    message,
    ip_address,
    status_code: status,
    response_time_ms,
    user_agent,
    method,
    path,
    query,
    trace_id,
    span_id,
    request_id,
    bytes,
    raw,
    error_type: errorType,
    stack: isError && errorType && STACKS[errorType] ? STACKS[errorType] : undefined,
    injected: opts.injected,
  };
}

/* ------------------------------------------------------------------ *
 *  Seeding — backfill 15 minutes of history
 * ------------------------------------------------------------------ */
export function seedHistory(now = Date.now()): LogEntry[] {
  const out: LogEntry[] = [];
  let id = 1;
  const windowMs = 15 * 60 * 1000;
  const start = now - windowMs;

  // Walk the window in ~2s steps, emitting 0-3 logs per step.
  let t = start;
  let incidentAt = start + 1000 * 60 * int(2, 6);
  let incidentEnd = incidentAt + 1000 * int(28, 52);

  while (t < now) {
    const inIncident = t > incidentAt && t < incidentEnd;
    const perStep = inIncident ? int(3, 7) : int(0, 2);
    for (let i = 0; i < perStep; i++) {
      out.push(
        createLogEntry(id++, {
          at: t + int(0, 1900),
          spike: inIncident,
        }),
      );
    }
    if (t > incidentEnd) {
      incidentAt = t + 1000 * 60 * int(2, 5);
      incidentEnd = incidentAt + 1000 * int(28, 52);
    }
    t += 2000;
  }

  // Trim to the newest 900 entries so the buffer stays light.
  return out.slice(-900);
}

/* ------------------------------------------------------------------ *
 *  Minute buckets
 * ------------------------------------------------------------------ */
export const MINUTE = 60_000;

export function bucketStart(ts: number) {
  return Math.floor(ts / MINUTE) * MINUTE;
}

export function emptyBucket(start: number): MinuteBucket {
  return {
    start,
    total: 0,
    errors: 0,
    warns: 0,
    byType: {},
    latencySum: 0,
    latencyCount: 0,
    maxLatency: 0,
  };
}

export function buildBuckets(logs: LogEntry[], now = Date.now()): MinuteBucket[] {
  const minutes = 15;
  const currentStart = bucketStart(now);
  const map = new Map<number, MinuteBucket>();
  for (let i = minutes - 1; i >= 0; i--) {
    const s = currentStart - i * MINUTE;
    map.set(s, emptyBucket(s));
  }
  for (const log of logs) {
    const key = bucketStart(log.timestamp);
    let b = map.get(key);
    if (!b) {
      if (key < currentStart - (minutes - 1) * MINUTE) continue;
      b = emptyBucket(key);
      map.set(key, b);
    }
    accumulate(b, log);
  }
  return [...map.values()].sort((a, b) => a.start - b.start);
}

export function accumulate(b: MinuteBucket, log: LogEntry) {
  b.total += 1;
  if (log.level === "ERROR") {
    b.errors += 1;
    const t = log.error_type ?? "500 Internal Server Error";
    b.byType[t] = (b.byType[t] ?? 0) + 1;
  }
  if (log.level === "WARN") b.warns += 1;
  b.latencySum += log.response_time_ms;
  b.latencyCount += 1;
  b.maxLatency = Math.max(b.maxLatency, log.response_time_ms);
}

export function mergeBucket(list: MinuteBucket[], log: LogEntry): MinuteBucket[] {
  const start = bucketStart(log.timestamp);
  const next = list.length ? [...list] : [];
  let bucket = next.find((b) => b.start === start);
  if (!bucket) {
    bucket = emptyBucket(start);
    next.push(bucket);
  }
  accumulate(bucket, log);
  const sorted = next.sort((a, b) => a.start - b.start);
  const cutoff = bucketStart(Date.now()) - 14 * MINUTE;
  return sorted.filter((b) => b.start >= cutoff);
}

/* ------------------------------------------------------------------ *
 *  Derived stats
 * ------------------------------------------------------------------ */
export function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}
