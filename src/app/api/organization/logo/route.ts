import { NextResponse } from "next/server";

import {
  ORGANIZATION_LOGOS_BUCKET,
  organizationLogoStoragePath,
} from "@/features/organization/lib/organization-logo";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function POST(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

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
    const { data: organization } = await admin
      .from("organizations")
      .select("id, logo_path")
      .eq("id", gate.organizationId)
      .maybeSingle();

    if (!organization) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const path = organizationLogoStoragePath(
      gate.organizationId,
      extensionForMime(file.type),
    );

    if (organization.logo_path && organization.logo_path !== path) {
      await admin.storage
        .from(ORGANIZATION_LOGOS_BUCKET)
        .remove([organization.logo_path]);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(ORGANIZATION_LOGOS_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { error } = await admin
      .from("organizations")
      .update({ logo_path: path })
      .eq("id", gate.organizationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logoPath: path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const admin = createAdminClient();
    const { data: organization } = await admin
      .from("organizations")
      .select("id, logo_path")
      .eq("id", gate.organizationId)
      .maybeSingle();

    if (!organization) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (organization.logo_path) {
      await admin.storage
        .from(ORGANIZATION_LOGOS_BUCKET)
        .remove([organization.logo_path]);
    }

    const { error } = await admin
      .from("organizations")
      .update({ logo_path: null })
      .eq("id", gate.organizationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
