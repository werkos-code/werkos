import { USER_ROLES, type OrganizationRole } from "@/config/roles";
import type { PlatformUserRow } from "@/features/platform/users-actions";

export const PLATFORM_USER_TABLE_ORDER = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.OWNER,
  USER_ROLES.OFFICE_EMPLOYEE,
  USER_ROLES.FIELD_EMPLOYEE,
  USER_ROLES.CUSTOMER,
  "unassigned",
] as const;

export type PlatformUserTableKey = (typeof PLATFORM_USER_TABLE_ORDER)[number];

const ORG_ROLE_PRIORITY: OrganizationRole[] = [
  USER_ROLES.OWNER,
  USER_ROLES.OFFICE_EMPLOYEE,
  USER_ROLES.FIELD_EMPLOYEE,
  USER_ROLES.CUSTOMER,
];

export function primaryPlatformUserRole(
  user: PlatformUserRow,
): PlatformUserTableKey {
  if (user.platformRole === USER_ROLES.SUPER_ADMIN) {
    return USER_ROLES.SUPER_ADMIN;
  }

  const membershipRoles = new Set(user.memberships.map((m) => m.role));
  for (const role of ORG_ROLE_PRIORITY) {
    if (membershipRoles.has(role)) return role;
  }

  return "unassigned";
}

export function groupUsersByRole(
  users: PlatformUserRow[],
): Record<PlatformUserTableKey, PlatformUserRow[]> {
  const grouped = Object.fromEntries(
    PLATFORM_USER_TABLE_ORDER.map((key) => [key, [] as PlatformUserRow[]]),
  ) as Record<PlatformUserTableKey, PlatformUserRow[]>;

  for (const user of users) {
    grouped[primaryPlatformUserRole(user)].push(user);
  }

  return grouped;
}
