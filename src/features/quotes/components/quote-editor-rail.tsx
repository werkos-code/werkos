"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { QuoteBillingTimeline } from "@/features/quotes/components/quote-billing-timeline";
import {
  QuoteTotalsPanel,
  QuoteTotalsPanelFooterButton,
} from "@/features/quotes/components/quote-totals-panel";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { cn } from "@/lib/utils";

type RailSubTab = "summary" | "settings";

type QuoteEditorRailProps = {
  quoteId: string;
  lines: QuoteLineRow[];
  status: string;
  editable: boolean;
  busy: boolean;
  dirty: boolean;
  saveLabel: string;
  validUntil: string;
  onSave: () => void;
  onOpenPlanningEditor: () => void;
  onValidUntilChange?: (value: string) => void;
};

export function QuoteEditorRail({
  quoteId,
  lines,
  status,
  editable,
  busy,
  dirty,
  saveLabel,
  validUntil,
  onSave,
  onOpenPlanningEditor,
  onValidUntilChange,
}: QuoteEditorRailProps) {
  const t = useTranslations("quotes");
  const [subTab, setSubTab] = useState<RailSubTab>("summary");

  const subTabs: { id: RailSubTab; label: string }[] = [
    { id: "summary", label: t("rail.summary") },
    { id: "settings", label: t("rail.settings") },
  ];

  return (
    <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
      <PageCard className="overflow-hidden p-0">
        <div className="flex border-b border-border px-1 pt-1">
          {subTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id)}
              className={cn(
                "flex-1 px-2 py-2 text-xs font-medium transition-colors",
                subTab === item.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {subTab === "summary" ? (
          <div className="space-y-5 p-4">
            <QuoteTotalsPanel
              embedded
              lines={lines}
              showInclVatToggle
              title={t("totalsTitle")}
              footer={
                editable ? (
                  <QuoteTotalsPanelFooterButton
                    disabled={busy || !dirty}
                    onClick={onSave}
                  >
                    {saveLabel}
                  </QuoteTotalsPanelFooterButton>
                ) : undefined
              }
            />

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">
                  {t("rail.paymentTermsTitle")}
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {t("stubs.soon")}
                </span>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {t("stubs.paymentTerm")}
                  </dt>
                  <dd>{t("stubs.paymentTermValue")}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {t("fields.validUntil")}
                  </dt>
                  <dd className="font-mono text-xs tabular-nums">
                    {validUntil || "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="border-t border-border pt-4">
              <QuoteBillingTimeline
                quoteId={quoteId}
                lines={lines}
                editable={editable}
                onOpenEditor={onOpenPlanningEditor}
              />
            </div>

            {status === "draft" ? (
              <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                {t("rail.draftBanner")}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <label
                htmlFor="rail-valid-until"
                className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
              >
                {t("fields.validUntil")}
              </label>
              <input
                id="rail-valid-until"
                type="date"
                disabled={!editable}
                value={validUntil}
                onChange={(e) => onValidUntilChange?.(e.target.value)}
                className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2 opacity-60">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("stubs.paymentTerms")}
              </p>
              <p className="text-sm">{t("stubs.paymentTermsValue")}</p>
              <p className="text-xs text-muted-foreground">{t("stubs.soon")}</p>
            </div>
            {editable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onOpenPlanningEditor}
              >
                {t("financialPlanning.editPlanning")}
              </Button>
            ) : null}
          </div>
        )}
      </PageCard>
    </aside>
  );
}
