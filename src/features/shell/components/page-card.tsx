import { cn } from "@/lib/utils";

type PageCardProps = React.ComponentProps<"div">;

export function PageCard({ className, ...props }: PageCardProps) {
  return (
    <div
      data-slot="page-card"
      className={cn(
        "rounded-xl border border-border/80 bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

type MetaStatCardProps = {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  muted?: boolean;
};

export function MetaStatCard({
  label,
  value,
  icon,
  action,
  className,
  muted,
}: MetaStatCardProps) {
  return (
    <PageCard className={cn("px-4 py-3", muted && "opacity-70", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <div className="truncate text-sm font-medium text-foreground">
            {value}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
          {action}
          {icon}
        </div>
      </div>
    </PageCard>
  );
}
