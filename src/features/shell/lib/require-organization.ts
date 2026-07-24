import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

export async function requireOrganization(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user!.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect({ href: "/onboarding/company", locale });
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership!.organization_id)
    .maybeSingle();

  return {
    user: user!,
    organizationId: membership!.organization_id,
    role: membership!.role,
    organizationName: organization?.name ?? null,
  };
}
