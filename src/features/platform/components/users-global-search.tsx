"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import type { PlatformUserRow } from "@/features/platform/users-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";

type UsersGlobalSearchProps = {
  users: PlatformUserRow[];
};

export function UsersGlobalSearch({ users }: UsersGlobalSearchProps) {
  const t = useTranslations("platform.users");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    return users
      .filter((user) => {
        const haystack = [
          user.email,
          user.fullName ?? "",
          ...user.memberships.map(
            (m) => `${m.organizationName} ${m.role}`,
          ),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 20);
  }, [query, users]);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-foreground">
        {t("searchTitle")}
      </h2>
      <PageCard className="space-y-3 p-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
        {query.trim().length < 2 ? (
          <p className="text-sm text-muted-foreground">{t("searchHint")}</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("searchEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[36rem]">
              <thead>
                <tr>
                  <th>{t("columns.name")}</th>
                  <th>{t("columns.email")}</th>
                  <th>{t("columns.memberships")}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link
                        href={`/platform/admin/gebruikers/${user.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {user.fullName || "—"}
                      </Link>
                    </td>
                    <td className="text-muted-foreground">
                      {user.email || "—"}
                    </td>
                    <td className="text-muted-foreground">
                      {user.memberships.length === 0
                        ? "—"
                        : user.memberships
                            .map(
                              (m) =>
                                `${m.organizationName} (${t(`roles.${m.role}`)})`,
                            )
                            .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>
    </section>
  );
}
