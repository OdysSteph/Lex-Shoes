import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { OrderActions } from "@/components/admin/order-actions";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateTime, formatIDR, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL,
} from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Addr = {
  recipient_name: string; phone: string; street: string; village: string;
  district: string; regency: string; province: string; postal_code: string; notes?: string | null;
};

export default async function AdminPesananDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: order }, { data: proofs }] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        id, order_number, status, payment_status, subtotal, shipping_fee, total,
        shipping_address, courier, tracking_number, expires_at, created_at,
        paid_at, shipped_at, completed_at, cancel_reason,
        items:order_items(id, product_name, sku, size, color, quantity, unit_price)
      `)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("payment_proofs")
      .select("id, path, status, submitted_at, reviewed_at, rejection_reason")
      .eq("order_id", id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (!order) notFound();
  const a = order.shipping_address as Addr;

  // Bucket privat: tautan sementara (5 menit), hanya bisa dibuat admin/pemilik berkat policy storage
  const proofList = await Promise.all(
    (proofs ?? []).map(async (p) => {
      const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(p.path, 300);
      return { ...p, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">Dibuat {formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{ORDER_STATUS_LABEL[order.status]}</Badge>
          <Badge variant="secondary">{PAYMENT_STATUS_LABEL[order.payment_status]}</Badge>
        </div>
        <Link href="/admin/pesanan" className="text-sm underline">← Kembali</Link>
      </div>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">Item</h2>
        <ul className="divide-y text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>
                {i.product_name}
                <span className="block text-xs text-muted-foreground">
                  {[i.size, i.color].filter(Boolean).join(" / ") || "Standar"} · {i.sku} · {i.quantity} × {formatIDR(Number(i.unit_price))}
                </span>
              </span>
              <span>{formatIDR(Number(i.unit_price) * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 space-y-1 border-t pt-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatIDR(Number(order.subtotal))}</span></div>
          <div className="flex justify-between"><span>Ongkir</span><span>{formatIDR(Number(order.shipping_fee))}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>{formatIDR(Number(order.total))}</span></div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 text-sm">
        <h2 className="mb-1 font-semibold">Alamat pengiriman</h2>
        <p>{a.recipient_name} · {a.phone}</p>
        <p className="text-muted-foreground">
          {a.street}, {a.village}, {a.district}, {a.regency}, {a.province} {a.postal_code}
        </p>
        {a.notes && <p className="mt-1">Catatan: {a.notes}</p>}
        {order.tracking_number && (
          <p className="mt-2">Kurir: {order.courier} · Resi: <strong>{order.tracking_number}</strong></p>
        )}
        {order.cancel_reason && <p className="mt-2 text-red-700">Dibatalkan: {order.cancel_reason}</p>}
      </section>

      <section className="space-y-3 rounded-lg border bg-white p-4 text-sm">
        <h2 className="font-semibold">Bukti pembayaran</h2>
        <p className="text-xs text-muted-foreground">
          Gambar bukti belum tentu berarti uang sudah masuk. Cocokkan dengan mutasi rekening sebelum menyetujui.
        </p>
        {proofList.length === 0 && <p className="text-muted-foreground">Belum ada bukti diunggah.</p>}
        <ul className="grid gap-4 sm:grid-cols-2">
          {proofList.map((p) => (
            <li key={p.id} className="space-y-2 rounded-md border p-3">
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="Bukti pembayaran" className="max-h-64 w-full rounded object-contain" />
                </a>
              ) : (
                <p className="text-red-600">Gagal memuat gambar.</p>
              )}
              <p>
                Status: <strong>{p.status === "submitted" ? "Menunggu tinjauan" : p.status === "approved" ? "Disetujui" : "Ditolak"}</strong>
                <br />
                <span className="text-xs text-muted-foreground">Diunggah {formatDateTime(p.submitted_at)}</span>
              </p>
              {p.rejection_reason && <p className="text-red-700">Alasan: {p.rejection_reason}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Tindakan</h2>
        <OrderActions orderId={order.id} status={order.status} paymentStatus={order.payment_status} />
        {["completed", "cancelled", "expired"].includes(order.status) && (
          <p className="text-sm text-muted-foreground">Pesanan sudah final. Tidak ada tindakan tersisa.</p>
        )}
      </section>
    </div>
  );
}