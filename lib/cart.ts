import { createClient } from "@/lib/supabase/server";

export type CartLine = {
  variantId: string;
  quantity: number;
  available: boolean;
  name: string;
  slug: string;
  label: string;
  price: number;
  stock: number;
};

type Row = {
  variant_id: string;
  quantity: number;
  variant: {
    size: string | null;
    color: string | null;
    stock: number;
    product: { name: string; slug: string; price: number } | null;
  } | null;
};

export async function getCart(): Promise<CartLine[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cart_items")
    .select(`
      variant_id, quantity,
      variant:product_variants(size, color, stock, product:products(name, slug, price))
    `)
    .order("created_at");

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const v = r.variant;
    const p = v?.product ?? null;
    // v / p bernilai null jika varian atau produk nonaktif (disaring RLS)
    return {
      variantId: r.variant_id,
      quantity: r.quantity,
      available: Boolean(v && p && v.stock >= r.quantity),
      name: p?.name ?? "Produk tidak tersedia",
      slug: p?.slug ?? "",
      label: [v?.size, v?.color].filter(Boolean).join(" / ") || "Standar",
      price: Number(p?.price ?? 0),
      stock: v?.stock ?? 0,
    };
  });
}