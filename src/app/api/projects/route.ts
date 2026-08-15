import { NextResponse } from "next/server";

import { logProjectActivity } from "@/features/projects/lib/project-activity";
import {
  isOrgStaffRole,
  PROJECT_STATUSES,
} from "@/features/projects/lib/project-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/database";
import { getOrganizationAccessAdmin } from "@/features/billing/lib/get-organization-access";

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

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    const gate = await requireStaff();
    if ("error" in gate) return gate.error;

    const access = await getOrganizationAccessAdmin(gate.organizationId, { userId: gate.userId });
    if (!access.canWrite) {
      return NextResponse.json(
        { error: "subscription_required", code: "subscription_required" },
        { status: 402 },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      customerId?: string;
      notes?: string;
      startDate?: string | null;
      endDate?: string | null;
      leadUserId?: string | null;
      contactName?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
    };

    const name = body.name?.trim() ?? "";
    const customerId = body.customerId?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    if (!customerId) {
      return NextResponse.json({ error: "customer_required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: customer } = await admin
      .from("customers")
      .select("id")
      .eq("organization_id", gate.organizationId)
      .eq("id", customerId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json(
        { error: "customer_not_found" },
        { status: 400 },
      );
    }

    const projectId = crypto.randomUUID();
    const { data: inserted, error } = await admin
      .from("projects")
      .insert({
        id: projectId,
        organization_id: gate.organizationId,
        customer_id: customerId,
        name,
        status: "preparation",
        notes: emptyToNull(body.notes),
        start_date: emptyToNull(body.startDate),
        end_date: emptyToNull(body.endDate),
        lead_user_id: emptyToNull(body.leadUserId),
        contact_name: emptyToNull(body.contactName),
        contact_email: emptyToNull(body.contactEmail),
        contact_phone: emptyToNull(body.contactPhone),
        created_by: gate.userId,
      })
      .select("id, project_number, name")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "project_created",
      title: "Project aangemaakt",
      body: inserted.name,
      metadata: { project_number: inserted.project_number },
      createdBy: gate.userId,
    });

    return NextResponse.json({ projectId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireStaff();
    if ("error" in gate) return gate.error;

    const access = await getOrganizationAccessAdmin(gate.organizationId, { userId: gate.userId });
    if (!access.canWrite) {
      return NextResponse.json(
        { error: "subscription_required", code: "subscription_required" },
        { status: 402 },
      );
    }

    const body = (await request.json()) as {
      id?: string;
      name?: string;
      customerId?: string;
      status?: ProjectStatus;
      notes?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      leadUserId?: string | null;
      contactName?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
    };

    const id = body.id?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    const customerId = body.customerId?.trim() ?? "";
    const status = body.status;

    if (!id || !customerId || !status) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    if (!PROJECT_STATUSES.includes(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("projects")
      .select(
        "id, name, status, customer_id, notes, start_date, end_date, lead_user_id, contact_name, contact_email, contact_phone",
      )
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const next = {
      name,
      customer_id: customerId,
      status,
      notes: emptyToNull(body.notes),
      start_date: emptyToNull(body.startDate),
      end_date: emptyToNull(body.endDate),
      lead_user_id: emptyToNull(body.leadUserId),
      contact_name: emptyToNull(body.contactName),
      contact_email: emptyToNull(body.contactEmail),
      contact_phone: emptyToNull(body.contactPhone),
    };

    const { error } = await admin
      .from("projects")
      .update(next)
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existing.status !== status) {
      await logProjectActivity(admin, {
        organizationId: gate.organizationId,
        projectId: id,
        type: "status_changed",
        title: "Status gewijzigd",
        body: `${existing.status} → ${status}`,
        metadata: { from: existing.status, to: status },
        createdBy: gate.userId,
      });
    }

    const changedFields: string[] = [];
    if (existing.name !== next.name) changedFields.push("name");
    if (existing.customer_id !== next.customer_id) changedFields.push("customer");
    if ((existing.notes ?? null) !== next.notes) changedFields.push("notes");
    if ((existing.start_date ?? null) !== next.start_date)
      changedFields.push("start_date");
    if ((existing.end_date ?? null) !== next.end_date)
      changedFields.push("end_date");
    if ((existing.lead_user_id ?? null) !== next.lead_user_id)
      changedFields.push("lead");
    if ((existing.contact_name ?? null) !== next.contact_name)
      changedFields.push("contact_name");
    if ((existing.contact_email ?? null) !== next.contact_email)
      changedFields.push("contact_email");
    if ((existing.contact_phone ?? null) !== next.contact_phone)
      changedFields.push("contact_phone");

    if (changedFields.length > 0) {
      await logProjectActivity(admin, {
        organizationId: gate.organizationId,
        projectId: id,
        type: "project_updated",
        title: "Project bijgewerkt",
        body: changedFields.join(", "),
        metadata: { fields: changedFields },
        createdBy: gate.userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
