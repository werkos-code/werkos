import { NextResponse } from "next/server";

import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) {
      return NextResponse.json({ customers: [] });
    }

    const admin = createAdminClient();
    const term = `%${q}%`;
    const { data, error } = await admin
      .from("customers")
      .select("id, name, email, phone, address")
      .eq("organization_id", gate.organizationId)
      .or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
      .order("name")
      .limit(8);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      customers: (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        address: row.address,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "search_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
