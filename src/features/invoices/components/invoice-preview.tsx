"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { InvoiceDocument } from "@/features/invoices/components/invoice-document";
import { InvoicePdfDownloadButton } from "@/features/invoices/components/invoice-pdf-download-button";
import type { InvoiceDetail } from "@/features/invoices/invoices-actions";

type InvoicePreviewProps = {
  invoice: InvoiceDetail;
  showToolbar?: boolean;
};

export function InvoicePreview({
  invoice,
  showToolbar = true,
}: InvoicePreviewProps) {
  const t = useTranslations("invoices");
  const documentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      {showToolbar ? (
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("preview.hint")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <InvoicePdfDownloadButton
              invoice={invoice}
              title={invoice.title}
              issueDate={invoice.issueDate}
              dueDate={invoice.dueDate ?? ""}
              notes={invoice.notes ?? ""}
              lines={invoice.lines}
              totals={{
                subtotalCents: invoice.subtotalCents,
                vatCents: invoice.vatCents,
                totalCents: invoice.totalCents,
              }}
              sourceRef={documentRef}
              labelKey="preview"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" />
              {t("preview.print")}
            </Button>
          </div>
        </div>
      ) : null}

      <div ref={documentRef}>
        <InvoiceDocument
          mode="preview"
          invoice={invoice}
          title={invoice.title}
          issueDate={invoice.issueDate}
          dueDate={invoice.dueDate ?? ""}
          notes={invoice.notes ?? ""}
          lines={invoice.lines}
          totals={{
            subtotalCents: invoice.subtotalCents,
            vatCents: invoice.vatCents,
            totalCents: invoice.totalCents,
          }}
        />
      </div>
    </div>
  );
}
