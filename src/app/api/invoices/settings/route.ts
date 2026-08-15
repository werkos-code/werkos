import { NextResponse } from "next/server";

import {
  DEFAULT_INVOICE_SETTINGS,
  formatInvoiceNumberPreview,
  normalizeInvoiceNumberPrefix,
  type InvoiceSettings,
  type InvoiceSettingsLetterhead,
} from "@/features/invoices/lib/invoice-settings";
import { organizationLogoPublicUrl } from "@/features/organization/lib/organization-logo";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

const SETTINGS_SELECT =
  "name, address, postal_code, city, country, phone, email, kvk_number, vat_number, iban, logo_path, invoice_number_prefix, invoice_number_include_year, invoice_number_pad, invoice_from_email, invoice_default_payment_terms_days, invoice_default_vat_rate_bps, invoice_default_notes, invoice_reminder_days_after_due";

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapSettings(row: {
  invoice_number_prefix: string | null;
  invoice_number_include_year: boolean | null;
  invoice_number_pad: number | null;
  invoice_from_email: string | null;
  invoice_default_payment_terms_days: number | null;
  invoice_default_vat_rate_bps: number | null;
  invoice_default_notes: string | null;
  invoice_reminder_days_after_due: number | null;
}): InvoiceSettings {
  return {
    numberPrefix:
      row.invoice_number_prefix?.trim() ||
      DEFAULT_INVOICE_SETTINGS.numberPrefix,
    numberIncludeYear:
      row.invoice_number_include_year ??
      DEFAULT_INVOICE_SETTINGS.numberIncludeYear,
    numberPad:
      row.invoice_number_pad ?? DEFAULT_INVOICE_SETTINGS.numberPad,
    fromEmail: row.invoice_from_email,
    defaultPaymentTermsDays:
      row.invoice_default_payment_terms_days ??
      DEFAULT_INVOICE_SETTINGS.defaultPaymentTermsDays,
    defaultVatRateBps:
      row.invoice_default_vat_rate_bps ??
      DEFAULT_INVOICE_SETTINGS.defaultVatRateBps,
    defaultNotes: row.invoice_default_notes,
    reminderDaysAfterDue: row.invoice_reminder_days_after_due,
  };
}

function mapLetterhead(row: {
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  kvk_number: string | null;
  vat_number: string | null;
  iban: string | null;
  logo_path: string | null;
}): InvoiceSettingsLetterhead {
  return {
    name: row.name,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    country: row.country,
    phone: row.phone,
    email: row.email,
    kvkNumber: row.kvk_number,
    vatNumber: row.vat_number,
    iban: row.iban,
    logoUrl: organizationLogoPublicUrl(row.logo_path),
  };
}

function parsePaymentTerms(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 365) return null;
  return Math.round(n);
}

function parsePad(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 2 || rounded > 8) return null;
  return rounded;
}

function parseVatBps(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (![0, 900, 2100].includes(n)) return null;
  return n;
}

function parseReminderDays(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 365) return undefined;
  return Math.round(n);
}

export async function GET() {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select(SETTINGS_SELECT)
      .eq("id", gate.organizationId)
      .maybeSingle();

    if (error) {
      if (
        error.message.includes("invoice_number_prefix") ||
        error.message.includes("does not exist")
      ) {
        return NextResponse.json(
          { error: "settings_not_migrated" },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const settings = mapSettings(data);
    return NextResponse.json({
      settings,
      letterhead: mapLetterhead(data),
      previewNumber: formatInvoiceNumberPreview(settings),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "load_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      numberPrefix?: string;
      numberIncludeYear?: boolean;
      numberPad?: number;
      fromEmail?: string | null;
      defaultPaymentTermsDays?: number;
      defaultVatRateBps?: number;
      defaultNotes?: string | null;
      reminderDaysAfterDue?: number | null;
      name?: string;
      address?: string | null;
      postalCode?: string | null;
      city?: string | null;
      country?: string | null;
      phone?: string | null;
      email?: string | null;
      kvkNumber?: string | null;
      vatNumber?: string | null;
      iban?: string | null;
    };

    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const numberPrefix = normalizeInvoiceNumberPrefix(
      body.numberPrefix ?? DEFAULT_INVOICE_SETTINGS.numberPrefix,
    );
    if (!numberPrefix) {
      return NextResponse.json({ error: "invalid_prefix" }, { status: 400 });
    }

    const numberPad = parsePad(
      body.numberPad ?? DEFAULT_INVOICE_SETTINGS.numberPad,
    );
    if (numberPad == null) {
      return NextResponse.json({ error: "invalid_pad" }, { status: 400 });
    }

    const paymentTerms = parsePaymentTerms(
      body.defaultPaymentTermsDays ??
        DEFAULT_INVOICE_SETTINGS.defaultPaymentTermsDays,
    );
    if (paymentTerms == null) {
      return NextResponse.json(
        { error: "invalid_payment_terms" },
        { status: 400 },
      );
    }

    const vatBps = parseVatBps(
      body.defaultVatRateBps ?? DEFAULT_INVOICE_SETTINGS.defaultVatRateBps,
    );
    if (vatBps == null) {
      return NextResponse.json({ error: "invalid_vat" }, { status: 400 });
    }

    const reminderParsed = parseReminderDays(body.reminderDaysAfterDue);
    if (reminderParsed === undefined) {
      return NextResponse.json({ error: "invalid_reminder" }, { status: 400 });
    }

    const fromEmail = trimOrNull(body.fromEmail);
    if (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
      return NextResponse.json({ error: "invalid_from_email" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .update({
        name,
        address: trimOrNull(body.address),
        postal_code: trimOrNull(body.postalCode),
        city: trimOrNull(body.city),
        country: trimOrNull(body.country),
        phone: trimOrNull(body.phone),
        email: trimOrNull(body.email),
        kvk_number: trimOrNull(body.kvkNumber),
        vat_number: trimOrNull(body.vatNumber),
        iban: trimOrNull(body.iban),
        invoice_number_prefix: numberPrefix,
        invoice_number_include_year: Boolean(body.numberIncludeYear),
        invoice_number_pad: numberPad,
        invoice_from_email: fromEmail,
        invoice_default_payment_terms_days: paymentTerms,
        invoice_default_vat_rate_bps: vatBps,
        invoice_default_notes: trimOrNull(body.defaultNotes),
        invoice_reminder_days_after_due: reminderParsed,
      })
      .eq("id", gate.organizationId)
      .select(SETTINGS_SELECT)
      .single();

    if (error || !data) {
      // Column missing until SQL is applied
      if (error?.message?.includes("invoice_number_prefix")) {
        return NextResponse.json(
          { error: "settings_not_migrated" },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: error?.message ?? "update_failed" },
        { status: 500 },
      );
    }

    const settings = mapSettings(data);
    return NextResponse.json({
      success: true,
      settings,
      letterhead: mapLetterhead(data),
      previewNumber: formatInvoiceNumberPreview(settings),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
