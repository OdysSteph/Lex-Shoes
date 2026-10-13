import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatIDR, ORDER_STATUS_LABEL } from "@/lib/format";
import { startOfMonth, todayJakarta } from "@/lib/report";

const LOW_STOCK = 3;

export default async function AdminHome() {
  const supabase = await createClient();
  const today = todayJakarta();
  const head = { count: "exact" as const, head: true };

  const [verif, paid, proc, ship, low, products, month, recent] = await Promise.all([
    supabase.from("orders").select("*", head).eq("status", "pending_verification"),
    supabase.from("orders").select("*", head).eq("status", "paid"),
    supabase.from("orders").select("*", head).eq("status", "processing"),
    supabase.from("orders").select("*", head).eq("status", "shipped"),
    supabase.from("product_variants").select("*", head).eq("is_active", true).lte("stock", LOW_STOCK),
    supabase.from("products").select("*", head),
    supabase.rpc("sales_report", { p_from: startOfMonth(today), p_to: today, p_group: "month" }),
    supabase
      .from("orders")
      .select("id, order_number, status, total, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const monthRow = ((month.data ?? []) as { orders_count: number; total_received: number }[])[0];

  const cards = [
    { label: "Penjualan bulan ini", value: formatIDR(Number(monthRow?.total_received ?? 0)), href: "/admin/laporan" },
    { label: "Pesanan terbayar bulan ini", value: String(Number(monthRow?.orders_count ?? 0)), href: "/admin/laporan" },
    { label: "Menunggu verifikasi pembayaran", value: String(verif.count ?? 0), href: "/admin/pesanan?status=pending_verification" },
    { label: "Dibayar, belum diproses", value: String(paid.count ?? 0), href: "/admin/pesanan?status=paid" },
    { label: "Sedang diproses", value: String(proc.count ?? 0), href: "/admin/pesanan?status=processing" },
    { label: "Dalam pengiriman", value: String(ship.count ?? 0), href: "/admin/pesanan?status=shipped" },
    { label: `Varian stok ≤ ${LOW_STOCK}`, value: String(low.count ?? 0), href: "/admin/produk" },
    { label: "Total produk", value: String(products.count ?? 0), href: "/admin/produk" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ringkasan</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-lg border bg-white p-4 hover:shadow-sm">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="text-xl font-bold">{c.value}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-lg border bg-white">
        <h2 className="border-b p-4 font-semibold">Pesanan terbaru</h2>
        <ul className="divide-y text-sm">
          {(recent.data ?? []).length === 0 && <li className="p-4 text-muted-foreground">Belum ada pesanan.</li>}
          {(recent.data ?? []).map((o) => (
            <li key={o.id}>
              <Link href={`/admin/pesanan/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-neutral-50">
                <span>
                  <span className="font-medium">{o.order_number}</span>
                  <span className="block text-xs text-muted-foreground">{formatDateTime(o.created_at)}</span>
                </span>
                <span>{ORDER_STATUS_LABEL[o.status]} · {formatIDR(Number(o.total))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}