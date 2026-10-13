"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addToCart, type CartState } from "@/app/actions/cart";

type Option = { id: string; label: string; stock: number };

export function AddToCartForm({ slug, options }: { slug: string; options: Option[] }) {
  const [state, action, pending] = useActionState<CartState, FormData>(addToCart, {});
  const inStock = options.filter((o) => o.stock > 0);

  if (inStock.length === 0) {
    return <p className="text-sm text-muted-foreground">Stok habis.</p>;
  }

  return (
    <form action={action} className="space-y-3 rounded-lg border bg-white p-4">
      <input type="hidden" name="slug" value={slug} />
      <div className="space-y-1">
        <Label htmlFor="variantId">Pilih varian</Label>
        <select
          id="variantId"
          name="variantId"
          required
          defaultValue=""
          className="w-full rounded-md border bg-white px-3 py-2 text-sm"
        >
          <option value="" disabled>Pilih ukuran / warna</option>
          {inStock.map((o) => (
            <option key={o.id} value={o.id}>{o.label} (sisa {o.stock})</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="quantity">Jumlah</Label>
        <Input id="quantity" name="quantity" type="number" min={1} max={10} defaultValue={1} className="w-24" />
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-green-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Menambahkan..." : "Tambah ke keranjang"}
      </Button>
    </form>
  );
}