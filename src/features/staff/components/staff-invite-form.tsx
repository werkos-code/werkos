"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USER_ROLES } from "@/config/roles";
import {
  EntityFormField,
  EntityFormSection,
  EntityFormShell,
} from "@/features/shell/components/entity-form-shell";
import {
  STAFF_ASSIGNABLE_ROLES,
  type StaffAssignableRole,
} from "@/features/staff/lib/staff-roles";
import { Link, useRouter } from "@/i18n/navigation";

export function StaffInviteForm() {
  const t = useTranslations("staff");
  const tRoles = useTranslations("platform.users.roles");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [role, setRole] = useState<StaffAssignableRole>(
    USER_ROLES.OFFICE_EMPLOYEE,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setPending(true);

        void (async () => {
          try {
            const response = await fetch("/api/staff", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fullName: String(form.get("fullName") ?? ""),
                email: String(form.get("email") ?? ""),
                password: String(form.get("password") ?? ""),
                role,
              }),
              signal: AbortSignal.timeout(20_000),
            });
            const result = (await response.json()) as {
              error?: string;
              memberId?: string;
            };

            if (!response.ok || result.error || !result.memberId) {
              setError(
                result.error === "invalid_input"
                  ? t("errors.invalidInput")
                  : result.error === "email_taken"
                    ? t("errors.emailTaken")
                    : result.error === "forbidden"
                      ? t("errors.forbidden")
                      : result.error || tCommon("error"),
              );
              return;
            }

            router.replace(`/personeel/${result.memberId}`);
          } catch {
            setError(tCommon("error"));
          } finally {
            setPending(false);
          }
        })();
      }}
    >
      <EntityFormShell
        icon={UserPlus}
        title={t("inviteTitle")}
        description={t("inviteHint")}
        footer={
          <>
            <Button type="submit" disabled={pending}>
              {pending ? tCommon("loading") : t("create")}
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/personeel">{tCommon("cancel")}</Link>
            </Button>
            {error ? (
              <p className="w-full text-sm text-destructive sm:ml-auto sm:w-auto">
                {error}
              </p>
            ) : null}
          </>
        }
      >
        <EntityFormSection title={t("sections.profile")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <EntityFormField className="sm:col-span-2">
              <Label htmlFor="fullName">{t("fields.name")}</Label>
              <Input
                id="fullName"
                name="fullName"
                required
                autoComplete="off"
                placeholder={t("placeholders.name")}
              />
            </EntityFormField>
            <EntityFormField className="sm:col-span-2">
              <Label htmlFor="email">{t("fields.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="off"
                placeholder={t("placeholders.email")}
              />
            </EntityFormField>
          </div>
        </EntityFormSection>

        <EntityFormSection
          title={t("sections.access")}
          description={t("passwordHint")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <EntityFormField>
              <Label htmlFor="password">{t("fields.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={t("placeholders.password")}
              />
            </EntityFormField>
            <EntityFormField>
              <Label htmlFor="role">{t("fields.role")}</Label>
              <select
                id="role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as StaffAssignableRole)
                }
                className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {STAFF_ASSIGNABLE_ROLES.map((option) => (
                  <option key={option} value={option}>
                    {tRoles(option)}
                  </option>
                ))}
              </select>
            </EntityFormField>
          </div>
        </EntityFormSection>
      </EntityFormShell>
    </form>
  );
}
