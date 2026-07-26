import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json, ProjectActivityType } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

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
  }
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
