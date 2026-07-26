import { USER_ROLES } from "@/config/roles";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

export type AppSession = {
  user: User;
  organizationId: string | null;
  role: string | null;
  organizationName: string | null;
  userName: string;
  platformRole: "super_admin" | null;
  isSuperAdmin: boolean;
};

async function loadProfile(userId: string, email: string | undefined) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, platform_role")
    .eq("id", userId)
    .maybeSingle();

  return {
    userName:
      profile?.full_name?.trim() || email?.split("@")[0] || "Gebruiker",
    platformRole: (profile?.platform_role ?? null) as "super_admin" | null,
  };
}

export async function requireOrganization(locale: string): Promise<AppSession> {
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

  const { userName, platformRole } = await loadProfile(user!.id, user!.email);
  const isSuperAdmin = platformRole === USER_ROLES.SUPER_ADMIN;

  if (!membership) {
    if (isSuperAdmin) {
      return {
        user: user!,
        organizationId: null,
        role: null,
        organizationName: null,
        userName,
        platformRole,
        isSuperAdmin,
      };
    }
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
    userName,
    platformRole,
    isSuperAdmin,
  };
}

export async function requireSuperAdmin(locale: string): Promise<AppSession> {
  const session = await requireOrganization(locale);
  if (!session.isSuperAdmin) {
    redirect({ href: "/werk", locale });
  }
  return session;
}
