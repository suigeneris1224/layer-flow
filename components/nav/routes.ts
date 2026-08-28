import type { Route } from "next";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  FolderTree,
  Home,
  Layers,
  LineChart,
  Receipt,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

interface BaseNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

/**
 * A nav entry is either a real link or a signpost.
 *
 * Screens that do not exist yet carry no href at all -- typedRoutes would
 * reject a link to a missing page, and rightly so. They render as disabled
 * labels rather than 404s.
 */
export type NavItem =
  | (BaseNavItem & { href: Route; comingSoon?: false })
  | (BaseNavItem & { href?: undefined; comingSoon: true });

export interface NavGroup {
  /** Null for the ungrouped items at the top. */
  label: string | null;
  items: NavItem[];
}

/** Sidebar, grouped as in the product design. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ key: "dashboard", href: "/dashboard", label: "Dashboard", icon: Home }],
  },
  {
    label: "Farm management",
    items: [
      { key: "farms", label: "Farms", icon: Warehouse, comingSoon: true },
      { key: "houses", label: "Houses", icon: Home, comingSoon: true },
      { key: "flocks", label: "Flocks", icon: Layers, comingSoon: true },
      { key: "inventory", href: "/inventory", label: "Egg Inventory", icon: Boxes },
    ],
  },
  {
    label: "Production",
    items: [
      {
        key: "production",
        href: "/production/new",
        label: "Daily Production",
        icon: ClipboardList,
      },
      { key: "pricing", href: "/prices", label: "Egg Sizes & Pricing", icon: Tags },
    ],
  },
  {
    label: "Sales",
    items: [
      { key: "sales", href: "/sales", label: "Sales History", icon: ShoppingCart },
      { key: "customers", label: "Customers", icon: Users, comingSoon: true },
    ],
  },
  {
    label: "Expenses",
    items: [
      { key: "expenses", label: "Expenses", icon: Receipt, comingSoon: true },
      { key: "categories", label: "Categories", icon: FolderTree, comingSoon: true },
    ],
  },
  {
    label: "Reports",
    items: [
      { key: "analytics", label: "Analytics", icon: LineChart, comingSoon: true },
      { key: "reports", label: "Reports", icon: BarChart3, comingSoon: true },
    ],
  },
];

/**
 * Mobile tab bar (spec section 46). The "+" sits between Flocks and Money.
 *
 * Deliberately short: the tab bar is primary navigation on a phone, and the
 * full grouped sidebar is available behind the drawer.
 */
export const TAB_ITEMS: NavItem[] = [
  { key: "home", href: "/dashboard", label: "Home", icon: Home },
  { key: "inventory", href: "/inventory", label: "Stock", icon: Boxes },
  { key: "money", href: "/sales", label: "Money", icon: ShoppingCart },
  { key: "more", label: "More", icon: Settings, comingSoon: true },
];
