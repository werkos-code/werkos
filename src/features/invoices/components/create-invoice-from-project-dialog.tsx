"use client";

import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BillableSourceLine } from "@/features/invoices/lib/invoice-lines";
import { DEFAULT_HOURLY_RATE_CENTS } from "@/features/invoices/lib/invoice-pricing";
import { cn } from "@/lib/utils";

type CreateInvoiceFromProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  defaultTitle?: string;
};

function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function lineTotalCents(line: BillableSourceLine) {
  return Math.round(line.quantity * line.unitPriceCents);
}

export function CreateInvoiceFromProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  defaultTitle,
}: CreateInvoiceFromProjectDialogProps) {
  const t = useTranslations("invoices.fromProject");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [title, setTitle] = useState(defaultTitle ?? "");
  const [hourlyRateEuros, setHourlyRateEuros] = useState(
    String(DEFAULT_HOURLY_RATE_CENTS / 100),
  );
  const [sources, setSources] = useState<BillableSourceLine[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [loadingSources, setLoadingSources] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadSources(rateEuros = hourlyRateEuros) {
    setLoadingSources(true);
    setError(null);
    try {
      const rateCents = Math.round(Number(rateEuros.replace(",", ".")) * 100);
      const params = new URLSearchParams({
        projectId,
        hourlyRateCents: String(
          Number.isFinite(rateCents) ? rateCents : DEFAULT_HOURLY_RATE_CENTS,
        ),
      });
      const res = await fetch(`/api/invoices/from-project?${params.toString()}`, {
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await res.json()) as {
        error?: string;
        sources?: BillableSourceLine[];
      };
      if (!res.ok || result.error) {
        setError(result.error || tCommon("error"));
        setSources([]);
        setSelectedKeys(new Set());
        return;
      }
      const next = result.sources ?? [];
      setSources(next);
      setSelectedKeys(new Set(next.map((line) => line.key)));
    } catch {
      setError(tCommon("error"));
      setSources([]);
      setSelectedKeys(new Set());
    } finally {
      setLoadingSources(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle ?? `Factuur — ${projectName}`);
    void loadSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when dialog opens
  }, [open, projectId, projectName, defaultTitle]);

  const selectedTotal = useMemo(
    () =>
      sources
        .filter((line) => selectedKeys.has(line.key))
        .reduce((sum, line) => sum + lineTotalCents(line), 0),
    [sources, selectedKeys],
  );

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(source: BillableSourceLine["source"]) {
    const keys = sources
      .filter((line) => line.source === source)
      .map((line) => line.key);
    const allSelected = keys.every((key) => selectedKeys.has(key));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (allSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  function submit() {
    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }
    if (selectedKeys.size === 0) {
      setError(t("noLinesSelected"));
      return;
    }
    setError(null);
    const rateCents = Math.round(
      Number(hourlyRateEuros.replace(",", ".")) * 100,
    );
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/invoices/from-project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              title: title.trim(),
              hourlyRateCents: Number.isFinite(rateCents)
                ? rateCents
                : DEFAULT_HOURLY_RATE_CENTS,
              selectedKeys: [...selectedKeys],
            }),
            signal: AbortSignal.timeout(30_000),
          });
          const result = (await res.json()) as {
            error?: string;
            invoiceId?: string;
          };
          if (!res.ok || !result.invoiceId) {
            setError(result.error || tCommon("error"));
            return;
          }
          onOpenChange(false);
          router.push(`/facturen/${result.invoiceId}`);
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  const groups: Array<{
    source: BillableSourceLine["source"];
    label: string;
  }> = [
    { source: "hours", label: t("groups.hours") },
    { source: "material", label: t("groups.material") },
    { source: "work_item", label: t("groups.workItems") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-title">{t("invoiceTitle")}</Label>
              <Input
                id="invoice-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hourly-rate">{t("hourlyRate")}</Label>
              <div className="flex gap-2">
                <Input
                  id="hourly-rate"
                  inputMode="decimal"
                  value={hourlyRateEuros}
                  onChange={(e) => setHourlyRateEuros(e.target.value)}
                  disabled={isPending || loadingSources}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || loadingSources}
                  onClick={() => void loadSources()}
                >
                  {t("reload")}
                </Button>
              </div>
            </div>
          </div>

          {loadingSources ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </div>
          ) : sources.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const items = sources.filter(
                  (line) => line.source === group.source,
                );
                if (items.length === 0) return null;
                const allSelected = items.every((line) =>
                  selectedKeys.has(line.key),
                );
                return (
                  <div key={group.source} className="rounded-xl border border-border">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2 text-left text-sm font-medium"
                      onClick={() => toggleGroup(group.source)}
                    >
                      <span>{group.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {allSelected ? t("deselectAll") : t("selectAll")}
                      </span>
                    </button>
                    <ul className="divide-y divide-border">
                      {items.map((line) => {
                        const checked = selectedKeys.has(line.key);
                        return (
                          <li key={line.key}>
                            <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/20">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={() => toggleKey(line.key)}
                                disabled={isPending}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">
                                  {line.title}
                                </span>
                                <span className="text-muted-foreground block text-xs">
                                  {line.quantity} {line.unit} ×{" "}
                                  {formatEuro(line.unitPriceCents)}
                                  {line.description
                                    ? ` · ${line.description}`
                                    : null}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 text-sm tabular-nums",
                                  !checked && "text-muted-foreground",
                                )}
                              >
                                {formatEuro(lineTotalCents(line))}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <div className="mr-auto text-sm text-muted-foreground">
            {t("selectedTotal")}:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatEuro(selectedTotal)}
            </span>
            <span className="ml-1 text-xs">({t("exclVat")})</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={isPending || loadingSources || selectedKeys.size === 0}
          >
            {isPending ? tCommon("loading") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
