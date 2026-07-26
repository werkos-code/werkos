import { isOrgStaffRole } from "@/features/projects/lib/project-status";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireApiStaff() {
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
