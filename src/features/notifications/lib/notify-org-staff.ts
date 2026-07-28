import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function notifyOrgStaff(
  admin: AdminClient,
  input: {
    organizationId: string;
    actorUserId?: string | null;
    type: string;
    title: string;
    body?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    projectId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { data: memberships } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .in("role", ["owner", "office_employee", "field_employee"]);

  const recipientIds = (memberships ?? [])
    .map((m) => m.user_id)
    .filter((id) => id !== input.actorUserId);

  if (recipientIds.length === 0) return;

  const rows = recipientIds.map((recipientUserId) => ({
    organization_id: input.organizationId,
    recipient_user_id: recipientUserId,
    actor_user_id: input.actorUserId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    project_id: input.projectId ?? null,
    metadata: (input.metadata ?? {}) as Json,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    console.error("notifyOrgStaff failed", error.message);
  }
}
