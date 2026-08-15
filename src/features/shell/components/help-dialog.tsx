"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { restartGuidedSetup } from "@/features/guided-setup/guided-setup-actions";
import { Link, useRouter } from "@/i18n/navigation";

type HelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const t = useTranslations("shell.help");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const links = [
    { href: "/projecten", label: t("links.projects") },
    { href: "/werkzaamheden", label: t("links.workItems") },
    { href: "/planning", label: t("links.planning") },
    { href: "/inbox", label: t("links.inbox") },
    { href: "/notificaties", label: t("links.notifications") },
    { href: "/instellingen/bedrijf", label: t("links.settings") },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {link.label}
                <ExternalLink className="size-3.5" />
              </Link>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => {
            startTransition(() => {
              void (async () => {
                await restartGuidedSetup();
                try {
                  window.localStorage.removeItem(
                    "werkos.guided-setup.context-dismissed",
                  );
                  window.localStorage.removeItem(
                    "werkos.guided-setup.collapsed",
                  );
                } catch {
                  // ignore storage errors
                }
                onOpenChange(false);
                router.push("/dashboard");
                router.refresh();
              })();
            });
          }}
        >
          {t("restartGuidedSetup")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("shortcut")}</p>
      </DialogContent>
    </Dialog>
  );
}
