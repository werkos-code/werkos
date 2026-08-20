"use client";

import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USER_ROLES } from "@/config/roles";
import {
  EntityFormField,
  EntityFormSection,
  EntityFormShell,
} from "@/features/shell/components/entity-form-shell";
import { STAFF_ASSIGNABLE_ROLES } from "@/features/staff/lib/staff-roles";
import type { StaffMemberRow } from "@/features/staff/staff-actions";
import { Link, useRouter } from "@/i18n/navigation";

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
  const canRemove = canManage && !isOwner && member.id !== currentUserId;

  if (!canEdit) {
    return (
      <EntityFormShell
        icon={UserRound}
        title={member.name}
        description={t("editDescription")}
        footer={
          <Button type="button" variant="ghost" asChild>
            <Link href="/personeel">{tCommon("back")}</Link>
          </Button>
        }
      >
        <EntityFormSection title={t("sections.profile")}>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-muted/40 px-4 py-3">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("fields.name")}
              </p>
              <p className="mt-1 font-medium">{member.name}</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-4 py-3">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("fields.email")}
              </p>
              <p className="mt-1 font-medium">{member.email || "—"}</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-4 py-3 sm:col-span-2">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("fields.role")}
              </p>
              <p className="mt-1 font-medium">{tRoles(member.role)}</p>
            </div>
          </div>
        </EntityFormSection>
      </EntityFormShell>
    );
  }

  return (
    <div className="space-y-4">
      <form
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
        <EntityFormShell
          icon={UserRound}
          title={t("editTitle")}
          description={t("editDescription")}
          footer={
            <>
              <Button type="submit" disabled={pending}>
                {pending ? tCommon("loading") : t("save")}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/personeel">{tCommon("cancel")}</Link>
              </Button>
              {error ? (
                <p className="w-full text-sm text-destructive sm:ml-auto sm:w-auto">
                  {error}
                </p>
              ) : null}
            </>
          }
        >
          <EntityFormSection title={t("sections.profile")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <EntityFormField className="sm:col-span-2">
                <Label htmlFor="fullName">{t("fields.name")}</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  required
                  defaultValue={member.name === "—" ? "" : member.name}
                />
              </EntityFormField>
              <EntityFormField className="sm:col-span-2">
                <Label htmlFor="email">{t("fields.email")}</Label>
                <Input
                  id="email"
                  value={member.email ?? ""}
                  disabled
                  readOnly
                  className="opacity-70"
                />
                <p className="text-xs text-muted-foreground">
                  {t("emailReadonly")}
                </p>
              </EntityFormField>
            </div>
          </EntityFormSection>

          <EntityFormSection title={t("sections.access")}>
            <EntityFormField>
              <Label htmlFor="role">{t("fields.role")}</Label>
              {canChangeRole ? (
                <select
                  id="role"
                  name="role"
                  defaultValue={member.role}
                  className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
            </EntityFormField>
          </EntityFormSection>
        </EntityFormShell>
      </form>

      {canRemove ? (
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-xl border border-destructive/20 bg-card px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("remove")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("deleteConfirm", { name: member.name })}
                </p>
              </div>
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
