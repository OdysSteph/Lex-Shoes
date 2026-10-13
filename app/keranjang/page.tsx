import Link from "next/link";
import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { requireUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { formatIDR } from "@/lib/format";
import { removeCartItem, updateCartQuantity } from "@/app/actions/cart";

export const metadata = { title: "Keranjang" };

export default async function KeranjangPage() {
  await requireUser();
  const cart = await getCart();
  const subtotal = cart.filter((l) => l.available).reduce((s, l) => s + l.price * l.quantity, 0);
  const hasIssue = cart.some((l) => !l.available);

  if (cart.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Keranjang Anda kosong.</p>
        <Link href="/produk" className={buttonVariants()}>Mulai belanja</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Keranjang</h1>

      <ul className="divide-y rounded-lg border bg-white">
        {cart.map((l) => (
          <li key={l.variantId} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{l.name}</p>
              <p className="text-sm text-muted-foreground">{l.label}</p>
              {l.available ? (
                <p className="text-sm">{formatIDR(l.price)}</p>
              ) : (
                <p className="text-sm text-red-600">
                  {l.stock > 0 ? `Stok hanya tersisa ${l.stock}. Kurangi jumlahnya.` : "Tidak tersedia. Hapus dari keranjang."}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <form action={updateCartQuantity.bind(null, l.variantId)} className="flex items-center gap-2">
                <Input name="quantity" type="number" min={1} max={99} defaultValue={l.quantity} className="h-8 w-20" />
                <Button type="submit" size="sm" variant="outline">Ubah</Button>
              </form>
              <ConfirmButton
                action={removeCartItem.bind(null, l.variantId)}
                label="Hapus"
                variant="destructive"
                confirmText="Hapus item ini dari keranjang?"
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">{formatIDR(subtotal)}</span></div>
        <p className="mt-1 text-xs text-muted-foreground">Ongkos kirim dihitung saat checkout.</p>
        {hasIssue ? (
          <p className="mt-3 text-sm text-red-600">Perbaiki item bermasalah sebelum checkout.</p>
        ) : (
          <Link href="/checkout" className={buttonVariants({ className: "mt-3 w-full" })}>Lanjut ke checkout</Link>
        )}
      </div>
    </div>
  );
}