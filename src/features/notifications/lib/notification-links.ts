import type { NotificationRow } from "@/features/notifications/notifications-actions";

export function notificationHref(notification: NotificationRow): string | null {
  if (
    notification.projectId &&
    notification.entityType === "quote" &&
    notification.entityId
  ) {
    return `/projecten/${notification.projectId}/offertes/${notification.entityId}`;
  }
  if (notification.projectId && notification.entityType === "work_item") {
    return `/projecten/${notification.projectId}?tab=work`;
  }
  if (notification.projectId) {
    return `/projecten/${notification.projectId}`;
  }
  if (notification.entityType === "invoice" && notification.entityId) {
    return `/facturen/${notification.entityId}`;
  }
  return null;
}
