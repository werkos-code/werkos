import { NextResponse } from "next/server";

import {
  MAX_QUOTE_FILE_BYTES,
  QUOTE_FILES_BUCKET,
  quoteFileStoragePath,
} from "@/features/quotes/lib/quote-attachments";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ quoteId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId } = await params;
    const admin = createAdminClient();

    const { data: quote } = await admin
      .from("quotes")
      .select("id")
      .eq("organization_id", gate.organizationId)
      .eq("id", quoteId)
      .maybeSingle();

    if (!quote) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("quote_attachments")
      .select("id, quote_id, name, mime_type, size_bytes, created_at")
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      attachments: (data ?? []).map((row) => ({
        id: row.id,
        quoteId: row.quote_id,
        name: row.name,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId } = await params;
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }
    if (file.size > MAX_QUOTE_FILE_BYTES) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }

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

    const fileId = crypto.randomUUID();
    const path = quoteFileStoragePath(
      gate.organizationId,
      quoteId,
      fileId,
      file.name,
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(QUOTE_FILES_BUCKET)
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data, error } = await admin
      .from("quote_attachments")
      .insert({
        id: fileId,
        organization_id: gate.organizationId,
        quote_id: quoteId,
        name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      await admin.storage.from(QUOTE_FILES_BUCKET).remove([path]);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attachmentId: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
