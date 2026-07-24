import type { OrganizationRole, UserRole } from "@/config/roles";

/**
 * Auth-related domain types.
 * Expand when profiles / memberships land in the database.
 *
 * Organization access is via memberships. `activeOrganizationId` is the
 * currently selected company in the UI (owners/customers may have several).
 */
export type AuthUserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  /** Platform role when super_admin; otherwise null at platform level. */
  platformRole: Extract<UserRole, "super_admin"> | null;
  activeOrganizationId: string | null;
  activeOrganizationRole: OrganizationRole | null;
  avatarUrl: string | null;
};
