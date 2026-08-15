"use client";

import { ImagePlus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DEFAULT_INVOICE_SETTINGS,
  formatInvoiceNumberPreview,
  INVOICE_PAYMENT_TERMS_OPTIONS,
  INVOICE_VAT_PRESETS,
  normalizeInvoiceNumberPrefix,
  type InvoiceSettings,
  type InvoiceSettingsLetterhead,
} from "@/features/invoices/lib/invoice-settings";
import { cn } from "@/lib/utils";

type InvoiceSettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type LoadState = "idle" | "loading" | "ready" | "error";

export function InvoiceSettingsSheet({
  open,
  onOpenChange,
}: InvoiceSettingsSheetProps) {
  const t = useTranslations("invoices.settingsSheet");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoPending, startLogoTransition] = useTransition();

  const [settings, setSettings] = useState<InvoiceSettings>(
    DEFAULT_INVOICE_SETTINGS,
  );
  const [letterhead, setLetterhead] = useState<InvoiceSettingsLetterhead>({
    name: "",
    address: null,
    postalCode: null,
    city: null,
    country: null,
    phone: null,
    email: null,
    kvkNumber: null,
    vatNumber: null,
    iban: null,
    logoUrl: null,
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadState("loading");
    setError(null);
    setSaved(false);
    setLogoError(null);

    void (async () => {
      try {
        const response = await fetch("/api/invoices/settings", {
          signal: AbortSignal.timeout(20_000),
        });
        const result = (await response.json()) as {
          error?: string;
          settings?: InvoiceSettings;
          letterhead?: InvoiceSettingsLetterhead;
        };
        if (cancelled) return;
        if (!response.ok || !result.settings || !result.letterhead) {
          setLoadState("error");
          setError(mapLoadError(result.error, t, tCommon));
          return;
        }
        setSettings(result.settings);
        setLetterhead(result.letterhead);
        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setLoadState("error");
          setError(tCommon("error"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, t, tCommon]);

  const preview = formatInvoiceNumberPreview(settings);

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
          const result = (await response.json()) as {
            error?: string;
          };
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
          const reload = await fetch("/api/invoices/settings");
          const body = (await reload.json()) as {
            letterhead?: InvoiceSettingsLetterhead;
          };
          if (body.letterhead) setLetterhead(body.letterhead);
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
          setLetterhead((prev) => ({ ...prev, logoUrl: null }));
        } catch {
          setLogoError(tCommon("error"));
        }
      })();
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/invoices/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          numberPrefix: normalizeInvoiceNumberPrefix(settings.numberPrefix),
          name: letterhead.name,
          address: letterhead.address,
          postalCode: letterhead.postalCode,
          city: letterhead.city,
          country: letterhead.country,
          phone: letterhead.phone,
          email: letterhead.email,
          kvkNumber: letterhead.kvkNumber,
          vatNumber: letterhead.vatNumber,
          iban: letterhead.iban,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as {
        error?: string;
        settings?: InvoiceSettings;
        letterhead?: InvoiceSettingsLetterhead;
      };
      if (!response.ok || result.error) {
        setError(mapSaveError(result.error, t, tCommon));
        return;
      }
      if (result.settings) setSettings(result.settings);
      if (result.letterhead) setLetterhead(result.letterhead);
      setSaved(true);
    } catch {
      setError(tCommon("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="h-full w-[min(100%,70vw)] gap-0 overflow-hidden rounded-tl-3xl rounded-bl-3xl p-0 data-[side=right]:w-[min(100%,70vw)] data-[side=right]:sm:max-w-[70vw]"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-6 py-3">
          <SheetTitle className="text-sm font-medium">{t("title")}</SheetTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label={tCommon("close")}
          >
            <X className="size-4" />
          </Button>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-1 border-b border-border bg-card px-6 py-5">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t("heading")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          {loadState === "loading" ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              {tCommon("loading")}
            </p>
          ) : loadState === "error" ? (
            <p className="px-6 py-8 text-sm text-destructive">{error}</p>
          ) : (
            <div className="space-y-8 px-6 py-6">
              {/* Number format */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">{t("sections.number")}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("sections.numberHint")}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="inv-prefix">{t("fields.prefix")}</Label>
                    <Input
                      id="inv-prefix"
                      value={settings.numberPrefix}
                      maxLength={12}
                      className="font-mono uppercase"
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          numberPrefix: normalizeInvoiceNumberPrefix(
                            e.target.value,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-pad">{t("fields.pad")}</Label>
                    <Input
                      id="inv-pad"
                      type="number"
                      min={2}
                      max={8}
                      value={settings.numberPad}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          numberPad: Number(e.target.value) || 4,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("fields.includeYear")}</Label>
                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
                      <button
                        type="button"
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs transition-colors",
                          settings.numberIncludeYear
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            numberIncludeYear: true,
                          }))
                        }
                      >
                        {t("fields.yearOn")}
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs transition-colors",
                          !settings.numberIncludeYear
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            numberIncludeYear: false,
                          }))
                        }
                      >
                        {t("fields.yearOff")}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {t("fields.preview")}
                  </span>{" "}
                  <span className="font-mono font-medium tabular-nums">
                    {preview}
                  </span>
                </p>
              </section>

              {/* Letterhead */}
              <section className="space-y-4 border-t border-border pt-8">
                <div>
                  <h3 className="text-sm font-medium">
                    {t("sections.letterhead")}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("sections.letterheadHint")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30">
                    {letterhead.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={letterhead.logoUrl}
                        alt={letterhead.name || "Logo"}
                        className="max-h-full max-w-full object-contain p-2"
                      />
                    ) : (
                      <ImagePlus className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => uploadLogo(e.target.files?.[0])}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={logoPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t("logo.upload")}
                    </Button>
                    {letterhead.logoUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={logoPending}
                        onClick={removeLogo}
                      >
                        <Trash2 className="size-3.5" />
                        {t("logo.remove")}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {logoError ? (
                  <p className="text-sm text-destructive">{logoError}</p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="lh-name">{t("fields.companyName")}</Label>
                    <Input
                      id="lh-name"
                      value={letterhead.name}
                      onChange={(e) =>
                        setLetterhead((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="lh-address">{t("fields.address")}</Label>
                    <Input
                      id="lh-address"
                      value={letterhead.address ?? ""}
                      onChange={(e) =>
                        setLetterhead((prev) => ({
                          ...prev,
                          address: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lh-postal">{t("fields.postalCode")}</Label>
                    <Input
                      id="lh-postal"
                      value={letterhead.postalCode ?? ""}
                      onChange={(e) =>
                        setLetterhead((prev) => ({
                          ...prev,
                          postalCode: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lh-city">{t("fields.city")}</Label>
                    <Input
                      id="lh-city"
                      value={letterhead.city ?? ""}
                      onChange={(e) =>
                        setLetterhead((prev) => ({
                          ...prev,
                          city: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lh-kvk">{t("fields.kvk")}</Label>
                    <Input
                      id="lh-kvk"
                      value={letterhead.kvkNumber ?? ""}
                      onChange={(e) =>
                        setLetterhead((prev) => ({
                          ...prev,
                          kvkNumber: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lh-vat">{t("fields.vatNumber")}</Label>
                    <Input
                      id="lh-vat"
                      value={letterhead.vatNumber ?? ""}
                      onChange={(e) =>
                        setLetterhead((prev) => ({
                          ...prev,
                          vatNumber: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="lh-iban">{t("fields.iban")}</Label>
                    <Input
                      id="lh-iban"
                      className="font-mono"
                      value={letterhead.iban ?? ""}
                      onChange={(e) =>
                        setLetterhead((prev) => ({
                          ...prev,
                          iban: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lh-phone">{t("fields.phone")}</Label>
                    <Input
                      id="lh-phone"
                      value={letterhead.phone ?? ""}
                      onChange={(e) =>
                        setLetterhead((prev) => ({
                          ...prev,
                          phone: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lh-email">{t("fields.companyEmail")}</Label>
                    <Input
                      id="lh-email"
                      type="email"
                      value={letterhead.email ?? ""}
                      onChange={(e) =>
                        setLetterhead((prev) => ({
                          ...prev,
                          email: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Sending */}
              <section className="space-y-4 border-t border-border pt-8">
                <div>
                  <h3 className="text-sm font-medium">{t("sections.sending")}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("sections.sendingHint")}
                  </p>
                </div>
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="from-email">{t("fields.fromEmail")}</Label>
                  <Input
                    id="from-email"
                    type="email"
                    placeholder={t("fields.fromEmailPlaceholder")}
                    value={settings.fromEmail ?? ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        fromEmail: e.target.value || null,
                      }))
                    }
                  />
                </div>
              </section>

              {/* Defaults */}
              <section className="space-y-4 border-t border-border pt-8">
                <div>
                  <h3 className="text-sm font-medium">
                    {t("sections.defaults")}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("sections.defaultsHint")}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pay-terms">
                      {t("fields.paymentTerms")}
                    </Label>
                    <select
                      id="pay-terms"
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={settings.defaultPaymentTermsDays}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          defaultPaymentTermsDays: Number(e.target.value),
                        }))
                      }
                    >
                      {INVOICE_PAYMENT_TERMS_OPTIONS.map((days) => (
                        <option key={days} value={days}>
                          {days === 0
                            ? t("fields.paymentTermsImmediate")
                            : t("fields.paymentTermsDays", { days })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vat-default">{t("fields.defaultVat")}</Label>
                    <select
                      id="vat-default"
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={settings.defaultVatRateBps}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          defaultVatRateBps: Number(e.target.value),
                        }))
                      }
                    >
                      {INVOICE_VAT_PRESETS.map((preset) => (
                        <option key={preset.bps} value={preset.bps}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reminder">
                      {t("fields.reminderDays")}
                    </Label>
                    <Input
                      id="reminder"
                      type="number"
                      min={0}
                      max={365}
                      placeholder={t("fields.reminderOff")}
                      value={settings.reminderDaysAfterDue ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setSettings((prev) => ({
                          ...prev,
                          reminderDaysAfterDue:
                            raw === "" ? null : Number(raw),
                        }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("fields.reminderHint")}
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="default-notes">
                      {t("fields.defaultNotes")}
                    </Label>
                    <textarea
                      id="default-notes"
                      rows={4}
                      className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      placeholder={t("fields.defaultNotesPlaceholder")}
                      value={settings.defaultNotes ?? ""}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          defaultNotes: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                </div>
              </section>

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              {saved ? (
                <p className="text-sm text-emerald-700">{t("saved")}</p>
              ) : null}
            </div>
          )}
        </div>

        {loadState === "ready" ? (
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || !letterhead.name.trim()}
              onClick={() => void save()}
            >
              {saving ? tCommon("loading") : t("save")}
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function mapLoadError(
  code: string | undefined,
  t: ReturnType<typeof useTranslations<"invoices.settingsSheet">>,
  tCommon: ReturnType<typeof useTranslations<"common">>,
) {
  if (code === "settings_not_migrated") return t("errors.notMigrated");
  return code || tCommon("error");
}

function mapSaveError(
  code: string | undefined,
  t: ReturnType<typeof useTranslations<"invoices.settingsSheet">>,
  tCommon: ReturnType<typeof useTranslations<"common">>,
) {
  if (code === "name_required") return t("errors.nameRequired");
  if (code === "invalid_prefix") return t("errors.invalidPrefix");
  if (code === "invalid_pad") return t("errors.invalidPad");
  if (code === "invalid_payment_terms") return t("errors.invalidPaymentTerms");
  if (code === "invalid_vat") return t("errors.invalidVat");
  if (code === "invalid_from_email") return t("errors.invalidFromEmail");
  if (code === "invalid_reminder") return t("errors.invalidReminder");
  if (code === "settings_not_migrated") return t("errors.notMigrated");
  return code || tCommon("error");
}
