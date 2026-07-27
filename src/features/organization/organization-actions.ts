"use server";

import {
  mapOrganizationLetterhead,
  ORGANIZATION_LETTERHEAD_SELECT,
  type OrganizationLetterhead,
} from "@/features/organization/lib/organization-letterhead";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";

export type OrganizationProfile = OrganizationLetterhead & {
  id: string;
  slug: string;
  updatedAt: string;
};

export async function getOrganizationProfile(): Promise<{
  organization?: OrganizationProfile;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("organizations")
    .select(ORGANIZATION_LETTERHEAD_SELECT)
    .eq("id", ctx.organizationId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "not_found" };

  return {
    organization: {
      id: data.id,
      slug: data.slug,
      updatedAt: data.updated_at,
      ...mapOrganizationLetterhead(data),
    },
  };
}
