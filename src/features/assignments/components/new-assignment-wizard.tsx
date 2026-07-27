"use client";

import { useRouter } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CustomerSearchResult } from "@/features/assignments/components/customer-search-field";
import { StepAanvraag } from "@/features/assignments/components/wizard-steps/step-aanvraag";
import { StepAfronden } from "@/features/assignments/components/wizard-steps/step-afronden";
import { StepCalculatie } from "@/features/assignments/components/wizard-steps/step-calculatie";
import { StepGegevens } from "@/features/assignments/components/wizard-steps/step-gegevens";
import { WizardProgress } from "@/features/assignments/components/wizard-progress";
import {
  clearWizardState,
  createEmptyWizardState,
  loadWizardState,
  nextStep,
  prevStep,
  saveWizardState,
  suggestProjectName,
  type AssignmentWizardState,
} from "@/features/assignments/lib/wizard-state";
import { PageCard } from "@/features/shell/components/page-card";
import type { ArticleRow } from "@/features/materials/lib/materials";

export function NewAssignmentWizard({
  articles = [],
}: {
  articles?: ArticleRow[];
}) {
  const t = useTranslations("assignment");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [state, setState] = useState<AssignmentWizardState>(
    createEmptyWizardState,
  );
  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = loadWizardState();
    if (saved) setState(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveWizardState(state);
  }, [state, hydrated]);

  const patchState = useCallback((patch: Partial<AssignmentWizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const patchCustomer = useCallback(
    (patch: Partial<AssignmentWizardState["customer"]>) => {
      setState((prev) => {
        const customer = { ...prev.customer, ...patch };
        const request = { ...prev.request };
        if (
          !request.projectName.trim() ||
          request.projectName ===
            suggestProjectName({
              projectType: request.projectType,
              customerName: prev.customer.name,
              company: prev.customer.company,
            })
        ) {
          request.projectName = suggestProjectName({
            projectType: request.projectType,
            customerName: customer.name,
            company: customer.company,
          });
        }
        return { ...prev, customer, request };
      });
    },
    [],
  );

  const patchRequest = useCallback(
    (patch: Partial<AssignmentWizardState["request"]>) => {
      setState((prev) => {
        const request = { ...prev.request, ...patch };
        if (
          patch.projectType !== undefined &&
          (!request.projectName.trim() ||
            request.projectName ===
              suggestProjectName({
                projectType: prev.request.projectType,
                customerName: prev.customer.name,
                company: prev.customer.company,
              }))
        ) {
          request.projectName = suggestProjectName({
            projectType: request.projectType,
            customerName: prev.customer.name,
            company: prev.customer.company,
          });
        }
        return { ...prev, request };
      });
    },
    [],
  );

  function handleSelectCustomer(customer: CustomerSearchResult | null) {
    if (!customer) {
      patchCustomer({
        mode: "new",
        customerId: null,
      });
      return;
    }
    patchCustomer({
      mode: "existing",
      customerId: customer.id,
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
    });
  }

  function validateStep(step: AssignmentWizardState["step"]): string | null {
    if (step === "gegevens" && !state.customer.name.trim()) {
      return t("errors.nameRequired");
    }
    if (step === "aanvraag" && !state.request.projectName.trim()) {
      return t("errors.projectNameRequired");
    }
    return null;
  }

  function goNext() {
    const validation = validateStep(state.step);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    const next = nextStep(state.step);
    if (next) patchState({ step: next });
  }

  function skipCalculatie() {
    setError(null);
    patchState({
      calculation: { lines: [], marginPercent: 0 },
      step: "afronden",
    });
  }

  function goBack() {
    setError(null);
    const previous = prevStep(state.step);
    if (previous) patchState({ step: previous });
  }

  async function complete() {
    const validation = validateStep("aanvraag");
    if (!state.customer.name.trim()) {
      setError(t("errors.nameRequired"));
      patchState({ step: "gegevens" });
      return;
    }
    if (validation) {
      setError(validation);
      patchState({ step: "aanvraag" });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/opdrachten/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            existingId: state.customer.customerId,
            name: state.customer.name,
            company: state.customer.company,
            phone: state.customer.phone,
            email: state.customer.email,
            address: state.customer.address,
          },
          request: state.request,
          calculation: {
            lines: state.calculation.lines,
            marginPercent: state.calculation.marginPercent,
          },
        }),
        signal: AbortSignal.timeout(45_000),
      });
      const result = (await res.json()) as {
        error?: string;
        projectId?: string;
      };
      if (!res.ok || !result.projectId) {
        setError(result.error || tCommon("error"));
        return;
      }
      clearWizardState();
      router.replace(`/projecten/${result.projectId}`);
    } catch {
      setError(tCommon("error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const isLast = state.step === "afronden";

  return (
    <div
      className={`mx-auto w-full space-y-6 ${state.step === "calculatie" ? "max-w-6xl" : "max-w-4xl"}`}
    >
      <WizardProgress current={state.step} />

      <PageCard className="p-6 sm:p-8">
        {state.step === "gegevens" ? (
          <StepGegevens
            state={state}
            onChange={patchCustomer}
            onSelectCustomer={handleSelectCustomer}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        ) : null}
        {state.step === "aanvraag" ? (
          <StepAanvraag state={state} onChange={patchRequest} />
        ) : null}
        {state.step === "calculatie" ? (
          <StepCalculatie
            lines={state.calculation.lines}
            marginPercent={state.calculation.marginPercent}
            articles={articles}
            onChangeLines={(lines) =>
              patchState({
                calculation: { ...state.calculation, lines },
              })
            }
            onChangeMargin={(marginPercent) =>
              patchState({
                calculation: { ...state.calculation, marginPercent },
              })
            }
          />
        ) : null}
        {state.step === "afronden" ? <StepAfronden state={state} /> : null}

        {error ? (
          <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <Button
            type="button"
            variant="ghost"
            disabled={state.step === "gegevens" || submitting}
            onClick={goBack}
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </Button>
          <div className="flex gap-2">
            {state.step === "calculatie" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={skipCalculatie}
              >
                {t("skipCalculatie")}
              </Button>
            ) : null}
            {isLast ? (
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void complete()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {tCommon("loading")}
                  </>
                ) : (
                  t("openProject")
                )}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                {t("next")}
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </PageCard>

      <p className="text-center text-xs text-muted-foreground">
        {t("autosaveHint")}
      </p>
    </div>
  );
}
