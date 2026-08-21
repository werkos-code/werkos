"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logoutAction, signUpAction } from "@/features/auth/actions";
import { Link, useRouter } from "@/i18n/navigation";

export function AccountStepForm() {
  const t = useTranslations("onboarding.account");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      <form
        className="flex flex-col gap-5"
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("fullName")}</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-11"
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
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 w-full"
        >
          {pending ? tCommon("loading") : t("submit")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
          onClick={(event) => {
            event.preventDefault();
            void (async () => {
              await logoutAction();
              router.push("/login");
            })();
          }}
        >
          {t("login")}
        </Link>
      </p>
    </>
  );
}
