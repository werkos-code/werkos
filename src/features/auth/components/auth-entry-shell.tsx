import { AuthBrandBar } from "@/features/auth/components/auth-brand-bar";
import { cn } from "@/lib/utils";

type AuthEntryShellProps = {
  websiteLabel: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Centered public entry frame (home, login) — logo top, soft background, no split panel.
 */
export function AuthEntryShell({
  websiteLabel,
  children,
  className,
}: AuthEntryShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#09133A]/[0.045] to-transparent"
      />

      <header className="relative z-10 mx-auto w-full max-w-md px-6 pt-8 sm:max-w-lg">
        <AuthBrandBar websiteLabel={websiteLabel} />
      </header>

      <main
        className={cn(
          "relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10 sm:py-14",
          className,
        )}
      >
        <div className="w-full max-w-md sm:max-w-lg">{children}</div>
      </main>
    </div>
  );
}
