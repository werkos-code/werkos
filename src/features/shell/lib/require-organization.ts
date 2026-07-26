import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { USER_ROLES } from "@/config/roles";
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

/**
 * Request-scoped session load (React.cache).
 * Safe to call from layout, page, and server actions in the same RSC pass.
 */
export const getAppSession = cache(async (): Promise<AppSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [membershipResult, profileResult] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, platform_role")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const membership = membershipResult.data;
  const profile = profileResult.data;
  const platformRole = (profile?.platform_role ?? null) as "super_admin" | null;
  const isSuperAdmin = platformRole === USER_ROLES.SUPER_ADMIN;
  const userName =
    profile?.full_name?.trim() || user.email?.split("@")[0] || "Gebruiker";

  if (!membership) {
    return {
      user,
      organizationId: null,
      role: null,
      organizationName: null,
      userName,
      platformRole,
      isSuperAdmin,
    };
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.organization_id)
    .maybeSingle();

  return {
    user,
    organizationId: membership.organization_id,
    role: membership.role,
    organizationName: organization?.name ?? null,
    userName,
    platformRole,
    isSuperAdmin,
  };
});

export async function requireOrganization(locale: string): Promise<AppSession> {
  const session = await getAppSession();

  if (!session) {
    redirect({ href: "/login", locale });
  }

  // redirect() never returns; narrow for TypeScript
  const resolved = session!;

  if (!resolved.organizationId) {
    if (resolved.isSuperAdmin) return resolved;
    redirect({ href: "/onboarding/company", locale });
  }

  return resolved;
}

export async function requireSuperAdmin(locale: string): Promise<AppSession> {
  const session = await requireOrganization(locale);
  if (!session.isSuperAdmin) {
    redirect({ href: "/werk", locale });
  }
  return session;
}

/** Requires an organization membership (not super-admin-only). */
export async function requireTenantOrganization(
  locale: string,
): Promise<AppSession & { organizationId: string }> {
  const session = await requireOrganization(locale);
  if (!session.organizationId) {
    redirect({ href: "/onboarding/company", locale });
  }
  return session as AppSession & { organizationId: string };
}
