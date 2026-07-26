import { USER_ROLES } from "@/config/roles";
import type { ProjectStatus } from "@/types/database";

export const PROJECT_STATUSES = [
  "preparation",
  "execution",
  "operationally_completed",
  "administratively_completed",
  "completed",
  "archived",
] as const satisfies readonly ProjectStatus[];

export type ProjectListFilter =
  | "new_requests"
  | "active"
  | "completed"
  | "archived"
  | "all";

/** Statuses that belong to each project list filter. */
export const PROJECT_FILTER_STATUSES: Record<
  ProjectListFilter,
  ProjectStatus[] | null
> = {
  new_requests: ["preparation"],
  active: [
    "execution",
    "operationally_completed",
    "administratively_completed",
  ],
  completed: ["completed"],
  archived: ["archived"],
  all: null,
};

export function isOrgStaffRole(role: string | null | undefined): boolean {
  return (
    role === USER_ROLES.OWNER ||
    role === USER_ROLES.OFFICE_EMPLOYEE ||
    role === USER_ROLES.FIELD_EMPLOYEE
  );
}
