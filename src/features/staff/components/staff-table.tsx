"use client";

import { useTranslations } from "next-intl";

import type { StaffMemberRow } from "@/features/staff/staff-actions";
import { PageCard } from "@/features/shell/components/page-card";

type StaffTableProps = {
  members: StaffMemberRow[];
};

export function StaffTable({ members }: StaffTableProps) {
  const t = useTranslations("staff");
  const tRoles = useTranslations("platform.users.roles");

  if (members.length === 0) {
    return (
      <PageCard className="px-5 py-8 text-sm text-muted-foreground">
        {t("empty")}
      </PageCard>
    );
  }

  return (
    <PageCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">{t("columns.name")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.email")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.role")}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-border/70 last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3 font-medium">{member.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {member.email || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {tRoles(member.role)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}
