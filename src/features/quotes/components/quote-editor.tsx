"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isQuoteEditable,
  lineNetCents,
  lineVatCents,
} from "@/features/quotes/lib/quote-status";
import type { QuoteDetail, QuoteLineRow } from "@/features/quotes/quotes-actions";

type QuoteEditorProps = {
  quote: QuoteDetail;
};

function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function QuoteEditor({ quote }: QuoteEditorProps) {
  const t = useTranslations("quotes");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const editable = isQuoteEditable(quote.status);
  const [title, setTitle] = useState(quote.title);
  const [internalNotes, setInternalNotes] = useState(quote.internalNotes ?? "");
  const [externalNotes, setExternalNotes] = useState(quote.externalNotes ?? "");
  const [validUntil, setValidUntil] = useState(quote.validUntil ?? "");
  const [lines, setLines] = useState(quote.lines);
  const linesRef = useRef(lines);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [setExecution, setSetExecution] = useState(true);

  useEffect(() => {
    setTitle(quote.title);
    setInternalNotes(quote.internalNotes ?? "");
    setExternalNotes(quote.externalNotes ?? "");
    setValidUntil(quote.validUntil ?? "");
    setLines(quote.lines);
  }, [quote]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const leafLines = useMemo(() => {
    const parentIds = new Set(
      lines.map((l) => l.parentId).filter(Boolean) as string[],
    );
    return lines.filter((l) => !parentIds.has(l.id));
  }, [lines]);

  const totals = useMemo(() => {
    let net = 0;
    let vat = 0;
    for (const line of leafLines) {
      const lineNet = lineNetCents({
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountCents: line.discountCents,
      });
      net += lineNet;
      vat += lineVatCents(lineNet, line.vatRateBps);
    }
    return { net, vat, gross: net + vat };
  }, [leafLines]);

  async function saveMeta() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: quote.id,
          title,
          internalNotes,
          externalNotes,
          validUntil: validUntil || null,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(result.error || tCommon("error"));
        return;
      }
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPending(false);
    }
  }

  async function setStatus(status: "sent" | "rejected" | "cancelled") {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quote.id, status }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(result.error || tCommon("error"));
        return;
      }
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPending(false);
    }
  }

  async function addLine(parentId: string | null) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, title: t("newLineTitle") }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as {
        error?: string;
        lineId?: string;
      };
      if (!response.ok || !result.lineId) {
        setError(result.error || tCommon("error"));
        return;
      }
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPending(false);
    }
  }

  async function saveLine(lineId: string) {
    const line = linesRef.current.find((item) => item.id === lineId);
    if (!line) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: line.id,
          title: line.title,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPriceCents: line.unitPriceCents,
          vatRateBps: line.vatRateBps,
          discountCents: line.discountCents,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(result.error || tCommon("error"));
        return;
      }
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPending(false);
    }
  }

  async function deleteLine(lineId: string) {
    if (!window.confirm(t("deleteLineConfirm"))) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/quotes/${quote.id}/lines?id=${encodeURIComponent(lineId)}`,
        { method: "DELETE", signal: AbortSignal.timeout(20_000) },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(result.error || tCommon("error"));
        return;
      }
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPending(false);
    }
  }

  async function acceptQuote() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineIds: selectedLineIds,
          setProjectExecution: setExecution,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(result.error || tCommon("error"));
        return;
      }
      setAcceptOpen(false);
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPending(false);
    }
  }

  function openAccept() {
    setSelectedLineIds(leafLines.map((l) => l.id));
    setAcceptOpen(true);
  }

  function updateLocalLine(id: string, patch: Partial<QuoteLineRow>) {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  const roots = lines.filter((l) => !l.parentId);
  const childrenOf = (parentId: string) =>
    lines.filter((l) => l.parentId === parentId);

  function renderLine(line: QuoteLineRow, depth: number) {
    const net = lineNetCents({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
    });

    return (
      <div key={line.id} className="space-y-2 border-b border-border/60 py-4">
        <div style={{ paddingLeft: depth * 16 }} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("fields.lineTitle")}</Label>
              <Input
                value={line.title}
                disabled={!editable}
                onChange={(e) =>
                  updateLocalLine(line.id, { title: e.target.value })
                }
                onBlur={() => {
                  if (editable) void saveLine(line.id);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("fields.unit")}</Label>
              <Input
                value={line.unit ?? ""}
                disabled={!editable}
                onChange={(e) =>
                  updateLocalLine(line.id, { unit: e.target.value })
                }
                onBlur={() => {
                  if (editable) void saveLine(line.id);
                }}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>{t("fields.quantity")}</Label>
              <Input
                type="number"
                step="0.001"
                value={line.quantity ?? ""}
                disabled={!editable}
                onChange={(e) =>
                  updateLocalLine(line.id, {
                    quantity:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                onBlur={() => {
                  if (editable) void saveLine(line.id);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("fields.unitPrice")}</Label>
              <Input
                type="number"
                step="0.01"
                value={
                  line.unitPriceCents === null
                    ? ""
                    : (line.unitPriceCents / 100).toFixed(2)
                }
                disabled={!editable}
                onChange={(e) =>
                  updateLocalLine(line.id, {
                    unitPriceCents:
                      e.target.value === ""
                        ? null
                        : Math.round(Number(e.target.value) * 100),
                  })
                }
                onBlur={() => {
                  if (editable) void saveLine(line.id);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("fields.discount")}</Label>
              <Input
                type="number"
                step="0.01"
                value={(line.discountCents / 100).toFixed(2)}
                disabled={!editable}
                onChange={(e) =>
                  updateLocalLine(line.id, {
                    discountCents: Math.round(Number(e.target.value || 0) * 100),
                  })
                }
                onBlur={() => {
                  if (editable) void saveLine(line.id);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("fields.lineTotal")}</Label>
              <p className="flex h-9 items-center text-sm text-muted-foreground">
                {formatEuro(net)}
              </p>
            </div>
          </div>
          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => void addLine(line.id)}
              >
                {t("addChildLine")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                onClick={() => void deleteLine(line.id)}
              >
                {t("deleteLine")}
              </Button>
            </div>
          ) : null}
        </div>
        {childrenOf(line.id).map((child) => renderLine(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium">
          {t(`status.${quote.status}`)}
        </span>
        {editable ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void setStatus("sent")}
          >
            {t("actions.send")}
          </Button>
        ) : null}
        {quote.status === "sent" || quote.status === "draft" ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={openAccept}
          >
            {t("actions.accept")}
          </Button>
        ) : null}
        {quote.status === "sent" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => void setStatus("rejected")}
          >
            {t("actions.reject")}
          </Button>
        ) : null}
        {editable || quote.status === "sent" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => void setStatus("cancelled")}
          >
            {t("actions.cancel")}
          </Button>
        ) : null}
      </div>

      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">{t("fields.title")}</Label>
          <Input
            id="title"
            value={title}
            disabled={!editable}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validUntil">{t("fields.validUntil")}</Label>
          <Input
            id="validUntil"
            type="date"
            value={validUntil}
            disabled={!editable}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="externalNotes">{t("fields.externalNotes")}</Label>
          <textarea
            id="externalNotes"
            rows={2}
            value={externalNotes}
            disabled={!editable}
            onChange={(e) => setExternalNotes(e.target.value)}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="internalNotes">{t("fields.internalNotes")}</Label>
          <textarea
            id="internalNotes"
            rows={2}
            value={internalNotes}
            disabled={!editable}
            onChange={(e) => setInternalNotes(e.target.value)}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        {editable ? (
          <Button type="button" disabled={pending} onClick={() => void saveMeta()}>
            {pending ? tCommon("loading") : t("saveMeta")}
          </Button>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">{t("linesTitle")}</h2>
          {editable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void addLine(null)}
            >
              {t("addLine")}
            </Button>
          ) : null}
        </div>
        {roots.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noLines")}</p>
        ) : (
          roots.map((line) => renderLine(line, 0))
        )}
        <div className="space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("totals.net")}</span>
            <span>{formatEuro(totals.net)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("totals.vat")}</span>
            <span>{formatEuro(totals.vat)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>{t("totals.gross")}</span>
            <span>{formatEuro(totals.gross)}</span>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {acceptOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-background p-5 shadow-lg">
            <h3 className="text-base font-medium">{t("acceptTitle")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("acceptDescription")}
            </p>
            <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
              {leafLines.map((line) => (
                <li key={line.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedLineIds.includes(line.id)}
                    onChange={(e) => {
                      setSelectedLineIds((prev) =>
                        e.target.checked
                          ? [...prev, line.id]
                          : prev.filter((id) => id !== line.id),
                      );
                    }}
                  />
                  <span>{line.title || t("untitledLine")}</span>
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={setExecution}
                onChange={(e) => setSetExecution(e.target.checked)}
              />
              {t("setProjectExecution")}
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={pending}
                onClick={() => void acceptQuote()}
              >
                {pending ? tCommon("loading") : t("confirmAccept")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAcceptOpen(false)}
              >
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
