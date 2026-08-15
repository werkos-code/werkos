"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  InvoiceDocument,
  type InvoiceDocumentTotals,
} from "@/features/invoices/components/invoice-document";
import type { InvoiceDetail } from "@/features/invoices/invoices-actions";
import {
  downloadElementAsPdf,
  invoicePdfFilename,
} from "@/features/invoices/lib/download-invoice-pdf";
import type { InvoiceLineRow } from "@/features/invoices/lib/invoice-lines";

type InvoicePdfDownloadButtonProps = {
  invoice: InvoiceDetail;
  title: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  lines: InvoiceLineRow[];
  totals: InvoiceDocumentTotals;
  /** When set, capture this existing preview DOM instead of mounting an offscreen clone. */
  sourceRef?: RefObject<HTMLElement | null>;
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "destructive"
    | "link";
  labelKey?: "editor" | "preview";
};

export function InvoicePdfDownloadButton({
  invoice,
  title,
  issueDate,
  dueDate,
  notes,
  lines,
  totals,
  sourceRef,
  size = "sm",
  variant = "outline",
  labelKey = "editor",
}: InvoicePdfDownloadButtonProps) {
  const tEditor = useTranslations("invoices.editor");
  const tPreview = useTranslations("invoices.preview");
  const captureRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!pending) return;

    let cancelled = false;

    void (async () => {
      try {
        // Let the offscreen preview paint before capturing.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        if (cancelled) return;

        let target = sourceRef?.current ?? captureRef.current;
        if (!target) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          target = sourceRef?.current ?? captureRef.current;
        }
        if (!target) {
          throw new Error("missing_target");
        }
        if (cancelled) return;

        await downloadElementAsPdf(
          target,
          invoicePdfFilename(invoice.invoiceNumber),
        );
      } catch {
        if (!cancelled) {
          toast.error(
            labelKey === "preview"
              ? tPreview("downloadError")
              : tEditor("errors.downloadFailed"),
          );
        }
      } finally {
        if (!cancelled) setPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    pending,
    sourceRef,
    invoice.invoiceNumber,
    labelKey,
    tEditor,
    tPreview,
  ]);

  const label =
    labelKey === "preview" ? tPreview("download") : tEditor("actions.download");

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => setPending(true)}
      >
        <Download className="size-3.5" />
        {pending ? tEditor("actions.downloading") : label}
      </Button>
      {!sourceRef && pending ? (
        <div
          ref={captureRef}
          aria-hidden
          className="pointer-events-none fixed top-0 left-[-10000px] z-[-1] w-[210mm] bg-white"
        >
          <InvoiceDocument
            mode="preview"
            invoice={invoice}
            title={title}
            issueDate={issueDate}
            dueDate={dueDate}
            notes={notes}
            lines={lines}
            totals={totals}
            className="shadow-none"
          />
        </div>
      ) : null}
    </>
  );
}
