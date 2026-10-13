"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type CartState = { error?: string; message?: string };

const addSchema = z.object({
  variantId: z.string().uuid("Pilih ukuran/varian"),
  quantity: z.coerce.number().int().min(1, "Jumlah minimal 1").max(10, "Maksimal 10 per tambah"),
});

export async function addToCart(_: CartState, formData: FormData): Promise<CartState> {
  const slug = String(formData.get("slug") ?? "");
  const user = await getUser();
  if (!user) {
    const next = /^[a-z0-9-]+$/.test(slug) ? `/produk/${slug}` : "/produk";
    redirect(`/masuk?next=${encodeURIComponent(next)}`);
  }

  const parsed = addSchema.safeParse({
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { variantId, quantity } = parsed.data;

  const supabase = await createClient();

  // RLS: hanya varian aktif dari produk aktif yang terlihat
  const { data: variant } = await supabase
    .from("product_variants").select("stock").eq("id", variantId).maybeSingle();
  if (!variant) return { error: "Varian tidak tersedia." };

  const { data: existing } = await supabase
    .from("cart_items").select("quantity").eq("variant_id", variantId).maybeSingle();

  const newQty = (existing?.quantity ?? 0) + quantity;
  if (newQty > variant.stock) {
    return { error: `Stok tidak cukup. Sisa ${variant.stock}, di keranjang ${existing?.quantity ?? 0}.` };
  }

  const { error } = await supabase
    .from("cart_items")
    .upsert({ user_id: user.id, variant_id: variantId, quantity: newQty }, { onConflict: "user_id,variant_id" });
  if (error) return { error: "Gagal menambah ke keranjang." };

  revalidatePath("/keranjang");
  return { message: "Ditambahkan ke keranjang." };
}

export async function updateCartQuantity(variantId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/masuk");

  const qty = Number(formData.get("quantity"));
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return;

  const supabase = await createClient();
  const { data: v } = await supabase
    .from("product_variants").select("stock").eq("id", variantId).maybeSingle();
  if (!v) return;

  await supabase
    .from("cart_items")
    .update({ quantity: Math.min(qty, v.stock) })
    .eq("variant_id", variantId); // RLS memastikan hanya baris milik sendiri
  revalidatePath("/keranjang");
}

export async function removeCartItem(variantId: string) {
  const user = await getUser();
  if (!user) redirect("/masuk");
  const supabase = await createClient();
  await supabase.from("cart_items").delete().eq("variant_id", variantId);
  revalidatePath("/keranjang");
}