import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ShellPage } from "@/features/shell/components/shell-page";
import { PageCard } from "@/features/shell/components/page-card";

type Props = { params: Promise<{ locale: string }> };

export default async function InstellingenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shell.pages.settings");
  const tOrg = await getTranslations("organizationSettings");

  return (
    <ShellPage title={t("title")}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PageCard className="p-4">
          <h2 className="text-sm font-medium">{tOrg("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tOrg("subtitle")}
          </p>
          <Link
            href="/instellingen/bedrijf"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            {tOrg("open")}
          </Link>
        </PageCard>
        <PageCard className="p-4 opacity-70">
          <h2 className="text-sm font-medium">{t("accountTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("accountSoon")}
          </p>
        </PageCard>
        <PageCard className="p-4 opacity-70">
          <h2 className="text-sm font-medium">{t("billingTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("billingSoon")}
          </p>
        </PageCard>
      </div>
    </ShellPage>
  );
}
