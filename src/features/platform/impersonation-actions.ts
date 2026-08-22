"use server";

import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { USER_ROLES } from "@/config/roles";
import { writePlatformAuditLog } from "@/features/platform/lib/audit-log";
import {
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_MAX_AGE_SECONDS,
  serializeImpersonationCookie,
} from "@/features/platform/lib/impersonation-cookie";
import { assertCallerIsSuperAdmin } from "@/features/platform/lib/platform-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "@/i18n/navigation";

async function requestAuditMetadata() {
  const headerStore = await headers();
  return {
    user_agent: headerStore.get("user-agent"),
    forwarded_for: headerStore.get("x-forwarded-for"),
  };
}

export async function startImpersonation(input: {
  targetUserId: string;
  organizationId: string;
}): Promise<{ error?: string }> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const targetUserId = input.targetUserId.trim();
  const organizationId = input.organizationId.trim();
  if (!targetUserId || !organizationId) return { error: "invalid_input" };

  const admin = createAdminClient();

  const [
    { data: targetProfile },
    { data: membership },
    { data: organization },
    targetAuth,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, platform_role")
      .eq("id", targetUserId)
      .maybeSingle(),
    admin
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)
      .maybeSingle(),
    admin.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    admin.auth.admin.getUserById(targetUserId),
  ]);

  if (!membership) return { error: "membership_not_found" };
  if (!organization) return { error: "organization_not_found" };
  if (targetProfile?.platform_role === USER_ROLES.SUPER_ADMIN) {
    return { error: "cannot_impersonate_super_admin" };
  }

  const targetEmail = targetAuth.data.user?.email ?? "";
  const audit = await writePlatformAuditLog({
    actorUserId: gate.user.id,
    action: "impersonation.start",
    targetType: "user",
    targetId: targetUserId,
    metadata: {
      organization_id: organizationId,
      organization_name: organization.name,
      target_email: targetEmail,
      target_role: membership.role,
      ...(await requestAuditMetadata()),
    },
  });
  if (audit.error) return { error: audit.error };

  const cookieStore = await cookies();
  cookieStore.set(
    IMPERSONATION_COOKIE_NAME,
    serializeImpersonationCookie({
      actorId: gate.user.id,
      targetUserId,
      organizationId,
      startedAt: Date.now(),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: IMPERSONATION_MAX_AGE_SECONDS,
    },
  );

  const locale = await getLocale();
  redirect({ href: "/dashboard", locale });
  return { error: "redirect_failed" };
}

export async function stopImpersonation(input?: {
  returnHref?: string;
}): Promise<{ error?: string }> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const cookieStore = await cookies();
  const existing = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;

  if (existing) {
    const audit = await writePlatformAuditLog({
      actorUserId: gate.user.id,
      action: "impersonation.stop",
      targetType: "session",
      metadata: await requestAuditMetadata(),
    });
    if (audit.error) return { error: audit.error };
  }

  cookieStore.delete(IMPERSONATION_COOKIE_NAME);

  const locale = await getLocale();
  redirect({
    href: input?.returnHref ?? "/platform/admin/gebruikers",
    locale,
  });
  return { error: "redirect_failed" };
}
