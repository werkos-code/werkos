"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEurFromCents, PRICING } from "@/config/pricing";
import { USER_ROLES } from "@/config/roles";
import {
  EntityFormField,
  EntityFormSection,
  EntityFormShell,
} from "@/features/shell/components/entity-form-shell";
import {
  remainingForKind,
  seatKindForRole,
  type StaffSeatUsage,
} from "@/features/staff/lib/staff-seats";
import {
  STAFF_ASSIGNABLE_ROLES,
  type StaffAssignableRole,
} from "@/features/staff/lib/staff-roles";
import { Link, useRouter } from "@/i18n/navigation";

type StaffInviteFormProps = {
  seats: StaffSeatUsage | null;
};

export function StaffInviteForm({ seats }: StaffInviteFormProps) {
  const t = useTranslations("staff");
  const tRoles = useTranslations("platform.users.roles");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [role, setRole] = useState<StaffAssignableRole>(
    USER_ROLES.OFFICE_EMPLOYEE,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmAddSeat, setConfirmAddSeat] = useState(false);

  const seatKind = seatKindForRole(role);
  const remaining = seats ? remainingForKind(seats, seatKind) : null;
  const atLimit = remaining != null && remaining <= 0;
  const priceLabel = formatEurFromCents(
    seatKind === "office"
      ? PRICING.officeSeatMonthlyCents
      : PRICING.fieldSeatMonthlyCents,
  );

  const seatHint = useMemo(() => {
    if (!seats || remaining == null) return null;
    if (remaining > 0) {
      return t("invite.remaining", {
        count: remaining,
        role: tRoles(role),
      });
    }
    return seats.isPaid
      ? t("invite.needSeatPaid", {
          role: tRoles(role),
          price: priceLabel,
        })
      : t("invite.needSeatTrial", {
          role: tRoles(role),
          price: priceLabel,
        });
  }, [seats, remaining, role, t, tRoles, priceLabel]);

  async function submit(payload: {
    fullName: string;
    email: string;
    password: string;
    addSeat: boolean;
  }) {
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: payload.fullName,
          email: payload.email,
          password: payload.password,
          role,
          addSeat: payload.addSeat,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const result = (await response.json()) as {
        error?: string;
        memberId?: string;
        seatKind?: string;
        priceLabel?: string;
      };

      if (response.status === 402 && result.error === "seat_limit_reached") {
        setConfirmAddSeat(true);
        setError(null);
        return;
      }

      if (!response.ok || result.error || !result.memberId) {
        setError(
          result.error === "invalid_input"
            ? t("errors.invalidInput")
            : result.error === "email_taken"
              ? t("errors.emailTaken")
              : result.error === "forbidden"
                ? t("errors.forbidden")
                : result.error === "subscription_required"
                  ? t("errors.subscriptionRequired")
                  : result.error === "stripe_missing"
                    ? t("errors.stripeMissing")
                    : result.error === "seat_purchase_failed"
                      ? t("errors.seatPurchaseFailed")
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
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const fullName = String(form.get("fullName") ?? "");
        const email = String(form.get("email") ?? "");
        const password = String(form.get("password") ?? "");

        void submit({
          fullName,
          email,
          password,
          addSeat: atLimit || confirmAddSeat,
        });
      }}
    >
      <EntityFormShell
        icon={UserPlus}
        title={t("inviteTitle")}
        description={t("inviteHint")}
        footer={
          <>
            <Button type="submit" disabled={pending}>
              {pending
                ? tCommon("loading")
                : atLimit || confirmAddSeat
                  ? t("invite.createWithSeat")
                  : t("create")}
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/personeel">{tCommon("cancel")}</Link>
            </Button>
            {error ? (
              <p className="w-full text-sm text-destructive sm:ml-auto sm:w-auto">
                {error}
              </p>
            ) : null}
          </>
        }
      >
        <EntityFormSection title={t("sections.profile")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <EntityFormField className="sm:col-span-2">
              <Label htmlFor="fullName">{t("fields.name")}</Label>
              <Input
                id="fullName"
                name="fullName"
                required
                autoComplete="off"
                placeholder={t("placeholders.name")}
              />
            </EntityFormField>
            <EntityFormField className="sm:col-span-2">
              <Label htmlFor="email">{t("fields.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="off"
                placeholder={t("placeholders.email")}
              />
            </EntityFormField>
          </div>
        </EntityFormSection>

        <EntityFormSection
          title={t("sections.access")}
          description={t("passwordHint")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <EntityFormField>
              <Label htmlFor="password">{t("fields.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={t("placeholders.password")}
              />
            </EntityFormField>
            <EntityFormField>
              <Label htmlFor="role">{t("fields.role")}</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as StaffAssignableRole);
                  setConfirmAddSeat(false);
                  setError(null);
                }}
                className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {STAFF_ASSIGNABLE_ROLES.map((option) => (
                  <option key={option} value={option}>
                    {tRoles(option)}
                  </option>
                ))}
              </select>
            </EntityFormField>
          </div>

          {seatHint ? (
            <div
              className={
                atLimit
                  ? "rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-950"
                  : "rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
              }
            >
              <p>{seatHint}</p>
              {atLimit || confirmAddSeat ? (
                <p className="mt-2 text-xs">
                  {seats?.isPaid
                    ? t("invite.chargeNow", { price: priceLabel })
                    : t("invite.chargeLater", { price: priceLabel })}
                </p>
              ) : null}
            </div>
          ) : null}
        </EntityFormSection>
      </EntityFormShell>
    </form>
  );
}
