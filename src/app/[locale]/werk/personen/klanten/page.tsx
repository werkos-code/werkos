import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Canonical customers live under Bedrijf. */
export default async function WerkKlantenRedirect({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/bedrijf/klanten", locale });
}
