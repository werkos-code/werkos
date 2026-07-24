/**
 * Organization is the multi-tenant root.
 * Every business entity must reference an organizationId.
 */
export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: "owner" | "employee" | "customer";
  createdAt: string;
};
