"use server";

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

  const { data } = await supabase
    .from("onboarding_drafts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

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

  const { error } = await supabase.from("onboarding_drafts").upsert({
    user_id: user.id,
    company_name: input.companyName.trim(),
    industry: input.industry,
    industry_other:
      input.industry === "other" ? input.industryOther?.trim() ?? null : null,
    step: "team",
  });

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

  const { error } = await supabase.from("onboarding_drafts").upsert({
    user_id: user.id,
    office_seats: Math.max(0, input.officeSeats),
    field_seats: Math.max(0, input.fieldSeats),
    step: "payment",
  });

  if (error) return { error: error.message };
  return {};
}

export async function userHasOrganization(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  return (data?.length ?? 0) > 0;
}
