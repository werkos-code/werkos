import type { NotificationRow } from "@/features/notifications/notifications-actions";

const EVENT_TITLE_KEYS = new Set([
  "project_created",
  "status_changed",
  "quote_sent",
  "quote_accepted",
  "quote_rejected",
  "quote_cancelled",
  "work_item_completed",
  "work_item_assigned",
  "invoice_sent",
  "invoice_paid",
  "appointment_created",
  "appointment_updated",
  "appointment_assigned",
  "inbox_message",
  "work_order_created",
  "work_order_assigned",
  "work_order_completed",
]);

export function notificationHref(notification: NotificationRow): string | null {
  const entityType = notification.entityType;
  const entityId = notification.entityId;
  const projectId = notification.projectId;

  if (entityType === "quote" && projectId && entityId) {
    return `/projecten/${projectId}/offertes/${entityId}`;
  }
  if (entityType === "work_item" && projectId) {
    return `/projecten/${projectId}?tab=work`;
  }
  if (entityType === "invoice" && entityId) {
    return `/facturen/${entityId}`;
  }
  if (entityType === "conversation" && entityId) {
    return `/inbox/${entityId}`;
  }
  if (entityType === "appointment") {
    return "/planning";
  }
  if (entityType === "work_order") {
    return "/werkbonnen";
  }
  if (projectId) {
    return `/projecten/${projectId}`;
  }
  return null;
}

export function notificationEventTitle(
  notification: NotificationRow,
  t: (key: string) => string,
): string {
  if (EVENT_TITLE_KEYS.has(notification.type)) {
    return t(`events.${notification.type}`);
  }
  return notification.title;
}

export function formatNotificationTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
