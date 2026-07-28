"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STAFF_ASSIGNABLE_ROLES,
  type StaffAssignableRole,
} from "@/features/staff/lib/staff-roles";
import { USER_ROLES } from "@/config/roles";

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
      className="flex max-w-lg flex-col gap-4"
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
      <div className="space-y-2">
        <Label htmlFor="fullName">{t("fields.name")}</Label>
        <Input id="fullName" name="fullName" required autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("fields.email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("fields.password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">{t("fields.role")}</Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as StaffAssignableRole)}
          className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
        >
          {STAFF_ASSIGNABLE_ROLES.map((option) => (
            <option key={option} value={option}>
              {tRoles(option)}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("loading") : t("create")}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/personeel">{tCommon("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
