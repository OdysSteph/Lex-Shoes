import Link from "next/link";
import { notFound } from "next/navigation";
import { AddressForm } from "@/components/address-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateAddress } from "@/app/actions/address";

export const metadata = { title: "Ubah Alamat" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UbahAlamatPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: a } = await supabase.from("addresses").select("*").eq("id", id).maybeSingle();
  if (!a) notFound(); // RLS: alamat milik orang lain tidak terlihat

  const [{ data: provinces }, { data: regencies }, { data: districts }] = await Promise.all([
    supabase.from("provinces").select("id, name").order("name"),
    supabase.from("regencies").select("id, name").eq("province_id", a.province_id).order("name"),
    supabase.from("districts").select("id, name").eq("regency_id", a.regency_id).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ubah alamat</h1>
        <Link href="/akun/alamat" className="text-sm underline">← Kembali</Link>
      </div>
      <p className="text-sm text-muted-foreground">Perubahan tidak mengubah alamat pada pesanan yang sudah dibuat.</p>
      <div className="rounded-lg border bg-white p-4">
        <AddressForm
          provinces={provinces ?? []}
          initialRegencies={regencies ?? []}
          initialDistricts={districts ?? []}
          action={updateAddress.bind(null, a.id)}
          submitLabel="Simpan perubahan"
          initial={{
            label: a.label,
            recipientName: a.recipient_name,
            phone: a.phone,
            provinceId: a.province_id,
            regencyId: a.regency_id,
            districtId: a.district_id,
            village: a.village,
            postalCode: a.postal_code,
            street: a.street,
            notes: a.notes ?? "",
            isDefault: a.is_default,
          }}
        />
      </div>
    </div>
  );
}