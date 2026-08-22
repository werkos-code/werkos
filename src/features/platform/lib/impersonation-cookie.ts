import { createHmac, timingSafeEqual } from "crypto";

import { env } from "@/lib/env";

export const IMPERSONATION_COOKIE_NAME = "werkos_imp";
export const IMPERSONATION_MAX_AGE_SECONDS = 4 * 60 * 60;

export type ImpersonationPayload = {
  actorId: string;
  targetUserId: string;
  organizationId: string;
  startedAt: number;
};

function signingSecret(): string {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for impersonation");
  }
  return key;
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", signingSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function serializeImpersonationCookie(
  payload: ImpersonationPayload,
): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signPayload(encoded)}`;
}

export function parseImpersonationCookie(
  value: string | undefined,
): ImpersonationPayload | null {
  if (!value) return null;

  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const encoded = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = signPayload(encoded);

  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as ImpersonationPayload;

    if (
      !payload.actorId ||
      !payload.targetUserId ||
      !payload.organizationId ||
      typeof payload.startedAt !== "number"
    ) {
      return null;
    }

    if (Date.now() - payload.startedAt > IMPERSONATION_MAX_AGE_SECONDS * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
