"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QuoteListItem } from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";
import type { QuoteStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type QuotesListProps = {
  quotes: QuoteListItem[];
  projectId?: string;
  showProject?: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_FILTERS: Array<QuoteStatus | "all"> = [
  "all",
  "draft",
  "sent",
  "accepted",
  "rejected",
  "cancelled",
];

export function QuotesList({
  quotes,
  projectId,
  showProject = false,
}: QuotesListProps) {
  const t = useTranslations("quotes");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (statusFilter !== "all" && quote.status !== statusFilter) return false;
      if (!q) return true;
      return (
        quote.title.toLowerCase().includes(q) ||
        (quote.quoteNumber?.toLowerCase().includes(q) ?? false) ||
        quote.projectName.toLowerCase().includes(q)
      );
    });
  }, [quotes, query, statusFilter]);

  async function createQuote() {
    if (!projectId) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title: t("defaultTitle") }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as {
        error?: string;
        quoteId?: string;
      };
      if (!response.ok || !result.quoteId) {
        setError(result.error || tCommon("error"));
        return;
      }
      router.push(`/projecten/${projectId}/offertes/${result.quoteId}`);
    } catch {
      setError(tCommon("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {projectId ? (
          <Button
            type="button"
            onClick={() => void createQuote()}
            disabled={pending}
          >
            {pending ? tCommon("loading") : t("newQuote")}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{t("listHint")}</p>
        )}
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-9 max-w-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === status
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {status === "all" ? t("filters.all") : t(`status.${status}`)}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {filtered.length === 0 ? (
        <PageCard className="px-5 py-8 text-sm text-muted-foreground">
          {quotes.length === 0 ? t("empty") : t("emptyFiltered")}
        </PageCard>
      ) : (
        <PageCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[40rem]">
              <thead>
                <tr>
                  <th>{t("columns.number")}</th>
                  <th>{t("columns.title")}</th>
                  {showProject ? (
                    <th>{t("columns.project")}</th>
                  ) : null}
                  <th>{t("columns.status")}</th>
                  <th>{t("columns.updated")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((quote) => (
                  <tr key={quote.id}>
                    <td className="font-mono text-xs tabular-nums text-muted-foreground">
                      {quote.quoteNumber || "—"}
                    </td>
                    <td>
                      <Link
                        href={`/projecten/${quote.projectId}/offertes/${quote.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {quote.title}
                      </Link>
                    </td>
                    {showProject ? (
                      <td className="text-muted-foreground">
                        <Link
                          href={`/projecten/${quote.projectId}`}
                          className="hover:text-primary hover:underline"
                        >
                          {quote.projectName}
                        </Link>
                      </td>
                    ) : null}
                    <td>
                      <Badge
                        variant={
                          quote.status === "draft" ? "success" : "secondary"
                        }
                      >
                        {t(`status.${quote.status}`)}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground">
                      {formatDate(quote.updatedAt)}
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
