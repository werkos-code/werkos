import type { UserRole } from "@/config/roles";

/**
 * Auth-related domain types.
 * Expand when profiles / memberships land in the database.
 */
export type AuthUserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  organizationId: string | null;
  avatarUrl: string | null;
};
