"use server";

import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import { createAdminClient } from "@/lib/supabase/admin";

export type ConversationRow = {
  id: string;
  projectId: string;
  projectName: string;
  subject: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  messageCount: number;
};

export type ConversationMessageRow = {
  id: string;
  authorUserId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
};

export async function listConversations(): Promise<{
  conversations?: ConversationRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("conversations")
    .select(
      "id, project_id, subject, last_message_at, projects!inner(id, name)",
    )
    .eq("organization_id", ctx.organizationId)
    .order("last_message_at", { ascending: false });

  if (error) return { error: error.message };

  const conversationIds = (data ?? []).map((row) => row.id);
  const previewByConversation = new Map<string, string>();

  if (conversationIds.length > 0) {
    const { data: messages } = await ctx.supabase
      .from("conversation_messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    for (const message of messages ?? []) {
      if (!previewByConversation.has(message.conversation_id)) {
        previewByConversation.set(message.conversation_id, message.body);
      }
    }
  }

  const countByConversation = new Map<string, number>();
  if (conversationIds.length > 0) {
    const { data: counts } = await ctx.supabase
      .from("conversation_messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds);
    for (const row of counts ?? []) {
      countByConversation.set(
        row.conversation_id,
        (countByConversation.get(row.conversation_id) ?? 0) + 1,
      );
    }
  }

  return {
    conversations: (data ?? []).map((row) => {
      const project = row.projects as unknown as { id: string; name: string };
      return {
        id: row.id,
        projectId: project.id,
        projectName: project.name,
        subject: row.subject,
        lastMessageAt: row.last_message_at,
        lastMessagePreview: previewByConversation.get(row.id) ?? null,
        messageCount: countByConversation.get(row.id) ?? 0,
      };
    }),
  };
}

export async function getConversation(conversationId: string): Promise<{
  conversation?: ConversationRow;
  messages?: ConversationMessageRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: conversation, error } = await ctx.supabase
    .from("conversations")
    .select(
      "id, project_id, subject, last_message_at, projects!inner(id, name)",
    )
    .eq("organization_id", ctx.organizationId)
    .eq("id", conversationId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!conversation) return { error: "not_found" };

  const { data: messages, error: messagesError } = await ctx.supabase
    .from("conversation_messages")
    .select("id, author_user_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError) return { error: messagesError.message };

  const authorIds = [
    ...new Set(
      (messages ?? [])
        .map((m) => m.author_user_id)
        .filter(Boolean) as string[],
    ),
  ];
  const nameById = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    for (const profile of profiles ?? []) {
      nameById.set(profile.id, profile.full_name?.trim() || "—");
    }
  }

  const project = conversation.projects as unknown as { id: string; name: string };

  return {
    conversation: {
      id: conversation.id,
      projectId: project.id,
      projectName: project.name,
      subject: conversation.subject,
      lastMessageAt: conversation.last_message_at,
      lastMessagePreview: messages?.at(-1)?.body ?? null,
      messageCount: messages?.length ?? 0,
    },
    messages: (messages ?? []).map((row) => ({
      id: row.id,
      authorUserId: row.author_user_id,
      authorName: row.author_user_id
        ? (nameById.get(row.author_user_id) ?? "—")
        : "—",
      body: row.body,
      createdAt: row.created_at,
    })),
  };
}

export async function listProjectOptionsForInbox(): Promise<{
  projects?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("projects")
    .select("id, name")
    .eq("organization_id", ctx.organizationId)
    .order("name");

  if (error) return { error: error.message };
  return { projects: data ?? [] };
}

export async function createConversation(input: {
  projectId: string;
  subject: string;
  body: string;
}): Promise<{ conversationId?: string; error?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || !body) return { error: "invalid_input" };

  const admin = createAdminClient();
  const conversationId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: conversationError } = await admin.from("conversations").insert({
    id: conversationId,
    organization_id: ctx.organizationId,
    project_id: input.projectId,
    subject,
    created_by: ctx.userId,
    last_message_at: now,
  });

  if (conversationError) return { error: conversationError.message };

  const { error: messageError } = await admin
    .from("conversation_messages")
    .insert({
      organization_id: ctx.organizationId,
      conversation_id: conversationId,
      author_user_id: ctx.userId,
      body,
    });

  if (messageError) return { error: messageError.message };
  return { conversationId };
}

export async function postConversationMessage(input: {
  conversationId: string;
  body: string;
}): Promise<{ error?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const body = input.body.trim();
  if (!body) return { error: "invalid_input" };

  const admin = createAdminClient();
  const { error: messageError } = await admin
    .from("conversation_messages")
    .insert({
      organization_id: ctx.organizationId,
      conversation_id: input.conversationId,
      author_user_id: ctx.userId,
      body,
    });

  if (messageError) return { error: messageError.message };

  const { error: updateError } = await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("organization_id", ctx.organizationId)
    .eq("id", input.conversationId);

  if (updateError) return { error: updateError.message };
  return {};
}
