"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { QuoteListItem } from "@/features/quotes/quotes-actions";

type QuotesListProps = {
  quotes: QuoteListItem[];
  projectId?: string;
  showProject?: boolean;
};

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
      router.push(`/werk/projecten/${projectId}/offertes/${result.quoteId}`);
    } catch {
      setError(tCommon("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {projectId ? (
        <Button type="button" onClick={() => void createQuote()} disabled={pending}>
          {pending ? tCommon("loading") : t("newQuote")}
        </Button>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-0 py-3 pr-4 font-medium">{t("columns.title")}</th>
                {showProject ? (
                  <th className="px-0 py-3 pr-4 font-medium">
                    {t("columns.project")}
                  </th>
                ) : null}
                <th className="px-0 py-3 font-medium">{t("columns.status")}</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/werk/projecten/${quote.projectId}/offertes/${quote.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {quote.title}
                    </Link>
                  </td>
                  {showProject ? (
                    <td className="py-3 pr-4 text-muted-foreground">
                      <Link
                        href={`/werk/projecten/${quote.projectId}`}
                        className="hover:underline"
                      >
                        {quote.projectName}
                      </Link>
                    </td>
                  ) : null}
                  <td className="py-3 text-muted-foreground">
                    {t(`status.${quote.status}`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
