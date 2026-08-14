"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/features/auth/actions";
import { siteConfig } from "@/config/site";
import { Link, useRouter } from "@/i18n/navigation";

export function LoginCard() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="w-full rounded-3xl bg-white px-8 py-12 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:px-12 sm:py-14">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          {t("loginTitle")}
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("loginSubtitle")}
        </p>

        <form
          className="mt-10 w-full max-w-sm space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await loginAction({
                email: String(form.get("email") ?? ""),
                password: String(form.get("password") ?? ""),
              });
              if (result.error) {
                setError(t("invalidCredentials"));
                return;
              }
              router.replace("/dashboard");
              router.refresh();
            });
          }}
        >
          <div className="space-y-2 text-left">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11"
            />
          </div>
          {error ? (
            <p className="text-center text-sm text-destructive">{error}</p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="mt-2 h-11 w-full"
          >
            {pending ? tCommon("loading") : t("submitLogin")}
          </Button>
        </form>

        <p className="mt-8 text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link
            href="/onboarding"
            className="font-medium text-primary hover:underline"
          >
            {t("startOnboarding")}
          </Link>
        </p>

        <a
          href={siteConfig.marketingUrl}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("backToWebsiteFull")}
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
