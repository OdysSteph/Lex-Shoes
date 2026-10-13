import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AddressForm } from "@/components/address-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/app/actions/address";

export const metadata = { title: "Alamat Saya" };

type Row = {
  id: string; label: string; recipient_name: string; phone: string; village: string;
  postal_code: string; street: string; is_default: boolean;
  province: { name: string } | null; regency: { name: string } | null; district: { name: string } | null;
};

export default async function AlamatPage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data }, { data: provinces }] = await Promise.all([
    supabase
      .from("addresses")
      .select("id, label, recipient_name, phone, village, postal_code, street, is_default, province:provinces(name), regency:regencies(name), district:districts(name)")
      .order("is_default", { ascending: false })
      .order("created_at"),
    supabase.from("provinces").select("id, name").order("name"),
  ]);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Alamat saya</h1>
        <Link href="/akun" className="text-sm underline">← Akun</Link>
      </div>

      {rows.length === 0 && <p className="text-muted-foreground">Belum ada alamat tersimpan.</p>}

      <ul className="space-y-3">
        {rows.map((a) => (
          <li key={a.id} className="space-y-2 rounded-lg border bg-white p-4 text-sm">
            <p className="font-medium">
              {a.label} {a.is_default && <Badge>Utama</Badge>}
            </p>
            <p>{a.recipient_name} · {a.phone}</p>
            <p className="text-muted-foreground">
              {a.street}, {a.village}, {a.district?.name}, {a.regency?.name}, {a.province?.name} {a.postal_code}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/akun/alamat/${a.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Ubah
              </Link>
              {!a.is_default && (
                <ConfirmButton
                  action={setDefaultAddress.bind(null, a.id)}
                  label="Jadikan utama"
                  confirmText="Jadikan alamat ini sebagai alamat utama?"
                />
              )}
              <ConfirmButton
                action={deleteAddress.bind(null, a.id)}
                label="Hapus"
                variant="destructive"
                confirmText="Hapus alamat ini? Pesanan yang sudah dibuat tidak terpengaruh."
              />
            </div>
          </li>
        ))}
      </ul>

      <details open={rows.length === 0} className="rounded-lg border bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium">+ Tambah alamat baru</summary>
        <div className="mt-4">
          <AddressForm provinces={provinces ?? []} action={saveAddress} submitLabel="Simpan alamat" resetOnSuccess />
        </div>
      </details>
    </div>
  );
}