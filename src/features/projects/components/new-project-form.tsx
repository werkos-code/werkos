"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject } from "@/features/projects/projects-actions";

type NewProjectFormProps = {
  customers: Array<{ id: string; name: string }>;
};

export function NewProjectForm({ customers }: NewProjectFormProps) {
  const t = useTranslations("projects");
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

        void (async () => {
          try {
            const result = await createProject({
              name: String(form.get("name") ?? ""),
              customerId: String(form.get("customerId") ?? ""),
              notes: String(form.get("notes") ?? "") || undefined,
            });

            if (result.error || !result.projectId) {
              setError(
                result.error === "name_required"
                  ? t("nameRequired")
                  : result.error === "customer_required" ||
                      result.error === "customer_not_found"
                    ? t("customerRequired")
                    : result.error || tCommon("error"),
              );
              return;
            }

            router.replace(`/werk/projecten/${result.projectId}`);
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
        <Input id="name" name="name" required autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerId">{t("fields.customer")}</Label>
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noCustomers")}{" "}
            <Link
              href="/bedrijf/klanten/nieuw"
              className="text-foreground underline"
            >
              {t("createCustomerFirst")}
            </Link>
          </p>
        ) : (
          <select
            id="customerId"
            name="customerId"
            required
            defaultValue=""
            className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
          >
            <option value="" disabled>
              {t("customerPlaceholder")}
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        )}
        {customers.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            <Link href="/bedrijf/klanten/nieuw" className="underline">
              {t("createCustomerFirst")}
            </Link>
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t("fields.notes")}</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || customers.length === 0}>
          {pending ? tCommon("loading") : t("create")}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/werk/projecten">{tCommon("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
