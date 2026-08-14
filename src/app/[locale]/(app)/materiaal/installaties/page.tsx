import { setRequestLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Installaties is parked; keep the URL from 404-ing bookmarks. */
export default async function InstallatiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/materiaal/voorraad", locale });
}
