import { NextResponse } from "next/server";

import {
  MAX_PROJECT_FILE_BYTES,
  PROJECT_FILES_BUCKET,
  projectFileStoragePath,
} from "@/features/files/lib/files";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export async function GET(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId")?.trim() ?? "";
    const folderId = emptyToNull(url.searchParams.get("folderId"));
    if (!projectId) {
      return NextResponse.json({ error: "project_required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: project } = await admin
      .from("projects")
      .select("id, name, project_number")
      .eq("organization_id", gate.organizationId)
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const [foldersResult, filesResult] = await Promise.all([
      admin
        .from("file_folders")
        .select("id, project_id, parent_id, name, created_at")
        .eq("organization_id", gate.organizationId)
        .eq("project_id", projectId)
        .order("name", { ascending: true }),
      admin
        .from("project_files")
        .select(
          "id, project_id, folder_id, name, storage_path, mime_type, size_bytes, created_at",
        )
        .eq("organization_id", gate.organizationId)
        .eq("project_id", projectId)
        .order("name", { ascending: true }),
    ]);

    if (foldersResult.error) {
      return NextResponse.json({ error: foldersResult.error.message }, { status: 500 });
    }
    if (filesResult.error) {
      return NextResponse.json({ error: filesResult.error.message }, { status: 500 });
    }

    const allFolders = foldersResult.data ?? [];
    const folders = allFolders.filter((row) =>
      folderId ? row.parent_id === folderId : row.parent_id == null,
    );
    const files = (filesResult.data ?? []).filter((row) =>
      folderId ? row.folder_id === folderId : row.folder_id == null,
    );

    const byId = new Map(allFolders.map((row) => [row.id, row]));
    const breadcrumbs: typeof allFolders = [];
    let cursor = folderId;
    while (cursor) {
      const folder = byId.get(cursor);
      if (!folder) break;
      breadcrumbs.unshift(folder);
      cursor = folder.parent_id;
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        projectNumber: project.project_number,
      },
      folders: folders.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        parentId: row.parent_id,
        name: row.name,
        createdAt: row.created_at,
      })),
      files: files.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        folderId: row.folder_id,
        name: row.name,
        storagePath: row.storage_path,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        createdAt: row.created_at,
      })),
      breadcrumbs: breadcrumbs.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        parentId: row.parent_id,
        name: row.name,
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

    const contentType = request.headers.get("content-type") ?? "";
    const admin = createAdminClient();

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const projectId = String(form.get("projectId") ?? "").trim();
      const folderId = emptyToNull(String(form.get("folderId") ?? ""));
      const file = form.get("file");

      if (!projectId) {
        return NextResponse.json({ error: "project_required" }, { status: 400 });
      }
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file_required" }, { status: 400 });
      }
      if (file.size > MAX_PROJECT_FILE_BYTES) {
        return NextResponse.json({ error: "file_too_large" }, { status: 400 });
      }

      const { data: project } = await admin
        .from("projects")
        .select("id")
        .eq("organization_id", gate.organizationId)
        .eq("id", projectId)
        .maybeSingle();
      if (!project) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      if (folderId) {
        const { data: folder } = await admin
          .from("file_folders")
          .select("id")
          .eq("organization_id", gate.organizationId)
          .eq("project_id", projectId)
          .eq("id", folderId)
          .maybeSingle();
        if (!folder) {
          return NextResponse.json({ error: "folder_not_found" }, { status: 404 });
        }
      }

      const fileId = crypto.randomUUID();
      const path = projectFileStoragePath(
        gate.organizationId,
        projectId,
        fileId,
        file.name,
      );
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await admin.storage
        .from(PROJECT_FILES_BUCKET)
        .upload(path, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data, error } = await admin
        .from("project_files")
        .insert({
          id: fileId,
          organization_id: gate.organizationId,
          project_id: projectId,
          folder_id: folderId,
          name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          created_by: gate.userId,
        })
        .select("id")
        .single();

      if (error) {
        await admin.storage.from(PROJECT_FILES_BUCKET).remove([path]);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ fileId: data.id });
    }

    const body = (await request.json()) as {
      action?: string;
      projectId?: string;
      parentId?: string | null;
      name?: string;
      folderId?: string;
    };

    if (body.action === "create_folder") {
      const projectId = body.projectId?.trim() ?? "";
      const name = body.name?.trim() ?? "";
      const parentId = emptyToNull(body.parentId);
      if (!projectId || !name) {
        return NextResponse.json({ error: "invalid_input" }, { status: 400 });
      }

      const { data: project } = await admin
        .from("projects")
        .select("id")
        .eq("organization_id", gate.organizationId)
        .eq("id", projectId)
        .maybeSingle();
      if (!project) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      const { data, error } = await admin
        .from("file_folders")
        .insert({
          organization_id: gate.organizationId,
          project_id: projectId,
          parent_id: parentId,
          name,
          created_by: gate.userId,
        })
        .select("id")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ folderId: data.id });
    }

    if (body.action === "rename_folder") {
      const folderId = body.folderId?.trim() ?? "";
      const name = body.name?.trim() ?? "";
      if (!folderId || !name) {
        return NextResponse.json({ error: "invalid_input" }, { status: 400 });
      }
      const { error } = await admin
        .from("file_folders")
        .update({ name })
        .eq("organization_id", gate.organizationId)
        .eq("id", folderId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      type?: "file" | "folder";
      id?: string;
    };
    const id = body.id?.trim() ?? "";
    const type = body.type;
    if (!id || (type !== "file" && type !== "folder")) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();

    if (type === "folder") {
      const [{ count: childFolders }, { count: childFiles }] = await Promise.all([
        admin
          .from("file_folders")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", gate.organizationId)
          .eq("parent_id", id),
        admin
          .from("project_files")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", gate.organizationId)
          .eq("folder_id", id),
      ]);

      if ((childFolders ?? 0) > 0 || (childFiles ?? 0) > 0) {
        return NextResponse.json({ error: "folder_not_empty" }, { status: 400 });
      }

      const { error } = await admin
        .from("file_folders")
        .delete()
        .eq("organization_id", gate.organizationId)
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    const { data: file } = await admin
      .from("project_files")
      .select("id, storage_path")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!file) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await admin.storage.from(PROJECT_FILES_BUCKET).remove([file.storage_path]);
    const { error } = await admin
      .from("project_files")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
