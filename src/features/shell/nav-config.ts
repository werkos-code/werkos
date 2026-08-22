import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Package,
  Receipt,
  Shield,
  Truck,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ShellNavChild = {
  href: string;
  labelKey: string;
};

export type ShellNavItem = {
  id: string;
  href?: string;
  labelKey: string;
  icon?: LucideIcon;
  children?: ShellNavChild[];
};

export type ShellNavSection = {
  id: string;
  /** i18n key under shell.sections.* */
  labelKey: string;
  /** When false, section starts collapsed (unless a child is active). */
  defaultOpen?: boolean;
  /** When false, section is always open and the header is not a toggle. Default true. */
  collapsible?: boolean;
  /** When true, no section header is rendered (items only). */
  hideLabel?: boolean;
  /** Subtle top rule before this section */
  dividerBefore?: boolean;
  items: ShellNavItem[];
};

/**
 * Single app navigation — collapsible section groups.
 */
export const APP_NAV: ShellNavSection[] = [
  {
    id: "operations",
    labelKey: "operations",
    collapsible: false,
    defaultOpen: true,
    items: [
      {
        id: "dashboard",
        href: "/dashboard",
        labelKey: "dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "projects",
        href: "/projecten",
        labelKey: "projects",
        icon: ClipboardList,
      },
      {
        id: "planning",
        href: "/planning",
        labelKey: "planning",
        icon: CalendarDays,
      },
      {
        id: "workItems",
        href: "/werkzaamheden",
        labelKey: "workItems",
        icon: ListTodo,
      },
    ],
  },
  {
    id: "documents",
    labelKey: "documents",
    defaultOpen: true,
    items: [
      {
        id: "quotes",
        href: "/offertes",
        labelKey: "quotes",
        icon: FileText,
      },
      {
        id: "invoices",
        href: "/facturen",
        labelKey: "invoices",
        icon: Receipt,
      },
      {
        id: "workOrders",
        href: "/werkbonnen",
        labelKey: "workOrders",
        icon: Wrench,
      },
      {
        id: "files",
        href: "/documenten",
        labelKey: "documentsLibrary",
        icon: FolderOpen,
      },
    ],
  },
  {
    id: "resources",
    labelKey: "resources",
    defaultOpen: false,
    items: [
      {
        id: "customers",
        href: "/klanten",
        labelKey: "customers",
        icon: Users,
      },
      {
        id: "suppliers",
        href: "/leveranciers",
        labelKey: "suppliers",
        icon: Truck,
      },
      {
        id: "subcontractors",
        href: "/onderaannemers",
        labelKey: "subcontractors",
        icon: Users,
      },
      {
        id: "equipment",
        labelKey: "equipment",
        icon: Package,
        children: [
          { href: "/materiaal/voorraad", labelKey: "stock" },
          { href: "/materiaal/artikelen", labelKey: "articles" },
          { href: "/materiaal/inkoop", labelKey: "purchasing" },
        ],
      },
    ],
  },
  {
    id: "company",
    labelKey: "company",
    defaultOpen: false,
    items: [
      {
        id: "companyProfile",
        href: "/instellingen/bedrijf",
        labelKey: "companyProfile",
        icon: Building2,
      },
      {
        id: "reports",
        href: "/rapportages",
        labelKey: "reports",
        icon: BarChart3,
      },
      {
        id: "staff",
        href: "/personeel",
        labelKey: "staff",
        icon: UserRound,
      },
    ],
  },
  {
    id: "communication",
    labelKey: "communication",
    defaultOpen: false,
    dividerBefore: true,
    items: [
      {
        id: "inbox",
        href: "/inbox",
        labelKey: "inbox",
        icon: Inbox,
      },
      {
        id: "notifications",
        href: "/notificaties",
        labelKey: "notificationsSettings",
        icon: Bell,
      },
    ],
  },
];

export const NEW_REQUEST_HREF = "/opdrachten/nieuw" as const;

export const PLATFORM_ADMIN_NAV: ShellNavSection = {
  id: "platform-admin",
  labelKey: "admin",
  hideLabel: true,
  collapsible: false,
  dividerBefore: true,
  items: [
    {
      id: "admin",
      href: "/platform/admin",
      labelKey: "admin",
      icon: Shield,
      children: [
        { href: "/platform/admin/accounts", labelKey: "adminAccounts" },
        { href: "/platform/admin/gebruikers", labelKey: "adminUsers" },
        {
          href: "/platform/admin/administratie",
          labelKey: "adminAdministration",
        },
      ],
    },
  ],
};

export const APP_HOME_HREF = "/dashboard" as const;

const EXTRA_TITLE_ROUTES: Array<{ href: string; labelKey: string }> = [
  { href: "/instellingen/account", labelKey: "settingsAccount" },
  { href: "/instellingen/abonnement", labelKey: "settingsBilling" },
  { href: "/financien", labelKey: "finance" },
  { href: NEW_REQUEST_HREF, labelKey: "newRequest" },
];

function collectTitleRoutes(sections: ShellNavSection[]) {
  const routes: Array<{ href: string; labelKey: string }> = [];
  for (const section of sections) {
    for (const item of section.items) {
      if (item.href) {
        routes.push({ href: item.href, labelKey: item.labelKey });
      }
      for (const child of item.children ?? []) {
        routes.push({ href: child.href, labelKey: child.labelKey });
      }
    }
  }
  return routes;
}

const TITLE_ROUTES = [
  ...collectTitleRoutes(APP_NAV),
  ...collectTitleRoutes([PLATFORM_ADMIN_NAV]),
  ...EXTRA_TITLE_ROUTES,
].sort((a, b) => b.href.length - a.href.length);

/** Nav `labelKey` under `shell.*` for the current pathname (no locale prefix). */
export function navLabelKeyForPathname(pathname: string): string | null {
  for (const route of TITLE_ROUTES) {
    if (pathname === route.href) return route.labelKey;
    if (route.href !== APP_HOME_HREF && pathname.startsWith(`${route.href}/`)) {
      return route.labelKey;
    }
  }
  return null;
}
