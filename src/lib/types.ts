/* ------------------------------------------------------------------
   Malwa Builders Admin — domain model.
   Plain data only, so a real API can replace the seed loader later.
-------------------------------------------------------------------*/

export type ModuleKey =
  | "dashboard"
  | "projects"
  | "customers"
  | "payments"
  | "payments_dues"
  | "payments_receipts"
  | "materials"
  | "vendors"
  | "vendors_list"
  | "vendors_commitments"
  | "reminders"
  | "website"
  | "settings";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string; // demo only — replace with real auth
  designation: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  gstin?: string;
  since: string;
  note?: string;
}

export type ProjectStatus = "upcoming" | "ongoing" | "on_hold" | "completed";

/** The kind of work — design services or full turnkey build. */
export type ProjectMode =
  | "site_visit"
  | "floor_plans"
  | "elevation"
  | "interior"
  | "exterior"
  | "turnkey";

export const PROJECT_MODES: { key: ProjectMode; label: string }[] = [
  { key: "floor_plans", label: "Floor Plans" },
  { key: "elevation", label: "Elevation" },
  { key: "interior", label: "Interior" },
  { key: "exterior", label: "Exterior" },
  { key: "site_visit", label: "Site Visit" },
  { key: "turnkey", label: "Turnkey" },
];

export const PROJECT_STATUSES: { key: ProjectStatus; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
];

export interface Project {
  id: string;
  code: string;
  name: string;
  customerId: string;
  mode: ProjectMode;
  status: ProjectStatus;
  site: string;
  city: string;
  builtUpArea: number; // sq ft
  contractValue: number;
  startDate: string;
  targetDate: string;
  progress: number; // 0-100
  note?: string;
}

export type MilestoneStatus = "pending" | "partial" | "paid";

/** One instalment of a project's payment schedule. Drives every due figure. */
export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  amount: number;
  dueDate: string;
  paidAmount: number;
  status: MilestoneStatus;
}

export type PaymentMode = "cash" | "upi" | "bank" | "cheque" | "rtgs";

export const PAYMENT_MODES: PaymentMode[] = ["cash", "upi", "bank", "cheque", "rtgs"];

export interface Payment {
  id: string;
  receiptNo: string;
  projectId: string;
  milestoneId?: string;
  amount: number;
  date: string;
  mode: PaymentMode;
  ref?: string;
  note?: string;
}

export const MATERIAL_CATEGORIES = [
  "Aggregate",
  "Cement",
  "Steel",
  "Bricks & Blocks",
  "Tiles & Stone",
  "Electrical",
  "Plumbing",
  "Paint & Finish",
  "Wood & Ply",
  "Misc",
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const UNITS = [
  "trolley",
  "bag",
  "qtl",
  "kg",
  "cft",
  "nos",
  "per 1000",
  "sqft",
  "rft",
  "litre",
] as const;
export type Unit = (typeof UNITS)[number];

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: Unit;
  /** ex-godown rate */
  rate: number;
  /** freight + unloading, so rate + delivery = price at site */
  delivery: number;
  vendorId: string;
  stock: number;
  minStock: number;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  city: string;
  kind: "supplier" | "contractor";
  supplies: string;
  gstin?: string;
  paymentTerms: string;
}

export type CommitmentStatus = "ordered" | "delivered" | "cancelled";

/** What we have promised a vendor: order value, what is paid, what is left. */
export interface Commitment {
  id: string;
  refNo: string;
  vendorId: string;
  projectId: string;
  item: string;
  amount: number;
  paidAmount: number;
  date: string;
  dueDate: string;
  status: CommitmentStatus;
  note?: string;
}

/** One payment we made to a vendor against a Commitment. Mirrors Payment, but money going out. */
export interface VendorPayment {
  id: string;
  receiptNo: string;
  commitmentId: string;
  vendorId: string;
  amount: number;
  date: string;
  mode: PaymentMode;
  ref?: string;
  note?: string;
}

export type ReminderStatus = "pending" | "done";
export type ReminderKind = "payment" | "vendor" | "site" | "custom";

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: string;
  message: string;
  toName: string;
  toPhone: string;
  dueDate: string;
  status: ReminderStatus;
  projectId?: string;
}

export type MediaKind = "image" | "video";

/** A photo or video published to the public website. */
export interface Media {
  id: string;
  title: string;
  kind: MediaKind;
  /** data URL for uploads, or any public link */
  url: string;
  section: string;
  caption?: string;
  published: boolean;
  uploadedAt: string;
}

export const WEBSITE_SECTIONS = [
  "Hero Banner",
  "Featured Projects",
  "Gallery",
  "Interior Work",
  "Testimonials",
  "About Us",
] as const;

export interface Settings {
  firmName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  reminderWindowDays: number;
}

export interface DB {
  users: User[];
  customers: Customer[];
  projects: Project[];
  milestones: Milestone[];
  payments: Payment[];
  materials: Material[];
  vendors: Vendor[];
  commitments: Commitment[];
  vendorPayments: VendorPayment[];
  reminders: Reminder[];
  media: Media[];
  settings: Settings;
}
