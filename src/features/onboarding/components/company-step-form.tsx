"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { saveCompanyDraft } from "@/features/onboarding/actions";
import { useRouter } from "@/i18n/navigation";

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
  const router = useRouter();
  const [industry, setIndustry] = useState(initialIndustry);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex w-full max-w-md flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (!industry) {
          setError(tCommon("error"));
          return;
        }

        setError(null);
        setPending(true);

        void (async () => {
          try {
            const result = await saveCompanyDraft({
              companyName: String(form.get("companyName") ?? ""),
              industry,
              industryOther: String(form.get("industryOther") ?? ""),
            });
            if (result.error) {
              setError(result.error);
              setPending(false);
              return;
            }
            router.push("/onboarding/team");
          } catch (err) {
            setError(err instanceof Error ? err.message : tCommon("error"));
            setPending(false);
          }
        })();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="companyName">{t("companyName")}</Label>
        <Input
          id="companyName"
          name="companyName"
          required
          defaultValue={initialCompanyName}
        />
      </div>
      <div className="space-y-3">
        <Label>{t("industry")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {INDUSTRY_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setIndustry(key)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                industry === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-muted",
              )}
            >
              {t(`industries.${key}`)}
            </button>
          ))}
        </div>
        {industry === "other" ? (
          <Input
            name="industryOther"
            placeholder={t("industryPlaceholder")}
            defaultValue={initialIndustryOther}
            required
          />
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending || !industry} className="w-full">
        {pending ? tCommon("loading") : t("submit")}
      </Button>
    </form>
  );
}
