import { NextResponse } from "next/server";

import { USER_ROLES } from "@/config/roles";
import { STAFF_ASSIGNABLE_ROLES } from "@/features/staff/lib/staff-roles";
import { getAppSession } from "@/features/shell/lib/require-organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganizationAccessAdmin } from "@/features/billing/lib/get-organization-access";

async function requireOwner() {
  const session = await getAppSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  if (!session.organizationId || session.role !== USER_ROLES.OWNER) {
    return {
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return {
    userId: session.user.id,
    organizationId: session.organizationId,
  };
}

export async function POST(request: Request) {
  try {
    const gate = await requireOwner();
    if ("error" in gate) return gate.error;

    const access = await getOrganizationAccessAdmin(gate.organizationId, { userId: gate.userId });
    if (!access.canWrite) {
      return NextResponse.json(
        { error: "subscription_required", code: "subscription_required" },
        { status: 402 },
      );
    }

    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    const fullName = body.fullName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const role = body.role?.trim() ?? "";

    if (
      !fullName ||
      !email ||
      password.length < 8 ||
      !STAFF_ASSIGNABLE_ROLES.includes(
        role as (typeof STAFF_ASSIGNABLE_ROLES)[number],
      )
    ) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const assignableRole = role as (typeof STAFF_ASSIGNABLE_ROLES)[number];

    const admin = createAdminClient();
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError || !created.user) {
      const message = createError?.message ?? "create_failed";
      const status = message.toLowerCase().includes("already") ? 409 : 500;
      return NextResponse.json(
        {
          error: status === 409 ? "email_taken" : message,
        },
        { status },
      );
    }

    const userId = created.user.id;

    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      platform_role: null,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { error: membershipError } = await admin
      .from("organization_memberships")
      .insert({
        organization_id: gate.organizationId,
        user_id: userId,
        role: assignableRole,
      });

    if (membershipError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ memberId: userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireOwner();
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
      fullName?: string;
      role?: string;
    };

    const id = body.id?.trim() ?? "";
    const fullName = body.fullName?.trim() ?? "";
    if (!id || !fullName) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("organization_memberships")
      .select("user_id, role")
      .eq("organization_id", gate.organizationId)
      .eq("user_id", id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const nextRole = body.role?.trim();
    if (membership.role === USER_ROLES.OWNER) {
      if (nextRole && nextRole !== USER_ROLES.OWNER) {
        return NextResponse.json(
          { error: "cannot_change_owner_role" },
          { status: 400 },
        );
      }
    } else if (nextRole) {
      if (
        !STAFF_ASSIGNABLE_ROLES.includes(
          nextRole as (typeof STAFF_ASSIGNABLE_ROLES)[number],
        )
      ) {
        return NextResponse.json({ error: "invalid_role" }, { status: 400 });
      }
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", id);
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (
      nextRole &&
      membership.role !== USER_ROLES.OWNER &&
      nextRole !== membership.role
    ) {
      const assignableRole = nextRole as (typeof STAFF_ASSIGNABLE_ROLES)[number];
      const { error: roleError } = await admin
        .from("organization_memberships")
        .update({ role: assignableRole })
        .eq("organization_id", gate.organizationId)
        .eq("user_id", id);
      if (roleError) {
        return NextResponse.json({ error: roleError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireOwner();
    if ("error" in gate) return gate.error;

    const access = await getOrganizationAccessAdmin(gate.organizationId, { userId: gate.userId });
    if (!access.canWrite) {
      return NextResponse.json(
        { error: "subscription_required", code: "subscription_required" },
        { status: 402 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    if (id === gate.userId) {
      return NextResponse.json({ error: "cannot_remove_self" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("organization_memberships")
      .select("user_id, role")
      .eq("organization_id", gate.organizationId)
      .eq("user_id", id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (membership.role === USER_ROLES.OWNER) {
      return NextResponse.json(
        { error: "cannot_remove_owner" },
        { status: 400 },
      );
    }

    const { error: membershipError } = await admin
      .from("organization_memberships")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("user_id", id);

    if (membershipError) {
      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 },
      );
    }

    const { count } = await admin
      .from("organization_memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id);

    if ((count ?? 0) === 0) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(id);
      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
