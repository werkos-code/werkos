"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import type { SubcontractorRow } from "@/features/subcontractors/subcontractors-actions";
import { Link, useRouter } from "@/i18n/navigation";

type SubcontractorsWorkspaceProps = {
  subcontractors: SubcontractorRow[];
};

export function SubcontractorsWorkspace({
  subcontractors,
}: SubcontractorsWorkspaceProps) {
  const t = useTranslations("subcontractors");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subcontractors;
    return subcontractors.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.email?.toLowerCase().includes(q) ?? false) ||
        (row.phone?.toLowerCase().includes(q) ?? false) ||
        (row.kvkNumber?.toLowerCase().includes(q) ?? false),
    );
  }, [subcontractors, query]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetaStatCard
          label={t("kpiTotal")}
          value={String(subcontractors.length)}
        />
        <MetaStatCard
          label={t("kpiWithEmail")}
          value={String(subcontractors.filter((s) => s.email).length)}
        />
        <MetaStatCard
          label={t("kpiWithPhone")}
          value={String(subcontractors.filter((s) => s.phone).length)}
        />
      </div>

      <div>
        <Button asChild>
          <Link href="/onderaannemers/nieuw">{t("newSubcontractor")}</Link>
        </Button>
      </div>

      <PageCard className="p-3">
        <div className="relative min-w-[14rem] max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-8"
          />
        </div>
      </PageCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {filtered.length === 0 ? (
        <PageCard className="px-5 py-8 text-sm text-muted-foreground">
          {subcontractors.length === 0 ? t("empty") : t("emptyFiltered")}
        </PageCard>
      ) : (
        <PageCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[36rem]">
              <thead>
                <tr>
                  <th>{t("columns.name")}</th>
                  <th>{t("columns.email")}</th>
                  <th>{t("columns.phone")}</th>
                  <th>{t("columns.kvk")}</th>
                  <th>{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="align-top"
                  >
                    <td>
                      <Link
                        href={`/onderaannemers/${row.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="text-muted-foreground">
                      {row.email || "—"}
                    </td>
                    <td className="text-muted-foreground">
                      {row.phone || "—"}
                    </td>
                    <td className="text-muted-foreground">
                      {row.kvkNumber || "—"}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <Link href={`/onderaannemers/${row.id}`}>
                            {t("open")}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={isPending && pendingId === row.id}
                          onClick={() => {
                            if (
                              !window.confirm(
                                t("deleteConfirm", { name: row.name }),
                              )
                            ) {
                              return;
                            }
                            setError(null);
                            setPendingId(row.id);
                            startTransition(() => {
                              void (async () => {
                                try {
                                  const response = await fetch(
                                    `/api/subcontractors?id=${encodeURIComponent(row.id)}`,
                                    {
                                      method: "DELETE",
                                      signal: AbortSignal.timeout(20_000),
                                    },
                                  );
                                  const result = (await response.json()) as {
                                    error?: string;
                                  };
                                  if (!response.ok || result.error) {
                                    setError(result.error || tCommon("error"));
                                    return;
                                  }
                                  router.refresh();
                                } catch {
                                  setError(tCommon("error"));
                                } finally {
                                  setPendingId(null);
                                }
                              })();
                            });
                          }}
                        >
                          {t("delete")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}
    </div>
  );
}
