import { getAppSession } from "@/features/shell/lib/require-organization";

export async function assertCallerIsSuperAdmin() {
  const session = await getAppSession();
  if (!session) return { error: "unauthorized" as const };
  if (!session.isSuperAdmin) return { error: "forbidden" as const };
  return { user: session.user };
}
