"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageCard } from "@/features/shell/components/page-card";
import { signUpAction } from "@/features/auth/actions";
import { useRouter } from "@/i18n/navigation";

export function AccountStepForm() {
  const t = useTranslations("onboarding.account");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex w-full flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setPending(true);

        void (async () => {
          try {
            const result = await signUpAction({
              fullName: String(form.get("fullName") ?? ""),
              email: String(form.get("email") ?? ""),
              password: String(form.get("password") ?? ""),
            });
            if (result.error === "email_in_use") {
              setError(t("emailInUse"));
              setPending(false);
              return;
            }
            if (result.error) {
              setError(result.error);
              setPending(false);
              return;
            }
            router.push("/onboarding/company");
          } catch (err) {
            setError(err instanceof Error ? err.message : tCommon("error"));
            setPending(false);
          }
        })();
      }}
    >
      <PageCard className="space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input id="fullName" name="fullName" required autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
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
          />
          <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
        </div>
      </PageCard>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? tCommon("loading") : t("submit")}
      </Button>
    </form>
  );
}
