import {
  Banknote, BellRing, Boxes, Building2, Images, LayoutDashboard, Settings2, Truck, Users2,
} from "lucide-react";
import type { ModuleKey } from "./types";

export interface NavChild {
  key: ModuleKey;
  label: string;
  href: string;
}

export interface NavItem {
  key: ModuleKey;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  desc: string;
  /** Present only for a grouped item — rendered as a heading over these sub-links. */
  children?: NavChild[];
}

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, desc: "Due, pending and upcoming payments at a glance" },
  { key: "customers", label: "Customers", href: "/customers", icon: Users2, desc: "Client details and their project history" },
  { key: "projects", label: "Projects", href: "/projects", icon: Building2, desc: "Floor plans, elevation, interior and turnkey builds" },
  {
    key: "payments", label: "Payments", href: "/payments", icon: Banknote,
    desc: "Instalments, collections and outstanding dues",
    children: [
      { key: "payments_dues", label: "Outstanding dues", href: "/payments" },
      { key: "payments_receipts", label: "Receipts", href: "/payments/receipts" },
    ],
  },
  {
    key: "vendors", label: "Vendors", href: "/vendors", icon: Truck,
    desc: "Suppliers, contractors and what we owe them",
    children: [
      { key: "vendors_list", label: "Vendors", href: "/vendors" },
      { key: "vendors_commitments", label: "Commitments", href: "/vendors/commitments" },
    ],
  },
  { key: "materials", label: "Materials", href: "/materials", icon: Boxes, desc: "Rates at site and stock in the store" },
  { key: "reminders", label: "Reminders", href: "/reminders", icon: BellRing, desc: "Follow-ups to send on WhatsApp" },
  { key: "website", label: "Website", href: "/website", icon: Images, desc: "Photos and videos shown on the public site" },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings2, desc: "Firm profile and preferences" },
];
