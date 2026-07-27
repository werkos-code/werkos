"use client";

import { useTranslations } from "next-intl";

import type { AssignmentWizardState } from "@/features/assignments/lib/wizard-state";
import { DEFAULT_PROJECT_TYPES } from "@/features/assignments/lib/wizard-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StepAanvraagProps = {
  state: AssignmentWizardState;
  onChange: (patch: Partial<AssignmentWizardState["request"]>) => void;
};

export function StepAanvraag({ state, onChange }: StepAanvraagProps) {
  const t = useTranslations("assignment.aanvraag");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="project-type">{t("projectType")}</Label>
          <Input
            id="project-type"
            list="project-type-suggestions"
            value={state.request.projectType}
            onChange={(e) => onChange({ projectType: e.target.value })}
            placeholder={t("projectTypePlaceholder")}
          />
          <datalist id="project-type-suggestions">
            {DEFAULT_PROJECT_TYPES.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="project-name">
            {t("projectName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="project-name"
            value={state.request.projectName}
            onChange={(e) => onChange({ projectName: e.target.value })}
            placeholder={t("projectNamePlaceholder")}
          />
          <p className="text-xs text-muted-foreground">{t("projectNameHint")}</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="location">{t("location")}</Label>
          <Input
            id="location"
            value={state.request.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder={t("locationPlaceholder")}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">{t("description")}</Label>
          <textarea
            id="description"
            rows={4}
            value={state.request.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder={t("descriptionPlaceholder")}
            className="border-input bg-background w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="particulars">{t("particulars")}</Label>
          <textarea
            id="particulars"
            rows={2}
            value={state.request.particulars}
            onChange={(e) => onChange({ particulars: e.target.value })}
            placeholder={t("particularsPlaceholder")}
            className="border-input bg-background w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="internal-notes">{t("internalNotes")}</Label>
          <textarea
            id="internal-notes"
            rows={2}
            value={state.request.internalNotes}
            onChange={(e) => onChange({ internalNotes: e.target.value })}
            placeholder={t("internalNotesPlaceholder")}
            className="border-input bg-background w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
      </div>
    </div>
  );
}
