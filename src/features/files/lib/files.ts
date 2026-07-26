export const PROJECT_FILES_BUCKET = "project-files";

export const MAX_PROJECT_FILE_BYTES = 50 * 1024 * 1024;

export function projectFileStoragePath(
  organizationId: string,
  projectId: string,
  fileId: string,
  fileName: string,
) {
  const safe = fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180);
  return `${organizationId}/${projectId}/${fileId}/${safe}`;
}

export type FileFolderRow = {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
};

export type ProjectFileRow = {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
};

export type DocumentProjectOption = {
  id: string;
  name: string;
  projectNumber: string;
};
