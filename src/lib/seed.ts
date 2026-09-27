/* ------------------------------------------------------------------
   Sample data for Malwa Builders.
   Dates are relative to "today" so the dashboard always shows live
   looking overdue / due-soon / upcoming numbers.
-------------------------------------------------------------------*/

import { addDays, toISODate } from "./format";
import type {
  Commitment,
  Customer,
  DB,
  Material,
  Milestone,
  Payment,
  PaymentMode,
  Project,
  ProjectMode,
  Reminder,
  Settings,
  User,
  Vendor,
  VendorPayment,
} from "./types";

/* deterministic PRNG so the demo looks the same on every reload */
let _seed = 20260801;
function rnd(): number {
  _seed = (_seed * 1103515245 + 12345) % 2147483648;
  return _seed / 2147483648;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function between(min: number, max: number): number {
  return Math.round(min + rnd() * (max - min));
}
/** ISO date N days from today (negative = past) */
function d(offset: number): string {
  return toISODate(addDays(new Date(), offset));
}

/* ------------------------------ team ----------------------------- */

const users: User[] = [
  {
    id: "u1",
    name: "Jaskaran Singh Malwa",
    email: "admin@malwabuilders.com",
    phone: "9815031725",
    password: "admin123",
    designation: "Founder & Managing Director",
  },
  {
    id: "u2",
    name: "Navdeep Singh Grewal",
    email: "manager@malwabuilders.com",
    phone: "9501005300",
    password: "manager123",
    designation: "Projects Head",
  },
];

/* ---------------------------- customers -------------------------- */

const customers: Customer[] = [
  { id: "c1", name: "Harpreet Singh Gill", phone: "9815500112", email: "hs.gill@gmail.com", address: "Kot Umra Road, near Green Enclave", city: "Jagraon", since: d(-410), note: "Prefers evening calls after 7 PM." },
  { id: "c2", name: "Dr. Manjit Kaur Sidhu", phone: "9814622334", email: "drmanjit.sidhu@gmail.com", address: "Civil Lines, opp. Govt. Hospital", city: "Jagraon", gstin: "03AABCM1234K1Z9", since: d(-330) },
  { id: "c3", name: "Sukhdev Singh Dhaliwal", phone: "9876711223", address: "Village Akhara, Sidhwan Bet Road", city: "Sidhwan Bet", since: d(-280), note: "Farmhouse on 4 acre land." },
  { id: "c4", name: "Amandeep Brar", phone: "9463788990", email: "aman.brar@outlook.com", address: "Royal City, Phase 2", city: "Jagraon", since: d(-240) },
  { id: "c5", name: "Gurmeet Singh Sandhu", phone: "9779045566", email: "gs.sandhu.ca@gmail.com", address: "Brampton, ON (NRI) — site at Malha Road", city: "Ludhiana", since: d(-200), note: "NRI client — approvals over WhatsApp video call." },
  { id: "c6", name: "Ravinder Kumar Jindal", phone: "9815977880", email: "jindal.traders@gmail.com", address: "Main Bazaar, above Jindal Traders", city: "Raikot", gstin: "03AAFCJ9087P1ZL", since: d(-160) },
  { id: "c7", name: "Simranjeet Kaur Aulakh", phone: "9855611447", address: "Guru Nanak Nagar, Street 4", city: "Jagraon", since: d(-120) },
  { id: "c8", name: "Jaswant Singh Cheema", phone: "9878455332", email: "cheema.js@gmail.com", address: "Cheema Farms, Mullanpur Road", city: "Mullanpur", since: d(-75) },
  { id: "c9", name: "Neeraj Bansal", phone: "9814099771", address: "Bansal Complex, GT Road", city: "Ludhiana", gstin: "03AACPB5566H1Z2", since: d(-40) },
];

/* ---------------------------- projects --------------------------- */

const projects: Project[] = [
  { id: "p1", code: "MB-2024-014", name: "Gill Residence — 500 Yd Luxury Kothi", customerId: "c1", mode: "turnkey", status: "ongoing", site: "Kot Umra Road, Green Enclave", city: "Jagraon", builtUpArea: 6200, contractValue: 14570000, startDate: d(-395), targetDate: d(35), progress: 82, note: "Full turnkey build. Italian marble in living, teak main door." },
  { id: "p2", code: "MB-2024-021", name: "Dr. Sidhu Bungalow — Civil Lines", customerId: "c2", mode: "turnkey", status: "ongoing", site: "Civil Lines, opp. Govt. Hospital", city: "Jagraon", builtUpArea: 4400, contractValue: 9460000, startDate: d(-320), targetDate: d(-12), progress: 91, note: "Ground floor consultation room needs a separate entry." },
  { id: "p3", code: "MB-2025-031", name: "Dhaliwal Farmhouse — Floor Plans", customerId: "c3", mode: "floor_plans", status: "ongoing", site: "Village Akhara, Sidhwan Bet Road", city: "Sidhwan Bet", builtUpArea: 5800, contractValue: 85000, startDate: d(-45), targetDate: d(20), progress: 55, note: "Visit done. Ground floor plans shared on WhatsApp. First floor pending." },
  { id: "p4", code: "MB-2025-038", name: "Brar Kothi — Floor Plans", customerId: "c4", mode: "floor_plans", status: "ongoing", site: "Royal City, Phase 2, Plot 88", city: "Jagraon", builtUpArea: 3800, contractValue: 72000, startDate: d(-28), targetDate: d(35), progress: 30, note: "Site visit fee ₹5,000 collected. Measuring completed." },
  { id: "p5", code: "MB-2025-042", name: "Sandhu NRI Villa — Elevation", customerId: "c5", mode: "elevation", status: "ongoing", site: "Malha Road, near Toll Plaza", city: "Ludhiana", builtUpArea: 4900, contractValue: 125000, startDate: d(-40), targetDate: d(25), progress: 50, note: "NRI client — 3D elevation review over WhatsApp video." },
  { id: "p6", code: "MB-2025-044", name: "Jindal Plot — Site Visit", customerId: "c6", mode: "site_visit", status: "completed", site: "Main Bazaar, Raikot", city: "Raikot", builtUpArea: 2400, contractValue: 5000, startDate: d(-18), targetDate: d(-16), progress: 100, note: "Plot measured. Client may book floor plans next." },
  { id: "p7", code: "MB-2025-048", name: "Aulakh House — Interior Design", customerId: "c7", mode: "interior", status: "ongoing", site: "Guru Nanak Nagar, Street 4", city: "Jagraon", builtUpArea: 2600, contractValue: 185000, startDate: d(-55), targetDate: d(15), progress: 70, note: "Kitchen + living concept approved. Final package in progress." },
  { id: "p8", code: "MB-2025-052", name: "Cheema Farms — Elevation Design", customerId: "c8", mode: "elevation", status: "ongoing", site: "Cheema Farms, Mullanpur Road", city: "Mullanpur", builtUpArea: 5400, contractValue: 98000, startDate: d(-35), targetDate: d(5), progress: 85 },
  { id: "p9", code: "MB-2026-003", name: "Bansal Farmhouse — Floor Plans", customerId: "c9", mode: "floor_plans", status: "ongoing", site: "Village Jhande, GT Road", city: "Ludhiana", builtUpArea: 4200, contractValue: 90000, startDate: d(-12), targetDate: d(40), progress: 20 },
  { id: "p10", code: "MB-2024-006", name: "Sekhon Kothi — Handover Complete", customerId: "c1", mode: "turnkey", status: "completed", site: "Tehsil Road, Atma Nagar", city: "Jagraon", builtUpArea: 3200, contractValue: 6560000, startDate: d(-620), targetDate: d(-180), progress: 100 },
  { id: "p11", code: "MB-2025-055", name: "Sohal Duplex — Exterior Design", customerId: "c6", mode: "exterior", status: "on_hold", site: "Nurpur Bet Road", city: "Raikot", builtUpArea: 3400, contractValue: 110000, startDate: d(-50), targetDate: d(60), progress: 15, note: "Paused — client waiting on bank loan for build." },
  { id: "p12", code: "MB-2026-007", name: "Kang Residence — Floor Plans", customerId: "c4", mode: "floor_plans", status: "upcoming", site: "Sector 5, Bhawanigarh Road", city: "Jagraon", builtUpArea: 4600, contractValue: 80000, startDate: d(8), targetDate: d(50), progress: 0, note: "Visit scheduled. Plans after measurement." },
];

/* ------------------- payment schedules per mode ------------------- */

export const SCHEDULES: Record<ProjectMode, { title: string; percent: number }[]> = {
  site_visit: [
    { title: "Site Visit & Measurement", percent: 100 },
  ],
  floor_plans: [
    { title: "Site Visit & Measurement", percent: 8 },
    { title: "Ground Floor Plans", percent: 37 },
    { title: "First Floor Plans", percent: 35 },
    { title: "Final Drawings Handover", percent: 20 },
  ],
  elevation: [
    { title: "Design Advance", percent: 40 },
    { title: "3D / Elevation Approval", percent: 40 },
    { title: "Working Drawings", percent: 20 },
  ],
  interior: [
    { title: "Design Advance", percent: 40 },
    { title: "Concept Approval", percent: 35 },
    { title: "Final Interior Package", percent: 25 },
  ],
  exterior: [
    { title: "Design Advance", percent: 40 },
    { title: "Concept Approval", percent: 35 },
    { title: "Final Exterior Package", percent: 25 },
  ],
  turnkey: [
    { title: "Booking Advance", percent: 10 },
    { title: "Foundation & Plinth Complete", percent: 15 },
    { title: "Ground Floor Roof Slab", percent: 15 },
    { title: "First Floor Roof Slab", percent: 15 },
    { title: "Brickwork & Inside Plaster", percent: 15 },
    { title: "Flooring, Tiles & Elevation", percent: 15 },
    { title: "Interior, Paint & Polish", percent: 10 },
    { title: "Handover & Snag Clearance", percent: 5 },
  ],
};

/** How far each project has actually paid: full instalments + a part payment. */
const COLLECTED: Record<string, { full: number; partOf?: number }> = {
  p1: { full: 6, partOf: 0.45 },
  p2: { full: 6, partOf: 0.5 },
  p3: { full: 2, partOf: 0.4 },
  p4: { full: 1 },
  p5: { full: 1, partOf: 0.5 },
  p6: { full: 1 },
  p7: { full: 2 },
  p8: { full: 2 },
  p9: { full: 1 },
  p10: { full: 8 },
  p11: { full: 0 },
  p12: { full: 0 },
};

const milestones: Milestone[] = [];
const payments: Payment[] = [];
let receiptNo = 1041;

projects.forEach((p) => {
  const schedule = SCHEDULES[p.mode];
  const start = new Date(p.startDate);
  const spanDays = Math.max(30, (new Date(p.targetDate).getTime() - start.getTime()) / 86400000);
  const step = spanDays / schedule.length;
  const rule = COLLECTED[p.id] ?? { full: 0 };

  schedule.forEach((s, i) => {
    const dueDate = toISODate(addDays(start, Math.round(step * (i + 1) - step / 2)));
    const amount = Math.round((p.contractValue * s.percent) / 100);
    const id = `${p.id}_m${i + 1}`;

    let paidAmount = 0;
    let status: Milestone["status"] = "pending";
    if (i < rule.full) {
      paidAmount = amount;
      status = "paid";
    } else if (i === rule.full && rule.partOf) {
      paidAmount = Math.round(amount * rule.partOf);
      status = "partial";
    }

    milestones.push({ id, projectId: p.id, title: s.title, amount, dueDate, paidAmount, status });

    if (paidAmount > 0) {
      const modes: PaymentMode[] = ["bank", "upi", "cheque", "rtgs", "cash"];
      const mode = pick(modes);
      payments.push({
        id: `${id}_pay`,
        receiptNo: `MB/RCP/${receiptNo++}`,
        projectId: p.id,
        milestoneId: id,
        amount: paidAmount,
        date: toISODate(addDays(new Date(dueDate), between(-6, 9))),
        mode,
        ref:
          mode === "cheque" ? `CHQ ${between(100000, 999999)}`
          : mode === "upi" ? `UPI ${between(100000000000, 999999999999)}`
          : mode === "cash" ? undefined
          : `NEFT${between(10000000, 99999999)}`,
      });
    }
  });
});

/* ----------------------------- vendors --------------------------- */

const vendors: Vendor[] = [
  { id: "v1", name: "Gill Sand & Grit Suppliers", contactPerson: "Balwinder Gill", phone: "9815223344", city: "Jagraon", kind: "supplier", supplies: "Reta, Bajri, Crush, Filling Mitti", gstin: "03AAGPG7788L1Z4", paymentTerms: "15 days credit" },
  { id: "v2", name: "Sidhu Stone Crusher", contactPerson: "Ranjit Sidhu", phone: "9814556677", city: "Ludhiana", kind: "supplier", supplies: "Bajri, Crush 20mm, Crush 12mm, Stone Dust", gstin: "03AABFS1122M1Z8", paymentTerms: "Advance" },
  { id: "v3", name: "Bharat Cement Agency", contactPerson: "Sunil Kumar", phone: "9876334455", city: "Jagraon", kind: "supplier", supplies: "Cement OPC 43, PPC, White Cement, Putty", gstin: "03AACCB4455N1Z1", paymentTerms: "30 days credit" },
  { id: "v4", name: "Dhillon Steel Traders", contactPerson: "Karan Dhillon", phone: "9463778899", city: "Ludhiana", kind: "supplier", supplies: "TMT Sariya Fe500D, Binding Wire, Girder", gstin: "03AAEPD9911K1Z6", paymentTerms: "7 days credit" },
  { id: "v5", name: "Malwa Brick Kiln (Bhatta)", contactPerson: "Sucha Singh", phone: "9855441122", city: "Sidhwan Bet", kind: "supplier", supplies: "First Class Bricks, Fly Ash Bricks", paymentTerms: "Cash on delivery" },
  { id: "v6", name: "Grewal Tiles & Sanitary", contactPerson: "Amrik Grewal", phone: "9814990033", city: "Jagraon", kind: "supplier", supplies: "Vitrified Tiles, Kota Stone, CP Fittings", gstin: "03AAJPG2233P1Z3", paymentTerms: "50% advance" },
  { id: "v7", name: "Sharma Electricals & Hardware", contactPerson: "Rakesh Sharma", phone: "9878221100", city: "Jagraon", kind: "supplier", supplies: "Wiring, Switches, MCB & DB, PVC Pipe", gstin: "03AAFPS6677Q1Z9", paymentTerms: "15 days credit" },
  { id: "v8", name: "Verma Paints & Polish", contactPerson: "Naresh Verma", phone: "9779033445", city: "Ludhiana", kind: "supplier", supplies: "Asian Paints, Primer, PU Polish, Waterproofing", paymentTerms: "Cash" },
  { id: "v9", name: "Balwinder Mistri Group", contactPerson: "Balwinder Singh", phone: "9815667788", city: "Jagraon", kind: "contractor", supplies: "Mistri, Labour, Shuttering", paymentTerms: "Weekly" },
  { id: "v10", name: "Jaspal Steel Fixing Works", contactPerson: "Jaspal Singh", phone: "9463112233", city: "Raikot", kind: "contractor", supplies: "Steel Fixing, Shuttering", paymentTerms: "Per slab" },
  { id: "v11", name: "Sukha Tile & Marble Team", contactPerson: "Sukhwinder Singh", phone: "9876009988", city: "Jagraon", kind: "contractor", supplies: "Tile Work, Marble Polish", paymentTerms: "On completion" },
  { id: "v12", name: "Happy Painter & POP Works", contactPerson: "Harpal Singh", phone: "9814772211", city: "Jagraon", kind: "contractor", supplies: "Painting, POP / False Ceiling", paymentTerms: "50-50" },
];

/* ---------------------------- materials -------------------------- */

const materials: Material[] = [
  { id: "m1", name: "Reta (River Sand)", category: "Aggregate", unit: "trolley", rate: 4500, delivery: 1250, vendorId: "v1", stock: 6, minStock: 4, updatedAt: d(-2) },
  { id: "m2", name: "Bajri (20mm Gravel)", category: "Aggregate", unit: "trolley", rate: 5300, delivery: 1400, vendorId: "v2", stock: 3, minStock: 4, updatedAt: d(-2) },
  { id: "m3", name: "Crush 12mm (Rodi)", category: "Aggregate", unit: "trolley", rate: 4900, delivery: 1350, vendorId: "v2", stock: 5, minStock: 3, updatedAt: d(-6) },
  { id: "m4", name: "Stone Dust", category: "Aggregate", unit: "trolley", rate: 2800, delivery: 900, vendorId: "v2", stock: 2, minStock: 2, updatedAt: d(-11) },
  { id: "m5", name: "Filling Mitti (Soil)", category: "Aggregate", unit: "trolley", rate: 1600, delivery: 650, vendorId: "v1", stock: 0, minStock: 2, updatedAt: d(-14) },
  { id: "m6", name: "Cement OPC 43 (Ambuja)", category: "Cement", unit: "bag", rate: 392, delivery: 12, vendorId: "v3", stock: 240, minStock: 150, updatedAt: d(-1) },
  { id: "m7", name: "Cement PPC (Shree)", category: "Cement", unit: "bag", rate: 358, delivery: 12, vendorId: "v3", stock: 95, minStock: 120, updatedAt: d(-1) },
  { id: "m8", name: "White Cement (Birla)", category: "Cement", unit: "bag", rate: 1180, delivery: 20, vendorId: "v3", stock: 12, minStock: 8, updatedAt: d(-9) },
  { id: "m9", name: "TMT Sariya 8mm Fe500D", category: "Steel", unit: "qtl", rate: 6350, delivery: 120, vendorId: "v4", stock: 18, minStock: 15, updatedAt: d(0) },
  { id: "m10", name: "TMT Sariya 10mm Fe500D", category: "Steel", unit: "qtl", rate: 6280, delivery: 120, vendorId: "v4", stock: 24, minStock: 15, updatedAt: d(0) },
  { id: "m11", name: "TMT Sariya 12mm Fe500D", category: "Steel", unit: "qtl", rate: 6180, delivery: 120, vendorId: "v4", stock: 31, minStock: 20, updatedAt: d(0) },
  { id: "m12", name: "TMT Sariya 16mm Fe500D", category: "Steel", unit: "qtl", rate: 6120, delivery: 120, vendorId: "v4", stock: 9, minStock: 12, updatedAt: d(0) },
  { id: "m13", name: "Binding Wire", category: "Steel", unit: "kg", rate: 82, delivery: 2, vendorId: "v4", stock: 140, minStock: 80, updatedAt: d(-4) },
  { id: "m14", name: "First Class Bricks", category: "Bricks & Blocks", unit: "per 1000", rate: 8600, delivery: 1100, vendorId: "v5", stock: 14, minStock: 10, updatedAt: d(-5) },
  { id: "m15", name: "Fly Ash Bricks", category: "Bricks & Blocks", unit: "per 1000", rate: 6700, delivery: 950, vendorId: "v5", stock: 8, minStock: 6, updatedAt: d(-5) },
  { id: "m16", name: "AAC Blocks 600x200x100", category: "Bricks & Blocks", unit: "nos", rate: 48, delivery: 6, vendorId: "v5", stock: 900, minStock: 500, updatedAt: d(-18) },
  { id: "m17", name: "Vitrified Tiles 800x800", category: "Tiles & Stone", unit: "sqft", rate: 68, delivery: 4, vendorId: "v6", stock: 1800, minStock: 800, updatedAt: d(-7) },
  { id: "m18", name: "Kota Stone (Polished)", category: "Tiles & Stone", unit: "sqft", rate: 42, delivery: 3, vendorId: "v6", stock: 650, minStock: 400, updatedAt: d(-13) },
  { id: "m19", name: "Italian Marble (Botticino)", category: "Tiles & Stone", unit: "sqft", rate: 385, delivery: 18, vendorId: "v6", stock: 220, minStock: 100, updatedAt: d(-20) },
  { id: "m20", name: "Copper Wiring 1.5 sqmm (90m)", category: "Electrical", unit: "nos", rate: 2450, delivery: 0, vendorId: "v7", stock: 22, minStock: 10, updatedAt: d(-8) },
  { id: "m21", name: "Modular Switch Set (Anchor)", category: "Electrical", unit: "nos", rate: 340, delivery: 0, vendorId: "v7", stock: 160, minStock: 60, updatedAt: d(-8) },
  { id: "m22", name: "CPVC Pipe 1 inch", category: "Plumbing", unit: "rft", rate: 118, delivery: 2, vendorId: "v7", stock: 420, minStock: 200, updatedAt: d(-10) },
  { id: "m23", name: "Asian Paints Apex Ultima", category: "Paint & Finish", unit: "litre", rate: 465, delivery: 0, vendorId: "v8", stock: 84, minStock: 40, updatedAt: d(-16) },
  { id: "m24", name: "Wall Putty (Birla 40kg)", category: "Paint & Finish", unit: "bag", rate: 1050, delivery: 15, vendorId: "v3", stock: 36, minStock: 25, updatedAt: d(-16) },
  { id: "m25", name: "Waterproofing Compound (20kg)", category: "Paint & Finish", unit: "nos", rate: 1850, delivery: 0, vendorId: "v8", stock: 9, minStock: 12, updatedAt: d(-22) },
  { id: "m26", name: "Marine Ply 19mm (BWP)", category: "Wood & Ply", unit: "sqft", rate: 98, delivery: 3, vendorId: "v6", stock: 540, minStock: 300, updatedAt: d(-12) },
  { id: "m27", name: "Teak Wood Frame", category: "Wood & Ply", unit: "cft", rate: 3650, delivery: 60, vendorId: "v6", stock: 28, minStock: 15, updatedAt: d(-25) },
  { id: "m28", name: "Shuttering Ply Hire (per month)", category: "Misc", unit: "sqft", rate: 14, delivery: 1, vendorId: "v9", stock: 0, minStock: 0, updatedAt: d(-30) },
];

/* -------------------------- commitments -------------------------- */

const commitments: Commitment[] = [];
let refNo = 3120;
/* Material POs only make sense on active turnkey builds */
const liveProjects = projects.filter((p) => p.status === "ongoing" && p.mode === "turnkey");

liveProjects.forEach((p) => {
  const count = between(2, 4);
  for (let i = 0; i < count; i++) {
    const m = pick(materials.slice(0, 24));
    const daysAgo = between(1, 70);
    const qty =
      m.unit === "trolley" ? between(3, 14)
      : m.unit === "bag" ? between(80, 450)
      : m.unit === "qtl" ? between(10, 65)
      : m.unit === "per 1000" ? between(6, 24)
      : m.unit === "sqft" ? between(250, 2400)
      : between(20, 400);
    const amount = Math.round(qty * (m.rate + m.delivery));
    const status: Commitment["status"] = daysAgo > 6 ? "delivered" : "ordered";
    const paidRatio = status === "delivered" ? pick([1, 1, 0.5, 0]) : 0;
    commitments.push({
      id: `cm_${refNo}`,
      refNo: `MB/PO/${refNo++}`,
      vendorId: m.vendorId,
      projectId: p.id,
      item: `${qty} ${m.unit} — ${m.name}`,
      amount,
      paidAmount: Math.round(amount * paidRatio),
      date: d(-daysAgo),
      dueDate: d(-daysAgo + 30),
      status,
    });
  }
});

/* ----------------------- vendor payments -------------------------- */

/* Left empty on purpose — existing commitments' paidAmount is an opening
   balance, not backed by a transaction. New payments build the ledger
   from here on. */
const vendorPayments: VendorPayment[] = [];

/* --------------------------- reminders --------------------------- */

const reminders: Reminder[] = [];
let remId = 1;

function firstName(full: string): string {
  return full.replace(/^Dr\.\s*/, "").split(" ")[0];
}

/* one payment reminder per unpaid instalment that is due within a month */
milestones
  .filter((m) => {
    const days = Math.round((new Date(m.dueDate).getTime() - Date.now()) / 86400000);
    return m.status !== "paid" && days <= 30 && days >= -60;
  })
  .slice(0, 12)
  .forEach((m) => {
    const project = projects.find((p) => p.id === m.projectId)!;
    const customer = customers.find((c) => c.id === project.customerId)!;
    const balance = m.amount - m.paidAmount;
    const overdue = new Date(m.dueDate) < new Date();
    reminders.push({
      id: `rem_${remId++}`,
      kind: "payment",
      title: `${overdue ? "Overdue" : "Payment due"} — ${m.title}`,
      message:
        `Sat Sri Akal ${firstName(customer.name)} ji,\n\n` +
        `Gentle reminder from *Malwa Builders* — payment of *\u20B9${balance.toLocaleString("en-IN")}* ` +
        `for _${m.title}_ at ${project.name} ${overdue ? "was due on" : "is due on"} ${m.dueDate}.\n\n` +
        `Kindly arrange the payment, the receipt will be shared immediately.\n\n— Malwa Builders, Jagraon`,
      toName: customer.name,
      toPhone: customer.phone,
      dueDate: m.dueDate,
      status: overdue && rnd() > 0.6 ? "done" : "pending",
      projectId: project.id,
    });
  });

reminders.push(
  {
    id: `rem_${remId++}`,
    kind: "vendor",
    title: "Vendor ledger — Dhillon Steel Traders",
    message: "Sat Sri Akal Karan ji, kindly share the updated ledger and pending bills for this month so we can release the payment.\n— Malwa Builders (Accounts)",
    toName: "Dhillon Steel Traders",
    toPhone: "9463778899",
    dueDate: d(1),
    status: "pending",
  },
  {
    id: `rem_${remId++}`,
    kind: "site",
    title: "Share elevation — Sandhu NRI Villa",
    message: "3D elevation ready. Send PDF + video walkthrough on WhatsApp to Gurmeet ji tonight (IST).",
    toName: "Design Team",
    toPhone: "9463311890",
    dueDate: d(2),
    status: "pending",
    projectId: "p5",
  },
  {
    id: `rem_${remId++}`,
    kind: "custom",
    title: "Low stock — Cement PPC & Bajri",
    message: "Cement PPC is 95 bags (minimum 120) and Bajri is 3 trolley (minimum 4). Raise the purchase orders today.",
    toName: "Purchase Team",
    toPhone: "9878123456",
    dueDate: d(0),
    status: "pending",
  },
);

/* ---------------------------- website ---------------------------- */

const media: DB["media"] = [
  { id: "md1", title: "Gill Residence — Front Elevation", kind: "image", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80", section: "Hero Banner", caption: "500 yard luxury kothi delivered at Jagraon", published: true, uploadedAt: d(-30) },
  { id: "md2", title: "Sekhon Kothi — Completed", kind: "image", url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80", section: "Featured Projects", caption: "Turnkey handover, Atma Nagar", published: true, uploadedAt: d(-24) },
  { id: "md3", title: "Modular Kitchen — Aulakh House", kind: "image", url: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1200&q=80", section: "Interior Work", caption: "Acrylic finish modular kitchen", published: true, uploadedAt: d(-18) },
  { id: "md4", title: "Living Room — Italian Marble", kind: "image", url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80", section: "Gallery", published: true, uploadedAt: d(-12) },
  { id: "md5", title: "Dhaliwal Farmhouse — Site Walkthrough", kind: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", section: "Featured Projects", caption: "Drone walkthrough of the 4 acre estate", published: false, uploadedAt: d(-6) },
  { id: "md6", title: "Client Review — Dr. Sidhu", kind: "image", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80", section: "Testimonials", caption: "\u201cOn time, on budget, no excuses.\u201d", published: true, uploadedAt: d(-3) },
];

/* ---------------------------- settings --------------------------- */

const settings: Settings = {
  firmName: "Malwa Builders",
  tagline: "We Build Luxury Living, Inside & Out.",
  address: "Ks Grewal Road, Tehsil Road, opp. SSP Police Line, Atma Nagar, Royal City, Jagraon, Punjab 142026",
  phone: "9815031725",
  email: "malwabuilders@gmail.com",
  website: "https://malwa-builder.vercel.app",
  gstin: "03AAXXM1234C1ZR",
  reminderWindowDays: 7,
};

/* ---------------------------- assemble --------------------------- */

export function buildSeedDB(): DB {
  return {
    users,
    customers,
    projects,
    milestones,
    payments,
    materials,
    vendors,
    commitments,
    vendorPayments,
    reminders,
    media,
    settings,
  };
}
