"use client";

import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  euroFromCents,
  type ArticleRow,
} from "@/features/materials/lib/materials";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import { formatEuroFromCents } from "@/utils/format";
import { cn } from "@/lib/utils";

type ArticlesWorkspaceProps = {
  articles: ArticleRow[];
};

type ArticleDraft = {
  id?: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  category: string;
  barcode: string;
  trackStock: boolean;
  purchasePrice: string;
  salePrice: string;
  isActive: boolean;
  notes: string;
};

function emptyDraft(): ArticleDraft {
  return {
    code: "",
    name: "",
    description: "",
    unit: "st",
    category: "",
    barcode: "",
    trackStock: true,
    purchasePrice: "",
    salePrice: "",
    isActive: true,
    notes: "",
  };
}

function fromRow(row: ArticleRow): ArticleDraft {
  return {
    id: row.id,
    code: row.code ?? "",
    name: row.name,
    description: row.description ?? "",
    unit: row.unit,
    category: row.category ?? "",
    barcode: row.barcode ?? "",
    trackStock: row.trackStock,
    purchasePrice: euroFromCents(row.purchasePriceCents),
    salePrice: euroFromCents(row.salePriceCents),
    isActive: row.isActive,
    notes: row.notes ?? "",
  };
}

export function ArticlesWorkspace({ articles }: ArticlesWorkspaceProps) {
  const t = useTranslations("materials.articles");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ArticleDraft>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((row) => {
      if (activeOnly && !row.isActive) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        (row.code?.toLowerCase().includes(q) ?? false) ||
        (row.category?.toLowerCase().includes(q) ?? false) ||
        (row.barcode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [articles, query, activeOnly]);

  const activeCount = articles.filter((row) => row.isActive).length;
  const trackedCount = articles.filter((row) => row.trackStock).length;

  function openCreate() {
    setDraft(emptyDraft());
    setError(null);
    setOpen(true);
  }

  function openEdit(row: ArticleRow) {
    setDraft(fromRow(row));
    setError(null);
    setOpen(true);
  }

  function save() {
    if (!draft.name.trim()) {
      setError(t("errors.nameRequired"));
      return;
    }
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/articles", {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: draft.id,
            code: draft.code,
            name: draft.name,
            description: draft.description,
            unit: draft.unit,
            category: draft.category,
            barcode: draft.barcode,
            trackStock: draft.trackStock,
            purchasePrice: draft.purchasePrice,
            salePrice: draft.salePrice,
            isActive: draft.isActive,
            notes: draft.notes,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok || result.error) {
          setError(tCommon("error"));
          return;
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function remove(row: ArticleRow) {
    if (!window.confirm(t("deleteConfirm", { name: row.name }))) return;
    startTransition(async () => {
      try {
        await fetch(`/api/articles?id=${encodeURIComponent(row.id)}`, {
          method: "DELETE",
          signal: AbortSignal.timeout(20_000),
        });
        router.refresh();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <MetaStatCard label={t("kpiTotal")} value={String(articles.length)} />
          <MetaStatCard label={t("kpiActive")} value={String(activeCount)} />
          <MetaStatCard label={t("kpiTracked")} value={String(trackedCount)} />
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          {t("new")}
        </Button>
      </div>

      <PageCard className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            className="h-9 pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(event) => setActiveOnly(event.target.checked)}
          />
          {t("activeOnly")}
        </label>
      </PageCard>

      {filtered.length === 0 ? (
        <PageCard className="px-5 py-8 text-sm text-muted-foreground">
          {t("empty")}
        </PageCard>
      ) : (
        <PageCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3">{t("columns.code")}</th>
                  <th className="px-4 py-3">{t("columns.name")}</th>
                  <th className="px-4 py-3">{t("columns.unit")}</th>
                  <th className="px-4 py-3">{t("columns.category")}</th>
                  <th className="px-4 py-3 text-right">{t("columns.purchase")}</th>
                  <th className="px-4 py-3">{t("columns.status")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/70 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.code || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-medium hover:text-primary"
                        onClick={() => openEdit(row)}
                      >
                        {row.name}
                      </button>
                      {row.trackStock ? null : (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t("notTracked")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.unit}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.category || "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {row.purchasePriceCents != null
                        ? formatEuroFromCents(row.purchasePriceCents)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={row.isActive ? "success" : "secondary"}
                        className={cn(!row.isActive && "opacity-70")}
                      >
                        {row.isActive ? t("active") : t("inactive")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => openEdit(row)}
                      >
                        {t("edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={isPending}
                        onClick={() => remove(row)}
                      >
                        {t("delete")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {draft.id ? t("editTitle") : t("newTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">{t("fields.name")}</span>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.code")}</span>
              <Input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.unit")}</span>
              <Input
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.category")}</span>
              <Input
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.barcode")}</span>
              <Input
                value={draft.barcode}
                onChange={(e) =>
                  setDraft({ ...draft, barcode: e.target.value })
                }
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.purchase")}</span>
              <Input
                inputMode="decimal"
                value={draft.purchasePrice}
                onChange={(e) =>
                  setDraft({ ...draft, purchasePrice: e.target.value })
                }
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.sale")}</span>
              <Input
                inputMode="decimal"
                value={draft.salePrice}
                onChange={(e) =>
                  setDraft({ ...draft, salePrice: e.target.value })
                }
              />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">
                {t("fields.description")}
              </span>
              <textarea
                rows={2}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                className="border-input bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.trackStock}
                onChange={(e) =>
                  setDraft({ ...draft, trackStock: e.target.checked })
                }
              />
              {t("fields.trackStock")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) =>
                  setDraft({ ...draft, isActive: e.target.checked })
                }
              />
              {t("fields.active")}
            </label>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="button" disabled={isPending} onClick={save}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
