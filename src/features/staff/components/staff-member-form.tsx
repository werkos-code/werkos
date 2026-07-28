"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USER_ROLES } from "@/config/roles";
import {
  STAFF_ASSIGNABLE_ROLES,
  type StaffMemberRow,
} from "@/features/staff/staff-actions";

type StaffMemberFormProps = {
  member: StaffMemberRow;
  canManage: boolean;
  currentUserId: string;
};

export function StaffMemberForm({
  member,
  canManage,
  currentUserId,
}: StaffMemberFormProps) {
  const t = useTranslations("staff");
  const tRoles = useTranslations("platform.users.roles");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removePending, startRemove] = useTransition();

  const isOwner = member.role === USER_ROLES.OWNER;
  const canEdit = canManage && (!isOwner || member.id === currentUserId);
  const canChangeRole = canManage && !isOwner;
  const canRemove =
    canManage && !isOwner && member.id !== currentUserId;

  if (!canEdit) {
    return (
      <div className="space-y-3 text-sm">
        <p>
          <span className="text-muted-foreground">{t("fields.name")}: </span>
          {member.name}
        </p>
        <p>
          <span className="text-muted-foreground">{t("fields.email")}: </span>
          {member.email || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">{t("fields.role")}: </span>
          {tRoles(member.role)}
        </p>
        <Button type="button" variant="ghost" asChild>
          <Link href="/personeel">{tCommon("back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="flex max-w-lg flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          setPending(true);

          void (async () => {
            try {
              const response = await fetch("/api/staff", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: member.id,
                  fullName: String(form.get("fullName") ?? ""),
                  role: canChangeRole
                    ? String(form.get("role") ?? member.role)
                    : undefined,
                }),
                signal: AbortSignal.timeout(20_000),
              });
              const result = (await response.json()) as { error?: string };
              if (!response.ok || result.error) {
                setError(
                  result.error === "cannot_change_owner_role"
                    ? t("errors.cannotChangeOwnerRole")
                    : result.error === "invalid_input"
                      ? t("errors.invalidInput")
                      : result.error || tCommon("error"),
                );
                return;
              }
              router.refresh();
            } catch {
              setError(tCommon("error"));
            } finally {
              setPending(false);
            }
          })();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("fields.name")}</Label>
          <Input
            id="fullName"
            name="fullName"
            required
            defaultValue={member.name === "—" ? "" : member.name}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("fields.email")}</Label>
          <Input
            id="email"
            value={member.email ?? ""}
            disabled
            readOnly
            className="opacity-70"
          />
          <p className="text-xs text-muted-foreground">{t("emailReadonly")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">{t("fields.role")}</Label>
          {canChangeRole ? (
            <select
              id="role"
              name="role"
              defaultValue={member.role}
              className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
            >
              {STAFF_ASSIGNABLE_ROLES.map((option) => (
                <option key={option} value={option}>
                  {tRoles(option)}
                </option>
              ))}
            </select>
          ) : (
            <Input value={tRoles(member.role)} disabled readOnly />
          )}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? tCommon("loading") : t("save")}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/personeel">{tCommon("cancel")}</Link>
          </Button>
        </div>
      </form>

      {canRemove ? (
        <div className="border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/5"
            disabled={removePending}
            onClick={() => {
              if (
                !window.confirm(t("deleteConfirm", { name: member.name }))
              ) {
                return;
              }
              setError(null);
              startRemove(() => {
                void (async () => {
                  try {
                    const response = await fetch(
                      `/api/staff?id=${encodeURIComponent(member.id)}`,
                      {
                        method: "DELETE",
                        signal: AbortSignal.timeout(20_000),
                      },
                    );
                    const result = (await response.json()) as {
                      error?: string;
                    };
                    if (!response.ok || result.error) {
                      setError(result.error || tCommon("error"));
                      return;
                    }
                    router.replace("/personeel");
                  } catch {
                    setError(tCommon("error"));
                  }
                })();
              });
            }}
          >
            {t("remove")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
