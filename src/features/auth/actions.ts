"use server";

import { createClient } from "@/lib/supabase/server";

export type AuthActionResult = {
  error?: string;
  success?: boolean;
};

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });

  if (error) {
    return { error: "invalid_credentials" };
  }

  return { success: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function signUpAction(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        full_name: input.fullName.trim(),
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { error: "email_in_use" };
    }
    return { error: error.message };
  }

  // Ensure profile name is set (trigger may race)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: input.fullName.trim(),
    });

    await supabase.from("onboarding_drafts").upsert({
      user_id: user.id,
      step: "company",
    });
  }

  return { success: true };
}
