/* Indian-style number, money and date helpers used all over the panel. */

export function inr(n: number): string {
  const v = Math.round(n || 0);
  return "\u20B9" + v.toLocaleString("en-IN");
}

/** Short Indian money: 1.25 Cr / 45.5 L / 85 K */
export function inrShort(n: number): string {
  const v = Math.abs(n || 0);
  const sign = n < 0 ? "-" : "";
  if (v >= 1_00_00_000) return `${sign}\u20B9${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `${sign}\u20B9${(v / 1_00_000).toFixed(2)} L`;
  if (v >= 1_000) return `${sign}\u20B9${(v / 1_000).toFixed(1)} K`;
  return `${sign}\u20B9${v}`;
}

export function num(n: number, digits = 0): string {
  return (n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(n: number, digits = 0): string {
  return `${(n || 0).toFixed(digits)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${`${d.getDate()}`.padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${fmtDate(iso)}, ${h}:${`${d.getMinutes()}`.padStart(2, "0")} ${ampm}`;
}

export function monthLabel(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${`${d.getFullYear()}`.slice(2)}`;
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const d1 = new Date(a);
  const d2 = new Date(b);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

/** Negative = overdue by N days, positive = due in N days. */
export function daysFromToday(iso: string): number {
  return daysBetween(new Date(), iso);
}

export function relativeDue(iso: string): string {
  const d = daysFromToday(iso);
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d === -1) return "1 day overdue";
  if (d < 0) return `${Math.abs(d)} days overdue`;
  return `Due in ${d} days`;
}

export function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Stable colour per string so avatars/tags look designed, not random. */
export function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function digits10(phone: string): string {
  const only = phone.replace(/\D/g, "");
  return only.length > 10 ? only.slice(-10) : only;
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/91${digits10(phone)}?text=${encodeURIComponent(message)}`;
}

export function telLink(phone: string): string {
  return `tel:+91${digits10(phone)}`;
}

export function smsLink(phone: string, message: string): string {
  return `sms:+91${digits10(phone)}?body=${encodeURIComponent(message)}`;
}

export function mailLink(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function maskPhone(phone: string): string {
  const d = digits10(phone);
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}
