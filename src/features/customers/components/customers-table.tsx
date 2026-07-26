"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { CustomerRow } from "@/features/customers/customers-actions";

type CustomersTableProps = {
  customers: CustomerRow[];
};

export function CustomersTable({ customers }: CustomersTableProps) {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (customers.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-0 py-3 pr-4 font-medium">{t("columns.name")}</th>
              <th className="px-0 py-3 pr-4 font-medium">{t("columns.email")}</th>
              <th className="px-0 py-3 pr-4 font-medium">{t("columns.phone")}</th>
              <th className="px-0 py-3 pr-4 font-medium">
                {t("columns.projects")}
              </th>
              <th className="px-0 py-3 font-medium">{t("columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-border/70 align-top last:border-0"
              >
                <td className="py-3 pr-4">
                  <Link
                    href={`/bedrijf/klanten/${customer.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {customer.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {customer.email || "—"}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {customer.phone || "—"}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {customer.projectCount}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" variant="ghost" size="sm" asChild>
                      <Link href={`/bedrijf/klanten/${customer.id}`}>
                        {t("open")}
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={isPending && pendingId === customer.id}
                      onClick={() => {
                        if (
                          !window.confirm(
                            t("deleteConfirm", { name: customer.name }),
                          )
                        ) {
                          return;
                        }
                        setError(null);
                        setPendingId(customer.id);
                        startTransition(() => {
                          void (async () => {
                            try {
                              const response = await fetch(
                                `/api/customers?id=${encodeURIComponent(customer.id)}`,
                                {
                                  method: "DELETE",
                                  signal: AbortSignal.timeout(20_000),
                                },
                              );
                              const result = (await response.json()) as {
                                error?: string;
                              };
                              if (!response.ok || result.error) {
                                setError(
                                  result.error === "has_projects"
                                    ? t("hasProjects")
                                    : result.error || tCommon("error"),
                                );
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
    </div>
  );
}
