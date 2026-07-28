"use server";

import { getAppSession } from "@/features/shell/lib/require-organization";
import { createClient } from "@/lib/supabase/server";

export type AccountProfile = {
  userId: string;
  email: string;
  fullName: string;
};

export async function getAccountProfile(): Promise<{
  profile?: AccountProfile;
  error?: string;
}> {
  const session = await getAppSession();
  if (!session) return { error: "unauthorized" };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", session.user.id)
    .maybeSingle();

  return {
    profile: {
      userId: session.user.id,
      email: session.user.email ?? "",
      fullName: profile?.full_name?.trim() || session.userName,
    },
  };
}

export async function updateAccountName(
  fullName: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await getAppSession();
  if (!session) return { error: "unauthorized" };

  const name = fullName.trim();
  if (!name) return { error: "name_required" };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert({
    id: session.user.id,
    full_name: name,
  });

  if (error) return { error: error.message };

  await supabase.auth.updateUser({
    data: { full_name: name },
  });

  return { success: true };
}

export async function updateAccountPassword(input: {
  password: string;
  confirmPassword: string;
}): Promise<{ error?: string; success?: boolean }> {
  const session = await getAppSession();
  if (!session) return { error: "unauthorized" };

  const password = input.password;
  if (password.length < 8) return { error: "password_too_short" };
  if (password !== input.confirmPassword) return { error: "password_mismatch" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true };
}
