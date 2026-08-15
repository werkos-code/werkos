"use server";

import { USER_ROLES } from "@/config/roles";
import {
  type GuidedSetupFlags,
} from "@/features/guided-setup/guided-setup-contexts";
import { getAppSession } from "@/features/shell/lib/require-organization";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import { createClient } from "@/lib/supabase/server";

function isCompanyProfileReady(org: {
  address: string | null;
  city: string | null;
  kvk_number: string | null;
  logo_path: string | null;
}) {
  const hasAddress = Boolean(org.address?.trim() && org.city?.trim());
  const hasIdentity = Boolean(org.logo_path || org.kvk_number?.trim());
  return hasAddress && hasIdentity;
}

function emptyFlags(isOwner: boolean, coachHidden = true): GuidedSetupFlags {
  return {
    isOwner,
    coachHidden,
    hasCompanyProfile: false,
    hasCustomers: false,
    hasProjects: false,
    hasWorkItems: false,
    hasQuotes: false,
    hasInvoices: false,
    hasAppointments: false,
    hasArticles: false,
    hasTeamBeyondOwner: false,
  };
}

export async function getGuidedSetupFlags(): Promise<{
  flags?: GuidedSetupFlags;
  error?: string;
}> {
  const session = await getAppSession();
  if (!session?.user) return { error: "unauthorized" };
  if (!session.organizationId) return { error: "no_organization" };

  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const isOwner = session.role === USER_ROLES.OWNER;
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("guided_setup_dismissed_at")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError) {
    if (
      profileError.message.includes("guided_setup") ||
      profileError.message.includes("schema cache")
    ) {
      return { flags: emptyFlags(isOwner, true) };
    }
    return { error: profileError.message };
  }

  const coachHidden = Boolean(profile?.guided_setup_dismissed_at);

  const [
    { data: organization },
    { count: customerCount },
    { count: projectCount },
    { count: workItemCount },
    { count: quoteCount },
    { count: invoiceCount },
    { count: appointmentCount },
    { count: articleCount },
    { count: memberCount },
  ] = await Promise.all([
    ctx.supabase
      .from("organizations")
      .select("address, city, kvk_number, logo_path")
      .eq("id", ctx.organizationId)
      .maybeSingle(),
    ctx.supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    ctx.supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    ctx.supabase
      .from("work_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    ctx.supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    ctx.supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    ctx.supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    ctx.supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    ctx.supabase
      .from("organization_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
  ]);

  return {
    flags: {
      isOwner,
      coachHidden,
      hasCompanyProfile: organization
        ? isCompanyProfileReady(organization)
        : false,
      hasCustomers: (customerCount ?? 0) > 0,
      hasProjects: (projectCount ?? 0) > 0,
      hasWorkItems: (workItemCount ?? 0) > 0,
      hasQuotes: (quoteCount ?? 0) > 0,
      hasInvoices: (invoiceCount ?? 0) > 0,
      hasAppointments: (appointmentCount ?? 0) > 0,
      hasArticles: (articleCount ?? 0) > 0,
      hasTeamBeyondOwner: (memberCount ?? 0) > 1,
    },
  };
}

/** Hide the coach everywhere until restart from Help. */
export async function dismissGuidedSetupCoach(): Promise<{ error?: string }> {
  const session = await getAppSession();
  if (!session?.user) return { error: "unauthorized" };

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      guided_setup_dismissed_at: now,
      guided_setup_intro_completed_at: now,
    })
    .eq("id", session.user.id);

  if (
    error &&
    !error.message.includes("guided_setup") &&
    !error.message.includes("schema cache")
  ) {
    return { error: error.message };
  }
  return {};
}

/** Re-enable the coach from Help. */
export async function restartGuidedSetup(): Promise<{ error?: string }> {
  const session = await getAppSession();
  if (!session?.user) return { error: "unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      guided_setup_intro_completed_at: null,
      guided_setup_dismissed_at: null,
    })
    .eq("id", session.user.id);

  if (
    error &&
    !error.message.includes("guided_setup") &&
    !error.message.includes("schema cache")
  ) {
    return { error: error.message };
  }
  return {};
}
