"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  calculateMonthlyTotalCents,
  formatEurFromCents,
  PRICING,
} from "@/config/pricing";
import { saveTeamDraft } from "@/features/onboarding/actions";
import { PageCard } from "@/features/shell/components/page-card";
import { useRouter } from "@/i18n/navigation";

type TeamStepFormProps = {
  initialOfficeSeats?: number;
  initialFieldSeats?: number;
};

function SeatCounter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label="-"
        >
          −
        </Button>
        <span className="w-6 text-center tabular-nums">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(value + 1)}
          aria-label="+"
        >
          +
        </Button>
      </div>
    </div>
  );
}

export function TeamStepForm({
  initialOfficeSeats = 0,
  initialFieldSeats = 0,
}: TeamStepFormProps) {
  const t = useTranslations("onboarding.team");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [officeSeats, setOfficeSeats] = useState(initialOfficeSeats);
  const [fieldSeats, setFieldSeats] = useState(initialFieldSeats);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const numberLocale =
    locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "nl-NL";

  const total = calculateMonthlyTotalCents(officeSeats, fieldSeats);

  return (
    <form
      className="flex w-full flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setPending(true);

        void (async () => {
          try {
            const result = await saveTeamDraft({ officeSeats, fieldSeats });
            if (result.error) {
              setError(result.error);
              setPending(false);
              return;
            }
            router.push("/onboarding/payment");
          } catch (err) {
            setError(err instanceof Error ? err.message : tCommon("error"));
            setPending(false);
          }
        })();
      }}
    >
      <div className="space-y-2">
        <SeatCounter
          label={t("office")}
          value={officeSeats}
          onChange={setOfficeSeats}
        />
        <SeatCounter
          label={t("field")}
          value={fieldSeats}
          onChange={setFieldSeats}
        />
      </div>

      <PageCard className="px-5 py-4 text-sm">
        <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t("priceTitle")}
        </p>
        <div className="space-y-2 text-muted-foreground">
          <div className="flex justify-between">
            <span>{t("base")}</span>
            <span className="tabular-nums">
              {formatEurFromCents(PRICING.baseMonthlyCents, numberLocale)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t("officeLine", { count: officeSeats })}</span>
            <span className="tabular-nums">
              {formatEurFromCents(
                officeSeats * PRICING.officeSeatMonthlyCents,
                numberLocale,
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t("fieldLine", { count: fieldSeats })}</span>
            <span className="tabular-nums">
              {formatEurFromCents(
                fieldSeats * PRICING.fieldSeatMonthlyCents,
                numberLocale,
              )}
            </span>
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-foreground">
            <span className="font-medium">{t("total")}</span>
            <span className="font-semibold tabular-nums">
              {formatEurFromCents(total, numberLocale)} {tCommon("perMonth")}
            </span>
          </div>
        </div>
        <ul className="mt-4 space-y-1 text-muted-foreground">
          <li>{t("includesAll")}</li>
          <li>{t("includesTrial")}</li>
        </ul>
      </PageCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? tCommon("loading") : t("submit")}
      </Button>
    </form>
  );
}
