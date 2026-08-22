import { ArrowLeft } from "lucide-react";

import { CockpitSourceHint } from "@/features/platform/components/cockpit/cockpit-source-hint";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type CockpitCardProps = React.ComponentProps<"div">;

export function CockpitCard({ className, ...props }: CockpitCardProps) {
  return (
    <div
      data-slot="cockpit-card"
      className={cn("admin-cockpit-card rounded-xl text-card-foreground", className)}
      {...props}
    />
  );
}

type CockpitKpiProps = {
  label: string;
  value: React.ReactNode;
  source?: string;
  muted?: boolean;
  variant?: "default" | "hero";
  accent?: "cyan" | "blue" | "emerald";
  className?: string;
};

export function CockpitKpi({
  label,
  value,
  source,
  muted,
  variant = "default",
  accent = "cyan",
  className,
}: CockpitKpiProps) {
  return (
    <CockpitCard
      className={cn(
        "relative overflow-hidden",
        variant === "hero" ? "px-6 py-5 lg:px-7 lg:py-6" : "px-4 py-3.5",
        muted && "opacity-55",
        className,
      )}
    >
      {source ? <CockpitSourceHint text={source} /> : null}
      <div
        className="admin-cockpit-kpi-glow"
        data-accent={accent}
        aria-hidden
      />
      <p className="relative text-[10px] font-medium tracking-[0.22em] text-cyan-400/75 uppercase">
        {label}
      </p>
      <div
        className={cn(
          "relative mt-2 truncate tabular-nums text-white",
          variant === "hero"
            ? "text-4xl font-extralight tracking-tight lg:text-5xl admin-cockpit-kpi-value-hero"
            : "text-2xl font-light tracking-tight lg:text-3xl",
          muted && "text-white/35",
        )}
      >
        {value}
      </div>
    </CockpitCard>
  );
}

type CockpitSectionProps = {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
};

export function CockpitSection({
  title,
  hint,
  children,
  className,
}: CockpitSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {title ? (
        <div className="flex items-center gap-4">
          <h2 className="shrink-0 text-[11px] font-medium tracking-[0.24em] text-cyan-300/90 uppercase">
            {title}
          </h2>
          <div className="admin-cockpit-section-line" aria-hidden />
        </div>
      ) : null}
      {hint ? <p className="text-sm text-slate-400">{hint}</p> : null}
      {children}
    </section>
  );
}

type CockpitAlertProps = {
  children: React.ReactNode;
  variant?: "info" | "error";
  className?: string;
};

export function CockpitAlert({
  children,
  variant = "info",
  className,
}: CockpitAlertProps) {
  return (
    <CockpitCard
      className={cn(
        "px-5 py-4 text-sm",
        variant === "error" ? "text-red-300" : "text-slate-400",
        className,
      )}
    >
      {children}
    </CockpitCard>
  );
}

type CockpitFilterChipProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

export function CockpitFilterChip({
  active,
  onClick,
  children,
}: CockpitFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200 shadow-[0_0_20px_rgb(34_211_238_/_0.12)]"
          : "rounded-full px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
      }
    >
      {children}
    </button>
  );
}

type CockpitBackLinkProps = {
  href: string;
  label: string;
  className?: string;
};

export function CockpitBackLink({
  href,
  label,
  className,
}: CockpitBackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-cyan-300",
        className,
      )}
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  );
}

type CockpitFieldGridProps = {
  children: React.ReactNode;
  className?: string;
};

export function CockpitFieldGrid({ children, className }: CockpitFieldGridProps) {
  return (
    <dl className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</dl>
  );
}

type CockpitFieldProps = {
  label: string;
  value: React.ReactNode;
};

export function CockpitField({ label, value }: CockpitFieldProps) {
  return (
    <div>
      <dt className="text-[10px] font-medium tracking-[0.18em] text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-slate-100">{value}</dd>
    </div>
  );
}

type CockpitSubheadingProps = {
  children: React.ReactNode;
  count?: number;
};

export function CockpitSubheading({ children, count }: CockpitSubheadingProps) {
  return (
    <h3 className="text-[11px] font-medium tracking-[0.2em] text-slate-300 uppercase">
      {children}
      {count != null ? (
        <span className="ml-2 font-normal tracking-normal text-slate-500">
          ({count})
        </span>
      ) : null}
    </h3>
  );
}
