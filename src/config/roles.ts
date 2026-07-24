/**
 * Application roles.
 * Persist these as a Postgres enum when the schema is introduced.
 * Every authorization check must use these constants — never raw strings.
 */
export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  OWNER: "owner",
  EMPLOYEE: "employee",
  CUSTOMER: "customer",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ORGANIZATION_ROLES = [
  USER_ROLES.OWNER,
  USER_ROLES.EMPLOYEE,
  USER_ROLES.CUSTOMER,
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    Object.values(USER_ROLES).includes(value as UserRole)
  );
}

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === USER_ROLES.SUPER_ADMIN;
}

export function isOrganizationRole(
  role: UserRole | null | undefined,
): role is OrganizationRole {
  return (
    role === USER_ROLES.OWNER ||
    role === USER_ROLES.EMPLOYEE ||
    role === USER_ROLES.CUSTOMER
  );
}
