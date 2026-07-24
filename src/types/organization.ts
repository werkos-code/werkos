import type { OrganizationRole } from "@/config/roles";

/**
 * Organization is the multi-tenant root.
 * Every business entity must reference an organizationId.
 */
export type Organization = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * User ↔ organization with exactly one role per membership.
 */
export type OrganizationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
};
