import { AppPageHeader } from "@/features/shell/components/app-page-header";

type ShellPageProps = {
  title: string;
  description?: string;
  backHref?: string;
  children?: React.ReactNode;
};

/**
 * Standard page frame inside the app shell: header + quiet content area.
 */
export function ShellPage({
  title,
  description,
  backHref,
  children,
}: ShellPageProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppPageHeader title={title} backHref={backHref} />
      <div className="flex-1 px-6 py-8 lg:px-8 lg:py-10">
        <div className="mx-auto w-[90%]">
          {description ? (
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
