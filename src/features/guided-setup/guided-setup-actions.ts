"use server";

import { USER_ROLES } from "@/config/roles";
import { getAppSession } from "@/features/shell/lib/require-organization";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import { createClient } from "@/lib/supabase/server";

export type GuidedSetupAudience = "owner" | "staff";

export type GuidedSetupStepId =
  | "company"
  | "assignment"
  | "quote"
  | "projects"
  | "work";

export type GuidedSetupStep = {
  id: GuidedSetupStepId;
  done: boolean;
  href: string;
};

export type GuidedSetupState = {
  audience: GuidedSetupAudience;
  showIntro: boolean;
  showChecklist: boolean;
  steps: GuidedSetupStep[];
  allDone: boolean;
};

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

export async function getGuidedSetupState(): Promise<{
  state?: GuidedSetupState;
  error?: string;
}> {
  const session = await getAppSession();
  if (!session?.user) return { error: "unauthorized" };
  if (!session.organizationId) return { error: "no_organization" };

  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "guided_setup_intro_completed_at, guided_setup_dismissed_at",
    )
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError) {
    // Column missing until SQL is applied — fail soft
    if (
      profileError.message.includes("guided_setup") ||
      profileError.message.includes("schema cache")
    ) {
      return {
        state: {
          audience: session.role === USER_ROLES.OWNER ? "owner" : "staff",
          showIntro: false,
          showChecklist: false,
          steps: [],
          allDone: true,
        },
      };
    }
    return { error: profileError.message };
  }

  const isOwner = session.role === USER_ROLES.OWNER;
  const audience: GuidedSetupAudience = isOwner ? "owner" : "staff";

  const [
    { data: organization },
    { count: projectCount },
    { count: quoteCount },
    { count: assignedCount },
  ] = await Promise.all([
    ctx.supabase
      .from("organizations")
      .select("address, city, kvk_number, logo_path")
      .eq("id", ctx.organizationId)
      .maybeSingle(),
    ctx.supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    ctx.supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    ctx.supabase
      .from("work_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId)
      .eq("assignee_user_id", ctx.userId),
  ]);

  const hasProjects = (projectCount ?? 0) > 0;
  const hasQuotes = (quoteCount ?? 0) > 0;
  const hasAssignedWork = (assignedCount ?? 0) > 0;
  const companyDone = organization
    ? isCompanyProfileReady(organization)
    : false;

  const steps: GuidedSetupStep[] = isOwner
    ? [
        {
          id: "company",
          done: companyDone,
          href: "/instellingen/bedrijf",
        },
        {
          id: "assignment",
          done: hasProjects,
          href: "/opdrachten/nieuw",
        },
        {
          id: "quote",
          done: hasQuotes,
          href: hasProjects ? "/offertes" : "/opdrachten/nieuw",
        },
      ]
    : [
        {
          id: "projects",
          done: hasProjects,
          href: "/projecten",
        },
        {
          id: "work",
          done: hasAssignedWork || hasProjects,
          href: "/werkzaamheden",
        },
      ];

  const allDone = steps.every((step) => step.done);
  const introCompleted = Boolean(profile?.guided_setup_intro_completed_at);
  const checklistDismissed = Boolean(profile?.guided_setup_dismissed_at);

  return {
    state: {
      audience,
      showIntro: !introCompleted,
      showChecklist: !checklistDismissed && !allDone,
      steps,
      allDone,
    },
  };
}

export async function completeGuidedSetupIntro(): Promise<{ error?: string }> {
  const session = await getAppSession();
  if (!session?.user) return { error: "unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ guided_setup_intro_completed_at: new Date().toISOString() })
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

export async function dismissGuidedSetupChecklist(): Promise<{
  error?: string;
}> {
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

/** Re-open intro + checklist from Help. */
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
