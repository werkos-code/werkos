import { NextResponse } from "next/server";

import { QUOTE_FILES_BUCKET } from "@/features/quotes/lib/quote-attachments";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ quoteId: string; attachmentId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId, attachmentId } = await params;
    const admin = createAdminClient();
    const { data: file } = await admin
      .from("quote_attachments")
      .select("id, name, storage_path")
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId)
      .eq("id", attachmentId)
      .maybeSingle();

    if (!file) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data, error } = await admin.storage
      .from(QUOTE_FILES_BUCKET)
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

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId, attachmentId } = await params;
    const admin = createAdminClient();

    const { data: quote } = await admin
      .from("quotes")
      .select("id, status")
      .eq("organization_id", gate.organizationId)
      .eq("id", quoteId)
      .maybeSingle();

    if (!quote) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (quote.status !== "draft") {
      return NextResponse.json({ error: "not_editable" }, { status: 400 });
    }

    const { data: file } = await admin
      .from("quote_attachments")
      .select("id, storage_path")
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId)
      .eq("id", attachmentId)
      .maybeSingle();

    if (!file) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { error } = await admin
      .from("quote_attachments")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("id", attachmentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.storage.from(QUOTE_FILES_BUCKET).remove([file.storage_path]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
