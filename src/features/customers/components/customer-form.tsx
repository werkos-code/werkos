"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerRow } from "@/features/customers/customers-actions";

type CustomerFormProps = {
  mode: "create" | "edit";
  initial?: CustomerRow;
};

export function CustomerForm({ mode, initial }: CustomerFormProps) {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
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
          notes: String(form.get("notes") ?? "") || undefined,
        };

        void (async () => {
          try {
            if (mode === "create") {
              const response = await fetch("/api/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(20_000),
              });
              const result = (await response.json()) as {
                error?: string;
                customerId?: string;
              };

              if (!response.ok || result.error || !result.customerId) {
                setError(
                  result.error === "name_required"
                    ? t("nameRequired")
                    : result.error || tCommon("error"),
                );
                return;
              }

              router.replace(`/klanten/${result.customerId}`);
              return;
            }

            if (!initial) return;

            const response = await fetch("/api/customers", {
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
      <div className="space-y-2">
        <Label htmlFor="name">{t("fields.name")}</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          autoComplete="organization"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("fields.email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={initial?.email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{t("fields.phone")}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initial?.phone ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">{t("fields.address")}</Label>
        <Input
          id="address"
          name="address"
          defaultValue={initial?.address ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">{t("fields.notes")}</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
          className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? tCommon("loading")
            : mode === "create"
              ? t("create")
              : t("save")}
        </Button>
        {mode === "create" ? (
          <Button type="button" variant="ghost" asChild>
            <Link href="/klanten">{tCommon("cancel")}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
