"use server";

import { PRICING } from "@/config/pricing";
import { provisionOrganization } from "@/features/onboarding/provision";
import { createClient } from "@/lib/supabase/server";

export type OnboardingDraft = {
  user_id: string;
  step: string;
  company_name: string | null;
  industry: string | null;
  industry_other: string | null;
  office_seats: number;
  field_seats: number;
  stripe_checkout_session_id: string | null;
};

export async function getOnboardingDraft(): Promise<OnboardingDraft | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("onboarding_drafts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getOnboardingDraft", error.message);
    return null;
  }

  return data;
}

export async function saveCompanyDraft(input: {
  companyName: string;
  industry: string;
  industryOther?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const companyName = input.companyName.trim();
  if (!companyName) return { error: "company_name_required" };

  const { error } = await supabase.from("onboarding_drafts").upsert(
    {
      user_id: user.id,
      company_name: companyName,
      industry: input.industry,
      industry_other:
        input.industry === "other" ? input.industryOther?.trim() ?? null : null,
      step: "team",
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };
  return {};
}

export async function saveTeamDraft(input: {
  officeSeats: number;
  fieldSeats: number;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const { error } = await supabase.from("onboarding_drafts").upsert(
    {
      user_id: user.id,
      office_seats: Math.max(0, input.officeSeats),
      field_seats: Math.max(0, input.fieldSeats),
      step: "complete",
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };
  return {};
}

/**
 * Finish onboarding without Stripe: provision org + 14-day free trial.
 */
export async function completeOnboardingAction(input: {
  officeSeats: number;
  fieldSeats: number;
}): Promise<{ error?: string; organizationId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const officeSeats = Math.max(0, input.officeSeats);
  const fieldSeats = Math.max(0, input.fieldSeats);

  const { data: draft, error: draftError } = await supabase
    .from("onboarding_drafts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (draftError) return { error: draftError.message };
  if (!draft?.company_name) return { error: "incomplete_draft" };

  const { error: saveError } = await supabase.from("onboarding_drafts").upsert(
    {
      user_id: user.id,
      office_seats: officeSeats,
      field_seats: fieldSeats,
      step: "complete",
    },
    { onConflict: "user_id" },
  );
  if (saveError) return { error: saveError.message };

  const industry =
    draft.industry === "other" ? draft.industry_other : draft.industry;

  try {
    const organizationId = await provisionOrganization({
      userId: user.id,
      companyName: draft.company_name,
      industry: industry ?? null,
      officeSeats,
      fieldSeats,
      status: "trialing",
      trialEndsAt: new Date(
        Date.now() + PRICING.trialDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });
    return { organizationId };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "provisioning_failed";
    return { error: message };
  }
}

export async function userHasOrganization(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (error) {
    console.error("userHasOrganization", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}
