"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROJECT_STATUSES } from "@/features/projects/lib/project-status";
import type {
  ProjectRow,
  StaffOption,
} from "@/features/projects/projects-actions";

type ProjectDetailFormProps = {
  project: ProjectRow;
  customers: Array<{ id: string; name: string }>;
  staff: StaffOption[];
  onCancel?: () => void;
  onSaved?: () => void;
};

export function ProjectDetailForm({
  project,
  customers,
  staff,
  onCancel,
  onSaved,
}: ProjectDetailFormProps) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        const startDate = String(form.get("startDate") ?? "") || null;
        const endDate = String(form.get("endDate") ?? "") || null;
        if (startDate && endDate && endDate < startDate) {
          setError(t("detail.dateRangeInvalid"));
          return;
        }
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
                  notes: String(form.get("notes") ?? "") || null,
                  startDate,
                  endDate,
                  leadUserId: String(form.get("leadUserId") ?? "") || null,
                  contactName: String(form.get("contactName") ?? "") || null,
                  contactEmail: String(form.get("contactEmail") ?? "") || null,
                  contactPhone: String(form.get("contactPhone") ?? "") || null,
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
              onSaved?.();
              router.refresh();
            } catch {
              setError(tCommon("error"));
            }
          })();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">{t("fields.name")}</Label>
          <Input id="name" name="name" required defaultValue={project.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectNumber">{t("fields.projectNumber")}</Label>
          <Input
            id="projectNumber"
            value={project.projectNumber}
            disabled
            readOnly
          />
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
        <div className="space-y-2 sm:col-span-2">
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
          <Label htmlFor="startDate">{t("fields.startDate")}</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={project.startDate ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">{t("fields.endDate")}</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={project.endDate ?? ""}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="leadUserId">{t("fields.leader")}</Label>
          <select
            id="leadUserId"
            name="leadUserId"
            defaultValue={project.leadUserId ?? ""}
            className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
          >
            <option value="">{t("fields.leaderNone")}</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactName">{t("fields.contactName")}</Label>
          <Input
            id="contactName"
            name="contactName"
            defaultValue={project.contactName ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">{t("fields.contactPhone")}</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            defaultValue={project.contactPhone ?? ""}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="contactEmail">{t("fields.contactEmail")}</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={project.contactEmail ?? ""}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">{t("fields.notes")}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={project.notes ?? ""}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? tCommon("loading") : t("save")}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={onCancel}
          >
            {tCommon("cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
