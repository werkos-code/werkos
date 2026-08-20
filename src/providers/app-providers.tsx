"use client";

import { ThemeProvider } from "next-themes";

import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { Toaster } from "@/components/ui/sonner";

type AppProvidersProps = {
  children: React.ReactNode;
};

/**
 * Root client providers. Keep this thin — add providers here only when
 * they are truly app-wide (theme, toasts, analytics).
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <AnalyticsProvider />
      {children}
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  );
}
