import { NextResponse } from "next/server";

import { logProjectActivity } from "@/features/projects/lib/project-activity";
import {
  PROJECT_COVERS_BUCKET,
  projectCoverStoragePath,
} from "@/features/projects/lib/project-cover";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ projectId: string }> };

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionForMime(mime: string) {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const { projectId } = await params;
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: project } = await admin
      .from("projects")
      .select("id, cover_path")
      .eq("organization_id", gate.organizationId)
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const path = projectCoverStoragePath(
      gate.organizationId,
      projectId,
      extensionForMime(file.type),
    );

    if (project.cover_path && project.cover_path !== path) {
      await admin.storage
        .from(PROJECT_COVERS_BUCKET)
        .remove([project.cover_path]);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(PROJECT_COVERS_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { error } = await admin
      .from("projects")
      .update({ cover_path: path })
      .eq("organization_id", gate.organizationId)
      .eq("id", projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "cover_updated",
      title: "Projectafbeelding bijgewerkt",
      createdBy: gate.userId,
    });

    return NextResponse.json({ coverPath: path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const { projectId } = await params;
    const admin = createAdminClient();

    const { data: project } = await admin
      .from("projects")
      .select("id, cover_path")
      .eq("organization_id", gate.organizationId)
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (project.cover_path) {
      await admin.storage
        .from(PROJECT_COVERS_BUCKET)
        .remove([project.cover_path]);
    }

    const { error } = await admin
      .from("projects")
      .update({ cover_path: null })
      .eq("organization_id", gate.organizationId)
      .eq("id", projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "cover_updated",
      title: "Projectafbeelding verwijderd",
      createdBy: gate.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
