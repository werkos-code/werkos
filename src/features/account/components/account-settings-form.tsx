"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateAccountName,
  updateAccountPassword,
  type AccountProfile,
} from "@/features/account/account-actions";
import { PageCard } from "@/features/shell/components/page-card";

type AccountSettingsFormProps = {
  initial: AccountProfile;
};

export function AccountSettingsForm({ initial }: AccountSettingsFormProps) {
  const t = useTranslations("accountSettings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [namePending, setNamePending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);

  return (
    <div className="space-y-4">
      <PageCard className="max-w-lg p-5">
        <h2 className="mb-4 text-sm font-medium">{t("profileTitle")}</h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setNameError(null);
            setNameSaved(false);
            setNamePending(true);
            void (async () => {
              const result = await updateAccountName(
                String(form.get("fullName") ?? ""),
              );
              if (result.error) {
                setNameError(
                  result.error === "name_required"
                    ? t("errors.nameRequired")
                    : result.error,
                );
                setNamePending(false);
                return;
              }
              setNameSaved(true);
              setNamePending(false);
              router.refresh();
            })();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("fields.name")}</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              defaultValue={initial.fullName}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("fields.email")}</Label>
            <Input
              id="email"
              value={initial.email}
              disabled
              readOnly
              className="opacity-70"
            />
            <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
          </div>
          {nameError ? (
            <p className="text-sm text-destructive">{nameError}</p>
          ) : null}
          {nameSaved ? (
            <p className="text-sm text-emerald-700">{t("saved")}</p>
          ) : null}
          <Button type="submit" disabled={namePending} className="w-fit">
            {namePending ? tCommon("loading") : t("saveProfile")}
          </Button>
        </form>
      </PageCard>

      <PageCard className="max-w-lg p-5">
        <h2 className="mb-4 text-sm font-medium">{t("passwordTitle")}</h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setPasswordError(null);
            setPasswordSaved(false);
            setPasswordPending(true);
            void (async () => {
              const result = await updateAccountPassword({
                password: String(form.get("password") ?? ""),
                confirmPassword: String(form.get("confirmPassword") ?? ""),
              });
              if (result.error) {
                setPasswordError(
                  result.error === "password_too_short"
                    ? t("errors.passwordTooShort")
                    : result.error === "password_mismatch"
                      ? t("errors.passwordMismatch")
                      : result.error,
                );
                setPasswordPending(false);
                return;
              }
              event.currentTarget.reset();
              setPasswordSaved(true);
              setPasswordPending(false);
            })();
          }}
        >
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("fields.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
          </div>
          {passwordError ? (
            <p className="text-sm text-destructive">{passwordError}</p>
          ) : null}
          {passwordSaved ? (
            <p className="text-sm text-emerald-700">{t("passwordSaved")}</p>
          ) : null}
          <Button type="submit" disabled={passwordPending} className="w-fit">
            {passwordPending ? tCommon("loading") : t("savePassword")}
          </Button>
        </form>
      </PageCard>
    </div>
  );
}
