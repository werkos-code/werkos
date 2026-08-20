import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { markProfileTimestamp } from "@/lib/analytics/persist-attribution";
import { trackBusinessEvent } from "@/lib/analytics/track-business-event";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * After a successful project insert: fire first_project_created once per org.
 */
export async function maybeTrackFirstProjectCreated(input: {
  organizationId: string;
  userId: string;
  projectId: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", input.organizationId);

    if (error) {
      console.error("[analytics:first_project]", error.message);
      return;
    }

    if ((count ?? 0) !== 1) return;

    const { claimed } = await trackBusinessEvent({
      event: ANALYTICS_EVENTS.firstProjectCreated,
      dedupeKey: `first_project_created:${input.organizationId}`,
      userId: input.userId,
      organizationId: input.organizationId,
      params: {
        project_id: input.projectId,
      },
    });

    if (claimed) {
      await markProfileTimestamp(input.userId, "first_project_at");
    }
  } catch (error) {
    console.error(
      "[analytics:first_project]",
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * After a successful quote insert: fire first_quote_created once per org.
 */
export async function maybeTrackFirstQuoteCreated(input: {
  organizationId: string;
  userId: string;
  quoteId: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", input.organizationId);

    if (error) {
      console.error("[analytics:first_quote]", error.message);
      return;
    }

    if ((count ?? 0) !== 1) return;

    const { claimed } = await trackBusinessEvent({
      event: ANALYTICS_EVENTS.firstQuoteCreated,
      dedupeKey: `first_quote_created:${input.organizationId}`,
      userId: input.userId,
      organizationId: input.organizationId,
      params: {
        quote_id: input.quoteId,
      },
    });

    if (claimed) {
      await markProfileTimestamp(input.userId, "first_quote_at");
    }
  } catch (error) {
    console.error(
      "[analytics:first_quote]",
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * When subscription status becomes `active` (paid), fire subscription_started once.
 * Trialing / incomplete / renewals do not count.
 */
export async function maybeTrackSubscriptionStarted(input: {
  organizationId: string;
  status: string;
  userId?: string | null;
}): Promise<void> {
  if (input.status !== "active") return;

  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: updated, error } = await admin
      .from("organizations")
      .update({ subscription_started_at: now })
      .eq("id", input.organizationId)
      .is("subscription_started_at", null)
      .select("id, created_by")
      .maybeSingle();

    if (error) {
      console.error("[analytics:subscription]", error.message);
      return;
    }

    if (!updated) return; // already recorded (idempotent)

    const userId = input.userId ?? updated.created_by ?? null;

    const { claimed } = await trackBusinessEvent({
      event: ANALYTICS_EVENTS.subscriptionStarted,
      dedupeKey: `subscription_started:${input.organizationId}`,
      userId,
      organizationId: input.organizationId,
      params: {
        subscription_status: "active",
      },
    });

    if (claimed && userId) {
      await markProfileTimestamp(userId, "subscription_started_at");
    }
  } catch (error) {
    console.error(
      "[analytics:subscription]",
      error instanceof Error ? error.message : error,
    );
  }
}
