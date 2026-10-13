"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addressSchema } from "@/lib/validation/checkout";

export type AddressState = { error?: string; message?: string };

const uuid = z.string().uuid();

function parse(formData: FormData) {
  return addressSchema.safeParse({
    label: formData.get("label") || "Rumah",
    recipientName: formData.get("recipientName"),
    phone: formData.get("phone"),
    provinceId: formData.get("provinceId"),
    regencyId: formData.get("regencyId"),
    districtId: formData.get("districtId"),
    village: formData.get("village"),
    postalCode: formData.get("postalCode"),
    street: formData.get("street"),
    notes: formData.get("notes") ?? "",
    isDefault: formData.get("isDefault") === "on",
  });
}

// Pastikan hierarki wilayah konsisten (kecamatan ∈ kab/kota ∈ provinsi)
async function regionIsValid(
  supabase: Awaited<ReturnType<typeof createClient>>,
  d: { provinceId: string; regencyId: string; districtId: string }
) {
  const [{ data: dist }, { data: reg }] = await Promise.all([
    supabase.from("districts").select("id").eq("id", d.districtId).eq("regency_id", d.regencyId).maybeSingle(),
    supabase.from("regencies").select("id").eq("id", d.regencyId).eq("province_id", d.provinceId).maybeSingle(),
  ]);
  return Boolean(dist && reg);
}

function refresh() {
  revalidatePath("/checkout");
  revalidatePath("/akun/alamat");
}

export async function saveAddress(_: AddressState, formData: FormData): Promise<AddressState> {
  const user = await getUser();
  if (!user) redirect("/masuk");

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  if (!(await regionIsValid(supabase, d))) {
    return { error: "Kombinasi provinsi, kota, dan kecamatan tidak valid." };
  }

  const { count } = await supabase.from("addresses").select("*", { count: "exact", head: true });
  const makeDefault = d.isDefault || (count ?? 0) === 0;

  const { data: created, error } = await supabase
    .from("addresses")
    .insert({
      user_id: user.id,
      label: d.label,
      recipient_name: d.recipientName,
      phone: d.phone,
      province_id: d.provinceId,
      regency_id: d.regencyId,
      district_id: d.districtId,
      village: d.village,
      postal_code: d.postalCode,
      street: d.street,
      notes: d.notes,
      is_default: false,
    })
    .select("id")
    .single();
  if (error || !created) return { error: "Gagal menyimpan alamat." };

  if (makeDefault) await supabase.rpc("set_default_address", { p_id: created.id });

  refresh();
  return { message: "Alamat disimpan." };
}

export async function updateAddress(
  addressId: string,
  _: AddressState,
  formData: FormData
): Promise<AddressState> {
  const user = await getUser();
  if (!user) redirect("/masuk");
  if (!uuid.safeParse(addressId).success) return { error: "Alamat tidak valid." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  if (!(await regionIsValid(supabase, d))) {
    return { error: "Kombinasi provinsi, kota, dan kecamatan tidak valid." };
  }

  // RLS memastikan hanya baris milik sendiri yang bisa diubah
  const { data, error } = await supabase
    .from("addresses")
    .update({
      label: d.label,
      recipient_name: d.recipientName,
      phone: d.phone,
      province_id: d.provinceId,
      regency_id: d.regencyId,
      district_id: d.districtId,
      village: d.village,
      postal_code: d.postalCode,
      street: d.street,
      notes: d.notes,
    })
    .eq("id", addressId)
    .select("id");
  if (error || !data?.length) return { error: "Gagal menyimpan perubahan alamat." };

  if (d.isDefault) await supabase.rpc("set_default_address", { p_id: addressId });

  refresh();
  return { message: "Alamat diperbarui. Pesanan lama tidak berubah." };
}

export async function setDefaultAddress(addressId: string): Promise<void> {
  const user = await getUser();
  if (!user || !uuid.safeParse(addressId).success) return;
  const supabase = await createClient();
  await supabase.rpc("set_default_address", { p_id: addressId });
  refresh();
}

export async function deleteAddress(addressId: string): Promise<void> {
  const user = await getUser();
  if (!user || !uuid.safeParse(addressId).success) return;
  const supabase = await createClient();
  await supabase.rpc("delete_address", { p_id: addressId });
  refresh();
}