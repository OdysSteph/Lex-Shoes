import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PaymentProofForm } from "@/components/payment-proof-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatIDR, ORDER_STATUS_LABEL, storeAssetUrl } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Addr = {
  recipient_name: string; phone: string; street: string; village: string;
  district: string; regency: string; province: string; postal_code: string;
};

export default async function PesananDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: order }, { data: settings }, { data: methods }, { data: proofs }] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        id, order_number, status, payment_status, subtotal, shipping_fee, total,
        shipping_address, courier, tracking_number, expires_at, created_at,
        items:order_items(id, product_name, sku, size, color, quantity, unit_price)
      `)
      .eq("id", id)
      .maybeSingle(), // RLS: order milik orang lain tidak terlihat -> 404
    supabase.from("store_settings").select("payment_instructions").single(),
    supabase
      .from("payment_methods")
      .select("id, type, provider, account_number, account_name, qris_image_path")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("payment_proofs")
      .select("id, status, rejection_reason, submitted_at")
      .eq("order_id", id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (!order) notFound();
  const a = order.shipping_address as Addr;
  const latest = proofs?.[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{order.order_number}</h1>
        <Badge>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">Dibuat {formatDateTime(order.created_at)}</p>

      {order.status === "pending_payment" && (
        <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <h2 className="font-semibold">Instruksi pembayaran</h2>
          <p>
            Transfer tepat <strong>{formatIDR(Number(order.total))}</strong> sebelum{" "}
            <strong>{formatDateTime(order.expires_at)}</strong> (WIB). Setelah lewat, pesanan otomatis
            kedaluwarsa dan stok dilepas.
          </p>

          {(methods ?? []).length === 0 ? (
            <p className="text-red-700">Tujuan pembayaran belum diatur penjual. Hubungi toko sebelum transfer.</p>
          ) : (
            <ul className="space-y-2">
              {methods!.map((m) => (
                <li key={m.id} className="rounded-md border bg-white p-3">
                  <p className="font-medium">{m.provider}</p>
                  {m.type === "bank" ? (
                    <p>{m.account_number} · a.n. {m.account_name}</p>
                  ) : (
                    m.qris_image_path && (
                      <div className="relative mt-1 h-56 w-56 max-w-full">
                        <Image
                          src={storeAssetUrl(m.qris_image_path)!}
                          alt="QRIS"
                          fill
                          sizes="224px"
                          className="object-contain"
                        />
                      </div>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}

          {settings?.payment_instructions && (
            <p className="whitespace-pre-line">{settings.payment_instructions}</p>
          )}

          {order.payment_status === "rejected" && latest?.rejection_reason && (
            <p className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
              Bukti pembayaran ditolak: {latest.rejection_reason}. Unggah bukti yang benar sebelum batas
              waktu di atas.
            </p>
          )}

          <PaymentProofForm orderId={order.id} />
        </section>
      )}

      {order.status === "pending_verification" && (
        <p className="rounded-lg border bg-white p-4 text-sm">
          Bukti pembayaran Anda sudah diterima. Admin sedang memeriksa apakah dana sudah masuk.
        </p>
      )}
      {order.status === "paid" && (
        <p className="rounded-lg border bg-white p-4 text-sm">
          Pembayaran terverifikasi. Pesanan akan segera diproses.
        </p>
      )}
      {order.status === "cancelled" && (
        <p className="rounded-lg border bg-white p-4 text-sm">Pesanan dibatalkan oleh penjual.</p>
      )}
      {order.status === "expired" && (
        <p className="rounded-lg border bg-white p-4 text-sm">
          Pesanan ini kedaluwarsa karena pembayaran tidak diterima tepat waktu.
        </p>
      )}

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">Item</h2>
        <ul className="divide-y text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>
                {i.product_name}
                <span className="block text-xs text-muted-foreground">
                  {[i.size, i.color].filter(Boolean).join(" / ") || "Standar"} · {i.sku} · {i.quantity} ×{" "}
                  {formatIDR(Number(i.unit_price))}
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
        <h2 className="mb-1 font-semibold">Dikirim ke</h2>
        <p>{a.recipient_name} · {a.phone}</p>
        <p className="text-muted-foreground">
          {a.street}, {a.village}, {a.district}, {a.regency}, {a.province} {a.postal_code}
        </p>
        {order.tracking_number && (
          <p className="mt-2">Kurir: {order.courier} · Resi: <strong>{order.tracking_number}</strong></p>
        )}
      </section>
    </div>
  );
}