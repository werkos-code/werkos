import { cn } from "@/lib/utils";
import { CockpitBackLink } from "@/features/platform/components/cockpit/admin-cockpit-ui";

type AdminCockpitPageProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  contentClassName?: string;
};

export function AdminCockpitPage({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  children,
  contentClassName,
}: AdminCockpitPageProps) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[1680px] px-5 py-7 lg:px-10 lg:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {backHref && backLabel ? (
            <CockpitBackLink href={backHref} label={backLabel} />
          ) : (
            <p className="mb-2 text-[10px] font-medium tracking-[0.28em] text-cyan-400/70 uppercase">
              WerkOS Control
            </p>
          )}
          <h1 className="admin-cockpit-title truncate text-3xl font-extralight tracking-tight text-white lg:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn("space-y-8", contentClassName)}>{children}</div>
    </div>
  );
}
