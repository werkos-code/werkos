"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { completeOnboardingAction } from "@/features/onboarding/actions";
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
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
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
  const router = useRouter();
  const [officeSeats, setOfficeSeats] = useState(initialOfficeSeats);
  const [fieldSeats, setFieldSeats] = useState(initialFieldSeats);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setPending(true);

        void (async () => {
          try {
            const result = await completeOnboardingAction({
              officeSeats,
              fieldSeats,
            });
            if (result.error) {
              setError(result.error);
              setPending(false);
              return;
            }
            router.push("/onboarding/complete");
            router.refresh();
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

      <p className="text-sm text-muted-foreground">{t("trialHint")}</p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? tCommon("loading") : t("submit")}
      </Button>
    </form>
  );
}
