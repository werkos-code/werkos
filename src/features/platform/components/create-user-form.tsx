"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USER_ROLES, type UserRole } from "@/config/roles";
import {
  createPlatformUser,
  type PlatformOrganizationOption,
} from "@/features/platform/users-actions";

type CreateUserFormProps = {
  organizations: PlatformOrganizationOption[];
};

const ROLE_OPTIONS: UserRole[] = [
  USER_ROLES.OWNER,
  USER_ROLES.OFFICE_EMPLOYEE,
  USER_ROLES.FIELD_EMPLOYEE,
  USER_ROLES.CUSTOMER,
  USER_ROLES.SUPER_ADMIN,
];

export function CreateUserForm({ organizations }: CreateUserFormProps) {
  const t = useTranslations("platform.users");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(USER_ROLES.OFFICE_EMPLOYEE);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const needsExistingOrg =
    role === USER_ROLES.OFFICE_EMPLOYEE ||
    role === USER_ROLES.FIELD_EMPLOYEE ||
    role === USER_ROLES.CUSTOMER;
  const needsNewOrg = role === USER_ROLES.OWNER;

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setPending(true);

        void (async () => {
          const result = await createPlatformUser({
            fullName: String(form.get("fullName") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            role,
            organizationId: String(form.get("organizationId") ?? "") || undefined,
            organizationName:
              String(form.get("organizationName") ?? "") || undefined,
          });

          if (result.error) {
            setError(
              result.error === "invalid_input"
                ? t("invalidInput")
                : result.error === "organization_required"
                  ? t("organizationRequired")
                  : result.error === "organization_name_required"
                    ? t("organizationNameRequired")
                    : result.error,
            );
            setPending(false);
            return;
          }

          event.currentTarget.reset();
          setRole(USER_ROLES.OFFICE_EMPLOYEE);
          setPending(false);
          router.refresh();
        })();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="fullName">{t("fullName")}</Label>
        <Input id="fullName" name="fullName" required autoComplete="off" className="border-white/10 bg-slate-950/50 text-slate-100" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          className="border-white/10 bg-slate-950/50 text-slate-100"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="border-white/10 bg-slate-950/50 text-slate-100"
        />
        <p className="text-xs text-slate-500">{t("passwordHint")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">{t("role")}</Label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
          className="border-white/10 bg-slate-950/50 text-slate-100"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`roles.${option}`)}
            </option>
          ))}
        </select>
      </div>

      {needsNewOrg ? (
        <div className="space-y-2">
          <Label htmlFor="organizationName">{t("organizationName")}</Label>
          <Input
            id="organizationName"
            name="organizationName"
            required
            className="border-white/10 bg-slate-950/50 text-slate-100"
          />
          <p className="text-xs text-slate-500">
            {t("organizationNameHint")}
          </p>
        </div>
      ) : null}

      {needsExistingOrg ? (
        <div className="space-y-2">
          <Label htmlFor="organizationId">{t("organization")}</Label>
          <select
            id="organizationId"
            name="organizationId"
            required
            className="border-white/10 bg-slate-950/50 text-slate-100"
            defaultValue=""
          >
            <option value="" disabled>
              {t("organizationPlaceholder")}
            </option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <Button
        type="submit"
        disabled={pending}
        className="w-fit bg-cyan-500 text-slate-950 hover:bg-cyan-400"
      >
        {pending ? tCommon("loading") : t("create")}
      </Button>
    </form>
  );
}
