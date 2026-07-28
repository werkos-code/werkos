"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { SubcontractorRow } from "@/features/subcontractors/subcontractors-actions";
import { PageCard } from "@/features/shell/components/page-card";

type SubcontractorsTableProps = {
  subcontractors: SubcontractorRow[];
};

export function SubcontractorsTable({
  subcontractors,
}: SubcontractorsTableProps) {
  const t = useTranslations("subcontractors");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (subcontractors.length === 0) {
    return (
      <PageCard className="px-5 py-8 text-sm text-muted-foreground">
        {t("empty")}
      </PageCard>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <PageCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("columns.name")}</th>
                <th className="px-4 py-3 font-medium">{t("columns.email")}</th>
                <th className="px-4 py-3 font-medium">{t("columns.phone")}</th>
                <th className="px-4 py-3 font-medium">{t("columns.kvk")}</th>
                <th className="px-4 py-3 font-medium">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {subcontractors.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/70 align-top last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/onderaannemers/${row.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.kvkNumber || "—"}
                  </td>
                  <td className="px-4 py-3">
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
    </div>
  );
}
