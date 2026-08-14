import { notifyOrgStaff } from "@/features/notifications/lib/notify-org-staff";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json, ProjectActivityType } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Activity types that should appear in the in-app bell. */
const ACTIVITY_NOTIFICATION: Partial<
  Record<ProjectActivityType, { entityType: string }>
> = {
  project_created: { entityType: "project" },
  status_changed: { entityType: "project" },
  quote_sent: { entityType: "quote" },
  quote_accepted: { entityType: "quote" },
  quote_rejected: { entityType: "quote" },
  quote_cancelled: { entityType: "quote" },
  work_item_completed: { entityType: "work_item" },
};

function metadataId(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export async function logProjectActivity(
  admin: AdminClient,
  input: {
    organizationId: string;
    projectId: string;
    type: ProjectActivityType;
    title: string;
    body?: string | null;
    metadata?: Record<string, unknown>;
    createdBy?: string | null;
    entityType?: string | null;
    entityId?: string | null;
  },
) {
  const { error } = await admin.from("project_activities").insert({
    organization_id: input.organizationId,
    project_id: input.projectId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    metadata: (input.metadata ?? {}) as Json,
    created_by: input.createdBy ?? null,
  });

  if (error) {
    console.error("logProjectActivity failed", error.message);
    return;
  }

  const notifySpec = ACTIVITY_NOTIFICATION[input.type];
  if (!notifySpec) return;

  const entityType = input.entityType ?? notifySpec.entityType;
  const entityId =
    input.entityId ??
    metadataId(input.metadata, "quote_id") ??
    metadataId(input.metadata, "work_item_id") ??
    (entityType === "project" ? input.projectId : null);

  await notifyOrgStaff(admin, {
    organizationId: input.organizationId,
    actorUserId: input.createdBy ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    entityType,
    entityId,
    projectId: input.projectId,
    metadata: input.metadata,
  });
}

export function quoteStatusActivityType(
  status: string,
): ProjectActivityType | null {
  switch (status) {
    case "sent":
      return "quote_sent";
    case "accepted":
      return "quote_accepted";
    case "rejected":
      return "quote_rejected";
    case "cancelled":
      return "quote_cancelled";
    default:
      return null;
  }
}
