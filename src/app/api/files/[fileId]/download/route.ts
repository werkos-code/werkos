import { NextResponse } from "next/server";

import { PROJECT_FILES_BUCKET } from "@/features/files/lib/files";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { fileId } = await params;
    const admin = createAdminClient();
    const { data: file } = await admin
      .from("project_files")
      .select("id, name, storage_path")
      .eq("organization_id", gate.organizationId)
      .eq("id", fileId)
      .maybeSingle();

    if (!file) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data, error } = await admin.storage
      .from(PROJECT_FILES_BUCKET)
      .createSignedUrl(file.storage_path, 60 * 10);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message ?? "signed_url_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: data.signedUrl,
      name: file.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "download_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
