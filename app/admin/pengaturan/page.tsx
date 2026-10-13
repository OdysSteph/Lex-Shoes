import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PaymentMethodForm, SettingsForm } from "@/components/admin/settings-forms";
import { deletePaymentMethod, togglePaymentMethod } from "@/app/admin/pengaturan/actions";
import { createClient } from "@/lib/supabase/server";
import { storeAssetUrl } from "@/lib/format";

export const metadata = { title: "Pengaturan Toko (Admin)" };

export default async function PengaturanPage() {
  const supabase = await createClient();
  const [{ data: s }, { data: methods }] = await Promise.all([
    supabase.from("store_settings").select("*").single(),
    supabase.from("payment_methods").select("*").order("sort_order").order("created_at"),
  ]);

  if (!s) return <p role="alert" className="text-red-600">Pengaturan tidak ditemukan.</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Pengaturan toko</h1>

      <section className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Informasi dan pesanan</h2>
        <SettingsForm
          values={{
            store_name: s.store_name,
            contact_phone: s.contact_phone,
            contact_email: s.contact_email,
            address: s.address,
            shipping_fee: Number(s.shipping_fee),
            payment_expiry_minutes: s.payment_expiry_minutes,
            payment_instructions: s.payment_instructions ?? "",
            instagram_url: s.instagram_url,
            facebook_url: s.facebook_url,
            tiktok_url: s.tiktok_url,
            whatsapp_number: s.whatsapp_number,
          }}
        />
      </section>

      <section className="space-y-4 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Rekening dan QRIS</h2>
        <p className="text-sm text-muted-foreground">
          Yang aktif ditampilkan kepada pelanggan di halaman pesanan. Untuk mengubah rekening, hapus lalu tambah ulang.
        </p>

        {(methods ?? []).length === 0 && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            Belum ada metode pembayaran. Pelanggan tidak akan melihat tujuan transfer sebelum Anda menambahkannya.
          </p>
        )}

        <ul className="space-y-3">
          {(methods ?? []).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <div className="flex items-center gap-3">
                {m.type === "qris" && m.qris_image_path && (
                  <div className="relative h-16 w-16 overflow-hidden rounded bg-neutral-100">
                    <Image src={storeAssetUrl(m.qris_image_path)!} alt="QRIS" fill sizes="64px" className="object-contain" />
                  </div>
                )}
                <div>
                  <p className="font-medium">
                    {m.provider}{" "}
                    {m.is_active ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
                  </p>
                  {m.type === "bank" ? (
                    <p className="text-muted-foreground">{m.account_number} · a.n. {m.account_name}</p>
                  ) : (
                    m.account_name && <p className="text-muted-foreground">{m.account_name}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <ConfirmButton
                  action={togglePaymentMethod.bind(null, m.id, !m.is_active)}
                  label={m.is_active ? "Nonaktifkan" : "Aktifkan"}
                  confirmText="Ubah status metode pembayaran ini?"
                />
                <ConfirmButton
                  action={deletePaymentMethod.bind(null, m.id)}
                  label="Hapus"
                  variant="destructive"
                  confirmText="Hapus metode pembayaran ini?"
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-medium">Tambah metode pembayaran</h3>
          <PaymentMethodForm />
        </div>
      </section>
    </div>
  );
}