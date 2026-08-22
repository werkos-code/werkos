import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { USER_ROLES } from "@/config/roles";
import {
  IMPERSONATION_COOKIE_NAME,
  parseImpersonationCookie,
} from "@/features/platform/lib/impersonation-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

export type ImpersonationContext = {
  targetUserId: string;
  targetUserName: string;
  targetEmail: string;
  organizationId: string;
  organizationName: string;
};

export type AppSession = {
  user: User;
  organizationId: string | null;
  role: string | null;
  organizationName: string | null;
  userName: string;
  platformRole: "super_admin" | null;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  impersonation: ImpersonationContext | null;
};

async function lookupAuthEmail(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return "";
  return data.user.email;
}

async function loadImpersonationOverlay(actor: User): Promise<{
  organizationId: string | null;
  role: string | null;
  organizationName: string | null;
  userName: string;
  impersonation: ImpersonationContext | null;
}> {
  const cookieStore = await cookies();
  const payload = parseImpersonationCookie(
    cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value,
  );

  if (!payload || payload.actorId !== actor.id) {
    return {
      organizationId: null,
      role: null,
      organizationName: null,
      userName: "",
      impersonation: null,
    };
  }

  const supabase = await createClient();
  const [{ data: membership }, { data: targetProfile }, { data: organization }] =
    await Promise.all([
      supabase
        .from("organization_memberships")
        .select("role")
        .eq("organization_id", payload.organizationId)
        .eq("user_id", payload.targetUserId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name, platform_role")
        .eq("id", payload.targetUserId)
        .maybeSingle(),
      supabase
        .from("organizations")
        .select("name")
        .eq("id", payload.organizationId)
        .maybeSingle(),
    ]);

  if (!membership || targetProfile?.platform_role === USER_ROLES.SUPER_ADMIN) {
    return {
      organizationId: null,
      role: null,
      organizationName: null,
      userName: "",
      impersonation: null,
    };
  }

  const targetEmail = await lookupAuthEmail(payload.targetUserId);
  const targetUserName =
    targetProfile?.full_name?.trim() ||
    targetEmail.split("@")[0] ||
    "Gebruiker";

  return {
    organizationId: payload.organizationId,
    role: membership.role,
    organizationName: organization?.name ?? null,
    userName: targetUserName,
    impersonation: {
      targetUserId: payload.targetUserId,
      targetUserName,
      targetEmail,
      organizationId: payload.organizationId,
      organizationName: organization?.name ?? "",
    },
  };
}

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
  const actorUserName =
    profile?.full_name?.trim() || user.email?.split("@")[0] || "Gebruiker";

  if (isSuperAdmin) {
    const overlay = await loadImpersonationOverlay(user);
    if (overlay.impersonation) {
      return {
        user,
        organizationId: overlay.organizationId,
        role: overlay.role,
        organizationName: overlay.organizationName,
        userName: overlay.userName,
        platformRole,
        isSuperAdmin,
        isImpersonating: true,
        impersonation: overlay.impersonation,
      };
    }
  }

  if (!membership) {
    return {
      user,
      organizationId: null,
      role: null,
      organizationName: null,
      userName: actorUserName,
      platformRole,
      isSuperAdmin,
      isImpersonating: false,
      impersonation: null,
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
    userName: actorUserName,
    platformRole,
    isSuperAdmin,
    isImpersonating: false,
    impersonation: null,
  };
});

export async function requireOrganization(locale: string): Promise<AppSession> {
  const session = await getAppSession();

  if (!session) {
    redirect({ href: "/login", locale });
  }

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
    redirect({ href: "/dashboard", locale });
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
