import { NextResponse } from "next/server";

import {
  createConversation,
  postConversationMessage,
} from "@/features/inbox/inbox-actions";
import { isOrgStaffRole } from "@/features/projects/lib/project-status";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationAccessAdmin } from "@/features/billing/lib/get-organization-access";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership || !isOrgStaffRole(membership.role)) {
    return {
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return { userId: user.id, organizationId: membership.organization_id };
}

export async function POST(request: Request) {
  try {
    const gate = await requireStaff();
    if ("error" in gate) return gate.error;

    const access = await getOrganizationAccessAdmin(gate.organizationId);
    if (!access.canWrite) {
      return NextResponse.json(
        { error: "subscription_required", code: "subscription_required" },
        { status: 402 },
      );
    }

    const body = (await request.json()) as {
      action?: string;
      projectId?: string;
      subject?: string;
      body?: string;
      conversationId?: string;
    };

    if (body.action === "message") {
      const result = await postConversationMessage({
        conversationId: body.conversationId ?? "",
        body: body.body ?? "",
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    const result = await createConversation({
      projectId: body.projectId ?? "",
      subject: body.subject ?? "",
      body: body.body ?? "",
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ conversationId: result.conversationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
