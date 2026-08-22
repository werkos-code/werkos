import { getOrganizationAccessAdmin } from "@/features/billing/lib/get-organization-access";
import { isOrgStaffRole } from "@/features/projects/lib/project-status";
import { getAppSession } from "@/features/shell/lib/require-organization";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireApiStaff() {
  const session = await getAppSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  if (session.isImpersonating && session.impersonation && session.organizationId) {
    return {
      userId: session.impersonation.targetUserId,
      organizationId: session.organizationId,
    };
  }

  if (!session.organizationId || !isOrgStaffRole(session.role)) {
    if (session.isSuperAdmin && session.organizationId) {
      return {
        userId: session.user.id,
        organizationId: session.organizationId,
      };
    }
    return {
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return {
    userId: session.user.id,
    organizationId: session.organizationId,
  };
}

/** Staff gate that also blocks writes when the org is in read-only (trial expired / unpaid). */
export async function requireWritableApiStaff() {
  const gate = await requireApiStaff();
  if ("error" in gate) return gate;

  const session = await getAppSession();
  if (session?.isImpersonating) {
    return gate;
  }

  const access = await getOrganizationAccessAdmin(gate.organizationId, {
    userId: gate.userId,
  });
  if (!access.canWrite) {
    return {
      error: NextResponse.json(
        {
          error: "subscription_required",
          code: "subscription_required",
          access: access.mode,
        },
        { status: 402 },
      ),
    };
  }

  return gate;
}
