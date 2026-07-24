import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function WerkDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shell");

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t("werkEmptyTitle")}
      </h1>
      <p className="mt-3 text-muted-foreground">{t("werkEmptyDescription")}</p>
    </div>
  );
}
