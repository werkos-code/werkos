import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { OrganizationProfileForm } from "@/features/organization/components/organization-profile-form";
import { getOrganizationProfile } from "@/features/organization/organization-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function BedrijfInstellingenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("organizationSettings");
  const result = await getOrganizationProfile();

  if (result.error === "not_found" || !result.organization) {
    notFound();
  }

  return (
    <ShellPage title={t("title")} backHref="/instellingen">
      <div className="mb-5 max-w-2xl space-y-1">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <OrganizationProfileForm initial={result.organization} />
    </ShellPage>
  );
}
