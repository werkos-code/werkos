import { NextResponse } from "next/server";

import { parseQuantity } from "@/features/materials/lib/materials";
import { applyReservationDelta } from "@/features/materials/lib/stock-balance";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export async function GET() {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("stock_reservations")
      .select(
        "id, article_id, location_id, project_id, quantity, notes, created_at",
      )
      .eq("organization_id", gate.organizationId)
      .is("released_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const articleIds = [...new Set((data ?? []).map((row) => row.article_id))];
    const locationIds = [...new Set((data ?? []).map((row) => row.location_id))];
    const projectIds = [
      ...new Set(
        (data ?? []).map((row) => row.project_id).filter(Boolean) as string[],
      ),
    ];

    const [{ data: articles }, { data: locations }, { data: projects }] =
      await Promise.all([
        articleIds.length
          ? admin.from("articles").select("id, name").in("id", articleIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
        locationIds.length
          ? admin
              .from("stock_locations")
              .select("id, name")
              .in("id", locationIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
        projectIds.length
          ? admin.from("projects").select("id, name").in("id", projectIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      ]);

    const articleById = new Map(
      (articles ?? []).map((row) => [row.id, row.name] as const),
    );
    const locationById = new Map(
      (locations ?? []).map((row) => [row.id, row.name] as const),
    );
    const projectById = new Map(
      (projects ?? []).map((row) => [row.id, row.name] as const),
    );

    return NextResponse.json({
      reservations: (data ?? []).map((row) => ({
        id: row.id,
        articleId: row.article_id,
        articleName: articleById.get(row.article_id) ?? "—",
        locationId: row.location_id,
        locationName: locationById.get(row.location_id) ?? "—",
        projectId: row.project_id,
        projectName: row.project_id
          ? (projectById.get(row.project_id) ?? "—")
          : null,
        quantity: Number(row.quantity),
        notes: row.notes,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      articleId?: string;
      locationId?: string;
      projectId?: string | null;
      materialLineId?: string | null;
      quantity?: number | string;
      notes?: string | null;
    };

    const articleId = body.articleId?.trim() ?? "";
    const locationId = body.locationId?.trim() ?? "";
    const quantity = parseQuantity(body.quantity);

    if (!articleId || !locationId || quantity == null || quantity <= 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const delta = await applyReservationDelta(
      admin,
      gate.organizationId,
      articleId,
      locationId,
      quantity,
    );

    if (!delta.ok) {
      return NextResponse.json({ error: delta.error }, { status: 400 });
    }

    const { data, error } = await admin
      .from("stock_reservations")
      .insert({
        organization_id: gate.organizationId,
        article_id: articleId,
        location_id: locationId,
        project_id: emptyToNull(body.projectId),
        material_line_id: emptyToNull(body.materialLineId),
        quantity,
        notes: emptyToNull(body.notes),
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      await applyReservationDelta(
        admin,
        gate.organizationId,
        articleId,
        locationId,
        -quantity,
      );
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reservationId: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as { id?: string; release?: boolean };
    const id = body.id?.trim() ?? "";
    if (!id || body.release !== true) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: reservation } = await admin
      .from("stock_reservations")
      .select("id, article_id, location_id, quantity, released_at")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!reservation) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (reservation.released_at) {
      return NextResponse.json({ error: "already_released" }, { status: 409 });
    }

    const quantity = Number(reservation.quantity);
    const delta = await applyReservationDelta(
      admin,
      gate.organizationId,
      reservation.article_id,
      reservation.location_id,
      -quantity,
    );

    if (!delta.ok) {
      return NextResponse.json({ error: delta.error }, { status: 400 });
    }

    const { error } = await admin
      .from("stock_reservations")
      .update({ released_at: new Date().toISOString() })
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      await applyReservationDelta(
        admin,
        gate.organizationId,
        reservation.article_id,
        reservation.location_id,
        quantity,
      );
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
