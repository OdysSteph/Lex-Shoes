"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type CheckoutState = { error?: string };

const ERRORS: Record<string, string> = {
  CART_EMPTY: "Keranjang kosong.",
  STOCK_UNAVAILABLE: "Stok salah satu produk tidak mencukupi atau produk sudah tidak dijual. Periksa keranjang Anda.",
  ADDRESS_NOT_FOUND: "Alamat tidak ditemukan.",
  NOT_AUTHENTICATED: "Sesi berakhir. Silakan masuk lagi.",
};

export async function placeOrder(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await getUser();
  if (!user) redirect("/masuk?next=/checkout");

  const addressId = z.string().uuid().safeParse(formData.get("addressId"));
  if (!addressId.success) return { error: "Pilih alamat pengiriman." };

  const supabase = await createClient();
  // Hanya ID alamat yang dikirim. Harga, ongkir, dan total dihitung di database.
  const { data, error } = await supabase.rpc("create_order", { p_address_id: addressId.data });

  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return { error: key ? ERRORS[key] : "Gagal membuat pesanan. Coba lagi." };
  }

  redirect(`/pesanan/${data}`);
}