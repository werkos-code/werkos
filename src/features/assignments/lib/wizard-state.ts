export const WIZARD_STORAGE_KEY = "werkos-new-assignment-wizard-v1";

export const WIZARD_STEPS = [
  "gegevens",
  "aanvraag",
  "calculatie",
  "afronden",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export type CalculationLine = {
  id: string;
  title: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  vatRateBps: number;
};

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
    lines: CalculationLine[];
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

export function createCalculationLine(
  partial?: Partial<CalculationLine>,
): CalculationLine {
  return {
    id: crypto.randomUUID(),
    title: "",
    quantity: 1,
    unit: "st",
    unitPriceCents: 0,
    vatRateBps: 2100,
    ...partial,
  };
}

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

export function loadWizardState(): AssignmentWizardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AssignmentWizardState;
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
