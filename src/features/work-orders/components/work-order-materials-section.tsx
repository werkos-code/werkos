"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { formatQty, type WorkOrderMaterialSummaryRow } from "@/features/materials/lib/materials";

type WorkOrderMaterialsSectionProps = {
  workOrderId: string;
  projectId: string;
  disabled?: boolean;
};

export function WorkOrderMaterialsSection({
  workOrderId,
  projectId,
  disabled,
}: WorkOrderMaterialsSectionProps) {
  const t = useTranslations("workOrders.materials");
  const tCommon = useTranslations("common");
  const [rows, setRows] = useState<WorkOrderMaterialSummaryRow[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [workItems, setWorkItems] = useState<Array<{ id: string; title: string }>>(
    [],
  );
  const [pickId, setPickId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function reload() {
    setLoading(true);
    try {
      const [materialsRes, linksRes] = await Promise.all([
        fetch(
          `/api/work-order-materials?workOrderId=${encodeURIComponent(workOrderId)}`,
          { signal: AbortSignal.timeout(20_000) },
        ),
        fetch(
          `/api/work-order-work-items?workOrderId=${encodeURIComponent(workOrderId)}`,
          { signal: AbortSignal.timeout(20_000) },
        ),
      ]);
      const materials = (await materialsRes.json()) as {
        rows?: WorkOrderMaterialSummaryRow[];
        error?: string;
      };
      const links = (await linksRes.json()) as {
        linkedWorkItemIds?: string[];
        workItems?: Array<{ id: string; title: string }>;
        error?: string;
      };
      if (!materialsRes.ok || materials.error || !linksRes.ok || links.error) {
        setError(tCommon("error"));
        return;
      }
      setRows(materials.rows ?? []);
      setLinkedIds(links.linkedWorkItemIds ?? []);
      setWorkItems(links.workItems ?? []);
      setError(null);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [workOrderId, projectId]);

  function linkItem(workItemId: string) {
    if (!workItemId) return;
    startTransition(async () => {
      await fetch("/api/work-order-work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId, workItemId }),
      });
      setPickId("");
      await reload();
    });
  }

  function unlinkItem(workItemId: string) {
    startTransition(async () => {
      await fetch(
        `/api/work-order-work-items?workOrderId=${encodeURIComponent(workOrderId)}&workItemId=${encodeURIComponent(workItemId)}`,
        { method: "DELETE" },
      );
      await reload();
    });
  }

  const available = workItems.filter((item) => !linkedIds.includes(item.id));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t("title")}</h3>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>

      {linkedIds.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {workItems
            .filter((item) => linkedIds.includes(item.id))
            .map((item) => (
              <li key={item.id}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={disabled || isPending}
                  onClick={() => unlinkItem(item.id)}
                >
                  {item.title} ×
                </Button>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noLinks")}</p>
      )}

      {available.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="border-input bg-background h-9 min-w-[12rem] flex-1 rounded-lg border px-2.5 text-sm"
            disabled={disabled || isPending}
          >
            <option value="">{t("pickWorkItem")}</option>
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={disabled || isPending || !pickId}
            onClick={() => linkItem(pickId)}
          >
            {t("link")}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
          {rows.map((row, index) => (
            <li key={`${row.kind}-${row.workItemId}-${row.title}-${index}`} className="px-3 py-2 text-sm">
              <p className="font-medium">
                {formatQty(row.quantity, row.unit)} · {row.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(`kinds.${row.kind}`)} · {row.workItemTitle}
              </p>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
