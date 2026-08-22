import { NextResponse } from "next/server";

import {
  getPlanningSettings,
  savePlanningSettings,
} from "@/features/planning/planning-actions";
import { requireWritableApiStaff } from "@/features/shell/lib/api-staff";

export async function GET() {
  const result = await getPlanningSettings();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ settings: result.settings });
}

export async function PATCH(request: Request) {
  const gate = await requireWritableApiStaff();
  if ("error" in gate) return gate.error;

  const body = (await request.json()) as {
    workDays?: number[];
    dayStartHour?: number;
    dayEndHour?: number;
    markComplete?: boolean;
  };

  const result = await savePlanningSettings({
    workDays: body.workDays ?? [],
    dayStartHour: body.dayStartHour ?? 7,
    dayEndHour: body.dayEndHour ?? 17,
    markComplete: body.markComplete ?? true,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ settings: result.settings });
}
