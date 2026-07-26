import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import type {
  DocumentProjectOption,
  FileFolderRow,
  ProjectFileRow,
} from "@/features/files/lib/files";

export async function listDocumentProjects(): Promise<{
  projects?: DocumentProjectOption[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("projects")
    .select("id, name, project_number")
    .eq("organization_id", ctx.organizationId)
    .order("name", { ascending: true });

  if (error) return { error: error.message };

  return {
    projects: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      projectNumber: row.project_number,
    })),
  };
}

export async function listFolderContents(input: {
  projectId: string;
  folderId?: string | null;
}): Promise<{
  folders?: FileFolderRow[];
  files?: ProjectFileRow[];
  breadcrumbs?: FileFolderRow[];
  project?: DocumentProjectOption;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const folderId = input.folderId ?? null;

  const [projectResult, foldersResult, filesResult] = await Promise.all([
    ctx.supabase
      .from("projects")
      .select("id, name, project_number")
      .eq("organization_id", ctx.organizationId)
      .eq("id", input.projectId)
      .maybeSingle(),
    ctx.supabase
      .from("file_folders")
      .select("id, project_id, parent_id, name, created_at")
      .eq("organization_id", ctx.organizationId)
      .eq("project_id", input.projectId)
      .order("name", { ascending: true }),
    ctx.supabase
      .from("project_files")
      .select(
        "id, project_id, folder_id, name, storage_path, mime_type, size_bytes, created_at",
      )
      .eq("organization_id", ctx.organizationId)
      .eq("project_id", input.projectId)
      .order("name", { ascending: true }),
  ]);

  if (projectResult.error) return { error: projectResult.error.message };
  if (!projectResult.data) return { error: "not_found" };
  if (foldersResult.error) return { error: foldersResult.error.message };
  if (filesResult.error) return { error: filesResult.error.message };

  const allFolders = (foldersResult.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    name: row.name,
    createdAt: row.created_at,
  }));

  const folders = allFolders.filter((folder) =>
    folderId ? folder.parentId === folderId : folder.parentId == null,
  );

  const files = (filesResult.data ?? [])
    .filter((row) =>
      folderId ? row.folder_id === folderId : row.folder_id == null,
    )
    .map((row) => ({
      id: row.id,
      projectId: row.project_id,
      folderId: row.folder_id,
      name: row.name,
      storagePath: row.storage_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      createdAt: row.created_at,
    }));

  const byId = new Map(allFolders.map((folder) => [folder.id, folder]));
  const breadcrumbs: FileFolderRow[] = [];
  let cursor = folderId;
  while (cursor) {
    const folder = byId.get(cursor);
    if (!folder) break;
    breadcrumbs.unshift(folder);
    cursor = folder.parentId;
  }

  return {
    project: {
      id: projectResult.data.id,
      name: projectResult.data.name,
      projectNumber: projectResult.data.project_number,
    },
    folders,
    files,
    breadcrumbs,
  };
}
