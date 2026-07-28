import { env } from "@/lib/env";

export const ORGANIZATION_LOGOS_BUCKET = "organization-logos";

export function organizationLogoPublicUrl(
  logoPath: string | null | undefined,
) {
  if (!logoPath) return null;
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ORGANIZATION_LOGOS_BUCKET}/${logoPath}`;
}

export function organizationLogoStoragePath(
  organizationId: string,
  extension: string,
) {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  return `${organizationId}/logo.${safeExt}`;
}
