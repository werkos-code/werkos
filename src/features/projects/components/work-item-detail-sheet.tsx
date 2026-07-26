"use client";

import { useTranslations } from "next-intl";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { WorkItemRow } from "@/features/projects/lib/work-item";

type WorkItemDetailSheetProps = {
  item: WorkItemRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WorkItemDetailSheet({
  item,
  open,
  onOpenChange,
}: WorkItemDetailSheetProps) {
  const t = useTranslations("projects.workItems");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>{item?.title ?? t("detailTitle")}</SheetTitle>
          <SheetDescription>{t("detailPlaceholderLead")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            {t("detailPlaceholderBody")}
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {t("detailPlaceholderItems.planning")}</li>
            <li>• {t("detailPlaceholderItems.hours")}</li>
            <li>• {t("detailPlaceholderItems.materials")}</li>
            <li>• {t("detailPlaceholderItems.files")}</li>
            <li>• {t("detailPlaceholderItems.checklist")}</li>
            <li>• {t("detailPlaceholderItems.comms")}</li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
