import { createAdminClient } from "@/lib/supabase/admin";

export function slugifyCompanyName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return base || "bedrijf";
}

export async function uniqueOrganizationSlug(name: string): Promise<string> {
  const admin = createAdminClient();
  const base = slugifyCompanyName(name);
  let candidate = base;
  let attempt = 0;

  while (attempt < 20) {
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
