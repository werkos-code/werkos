import { USER_ROLES } from "@/config/roles";

export type StaffAssignableRole =
  | typeof USER_ROLES.OFFICE_EMPLOYEE
  | typeof USER_ROLES.FIELD_EMPLOYEE;

export const STAFF_ASSIGNABLE_ROLES: StaffAssignableRole[] = [
  USER_ROLES.OFFICE_EMPLOYEE,
  USER_ROLES.FIELD_EMPLOYEE,
];
