"use client";

import { useTranslations } from "next-intl";

import type { CustomerSearchResult } from "@/features/assignments/components/customer-search-field";
import { CustomerSearchField } from "@/features/assignments/components/customer-search-field";
import type { AssignmentWizardState } from "@/features/assignments/lib/wizard-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StepGegevensProps = {
  state: AssignmentWizardState;
  onChange: (patch: Partial<AssignmentWizardState["customer"]>) => void;
  onSelectCustomer: (customer: CustomerSearchResult | null) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

export function StepGegevens({
  state,
  onChange,
  onSelectCustomer,
  searchQuery,
  onSearchQueryChange,
}: StepGegevensProps) {
  const t = useTranslations("assignment.gegevens");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <CustomerSearchField
        query={searchQuery}
        onQueryChange={onSearchQueryChange}
        selectedId={state.customer.customerId}
        onSelect={onSelectCustomer}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="contact-name">
            {t("name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact-name"
            value={state.customer.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t("namePlaceholder")}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">{t("company")}</Label>
          <Input
            id="company"
            value={state.customer.company}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder={t("companyPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input
            id="phone"
            type="tel"
            value={state.customer.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder={t("phonePlaceholder")}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            value={state.customer.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">{t("address")}</Label>
          <Input
            id="address"
            value={state.customer.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder={t("addressPlaceholder")}
            autoComplete="street-address"
          />
        </div>
      </div>
    </div>
  );
}
