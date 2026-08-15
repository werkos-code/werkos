"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  DashboardSurface,
  DashboardSurfaceHeader,
} from "@/features/dashboard/components/dashboard-surface";
import { saveUserNote } from "@/features/dashboard/dashboard-actions";
import { cn } from "@/lib/utils";

export function DashboardNotesCard({ initialBody }: { initialBody: string }) {
  const t = useTranslations("dashboard.private.notes");
  const tCommon = useTranslations("common");
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBody = useRef(body);
  latestBody.current = body;

  useEffect(() => {
    setBody(initialBody);
  }, [initialBody]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function scheduleSave(next: string) {
    setBody(next);
    setStatus("idle");
    setError(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatus("saving");
      startTransition(() => {
        void (async () => {
          const result = await saveUserNote(latestBody.current);
          if (result.error) {
            setStatus("error");
            setError(
              result.error === "notes_unavailable"
                ? t("unavailable")
                : tCommon("error"),
            );
            return;
          }
          setStatus("saved");
        })();
      });
    }, 600);
  }

  return (
    <DashboardSurface className="flex min-h-72 flex-col">
      <DashboardSurfaceHeader
        title={t("title")}
        action={
          <span className="text-[11px] text-muted-foreground">
            {status === "saving" || isPending
              ? t("saving")
              : status === "saved"
                ? t("saved")
                : status === "error"
                  ? error
                  : null}
          </span>
        }
      />
      <div className="flex flex-1 flex-col px-5 pb-5">
        <textarea
          value={body}
          onChange={(event) => scheduleSave(event.target.value)}
          placeholder={t("placeholder")}
          className={cn(
            "min-h-44 w-full flex-1 resize-none rounded-xl border-0 bg-muted/30 px-3 py-2.5 text-sm outline-none",
            "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
        />
      </div>
    </DashboardSurface>
  );
}
