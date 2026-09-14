import type { Route } from "next";
import {
  BellRing,
  CreditCard,
  LifeBuoy,
  RefreshCw,
  UserRound,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { FarmContext } from "@/lib/auth/session";
import { canManageFarmSettings, canManageUsers } from "@/lib/auth/permissions";

/**
 * The 7 Settings categories, shared by the hub grid (app/(app)/settings/page.tsx,
 * mobile's landing view) and the tab bar (components/nav/settings-nav.tsx,
 * desktop/tablet) so the two listings can't drift apart.
 *
 * All 7 now genuinely live under /settings/* -- Profile, Team, Subscription
 * and Help & Support used to be their own top-level routes (/profile, /team,
 * /billing, /support); those became redirect shims when their content moved
 * here, so every tab swaps content in place instead of navigating away.
 */
export interface SettingsCategory {
  key: string;
  href: Route;
  icon: LucideIcon;
  title: string;
  description: string;
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    key: "profile",
    href: "/settings/profile",
    icon: UserRound,
    title: "Profile",
    description: "Your personal information and account.",
  },
  {
    key: "farm",
    href: "/settings/farm",
    icon: Warehouse,
    title: "Farm",
    description: "Farm information, houses and configuration.",
  },
  {
    key: "team",
    href: "/settings/team",
    icon: Users,
    title: "Team",
    description: "Who works with you, and what they can do.",
  },
  {
    key: "subscription",
    href: "/settings/billing",
    icon: CreditCard,
    title: "Subscription",
    description: "Your plan, usage, and billing.",
  },
  {
    key: "notifications",
    href: "/settings/notifications",
    icon: BellRing,
    title: "Notifications",
    description: "What LayerFlow should tell you, and when.",
  },
  {
    key: "data-sync",
    href: "/settings/data-sync",
    icon: RefreshCw,
    title: "Data & Sync",
    description: "Whether your data is saved and up to date.",
  },
  {
    key: "help",
    href: "/settings/support",
    icon: LifeBuoy,
    title: "Help & Support",
    description: "Get help, or send us a message.",
  },
];

/**
 * Farm/Team live under Settings, but changing them is owner-only -- same as
 * their own pages already enforce; hiding the entry here just saves a tap
 * into a page that would only tell you no.
 */
export function visibleSettingsCategories(context: FarmContext): SettingsCategory[] {
  return SETTINGS_CATEGORIES.filter((category) => {
    if (category.key === "farm") return canManageFarmSettings(context);
    if (category.key === "team") return canManageUsers(context);
    return true;
  });
}
