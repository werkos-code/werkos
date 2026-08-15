export type GuidedSetupContextId =
  | "dashboard"
  | "projects"
  | "planning"
  | "work"
  | "materials"
  | "staff";

export type GuidedSetupStepId =
  | "assignment"
  | "company"
  | "customer"
  | "project"
  | "workItems"
  | "quote"
  | "invoice"
  | "appointment"
  | "planWork"
  | "addWork"
  | "scheduleWork"
  | "article"
  | "stock"
  | "invite"
  | "roles";

export type GuidedSetupFlags = {
  isOwner: boolean;
  coachHidden: boolean;
  hasCompanyProfile: boolean;
  hasCustomers: boolean;
  hasProjects: boolean;
  hasWorkItems: boolean;
  hasQuotes: boolean;
  hasInvoices: boolean;
  hasAppointments: boolean;
  hasArticles: boolean;
  hasTeamBeyondOwner: boolean;
};

export type GuidedSetupStepDef = {
  id: GuidedSetupStepId;
  done: boolean;
  href: string;
};

export type GuidedSetupContextMatch = {
  contextId: GuidedSetupContextId;
  projectId?: string;
};

/** Strip locale prefix if present; pathname from next-intl is usually locale-free. */
export function matchGuidedSetupContext(
  pathname: string,
): GuidedSetupContextMatch | null {
  const path = pathname.replace(/^\/(nl|en|de)(?=\/|$)/, "") || "/";

  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    return { contextId: "dashboard" };
  }

  const projectMatch = path.match(/^\/projecten(?:\/([^/]+))?\/?$/);
  if (projectMatch) {
    return {
      contextId: "projects",
      projectId: projectMatch[1],
    };
  }

  if (path === "/planning" || path.startsWith("/planning/")) {
    return { contextId: "planning" };
  }

  if (path === "/werkzaamheden" || path.startsWith("/werkzaamheden/")) {
    return { contextId: "work" };
  }

  if (path.startsWith("/materiaal")) {
    return { contextId: "materials" };
  }

  if (path === "/personeel" || path.startsWith("/personeel/")) {
    return { contextId: "staff" };
  }

  return null;
}

export function stepsForContext(
  match: GuidedSetupContextMatch,
  flags: GuidedSetupFlags,
): GuidedSetupStepDef[] {
  const { contextId, projectId } = match;

  switch (contextId) {
    case "dashboard":
      return [
        {
          id: "assignment",
          done: flags.hasProjects,
          href: "/opdrachten/nieuw",
        },
        {
          id: "company",
          done: flags.hasCompanyProfile,
          href: "/instellingen/bedrijf",
        },
        {
          id: "customer",
          done: flags.hasCustomers,
          href: "/klanten/nieuw",
        },
      ];

    case "projects": {
      const workHref = projectId
        ? `/projecten/${projectId}?tab=work`
        : "/werkzaamheden";
      const quoteHref = projectId
        ? `/projecten/${projectId}?tab=quotes`
        : "/offertes";
      const invoiceHref = projectId
        ? `/projecten/${projectId}?tab=money`
        : "/facturen";

      return [
        {
          id: "project",
          done: flags.hasProjects,
          href: "/opdrachten/nieuw",
        },
        {
          id: "workItems",
          done: flags.hasWorkItems,
          href: workHref,
        },
        {
          id: "quote",
          done: flags.hasQuotes,
          href: quoteHref,
        },
        {
          id: "invoice",
          done: flags.hasInvoices,
          href: invoiceHref,
        },
      ];
    }

    case "planning":
      return [
        {
          id: "appointment",
          done: flags.hasAppointments,
          href: "/planning",
        },
        {
          id: "planWork",
          done: flags.hasAppointments && flags.hasWorkItems,
          href: "/werkzaamheden",
        },
      ];

    case "work":
      return [
        {
          id: "addWork",
          done: flags.hasWorkItems,
          href: flags.hasProjects ? "/projecten" : "/opdrachten/nieuw",
        },
        {
          id: "scheduleWork",
          done: flags.hasAppointments,
          href: "/planning",
        },
      ];

    case "materials":
      return [
        {
          id: "article",
          done: flags.hasArticles,
          href: "/materiaal/artikelen",
        },
        {
          id: "stock",
          done: flags.hasArticles,
          href: "/materiaal/voorraad",
        },
      ];

    case "staff":
      return [
        {
          id: "invite",
          done: flags.hasTeamBeyondOwner,
          href: "/personeel/nieuw",
        },
        {
          id: "roles",
          done: flags.hasTeamBeyondOwner,
          href: "/personeel",
        },
      ];

    default:
      return [];
  }
}
