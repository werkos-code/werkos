import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { AccountSettingsForm } from "@/features/account/components/account-settings-form";
import { getAccountProfile } from "@/features/account/account-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function AccountSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("accountSettings");
  const result = await getAccountProfile();

  if (result.error === "unauthorized" || !result.profile) {
    notFound();
  }

  return (
    <ShellPage title={t("title")} backHref="/instellingen">
      <p className="mb-5 max-w-lg text-sm text-muted-foreground">
        {t("subtitle")}
      </p>
      <AccountSettingsForm initial={result.profile} />
    </ShellPage>
  );
}
