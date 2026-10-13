import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateTime, formatIDR, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL,
} from "@/lib/format";

export const metadata = { title: "Pesanan (Admin)" };

const PAGE_SIZE = 20;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
type SP = Record<string, string | undefined>;

export default async function AdminPesananPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total, created_at, shipping_address", { count: "exact" });

  if (sp.status && sp.status in ORDER_STATUS_LABEL) query = query.eq("status", sp.status);
  if (sp.payment && sp.payment in PAYMENT_STATUS_LABEL) query = query.eq("payment_status", sp.payment);

  // Batas tanggal dihitung dalam WIB (UTC+7)
  if (sp.from && DATE.test(sp.from)) query = query.gte("created_at", `${sp.from}T00:00:00+07:00`);
  if (sp.to && DATE.test(sp.to)) query = query.lte("created_at", `${sp.to}T23:59:59.999+07:00`);

  // Cari nomor pesanan atau nama penerima
  const term = sp.q?.trim().replace(/[%_\\,()*]/g, " ").trim();
  if (term) {
    query = query.or(
      `order_number.ilike.%${term}%,shipping_address->>recipient_name.ilike.%${term}%`
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => { if (v && k !== "page") u.set(k, v); });
    u.set("page", String(p));
    return `/admin/pesanan?${u}`;
  };

  const sel = "h-9 rounded-md border bg-white px-2 text-sm";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pesanan</h1>

      <form method="get" className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <Input name="q" defaultValue={sp.q} placeholder="No. pesanan / nama penerima" className="lg:col-span-2" />
        <select name="status" defaultValue={sp.status ?? ""} className={sel}>
          <option value="">Semua status</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="payment" defaultValue={sp.payment ?? ""} className={sel}>
          <option value="">Semua pembayaran</option>
          {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Input name="from" type="date" defaultValue={sp.from} />
        <Input name="to" type="date" defaultValue={sp.to} />
        <div className="flex gap-2 lg:col-span-2">
          <Button type="submit">Terapkan</Button>
          <Link href="/admin/pesanan" className={buttonVariants({ variant: "ghost" })}>Reset</Link>
        </div>
      </form>

      {error && <p role="alert" className="text-red-600">Gagal memuat pesanan.</p>}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left">
            <tr>
              <th className="p-3">No. pesanan</th><th className="p-3">Tanggal (WIB)</th>
              <th className="p-3">Penerima</th><th className="p-3">Total</th>
              <th className="p-3">Status</th><th className="p-3">Pembayaran</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Tidak ada pesanan.</td></tr>
            )}
            {(data ?? []).map((o) => {
              const a = o.shipping_address as { recipient_name?: string };
              return (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{o.order_number}</td>
                  <td className="p-3">{formatDateTime(o.created_at)}</td>
                  <td className="p-3">{a.recipient_name}</td>
                  <td className="p-3">{formatIDR(Number(o.total))}</td>
                  <td className="p-3"><Badge variant="secondary">{ORDER_STATUS_LABEL[o.status]}</Badge></td>
                  <td className="p-3">{PAYMENT_STATUS_LABEL[o.payment_status]}</td>
                  <td className="p-3">
                    <Link href={`/admin/pesanan/${o.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Detail
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Paginasi">
          {page > 1 && <Link href={pageHref(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Sebelumnya</Link>}
          <span>Halaman {page} dari {totalPages}</span>
          {page < totalPages && <Link href={pageHref(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Berikutnya</Link>}
        </nav>
      )}
    </div>
  );
}