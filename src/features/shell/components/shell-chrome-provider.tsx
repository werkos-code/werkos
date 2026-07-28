"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { GlobalSearchDialog } from "@/features/shell/components/global-search-dialog";
import { HelpDialog } from "@/features/shell/components/help-dialog";
import { NotificationPanel } from "@/features/shell/components/notification-panel";

type ShellChromeContextValue = {
  openSearch: () => void;
  openNotifications: () => void;
  openHelp: () => void;
  unreadCount: number;
  refreshUnreadCount: () => void;
};

const ShellChromeContext = createContext<ShellChromeContextValue | null>(null);

export function useShellChrome() {
  const ctx = useContext(ShellChromeContext);
  if (!ctx) {
    throw new Error("useShellChrome must be used within ShellChromeProvider");
  }
  return ctx;
}

export function ShellChromeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(() => {
    void (async () => {
      try {
        const response = await fetch("/api/notifications/unread-count", {
          signal: AbortSignal.timeout(10_000),
        });
        const result = (await response.json()) as { count?: number };
        if (response.ok) {
          setUnreadCount(result.count ?? 0);
        }
      } catch {
        // ignore polling errors
      }
    })();
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      openSearch: () => setSearchOpen(true),
      openNotifications: () => {
        setNotificationsOpen(true);
        refreshUnreadCount();
      },
      openHelp: () => setHelpOpen(true),
      unreadCount,
      refreshUnreadCount,
    }),
    [refreshUnreadCount, unreadCount],
  );

  return (
    <ShellChromeContext.Provider value={value}>
      {children}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <NotificationPanel
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        onChanged={refreshUnreadCount}
      />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </ShellChromeContext.Provider>
  );
}
