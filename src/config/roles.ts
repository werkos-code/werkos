/**
 * Application and organization roles.
 * Persist these as Postgres enums when the schema is introduced.
 * Every authorization check must use these constants — never raw strings.
 *
 * Platform role (WerkOS internal):
 * - super_admin
 *
 * Organization roles (via membership):
 * - owner — exactly one per organization; a user may own multiple orgs
 * - office_employee — staff; exactly one organization
 * - field_employee — field staff; exactly one organization
 * - customer — customer portal; a user may be customer of multiple orgs
 */
export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  OWNER: "owner",
  OFFICE_EMPLOYEE: "office_employee",
  FIELD_EMPLOYEE: "field_employee",
  CUSTOMER: "customer",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Roles that exist on an organization membership (not platform). */
export const ORGANIZATION_ROLES = [
  USER_ROLES.OWNER,
  USER_ROLES.OFFICE_EMPLOYEE,
  USER_ROLES.FIELD_EMPLOYEE,
  USER_ROLES.CUSTOMER,
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const STAFF_ROLES = [
  USER_ROLES.OFFICE_EMPLOYEE,
  USER_ROLES.FIELD_EMPLOYEE,
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    Object.values(USER_ROLES).includes(value as UserRole)
  );
}

export function isOrganizationRole(
  role: UserRole | null | undefined,
): role is OrganizationRole {
  return (
    role === USER_ROLES.OWNER ||
    role === USER_ROLES.OFFICE_EMPLOYEE ||
    role === USER_ROLES.FIELD_EMPLOYEE ||
    role === USER_ROLES.CUSTOMER
  );
}

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === USER_ROLES.SUPER_ADMIN;
}

export function isStaffRole(
  role: UserRole | null | undefined,
): role is StaffRole {
  return (
    role === USER_ROLES.OFFICE_EMPLOYEE || role === USER_ROLES.FIELD_EMPLOYEE
  );
}

/**
 * Membership cardinality rules (domain):
 * - owner / customer: multiple organizations allowed
 * - office_employee / field_employee: exactly one organization
 */
export function allowsMultipleOrganizations(role: OrganizationRole): boolean {
  return role === USER_ROLES.OWNER || role === USER_ROLES.CUSTOMER;
}
