import { NextResponse } from "next/server";

import {
  mapOrganizationLetterhead,
  ORGANIZATION_LETTERHEAD_SELECT,
} from "@/features/organization/lib/organization-letterhead";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select(ORGANIZATION_LETTERHEAD_SELECT)
      .eq("id", gate.organizationId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: data.id,
        slug: data.slug,
        updatedAt: data.updated_at,
        ...mapOrganizationLetterhead(data),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "load_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      name?: string;
      industry?: string | null;
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

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .update({
        name,
        industry: trimOrNull(body.industry),
        address: trimOrNull(body.address),
        postal_code: trimOrNull(body.postalCode),
        city: trimOrNull(body.city),
        country: trimOrNull(body.country),
        phone: trimOrNull(body.phone),
        email: trimOrNull(body.email),
        kvk_number: trimOrNull(body.kvkNumber),
        vat_number: trimOrNull(body.vatNumber),
        iban: trimOrNull(body.iban),
      })
      .eq("id", gate.organizationId)
      .select(ORGANIZATION_LETTERHEAD_SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "update_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: data.id,
        slug: data.slug,
        updatedAt: data.updated_at,
        ...mapOrganizationLetterhead(data),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
