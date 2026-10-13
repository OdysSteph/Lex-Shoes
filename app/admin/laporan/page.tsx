import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";
import {
  addDays, bucketLabel, isDate, startOfMonth, startOfYear, todayJakarta,
} from "@/lib/report";

export const metadata = { title: "Laporan Penjualan (Admin)" };

type Row = {
  bucket: string;
  orders_count: number;
  product_sales: number;
  shipping_revenue: number;
  total_received: number;
};
type SP = { from?: string; to?: string; group?: string };

const GROUPS: Record<string, string> = { day: "Harian", week: "Mingguan", month: "Bulanan", year: "Tahunan" };

export default async function LaporanPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const today = todayJakarta();
  const from = isDate(sp.from) ? sp.from : startOfMonth(today);
  const to = isDate(sp.to) ? sp.to : today;
  const group = sp.group && sp.group in GROUPS ? sp.group : "day";
  const rangeOk = from <= to && new Date(to).getTime() - new Date(from).getTime() <= 3660 * 86400000;

  let rows: Row[] = [];
  let failed = false;
  let lost = 0;

  if (rangeOk) {
    const supabase = await createClient();
    const [report, closed] = await Promise.all([
      supabase.rpc("sales_report", { p_from: from, p_to: to, p_group: group }),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("status", ["cancelled", "expired"])
        .gte("created_at", `${from}T00:00:00+07:00`)
        .lte("created_at", `${to}T23:59:59.999+07:00`),
    ]);
    if (report.error) failed = true;
    rows = ((report.data ?? []) as Row[]).map((r) => ({
      bucket: r.bucket,
      orders_count: Number(r.orders_count),
      product_sales: Number(r.product_sales),
      shipping_revenue: Number(r.shipping_revenue),
      total_received: Number(r.total_received),
    }));
    lost = closed.count ?? 0;
  }

  const sum = (k: keyof Omit<Row, "bucket">) => rows.reduce((s, r) => s + r[k], 0);
  const q = (f: string, t: string, g: string) => `/admin/laporan?from=${f}&to=${t}&group=${g}`;
  const presets = [
    { label: "Hari ini", href: q(today, today, "day") },
    { label: "7 hari terakhir", href: q(addDays(today, -6), today, "day") },
    { label: "Bulan ini", href: q(startOfMonth(today), today, "day") },
    { label: "Tahun ini", href: q(startOfYear(today), today, "month") },
  ];

  const sel = "h-9 rounded-md border bg-white px-2 text-sm";
  const cards = [
    { label: "Pesanan terbayar", value: String(sum("orders_count")) },
    { label: "Penjualan produk", value: formatIDR(sum("product_sales")) },
    { label: "Ongkir terkumpul", value: formatIDR(sum("shipping_revenue")) },
    { label: "Total diterima", value: formatIDR(sum("total_received")) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Laporan penjualan</h1>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Link key={p.label} href={p.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {p.label}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
        <div className="space-y-1"><label htmlFor="from" className="text-xs">Dari</label><Input id="from" name="from" type="date" defaultValue={from} /></div>
        <div className="space-y-1"><label htmlFor="to" className="text-xs">Sampai</label><Input id="to" name="to" type="date" defaultValue={to} /></div>
        <div className="space-y-1">
          <label htmlFor="group" className="text-xs">Kelompokkan</label>
          <select id="group" name="group" defaultValue={group} className={sel}>
            {Object.entries(GROUPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <Button type="submit">Tampilkan</Button>
      </form>

      {!rangeOk && <p role="alert" className="text-red-600">Rentang tanggal tidak valid (maksimal 10 tahun, tanggal awal tidak boleh setelah akhir).</p>}
      {failed && <p role="alert" className="text-red-600">Gagal memuat laporan.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-white p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left">
            <tr>
              <th className="p-3">Periode</th>
              <th className="p-3">Pesanan</th>
              <th className="p-3">Penjualan produk</th>
              <th className="p-3">Ongkir</th>
              <th className="p-3">Total diterima</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Belum ada penjualan terverifikasi pada periode ini.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.bucket} className="border-b last:border-0">
                <td className="p-3 font-medium">{bucketLabel(r.bucket, group)}</td>
                <td className="p-3">{r.orders_count}</td>
                <td className="p-3">{formatIDR(r.product_sales)}</td>
                <td className="p-3">{formatIDR(r.shipping_revenue)}</td>
                <td className="p-3">{formatIDR(r.total_received)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-1 rounded-lg border bg-white p-4 text-sm">
        <h2 className="font-semibold">Pesanan tidak dihitung</h2>
        <p>
          Dibatalkan atau kedaluwarsa pada periode ini: <strong>{lost}</strong> pesanan (dikecualikan dari penjualan).
        </p>
      </section>

      <section className="space-y-1 rounded-lg border bg-white p-4 text-xs text-muted-foreground">
        <h2 className="text-sm font-semibold text-foreground">Cara menghitung</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Penjualan diakui saat pembayaran diverifikasi admin. Pesanan belum bayar, ditolak, kedaluwarsa, dan dibatalkan tidak dihitung.</li>
          <li>Penjualan produk = jumlah subtotal item. Ongkir dilaporkan terpisah. Total diterima = produk + ongkir.</li>
          <li>Refund belum didukung, jadi belum ada pengurang. Penjualan bersih sama dengan penjualan produk.</li>
          <li>Angka ini adalah penjualan, bukan laba. Laba butuh data harga modal dan biaya lain.</li>
          <li>Batas hari 00:00-23:59 WIB (Asia/Jakarta). Minggu dimulai Senin, dan minggu di tepi rentang bisa terpotong sebagian.</li>
        </ul>
      </section>
    </div>
  );
}