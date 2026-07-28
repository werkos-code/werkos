"use client";

import { useRouter } from "@/i18n/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganizationProfile } from "@/features/organization/organization-actions";
import { PageCard } from "@/features/shell/components/page-card";

type OrganizationProfileFormProps = {
  initial: OrganizationProfile;
};

export function OrganizationProfileForm({
  initial,
}: OrganizationProfileFormProps) {
  const t = useTranslations("organizationSettings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoPending, startLogoTransition] = useTransition();

  function uploadLogo(file: File | undefined) {
    if (!file) return;
    setLogoError(null);
    startLogoTransition(() => {
      void (async () => {
        try {
          const form = new FormData();
          form.append("file", file);
          const response = await fetch("/api/organization/logo", {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(30_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setLogoError(
              result.error === "invalid_type"
                ? t("logo.invalidType")
                : result.error === "file_too_large"
                  ? t("logo.tooLarge")
                  : result.error || tCommon("error"),
            );
            return;
          }
          router.refresh();
        } catch {
          setLogoError(tCommon("error"));
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      })();
    });
  }

  function removeLogo() {
    setLogoError(null);
    startLogoTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/organization/logo", {
            method: "DELETE",
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setLogoError(result.error || tCommon("error"));
            return;
          }
          router.refresh();
        } catch {
          setLogoError(tCommon("error"));
        }
      })();
    });
  }

  return (
    <PageCard className="max-w-2xl p-5">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          setSaved(false);
          setPending(true);

          const payload = {
            name: String(form.get("name") ?? ""),
            industry: String(form.get("industry") ?? "") || null,
            address: String(form.get("address") ?? "") || null,
            postalCode: String(form.get("postalCode") ?? "") || null,
            city: String(form.get("city") ?? "") || null,
            country: String(form.get("country") ?? "") || null,
            phone: String(form.get("phone") ?? "") || null,
            email: String(form.get("email") ?? "") || null,
            kvkNumber: String(form.get("kvkNumber") ?? "") || null,
            vatNumber: String(form.get("vatNumber") ?? "") || null,
            iban: String(form.get("iban") ?? "") || null,
          };

          void (async () => {
            try {
              const response = await fetch("/api/organization", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(20_000),
              });
              const result = (await response.json()) as { error?: string };
              if (!response.ok || result.error) {
                setError(
                  result.error === "name_required"
                    ? t("nameRequired")
                    : result.error || tCommon("error"),
                );
                return;
              }
              setSaved(true);
              router.refresh();
            } catch {
              setError(tCommon("error"));
            } finally {
              setPending(false);
            }
          })();
        }}
      >
        <div className="space-y-1">
          <h2 className="text-sm font-medium">{t("sections.identity")}</h2>
          <p className="text-sm text-muted-foreground">{t("sections.identityHint")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">{t("fields.name")}</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={initial.name}
              disabled={pending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="industry">{t("fields.industry")}</Label>
            <Input
              id="industry"
              name="industry"
              defaultValue={initial.industry ?? ""}
              disabled={pending}
            />
          </div>
        </div>

        <div className="space-y-1 border-t border-border pt-5">
          <h2 className="text-sm font-medium">{t("sections.logo")}</h2>
          <p className="text-sm text-muted-foreground">{t("sections.logoHint")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30">
            {initial.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={initial.logoUrl}
                alt={initial.name}
                className="max-h-full max-w-full object-contain p-2"
              />
            ) : (
              <ImagePlus className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => uploadLogo(event.target.files?.[0])}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={logoPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPending ? t("logo.uploading") : t("logo.upload")}
              </Button>
              {initial.logoUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={logoPending}
                  className="text-destructive"
                  onClick={removeLogo}
                >
                  <Trash2 className="size-3.5" />
                  {t("logo.remove")}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{t("logo.hint")}</p>
            {logoError ? (
              <p className="text-sm text-destructive">{logoError}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1 border-t border-border pt-5">
          <h2 className="text-sm font-medium">{t("sections.address")}</h2>
          <p className="text-sm text-muted-foreground">{t("sections.addressHint")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">{t("fields.address")}</Label>
            <Input
              id="address"
              name="address"
              defaultValue={initial.address ?? ""}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">{t("fields.postalCode")}</Label>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={initial.postalCode ?? ""}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">{t("fields.city")}</Label>
            <Input
              id="city"
              name="city"
              defaultValue={initial.city ?? ""}
              disabled={pending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="country">{t("fields.country")}</Label>
            <Input
              id="country"
              name="country"
              defaultValue={initial.country ?? ""}
              disabled={pending}
              placeholder="NL"
            />
          </div>
        </div>

        <div className="space-y-1 border-t border-border pt-5">
          <h2 className="text-sm font-medium">{t("sections.contact")}</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">{t("fields.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial.email ?? ""}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("fields.phone")}</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={initial.phone ?? ""}
              disabled={pending}
            />
          </div>
        </div>

        <div className="space-y-1 border-t border-border pt-5">
          <h2 className="text-sm font-medium">{t("sections.legal")}</h2>
          <p className="text-sm text-muted-foreground">{t("sections.legalHint")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kvkNumber">{t("fields.kvkNumber")}</Label>
            <Input
              id="kvkNumber"
              name="kvkNumber"
              defaultValue={initial.kvkNumber ?? ""}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vatNumber">{t("fields.vatNumber")}</Label>
            <Input
              id="vatNumber"
              name="vatNumber"
              defaultValue={initial.vatNumber ?? ""}
              disabled={pending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="iban">{t("fields.iban")}</Label>
            <Input
              id="iban"
              name="iban"
              defaultValue={initial.iban ?? ""}
              disabled={pending}
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-sm text-muted-foreground">{t("saved")}</p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </PageCard>
  );
}
