import {
  CalendarDays,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ShellContext = "werk" | "bedrijf";

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
  items: ShellNavItem[];
};

/** Primary Werk navigation — visual shell only for now. */
export const WERK_NAV: ShellNavSection[] = [
  {
    id: "main",
    items: [
      {
        id: "dashboard",
        href: "/werk",
        labelKey: "dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "projects",
        labelKey: "projects",
        icon: ClipboardList,
        children: [
          { href: "/werk/projecten", labelKey: "allProjects" },
          { href: "/werk/projecten/offertes", labelKey: "quotes" },
          { href: "/werk/projecten/werkbonnen", labelKey: "workOrders" },
          { href: "/werk/projecten/facturen", labelKey: "invoices" },
        ],
      },
      {
        id: "planning",
        href: "/werk/planning",
        labelKey: "planning",
        icon: CalendarDays,
      },
    ],
  },
  {
    id: "resources",
    items: [
      {
        id: "materials",
        labelKey: "materials",
        icon: Package,
        children: [
          { href: "/werk/materiaal/voorraad", labelKey: "stock" },
          { href: "/werk/materiaal/artikelen", labelKey: "articles" },
          { href: "/werk/materiaal/inkoop", labelKey: "purchasing" },
          { href: "/werk/materiaal/installaties", labelKey: "installations" },
        ],
      },
      {
        id: "people",
        labelKey: "people",
        icon: Users,
        children: [
          { href: "/werk/personen/klanten", labelKey: "customers" },
          { href: "/werk/personen/leveranciers", labelKey: "suppliers" },
          {
            href: "/werk/personen/onderaannemers",
            labelKey: "subcontractors",
          },
        ],
      },
    ],
  },
  {
    id: "inbox",
    items: [
      {
        id: "inbox",
        href: "/werk/inbox",
        labelKey: "inbox",
        icon: Inbox,
      },
    ],
  },
];

/** Bedrijf context — same chrome, quieter structure. */
export const BEDRIJF_NAV: ShellNavSection[] = [
  {
    id: "main",
    items: [
      {
        id: "dashboard",
        href: "/bedrijf",
        labelKey: "dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "customers",
        href: "/bedrijf/klanten",
        labelKey: "customers",
        icon: Users,
      },
      {
        id: "finance",
        href: "/bedrijf/financien",
        labelKey: "finance",
        icon: Receipt,
      },
      {
        id: "reports",
        href: "/bedrijf/rapportages",
        labelKey: "reports",
        icon: FileText,
      },
      {
        id: "settings",
        href: "/bedrijf/instellingen",
        labelKey: "settings",
        icon: Settings,
      },
    ],
  },
];

export const NEW_REQUEST_HREF = "/werk/aanvragen/nieuw" as const;

/** Platform Admin — shown only for super_admin, below a divider. */
export const PLATFORM_ADMIN_NAV: ShellNavSection = {
  id: "platform-admin",
  items: [
    {
      id: "admin",
      labelKey: "admin",
      icon: Shield,
      children: [
        { href: "/platform/admin", labelKey: "adminDashboard" },
        { href: "/platform/admin/gebruikers", labelKey: "adminUsers" },
        {
          href: "/platform/admin/administratie",
          labelKey: "adminAdministration",
        },
      ],
    },
  ],
};
