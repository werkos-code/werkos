"use client";

import { HardHat } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EntityFormField,
  EntityFormSection,
  EntityFormShell,
} from "@/features/shell/components/entity-form-shell";
import type { SubcontractorRow } from "@/features/subcontractors/subcontractors-actions";
import { Link, useRouter } from "@/i18n/navigation";

type SubcontractorFormProps = {
  mode: "create" | "edit";
  initial?: SubcontractorRow;
};

export function SubcontractorForm({ mode, initial }: SubcontractorFormProps) {
  const t = useTranslations("subcontractors");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setPending(true);

        const payload = {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? "") || undefined,
          phone: String(form.get("phone") ?? "") || undefined,
          address: String(form.get("address") ?? "") || undefined,
          kvkNumber: String(form.get("kvkNumber") ?? "") || undefined,
          notes: String(form.get("notes") ?? "") || undefined,
        };

        void (async () => {
          try {
            if (mode === "create") {
              const response = await fetch("/api/subcontractors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(20_000),
              });
              const result = (await response.json()) as {
                error?: string;
                subcontractorId?: string;
              };

              if (!response.ok || result.error || !result.subcontractorId) {
                setError(
                  result.error === "name_required"
                    ? t("nameRequired")
                    : result.error || tCommon("error"),
                );
                return;
              }

              router.replace(`/onderaannemers/${result.subcontractorId}`);
              return;
            }

            if (!initial) return;

            const response = await fetch("/api/subcontractors", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: initial.id, ...payload }),
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
          } finally {
            setPending(false);
          }
        })();
      }}
    >
      <EntityFormShell
        icon={HardHat}
        title={mode === "create" ? t("newTitle") : t("editTitle")}
        description={
          mode === "create" ? t("newDescription") : t("editDescription")
        }
        footer={
          <>
            <Button type="submit" disabled={pending}>
              {pending
                ? tCommon("loading")
                : mode === "create"
                  ? t("create")
                  : t("save")}
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/onderaannemers">{tCommon("cancel")}</Link>
            </Button>
            {error ? (
              <p className="w-full text-sm text-destructive sm:ml-auto sm:w-auto">
                {error}
              </p>
            ) : null}
          </>
        }
      >
        <EntityFormSection title={t("sections.identity")}>
          <EntityFormField>
            <Label htmlFor="name">{t("fields.name")}</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              autoComplete="organization"
              placeholder={t("placeholders.name")}
            />
          </EntityFormField>
        </EntityFormSection>

        <EntityFormSection title={t("sections.contact")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <EntityFormField>
              <Label htmlFor="email">{t("fields.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={initial?.email ?? ""}
                placeholder={t("placeholders.email")}
              />
            </EntityFormField>
            <EntityFormField>
              <Label htmlFor="phone">{t("fields.phone")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={initial?.phone ?? ""}
                placeholder={t("placeholders.phone")}
              />
            </EntityFormField>
            <EntityFormField className="sm:col-span-2">
              <Label htmlFor="address">{t("fields.address")}</Label>
              <Input
                id="address"
                name="address"
                defaultValue={initial?.address ?? ""}
                placeholder={t("placeholders.address")}
              />
            </EntityFormField>
          </div>
        </EntityFormSection>

        <EntityFormSection title={t("sections.business")}>
          <EntityFormField>
            <Label htmlFor="kvkNumber">{t("fields.kvk")}</Label>
            <Input
              id="kvkNumber"
              name="kvkNumber"
              defaultValue={initial?.kvkNumber ?? ""}
              placeholder={t("placeholders.kvk")}
            />
          </EntityFormField>
        </EntityFormSection>

        <EntityFormSection title={t("sections.notes")}>
          <EntityFormField>
            <Label htmlFor="notes">{t("fields.notes")}</Label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={initial?.notes ?? ""}
              placeholder={t("placeholders.notes")}
              className="border-input bg-background w-full rounded-lg border px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </EntityFormField>
        </EntityFormSection>
      </EntityFormShell>
    </form>
  );
}
