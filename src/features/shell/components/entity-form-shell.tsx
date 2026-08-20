import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PageCard } from "@/features/shell/components/page-card";
import { cn } from "@/lib/utils";

type EntityFormShellProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Centered create/edit form frame for relations & staff.
 * Lives inside ShellPage’s w-[90%] content area.
 */
export function EntityFormShell({
  icon: Icon,
  title,
  description,
  children,
  footer,
  className,
}: EntityFormShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl", className)}>
      <PageCard className="overflow-hidden">
        <div className="border-b border-border/70 bg-muted/25 px-6 py-5 sm:px-8">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </h2>
              {description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-7">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/15 px-6 py-4 sm:px-8">
            {footer}
          </div>
        ) : null}
      </PageCard>
    </div>
  );
}

export function EntityFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-0.5">
        <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function EntityFormField({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}
