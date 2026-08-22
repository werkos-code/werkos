import type { AppointmentStatus, AppointmentType } from "@/types/database";

export type AppointmentPayload = {
  id?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  type?: AppointmentType;
  status?: AppointmentStatus;
  projectId?: string | null;
  workItemId?: string | null;
  assigneeUserId?: string | null;
  location?: string | null;
  notes?: string | null;
};

export async function createAppointment(payload: AppointmentPayload) {
  const res = await fetch("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  const result = (await res.json()) as { error?: string; appointmentId?: string };
  if (!res.ok || result.error) {
    throw new Error(result.error ?? "create_failed");
  }
  return result.appointmentId!;
}

export async function updateAppointment(payload: AppointmentPayload & { id: string }) {
  const res = await fetch("/api/appointments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  const result = (await res.json()) as { error?: string };
  if (!res.ok || result.error) {
    throw new Error(result.error ?? "update_failed");
  }
}

export async function deleteAppointment(id: string) {
  const res = await fetch("/api/appointments", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
    signal: AbortSignal.timeout(20_000),
  });
  const result = (await res.json()) as { error?: string };
  if (!res.ok || result.error) {
    throw new Error(result.error ?? "delete_failed");
  }
}
