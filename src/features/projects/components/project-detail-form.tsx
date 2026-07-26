"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROJECT_STATUSES } from "@/features/projects/lib/project-status";
import type { ProjectRow } from "@/features/projects/projects-actions";

type ProjectDetailFormProps = {
  project: ProjectRow;
  customers: Array<{ id: string; name: string }>;
};

export function ProjectDetailForm({
  project,
  customers,
}: ProjectDetailFormProps) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        startTransition(() => {
          void (async () => {
            try {
              const response = await fetch("/api/projects", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: project.id,
                  name: String(form.get("name") ?? ""),
                  customerId: String(form.get("customerId") ?? ""),
                  status: String(form.get("status") ?? ""),
                  notes: String(form.get("notes") ?? "") || undefined,
                }),
                signal: AbortSignal.timeout(20_000),
              });
              const result = (await response.json()) as { error?: string };
              if (!response.ok || result.error) {
                setError(
                  result.error === "name_required"
                    ? t("nameRequired")
                    : result.error || tCommon("error"),
                );
                return;
              }
              router.refresh();
            } catch {
              setError(tCommon("error"));
            }
          })();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="name">{t("fields.name")}</Label>
        <Input id="name" name="name" required defaultValue={project.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerId">{t("fields.customer")}</Label>
        <select
          id="customerId"
          name="customerId"
          required
          defaultValue={project.customerId}
          className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
        >
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">{t("fields.status")}</Label>
        <select
          id="status"
          name="status"
          defaultValue={project.status}
          className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
        >
          {PROJECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">{t("fields.notes")}</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={project.notes ?? ""}
          className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? tCommon("loading") : t("save")}
      </Button>
    </form>
  );
}
