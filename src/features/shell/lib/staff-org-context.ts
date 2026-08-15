import { createClient } from "@/lib/supabase/server";
import { isOrgStaffRole } from "@/features/projects/lib/project-status";
import { getOrganizationAccess } from "@/features/billing/lib/get-organization-access";
import { getAppSession } from "@/features/shell/lib/require-organization";

export type StaffOrgContext =
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: string;
      organizationId: string;
    }
  | { error: "unauthorized" | "no_organization" | "forbidden" };

/**
 * Staff org context for data loaders. Reuses getAppSession() within the request.
 */
export async function getStaffOrgContext(): Promise<StaffOrgContext> {
  const session = await getAppSession();
  if (!session) return { error: "unauthorized" };

  if (!session.organizationId) return { error: "no_organization" };
  if (!isOrgStaffRole(session.role)) return { error: "forbidden" };

  const supabase = await createClient();
  return {
    supabase,
    userId: session.user.id,
    organizationId: session.organizationId,
  };
}

/** Same as getStaffOrgContext, but blocks when the org is read-only. */
export async function getWritableStaffOrgContext(): Promise<
  StaffOrgContext | { error: "subscription_required" }
> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return ctx;

  const access = await getOrganizationAccess(ctx.organizationId);
  if (!access.canWrite) return { error: "subscription_required" };
  return ctx;
}
