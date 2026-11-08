import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { Copy, X } from "lucide-react";

/* ---------------------------------------------------------------- Card */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/[0.07] bg-panel/80 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_18px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  accent = "violet",
  actions,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  accent?: "violet" | "emerald" | "amber" | "rose" | "slate" | "cyan";
  actions?: ReactNode;
  className?: string;
}) {
  const accents: Record<string, string> = {
    violet: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    rose: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    cyan: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
    slate: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  };
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
            accents[accent],
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-semibold tracking-tight text-slate-100">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Button */
export function Button({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  className,
  title,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "success" | "subtle";
  size?: "sm" | "md";
  className?: string;
  title?: string;
  disabled?: boolean;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-violet-600 text-white hover:bg-violet-500 border-violet-400/40 shadow-[0_6px_20px_-8px_rgba(139,92,246,0.9)]",
    ghost:
      "bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white border-white/10",
    subtle:
      "bg-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border-transparent",
    danger:
      "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border-rose-500/30",
    success:
      "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/30",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-3.5 py-2 text-xs",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Toggle */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  accent = "emerald",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  accent?: "emerald" | "violet" | "amber";
}) {
  const on: Record<string, string> = {
    emerald: "bg-emerald-500/90 border-emerald-400",
    violet: "bg-violet-500/90 border-violet-400",
    amber: "bg-amber-500/90 border-amber-400",
  };
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      title={hint}
      className="group inline-flex items-center gap-2 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-200"
    >
      <span
        className={cn(
          "relative h-[18px] w-[32px] rounded-full border transition-all duration-200",
          checked ? on[accent] : "border-white/10 bg-white/[0.06]",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-[12px] w-[12px] rounded-full bg-white transition-all duration-200",
            checked ? "left-[16px]" : "left-[2px] opacity-60",
          )}
        />
      </span>
      {label}
    </button>
  );
}

/* ---------------------------------------------------------------- Pill */
export function Pill({
  children,
  onClick,
  active,
  className,
  count,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-terminal text-[10.5px] font-semibold uppercase tracking-wider transition-all duration-150",
        active
          ? "border-white/25 bg-white/[0.1] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
          : "border-white/[0.07] bg-white/[0.02] text-slate-500 hover:border-white/15 hover:text-slate-300",
        className,
      )}
    >
      {children}
      {typeof count === "number" ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-px font-terminal text-[9.5px] tabular-nums",
            active ? "bg-white/15 text-white" : "bg-white/[0.05] text-slate-500",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/* ---------------------------------------------------------------- Stat */
export function Stat({
  label,
  value,
  unit,
  delta,
  icon,
  accent = "violet",
  footer,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { dir: "up" | "down" | "flat"; text: string; good?: boolean };
  icon?: ReactNode;
  accent?: "violet" | "emerald" | "amber" | "rose" | "cyan" | "slate";
  footer?: ReactNode;
}) {
  const map: Record<string, { ring: string; text: string; glow: string }> = {
    violet: { ring: "ring-violet-500/25", text: "text-violet-300", glow: "from-violet-500/12" },
    emerald: { ring: "ring-emerald-500/25", text: "text-emerald-300", glow: "from-emerald-500/12" },
    amber: { ring: "ring-amber-500/25", text: "text-amber-300", glow: "from-amber-500/12" },
    rose: { ring: "ring-rose-500/25", text: "text-rose-300", glow: "from-rose-500/12" },
    cyan: { ring: "ring-cyan-500/25", text: "text-cyan-300", glow: "from-cyan-500/12" },
    slate: { ring: "ring-slate-500/25", text: "text-slate-300", glow: "from-slate-500/12" },
  };
  const a = map[accent];
  return (
    <Card className={cn("overflow-hidden p-4", a.ring, "ring-1")}>
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-b to-transparent blur-2xl",
          a.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        {icon ? <span className={cn("opacity-80", a.text)}>{icon}</span> : null}
      </div>
      <div className="relative mt-2 flex items-baseline gap-1.5">
        <span className="font-terminal text-[26px] font-bold leading-none tabular-nums text-slate-50">
          {value}
        </span>
        {unit ? (
          <span className="font-terminal text-xs font-medium text-slate-500">{unit}</span>
        ) : null}
      </div>
      {delta ? (
        <p
          className={cn(
            "relative mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-terminal text-[10px] font-semibold",
            delta.dir === "up"
              ? delta.good
                ? "bg-emerald-500/12 text-emerald-300"
                : "bg-rose-500/12 text-rose-300"
              : delta.dir === "down"
                ? delta.good
                  ? "bg-emerald-500/12 text-emerald-300"
                  : "bg-rose-500/12 text-rose-300"
                : "bg-white/[0.05] text-slate-400",
          )}
        >
          {delta.text}
        </p>
      ) : null}
      {footer ? <div className="relative mt-3">{footer}</div> : null}
    </Card>
  );
}

/* ---------------------------------------------------------------- Misc */
export function KeyValue({
  k,
  v,
  mono = true,
  copy,
}: {
  k: string;
  v: ReactNode;
  mono?: boolean;
  copy?: string;
}) {
  return (
    <div className="group flex items-start gap-3 border-b border-white/[0.04] py-2 last:border-0">
      <span className="w-[38%] shrink-0 font-terminal text-[11px] font-medium text-slate-500">
        {k}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 break-all text-[11.5px] text-slate-200",
          mono && "font-terminal",
        )}
      >
        {v}
      </span>
      {copy ? (
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(copy)}
          className="shrink-0 rounded p-1 text-slate-600 opacity-0 transition hover:bg-white/5 hover:text-slate-300 group-hover:opacity-100"
          title="Copy value"
        >
          <Copy className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-terminal text-[10px] font-semibold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02] text-slate-500">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-300">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
          {body}
        </p>
      </div>
      {action}
    </div>
  );
}

export function Toast({
  message,
  tone,
  onClose,
}: {
  message: string;
  tone: "success" | "info" | "danger";
  onClose: () => void;
}) {
  const tones = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    info: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    danger: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  };
  return (
    <div
      className={cn(
        "animate-fade-up pointer-events-auto flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-xs font-medium shadow-2xl backdrop-blur-xl",
        tones[tone],
      )}
    >
      <span className="font-terminal text-[10px] uppercase tracking-wider opacity-70">
        logpulse
      </span>
      <span className="text-slate-100">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-0.5 text-current opacity-60 transition hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
