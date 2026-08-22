import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export async function writePlatformAuditLog(input: {
  actorUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, Json | undefined>;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("platform_audit_log").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: (input.metadata ?? {}) as Json,
  });

  if (error) return { error: error.message };
  return {};
}
