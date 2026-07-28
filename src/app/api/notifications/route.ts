import { NextResponse } from "next/server";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/notifications-actions";

export async function GET() {
  const result = await listNotifications();
  if (result.error) {
    const status =
      result.error === "unauthorized"
        ? 401
        : result.error === "no_organization"
          ? 403
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({
    notifications: result.notifications,
    unreadCount: result.unreadCount,
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: string; all?: boolean };

  if (body.all) {
    const result = await markAllNotificationsRead();
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ success: true });
  }

  const id = body.id?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await markNotificationRead(id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  return NextResponse.json({ success: true });
}
