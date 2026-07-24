import { setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function StubPage({
  params,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <p className="text-muted-foreground">Binnenkort beschikbaar.</p>
  );
}
