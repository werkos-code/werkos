import { AppPageHeader } from "@/features/shell/components/app-page-header";
import { cn } from "@/lib/utils";

type ShellPageProps = {
  title: string;
  /** @deprecated Prefer tooltips; kept for call-site compat, not rendered. */
  description?: string;
  backHref?: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  contentClassName?: string;
};

/**
 * Standard page frame inside the app shell: header + quiet content area.
 */
export function ShellPage({
  title,
  backHref,
  status,
  actions,
  children,
  contentClassName,
}: ShellPageProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppPageHeader
        title={title}
        backHref={backHref}
        status={status}
        actions={actions}
      />
      <div className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
        <div className={cn("mx-auto w-[90%]", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}
