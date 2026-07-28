import { NextResponse } from "next/server";

import { isOrgStaffRole } from "@/features/projects/lib/project-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership || !isOrgStaffRole(membership.role)) {
    return {
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return {
    userId: user.id,
    organizationId: membership.organization_id,
  };
}

export async function POST(request: Request) {
  try {
    const gate = await requireStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      kvkNumber?: string;
      notes?: string;
    };

    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const subcontractorId = crypto.randomUUID();
    const admin = createAdminClient();
    const { error } = await admin.from("subcontractors").insert({
      id: subcontractorId,
      organization_id: gate.organizationId,
      name,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      address: body.address?.trim() || null,
      kvk_number: body.kvkNumber?.trim() || null,
      notes: body.notes?.trim() || null,
      created_by: gate.userId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ subcontractorId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      id?: string;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      kvkNumber?: string;
      notes?: string;
    };

    const id = body.id?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("subcontractors")
      .update({
        name,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        kvk_number: body.kvkNumber?.trim() || null,
        notes: body.notes?.trim() || null,
      })
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireStaff();
    if ("error" in gate) return gate.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("subcontractors")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
