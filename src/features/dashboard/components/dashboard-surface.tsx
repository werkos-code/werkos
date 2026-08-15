"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Dashboard-only surface: softer than PageCard, unique to home. */
export function DashboardSurface({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.04]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardSurfaceHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-5 pt-4 pb-3",
        className,
      )}
    >
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function DashboardEmptyCta({
  icon: Icon,
  title,
  description,
  ctaLabel,
  href,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel: string;
  href?: string;
  onClick?: () => void;
}) {
  const cta = href ? (
    <Button asChild size="sm" className="mt-4">
      <Link href={href}>{ctaLabel}</Link>
    </Button>
  ) : (
    <Button type="button" size="sm" className="mt-4" onClick={onClick}>
      {ctaLabel}
    </Button>
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {cta}
    </div>
  );
}
