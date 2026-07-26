import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Package,
  Receipt,
  Shield,
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
  /** Optional quiet section label (i18n key under shell.sections.*) */
  labelKey?: string;
  items: ShellNavItem[];
};

/**
 * Single app navigation — one operating system.
 */
export const APP_NAV: ShellNavSection[] = [
  {
    id: "daily",
    items: [
      {
        id: "dashboard",
        href: "/dashboard",
        labelKey: "dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "operations",
    labelKey: "operations",
    items: [
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
      {
        id: "workOrders",
        href: "/werkbonnen",
        labelKey: "workOrders",
        icon: Wrench,
      },
      {
        id: "invoices",
        href: "/facturen",
        labelKey: "invoices",
        icon: Receipt,
      },
    ],
  },
  {
    id: "resources",
    labelKey: "resources",
    items: [
      {
        id: "customers",
        href: "/klanten",
        labelKey: "customers",
        icon: Users,
      },
      {
        id: "staff",
        href: "/personeel",
        labelKey: "staff",
        icon: UserRound,
      },
      {
        id: "materials",
        labelKey: "materials",
        icon: Package,
        children: [
          { href: "/materiaal/voorraad", labelKey: "stock" },
          { href: "/materiaal/artikelen", labelKey: "articles" },
          { href: "/materiaal/inkoop", labelKey: "purchasing" },
          { href: "/materiaal/installaties", labelKey: "installations" },
        ],
      },
    ],
  },
  {
    id: "communication",
    labelKey: "communication",
    items: [
      {
        id: "inbox",
        href: "/inbox",
        labelKey: "inbox",
        icon: Inbox,
      },
    ],
  },
  {
    id: "insights",
    labelKey: "insights",
    items: [
      {
        id: "reports",
        href: "/rapportages",
        labelKey: "reports",
        icon: BarChart3,
      },
    ],
  },
];

export const NEW_REQUEST_HREF = "/aanvragen/nieuw" as const;

/** Platform Admin — shown only for super_admin. */
export const PLATFORM_ADMIN_NAV: ShellNavSection = {
  id: "platform-admin",
  labelKey: "platform",
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

/** Default post-login / home destination inside the app shell. */
export const APP_HOME_HREF = "/dashboard" as const;
