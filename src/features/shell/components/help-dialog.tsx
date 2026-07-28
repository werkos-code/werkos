"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";

type HelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const t = useTranslations("shell.help");

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
        <p className="text-xs text-muted-foreground">{t("shortcut")}</p>
      </DialogContent>
    </Dialog>
  );
}
