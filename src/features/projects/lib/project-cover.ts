import { env } from "@/lib/env";

export const PROJECT_COVERS_BUCKET = "project-covers";

export function projectCoverPublicUrl(coverPath: string | null | undefined) {
  if (!coverPath) return null;
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PROJECT_COVERS_BUCKET}/${coverPath}`;
}

export function projectCoverStoragePath(
  organizationId: string,
  projectId: string,
  extension: string,
) {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  return `${organizationId}/${projectId}/cover.${safeExt}`;
}
