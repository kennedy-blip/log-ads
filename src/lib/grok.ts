export type FieldType = "string" | "int" | "float";

export interface GrokField {
  name: string;
  type: FieldType;
}

export interface CompileResult {
  ok: boolean;
  source: string;
  regex: RegExp | null;
  fields: GrokField[];
  usedPatterns: string[];
  error?: string;
}

export interface MatchField {
  name: string;
  type: FieldType;
  raw: string | null;
  value: string | number | null;
  coerceError?: boolean;
}

export interface MatchResult {
  matched: boolean;
  fields: MatchField[];
  start: number;
  end: number;
  note?: string;
}

/* ------------------------------------------------------------------ *
 *  Built-in grok pattern library
 * ------------------------------------------------------------------ */
export const GROK_PATTERNS: Record<string, string> = {
  // Basics
  WORD: "\\b\\w+\\b",
  NOTSPACE: "\\S+",
  SPACE: "\\s+",
  SP: "[ ]+",
  DATA: ".*?",
  GREEDYDATA: ".*",
  USERNAME: "[a-zA-Z0-9._-]+",
  USER: "%{USERNAME}",
  HOSTNAME: "[0-9A-Za-z][0-9A-Za-z-]{0,62}(?:\\.[0-9A-Za-z][0-9A-Za-z-]{0,62})*\\.?",
  HOSTPORT: "%{IPORHOST}:%{POSINT}",

  // Numbers
  INT: "[+-]?[0-9]+",
  POSINT: "\\b[1-9][0-9]*\\b",
  NONNEGINT: "\\b(?:0|[1-9][0-9]*)\\b",
  BASE10NUM: "[+-]?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)",
  NUMBER: "%{BASE10NUM}",

  // Network
  IP: "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b",
  IPV4: "%{IP}",
  IPV6: "((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:)))(%.+)?)",
  IPORHOST: "(?:%{IP}|%{HOSTNAME})",

  // Paths / URLs
  PATH: "(?:[\\\\/]?[A-Za-z0-9._-]+)+[\\\\/]?",
  URIPATH: "(?:/[A-Za-z0-9$.+!*'(){},~:;=@#%&_\\-]+)+",
  URIPARAM: "\\?[A-Za-z0-9$.+!*'|(){},~@#%&/=:;_?\\-\\[\\]<>]*",
  URIPATHPARAM: "%{URIPATH}(?:%{URIPARAM})?",
  URIPROTO: "[A-Za-z][A-Za-z0-9+.-]*",
  URI: "%{URIPROTO}://(?:%{USER}(?::[^@]*)?@)?(?:%{IPORHOST})(?::%{INT})?(?:%{URIPATHPARAM})?",

  // Strings
  QUOTEDSTRING: '"(?:[^"\\\\]|\\\\.)*"',
  QS: "%{QUOTEDSTRING}",

  // Dates
  MONTH: "\\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\b",
  MONTHNUM: "(?:0?[1-9]|1[0-2])",
  MONTHNUM2: "(?:0[1-9]|1[0-2])",
  MONTHDAY: "(?:(?:0[1-9])|(?:[12][0-9])|(?:3[01])|[1-9])",
  DAY: "(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)",
  YEAR: "(?:\\d\\d){1,2}",
  HOUR: "(?:2[0123]|[01]?[0-9])",
  MINUTE: "(?:[0-5][0-9])",
  SECOND: "(?:(?:[0-5]?[0-9]|60)(?:[:.,][0-9]+)?)",
  TIME: "(?:%{HOUR}:%{MINUTE}(?::%{SECOND})?)",
  ISO8601_TIMEZONE: "(?:Z|[+-]%{HOUR}(?::?%{MINUTE})?)",
  ISO8601_SECOND: "(?:%{SECOND}|60)",
  TIMESTAMP_ISO8601: "%{YEAR}-%{MONTHNUM}-%{MONTHDAY}[T ]%{HOUR}:?%{MINUTE}(?::?%{SECOND})?%{ISO8601_TIMEZONE}?",
  DATE_US: "%{MONTHNUM}[/-]%{MONTHDAY}[/-]%{YEAR}",
  DATE_EU: "%{MONTHDAY}[./-]%{MONTHNUM}[./-]%{YEAR}",
  ISO8601_DATE: "%{YEAR}-%{MONTHNUM2}-%{MONTHDAY}",
  SYSLOGTIMESTAMP: "%{MONTH} +%{MONTHDAY} %{TIME}",
  HTTPDATE: "%{MONTHDAY}/%{MONTH}/%{YEAR}:%{TIME} %{ISO8601_TIMEZONE}",

  // Log levels
  LOGLEVEL:
    "(?:ALERT|CRIT|CRITICAL|DEBUG|EMERG|ERR|ERROR|FATAL|INFO|NOTICE|TRACE|WARN|WARNING|alert|crit|critical|debug|emerg|err|error|fatal|info|notice|trace|warn|warning)",

  // Web / app specifics
  SYSLOGHOST: "%{IPORHOST}",
  SYSLOGFACILITY: "<%{NONNEGINT}.%{NONNEGINT}>",
  SYSLOGBASE: "%{SYSLOGTIMESTAMP:timestamp}(?: %{SYSLOGFACILITY})? %{SYSLOGHOST:logsource} %{SYSLOGPROG}:",
  SYSLOGPROG: "%{PROG}(?:\\[%{POSINT}\\])?",
  PROG: "[\\x21-\\x5a\\x5c\\x5e-\\x7e]+",
  JAVACLASS: "(?:[a-zA-Z0-9$-]+\\.)+[A-Za-z0-9$_]+",
  JAVAFILE: "(?:[A-Za-z0-9_.-]+)",
  JAVASTACKTRACEPART: "%{JAVAFILE}:%{JAVAFILE}",
  UUID: "[A-Fa-f0-9]{8}-(?:[A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}",
  BASE64: "[A-Za-z0-9+/=]+",
};

const FIELD_RE = /%\{(\w+)(?::([\w$.-]+))?(?::(\w+))?\}/g;
const IDENT_RE = /^[A-Za-z_$][\w$]*$/;

/* ------------------------------------------------------------------ *
 *  Compiler
 * ------------------------------------------------------------------ */
function expandPattern(
  pattern: string,
  fields: GrokField[],
  seen: Set<string>,
  used: Set<string>,
  depth: number,
): string {
  if (depth > 18) {
    throw new Error(
      "Pattern nesting exceeded 18 levels — check for a recursive pattern definition.",
    );
  }
  return pattern.replace(
    FIELD_RE,
    (_match, name: string, field?: string, type?: string) => {
      const definition = GROK_PATTERNS[name];
      if (!definition) {
        throw new Error(
          `Unknown pattern %{${name}}. It is not in the built-in grok library.`,
        );
      }
      used.add(name);
      const inner = expandPattern(definition, fields, seen, used, depth + 1);
      if (!field) return `(?:${inner})`;
      if (!IDENT_RE.test(field)) {
        throw new Error(
          `"${field}" is not a valid capture name — use letters, digits and underscores (must not start with a digit).`,
        );
      }
      if (seen.has(field)) {
        throw new Error(
          `Duplicate capture name "${field}". Every named capture may only appear once.`,
        );
      }
      seen.add(field);
      const ft = (type as FieldType) || "string";
      if (!["string", "int", "float"].includes(ft)) {
        throw new Error(`Unknown conversion type ":${type}" (use :int or :float).`);
      }
      fields.push({ name: field, type: ft });
      return `(?<${field}>${inner})`;
    },
  );
}

export interface CompileOptions {
  mode?: "grok" | "regex";
  anchor?: boolean;
  caseInsensitive?: boolean;
}

export function compilePattern(
  input: string,
  opts: CompileOptions = {},
): CompileResult {
  const { mode = "grok", anchor = true, caseInsensitive = false } = opts;
  const fields: GrokField[] = [];
  const seen = new Set<string>();
  const used = new Set<string>();

  if (!input.trim()) {
    return {
      ok: false,
      source: "",
      regex: null,
      fields,
      usedPatterns: [],
      error: "Pattern is empty — start typing a grok expression.",
    };
  }

  let source = input;
  if (mode === "grok") {
    try {
      source = expandPattern(input, fields, seen, used, 0);
    } catch (err) {
      return {
        ok: false,
        source: "",
        regex: null,
        fields,
        usedPatterns: [...used],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    // Raw regex mode — read the named groups straight out of the source.
    const groupRe = /\(\?<([A-Za-z_$][\w$]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = groupRe.exec(source))) {
      if (seen.has(m[1])) {
        return {
          ok: false,
          source,
          regex: null,
          fields,
          usedPatterns: [],
          error: `Duplicate capture name "${m[1]}".`,
        };
      }
      seen.add(m[1]);
      fields.push({ name: m[1], type: "string" });
    }
  }

  const finalSource = anchor ? `^(?:${source})$` : source;

  try {
    const regex = new RegExp(finalSource, caseInsensitive ? "i" : undefined);
    return { ok: true, source: finalSource, regex, fields, usedPatterns: [...used] };
  } catch (err) {
    return {
      ok: false,
      source: finalSource,
      regex: null,
      fields,
      usedPatterns: [...used],
      error:
        err instanceof Error
          ? `Invalid regular expression — ${err.message}`
          : "Invalid regular expression.",
    };
  }
}

function coerce(raw: string | null, type: FieldType): MatchField {
  if (raw === null) return { name: "", type, raw, value: null };
  if (type === "int") {
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n)
      ? { name: "", type, raw, value: null, coerceError: true }
      : { name: "", type, raw, value: n };
  }
  if (type === "float") {
    const n = Number.parseFloat(raw);
    return Number.isNaN(n)
      ? { name: "", type, raw, value: null, coerceError: true }
      : { name: "", type, raw, value: n };
  }
  return { name: "", type, raw, value: raw };
}

export function runMatch(
  regex: RegExp | null,
  line: string,
  fields: GrokField[],
): MatchResult {
  if (!regex) return { matched: false, fields: [], start: 0, end: 0 };
  const trimmed = line.replace(/\s+$/, "");
  const m = regex.exec(trimmed);
  if (!m) {
    return {
      matched: false,
      fields: [],
      start: 0,
      end: 0,
      note: "NO MATCH — the pattern did not describe this line.",
    };
  }
  const groups = m.groups ?? {};
  const out: MatchField[] = fields.map((f) => {
    const res = coerce(f.name in groups ? groups[f.name] ?? null : null, f.type);
    return { ...res, name: f.name };
  });
  return { matched: true, fields: out, start: m.index, end: m.index + m[0].length };
}

export function fieldsToJson(fields: MatchField[]) {
  const obj: Record<string, string | number | null> = {};
  for (const f of fields) obj[f.name] = f.value;
  return obj;
}

/* ------------------------------------------------------------------ *
 *  Saved pattern presets
 * ------------------------------------------------------------------ */
export interface PatternPreset {
  id: string;
  label: string;
  hint: string;
  mode: "grok" | "regex";
  anchor?: boolean;
  pattern: string;
  samples: string[];
}

export const PRESETS: PatternPreset[] = [
  {
    id: "logpulse",
    label: "LogPulse ingest line",
    hint: "The exact shape of the live stream — full structured extraction.",
    mode: "grok",
    pattern:
      '%{TIMESTAMP_ISO8601:timestamp}\\s+%{LOGLEVEL:level}\\s+\\[%{DATA:service}\\]\\s+%{IP:client_ip}\\s+%{WORD:method}\\s+%{URIPATHPARAM:request}\\s+%{INT:status_code:int}\\s+%{INT:response_time_ms:int}ms\\s+%{NUMBER:payload_kb:float}kB\\s+"%{DATA:user_agent}"\\s+trace=%{NOTSPACE:trace_id}\\s+-\\s+%{GREEDYDATA:message}',
    samples: [
      '2026-02-14T09:12:41.318Z INFO  [api-gateway] 10.2.118.44 GET /v1/accounts 200 42ms 3.14kB "curl/8.4.0" trace=4f9a1c7b22d1e0a8 - request completed successfully',
      '2026-02-14T09:13:02.884Z ERROR [payments-svc] 172.31.9.201 POST /v1/charge 500 1842ms 0.62kB "stripe-node/14.1.0" trace=9b22ce04ff11a70d - NullPointerException at ChargeService.mapDto(ChargeService.java:214)',
      '2026-02-14T09:13:19.001Z WARN  [auth-svc] 84.12.240.9 GET /v1/search?page=7 429 611ms 1.02kB "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0" trace=1c8be0a9d447f221 - rate limit exceeded for tenant tn_5521 (limit 100/s)',
    ],
  },
  {
    id: "syslog",
    label: "Legacy syslog (RFC 3164)",
    hint: "Old-school BSD syslog from a fleet of app boxes.",
    mode: "grok",
    pattern:
      "%{SYSLOGTIMESTAMP:syslog_timestamp}\\s+%{SYSLOGHOST:hostname}\\s+%{PROG:program}(?:\\[%{POSINT:pid:int}\\])?:\\s+%{GREEDYDATA:message}",
    samples: [
      "Feb 14 09:12:41 ip-10-2-118-44 payments-svc[2841]: upstream latency degraded (p95 842ms)",
      "Feb 14 09:12:58 ip-10-2-118-44 kernel: [UFW BLOCK] IN=eth0 OUT= SRC=192.168.1.44 DST=10.2.118.44",
      "Feb 14 09:14:03 logs-01 notification-worker[9912]: job 8a41df retried (attempt 3/5)",
    ],
  },
  {
    id: "nginx",
    label: "Nginx combined access",
    hint: "Classic access log with referrer + user agent.",
    mode: "grok",
    pattern:
      '%{IPORHOST:client_ip} - %{USER:ident} \\[%{HTTPDATE:timestamp}\\] "%{WORD:verb} %{URIPATHPARAM:request} HTTP/%{NUMBER:http_version:float}" %{INT:status_code:int} %{INT:body_bytes:int} "%{DATA:referrer}" "%{DATA:agent}"',
    samples: [
      '84.12.240.9 - jordan [14/Feb/2026:09:12:41 +0000] "GET /v1/accounts HTTP/1.1" 200 5127 "https://app.acme.dev/billing" "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) Safari/605.1.15"',
      '10.2.118.44 - - [14/Feb/2026:09:12:44 +0000] "POST /v1/charge HTTP/2.0" 500 612 "-" "stripe-node/14.1.0"',
      '203.0.113.7 - - [14/Feb/2026:09:12:51 +0000] "GET /missing.css HTTP/1.1" 404 153 "-" "curl/8.4.0"',
    ],
  },
  {
    id: "java",
    label: "Java exception header",
    hint: "Capture the class + exception line that precedes a stack trace.",
    mode: "grok",
    pattern:
      "%{TIMESTAMP_ISO8601:timestamp}\\s+%{LOGLEVEL:level}\\s+\\[%{DATA:thread}\\]\\s+%{JAVACLASS:class}\\s*:\\s+%{GREEDYDATA:exception}",
    samples: [
      "2026-02-14T09:13:02,884 ERROR [XNIO-1 task-12] com.acme.payments.ChargeService : NullPointerException at ChargeService.mapDto(ChargeService.java:214)",
      "2026-02-14T09:14:11,004 WARN  [scheduler-4] com.acme.jobs.ReindexJob : retry budget remaining: 0.18",
    ],
  },
  {
    id: "kv",
    label: "key=value legacy shim",
    hint: "Whitespace separated key/value pairs — note the :int coercion.",
    mode: "grok",
    pattern:
      'ts=%{TIMESTAMP_ISO8601:timestamp} lvl=%{LOGLEVEL:level} svc=%{NOTSPACE:service} rid=%{NOTSPACE:request_id} dur=%{INT:duration_ms:int}ms st=%{INT:status_code:int} msg="%{DATA:message}"',
    samples: [
      'ts=2026-02-14T09:12:41Z lvl=INFO svc=billing-sync rid=req_77c1a0d34b2f dur=88ms st=200 msg="checkpoint written to wal segment 118"',
      'ts=2026-02-14T09:13:44Z lvl=ERROR svc=search-indexer rid=req_19ab40c551e8 dur=1240ms st=503 msg="circuit breaker OPEN - failing fast"',
    ],
  },
  {
    id: "rawregex",
    label: "Raw regex (named groups)",
    hint: "Plain JavaScript regex — switch modes to write it by hand.",
    mode: "regex",
    anchor: false,
    pattern:
      "(?<timestamp>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z)\\s+(?<level>\\w+)\\s+(?<service>[\\w-]+)",
    samples: [
      "2026-02-14T09:12:41.318Z INFO api-gateway request completed successfully",
      "2026-02-14T09:13:02.884Z ERROR payments-svc unhandled exception",
    ],
  },
];
