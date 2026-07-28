import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SubcontractorForm } from "@/features/subcontractors/components/subcontractor-form";
import { getSubcontractor } from "@/features/subcontractors/subcontractors-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; subcontractorId: string }>;
};

export default async function SubcontractorDetailPage({ params }: Props) {
  const { locale, subcontractorId } = await params;
  setRequestLocale(locale);
  const result = await getSubcontractor(subcontractorId);

  if (result.error === "not_found" || !result.subcontractor) {
    notFound();
  }

  const subcontractor = result.subcontractor;

  return (
    <ShellPage title={subcontractor.name} backHref="/onderaannemers">
      <PageCard className="max-w-lg p-5">
        <SubcontractorForm mode="edit" initial={subcontractor} />
      </PageCard>
    </ShellPage>
  );
}
