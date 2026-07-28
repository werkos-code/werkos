"use server";

import { getAppSession } from "@/features/shell/lib/require-organization";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import { createClient } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  projectId: string | null;
  readAt: string | null;
  createdAt: string;
};

function mapNotification(row: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  project_id: string | null;
  read_at: string | null;
  created_at: string;
}): NotificationRow {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    projectId: row.project_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function listNotifications(limit = 50): Promise<{
  notifications?: NotificationRow[];
  unreadCount?: number;
  error?: string;
}> {
  const session = await getAppSession();
  if (!session?.user) return { error: "unauthorized" };
  if (!session.organizationId) return { error: "no_organization" };

  const supabase = await createClient();
  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        "id, type, title, body, entity_type, entity_id, project_id, read_at, created_at",
      )
      .eq("organization_id", session.organizationId)
      .eq("recipient_user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", session.organizationId)
      .eq("recipient_user_id", session.user.id)
      .is("read_at", null),
  ]);

  if (error) return { error: error.message };

  return {
    notifications: (data ?? []).map(mapNotification),
    unreadCount: count ?? 0,
  };
}

export async function getUnreadNotificationCount(): Promise<{
  count?: number;
  error?: string;
}> {
  const session = await getAppSession();
  if (!session?.user || !session.organizationId) return { count: 0 };

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", session.organizationId)
    .eq("recipient_user_id", session.user.id)
    .is("read_at", null);

  if (error) return { error: error.message };
  return { count: count ?? 0 };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ error?: string }> {
  const session = await getAppSession();
  if (!session?.user || !session.organizationId) return { error: "unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_user_id", session.user.id)
    .eq("organization_id", session.organizationId);

  if (error) return { error: error.message };
  return {};
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const session = await getAppSession();
  if (!session?.user || !session.organizationId) return { error: "unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_user_id", session.user.id)
    .eq("organization_id", session.organizationId)
    .is("read_at", null);

  if (error) return { error: error.message };
  return {};
}
