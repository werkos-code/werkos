import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

export type NotifyAudience = "staff" | "assignees";

export type NotifyStaffInput = {
  organizationId: string;
  actorUserId?: string | null;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
  extraRecipientIds?: string[];
  /** `staff` (default): whole org except actor. `assignees`: only extraRecipientIds. */
  audience?: NotifyAudience;
};

const STAFF_ROLES = ["owner", "office_employee", "field_employee"] as const;

/**
 * Writes in-app notifications.
 * Staff broadcasts skip the actor; if nobody else is in the org, the actor
 * still gets the row so a solo operator sees the bell work.
 * Assignee-only events never notify the person who just assigned themselves.
 */
export async function notifyOrgStaff(
  admin: AdminClient,
  input: NotifyStaffInput,
) {
  const { data: memberships } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .in("role", [...STAFF_ROLES]);

  const staffIds = (memberships ?? [])
    .map((row) => row.user_id)
    .filter(Boolean);
  const actorId = input.actorUserId ?? null;
  const extraIds = (input.extraRecipientIds ?? []).filter(Boolean);
  const audience = input.audience ?? "staff";

  let recipients: string[];
  if (audience === "assignees") {
    recipients = extraIds.filter((id) => id !== actorId);
  } else {
    const set = new Set(staffIds.filter((id) => id !== actorId));
    for (const id of extraIds) {
      if (id !== actorId) set.add(id);
    }
    recipients = [...set];
    if (recipients.length === 0 && actorId && staffIds.includes(actorId)) {
      recipients = [actorId];
    }
  }

  recipients = [...new Set(recipients)];
  if (recipients.length === 0) return;

  const rows = recipients.map((recipientUserId) => ({
    organization_id: input.organizationId,
    recipient_user_id: recipientUserId,
    actor_user_id: actorId,
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
