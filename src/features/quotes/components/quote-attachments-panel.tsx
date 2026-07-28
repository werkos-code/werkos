"use client";

import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  formatFileSize,
  type QuoteAttachmentRow,
} from "@/features/quotes/lib/quote-attachments";
import { PageCard } from "@/features/shell/components/page-card";
import { cn } from "@/lib/utils";

type QuoteAttachmentsPanelProps = {
  quoteId: string;
  editable: boolean;
};

export function QuoteAttachmentsPanel({
  quoteId,
  editable,
}: QuoteAttachmentsPanelProps) {
  const t = useTranslations("quotes.attachments");
  const tCommon = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<QuoteAttachmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/attachments`, {
        signal: AbortSignal.timeout(20_000),
      });
      const data = (await res.json()) as {
        error?: string;
        attachments?: QuoteAttachmentRow[];
      };
      if (!res.ok || data.error) {
        setError(mapError(data.error, t, tCommon));
        return;
      }
      setAttachments(data.attachments ?? []);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }, [quoteId, t, tCommon]);

  useEffect(() => {
    void load();
  }, [load]);

  function uploadFiles(list: FileList | File[] | null) {
    if (!editable || !list || list.length === 0) return;
    const files = Array.from(list);
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          for (const file of files) {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`/api/quotes/${quoteId}/attachments`, {
              method: "POST",
              body: form,
              signal: AbortSignal.timeout(60_000),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok || data.error) {
              setError(mapError(data.error, t, tCommon));
              return;
            }
          }
          await load();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function downloadAttachment(id: string) {
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/quotes/${quoteId}/attachments/${id}`,
            { signal: AbortSignal.timeout(20_000) },
          );
          const data = (await res.json()) as {
            error?: string;
            url?: string;
            name?: string;
          };
          if (!res.ok || data.error || !data.url) {
            setError(mapError(data.error, t, tCommon));
            return;
          }
          const a = document.createElement("a");
          a.href = data.url;
          a.download = data.name ?? "download";
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.click();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function removeAttachment(id: string) {
    if (!editable) return;
    if (!window.confirm(t("deleteConfirm"))) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/quotes/${quoteId}/attachments/${id}`,
            {
              method: "DELETE",
              signal: AbortSignal.timeout(20_000),
            },
          );
          const data = (await res.json()) as { error?: string };
          if (!res.ok || data.error) {
            setError(mapError(data.error, t, tCommon));
            return;
          }
          await load();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("hint")}</p>
        </div>
        {editable ? (
          <Button type="button" size="sm" disabled={isPending} asChild>
            <label className="cursor-pointer">
              <Upload className="size-3.5" />
              {isPending ? tCommon("loading") : t("upload")}
              <input
                ref={inputRef}
                type="file"
                multiple
                className="sr-only"
                disabled={isPending}
                onChange={(event) => {
                  uploadFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </Button>
        ) : null}
      </div>

      {editable ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/20",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            uploadFiles(event.dataTransfer.files);
          }}
        >
          <Paperclip className="size-6 text-primary/70" />
          <p className="text-sm text-muted-foreground">{t("dropHint")}</p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      ) : attachments.length === 0 ? (
        <PageCard className="px-5 py-8 text-sm text-muted-foreground">
          {t("empty")}
        </PageCard>
      ) : (
        <PageCard className="overflow-hidden">
          <ul className="divide-y divide-border">
            {attachments.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.sizeBytes)}
                    {file.mimeType ? ` · ${file.mimeType}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                    aria-label={t("download")}
                    onClick={() => downloadAttachment(file.id)}
                  >
                    <Download className="size-4" />
                  </Button>
                  {editable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      className="text-destructive"
                      aria-label={t("delete")}
                      onClick={() => removeAttachment(file.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </PageCard>
      )}
    </div>
  );
}

function mapError(
  code: string | undefined,
  t: ReturnType<typeof useTranslations>,
  tCommon: ReturnType<typeof useTranslations>,
) {
  if (code === "file_too_large") return t("tooLarge");
  if (code === "not_editable") return t("notEditable");
  if (code === "file_required") return t("fileRequired");
  return code || tCommon("error");
}
