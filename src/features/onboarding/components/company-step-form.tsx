"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { completeCompanyOnboardingAction } from "@/features/onboarding/actions";

const INDUSTRY_KEYS = [
  "painter",
  "roofer",
  "installer",
  "landscaper",
  "plasterer",
  "other",
] as const;

type CompanyStepFormProps = {
  initialCompanyName?: string;
  initialIndustry?: string;
  initialIndustryOther?: string;
};

export function CompanyStepForm({
  initialCompanyName = "",
  initialIndustry = "",
  initialIndustryOther = "",
}: CompanyStepFormProps) {
  const t = useTranslations("onboarding.company");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [industry, setIndustry] = useState(initialIndustry);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const form = new FormData(event.currentTarget);

        setError(null);
        setPending(true);

        void (async () => {
          try {
            const result = await completeCompanyOnboardingAction({
              companyName: String(form.get("companyName") ?? ""),
              industry: industry || undefined,
              industryOther: String(form.get("industryOther") ?? ""),
            });
            if (result.error) {
              setError(result.error);
              setPending(false);
              return;
            }
            window.location.assign(`/${locale}/onboarding/complete`);
          } catch (err) {
            setError(err instanceof Error ? err.message : tCommon("error"));
            setPending(false);
          }
        })();
      }}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">{t("companyName")}</Label>
          <Input
            id="companyName"
            name="companyName"
            required
            autoComplete="organization"
            defaultValue={initialCompanyName}
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <Label>{t("industry")}</Label>
            <span className="text-xs text-muted-foreground">{t("industryOptional")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {INDUSTRY_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setIndustry((current) => (current === key ? "" : key))
                }
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  industry === key
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted/40",
                )}
              >
                {t(`industries.${key}`)}
              </button>
            ))}
          </div>
          <div className="min-h-9">
            {industry === "other" ? (
              <Input
                name="industryOther"
                placeholder={t("industryPlaceholder")}
                defaultValue={initialIndustryOther}
              />
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{t("trialHint")}</p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? tCommon("loading") : t("submit")}
      </Button>
    </form>
  );
}
