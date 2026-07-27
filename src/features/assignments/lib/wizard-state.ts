import {
  createQuoteLine,
  type QuoteLineRow,
} from "@/features/quotes/lib/quote-line";

export const WIZARD_STORAGE_KEY = "werkos-new-assignment-wizard-v2";

export const WIZARD_STEPS = [
  "gegevens",
  "aanvraag",
  "calculatie",
  "afronden",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export type CalculationLine = QuoteLineRow;

export type AssignmentWizardState = {
  step: WizardStep;
  customer: {
    mode: "new" | "existing";
    customerId: string | null;
    name: string;
    company: string;
    phone: string;
    email: string;
    address: string;
  };
  request: {
    projectType: string;
    projectName: string;
    location: string;
    description: string;
    particulars: string;
    internalNotes: string;
  };
  calculation: {
    lines: QuoteLineRow[];
    marginPercent: number;
  };
};

export const DEFAULT_PROJECT_TYPES = [
  "Schilderwerk",
  "Dakrenovatie",
  "Timmerwerk",
  "Kozijnen",
  "Badkamer",
  "Keuken",
  "Elektra",
  "Loodgieterswerk",
  "Stucwerk",
  "Overig",
] as const;

export function createEmptyWizardState(): AssignmentWizardState {
  return {
    step: "gegevens",
    customer: {
      mode: "new",
      customerId: null,
      name: "",
      company: "",
      phone: "",
      email: "",
      address: "",
    },
    request: {
      projectType: "",
      projectName: "",
      location: "",
      description: "",
      particulars: "",
      internalNotes: "",
    },
    calculation: {
      lines: [],
      marginPercent: 0,
    },
  };
}

export { createQuoteLine as createCalculationLine };

export function suggestProjectName(input: {
  projectType: string;
  customerName: string;
  company: string;
}): string {
  const type = input.projectType.trim();
  const label = input.company.trim() || input.customerName.trim();
  if (!type && !label) return "";
  if (!type) return label;
  if (!label) return type;
  return `${type} - ${label}`;
}

function migrateV1Lines(raw: unknown): QuoteLineRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, index) => {
    const line = entry as Record<string, unknown>;
    if ("parentId" in line) {
      const existing = line as QuoteLineRow;
      return {
        ...existing,
        lineType: existing.lineType ?? "article",
        articleId: existing.articleId ?? null,
        costPriceCents: existing.costPriceCents ?? null,
      };
    }
    return createQuoteLine({
      sortOrder: index,
      title: String(line.title ?? ""),
      quantity: Number(line.quantity ?? 1),
      unit: String(line.unit ?? "st"),
      unitPriceCents: Number(line.unitPriceCents ?? 0),
      vatRateBps: Number(line.vatRateBps ?? 2100),
      lineType: "article",
    });
  });
}

export function loadWizardState(): AssignmentWizardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) {
      const legacy = window.localStorage.getItem(
        "werkos-new-assignment-wizard-v1",
      );
      if (!legacy) return null;
      const parsed = JSON.parse(legacy) as Partial<AssignmentWizardState>;
      return {
        ...createEmptyWizardState(),
        ...parsed,
        calculation: {
          lines: migrateV1Lines(parsed.calculation?.lines),
          marginPercent: parsed.calculation?.marginPercent ?? 0,
        },
      };
    }
    const parsed = JSON.parse(raw) as Partial<AssignmentWizardState>;
    return {
      ...createEmptyWizardState(),
      ...parsed,
      customer: {
        ...createEmptyWizardState().customer,
        ...parsed.customer,
      },
      request: {
        ...createEmptyWizardState().request,
        ...parsed.request,
      },
      calculation: {
        lines: migrateV1Lines(parsed.calculation?.lines),
        marginPercent: parsed.calculation?.marginPercent ?? 0,
      },
    };
  } catch {
    return null;
  }
}

export function saveWizardState(state: AssignmentWizardState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function clearWizardState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WIZARD_STORAGE_KEY);
  window.localStorage.removeItem("werkos-new-assignment-wizard-v1");
}

export function stepIndex(step: WizardStep) {
  return WIZARD_STEPS.indexOf(step);
}

export function nextStep(step: WizardStep): WizardStep | null {
  const index = stepIndex(step);
  return index < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[index + 1]! : null;
}

export function prevStep(step: WizardStep): WizardStep | null {
  const index = stepIndex(step);
  return index > 0 ? WIZARD_STEPS[index - 1]! : null;
}
