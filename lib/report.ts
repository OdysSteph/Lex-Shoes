const JAKARTA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const todayJakarta = () => JAKARTA.format(new Date()); // YYYY-MM-DD

export function isDate(s?: string): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addDays(s: string, n: number) {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const startOfMonth = (s: string) => s.slice(0, 8) + "01";
export const startOfYear = (s: string) => s.slice(0, 4) + "-01-01";

export function bucketLabel(bucket: string, group: string) {
  const d = new Date(bucket + "T00:00:00Z");
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", ...o }).format(d);
  if (group === "year") return f({ year: "numeric" });
  if (group === "month") return f({ month: "long", year: "numeric" });
  if (group === "week") return "Minggu " + f({ day: "numeric", month: "short", year: "numeric" });
  return f({ day: "numeric", month: "short", year: "numeric" });
}