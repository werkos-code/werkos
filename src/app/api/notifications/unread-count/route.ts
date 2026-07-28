import { NextResponse } from "next/server";

import { getUnreadNotificationCount } from "@/features/notifications/notifications-actions";

export async function GET() {
  const result = await getUnreadNotificationCount();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ count: result.count ?? 0 });
}
