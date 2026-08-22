"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AppointmentRow } from "@/features/planning/lib/planning";
import { formatTimeRange } from "@/features/planning/lib/planning";

type PlanningConflictDialogProps = {
  open: boolean;
  assigneeName: string;
  conflicts: AppointmentRow[];
  locale: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PlanningConflictDialog({
  open,
  assigneeName,
  conflicts,
  locale,
  onCancel,
  onConfirm,
}: PlanningConflictDialogProps) {
  const t = useTranslations("planning");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("conflict.title", { name: assigneeName })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">{t("conflict.description")}</p>
          <ul className="space-y-2">
            {conflicts.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <p className="font-medium">
                  {formatTimeRange(item.startsAt, item.endsAt, locale)}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {item.title}
                  {item.projectName ? ` · ${item.projectName}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              {t("conflict.cancel")}
            </Button>
            <Button type="button" size="sm" onClick={onConfirm}>
              {t("conflict.confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
