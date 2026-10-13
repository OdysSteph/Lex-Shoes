import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";
import { AddressForm } from "@/components/address-form";
import { CheckoutForm, type AddressOption } from "@/components/checkout-form";
import { saveAddress } from "@/app/actions/address";

export const metadata = { title: "Checkout" };

type AddrRow = {
  id: string; label: string; recipient_name: string; phone: string; village: string;
  postal_code: string; street: string; is_default: boolean;
  province: { name: string } | null; regency: { name: string } | null; district: { name: string } | null;
};

export default async function CheckoutPage() {
  await requireUser();
  const cart = await getCart();
  if (cart.length === 0) redirect("/keranjang");

  const supabase = await createClient();
  const [{ data: addrs }, { data: settings }, { data: provinces }] = await Promise.all([
    supabase
      .from("addresses")
      .select("id, label, recipient_name, phone, village, postal_code, street, is_default, province:provinces(name), regency:regencies(name), district:districts(name)")
      .order("is_default", { ascending: false })
      .order("created_at"),
    supabase.from("store_settings").select("shipping_fee").single(),
    supabase.from("provinces").select("id, name").order("name"),
  ]);

  const rows = (addrs ?? []) as unknown as AddrRow[];
  const options: AddressOption[] = rows.map((a) => ({
    id: a.id,
    label: a.label,
    recipient: a.recipient_name,
    phone: a.phone,
    text: `${a.street}, ${a.village}, ${a.district?.name}, ${a.regency?.name}, ${a.province?.name} ${a.postal_code}`,
  }));

  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const shipping = Number(settings?.shipping_fee ?? 0);

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Checkout</h1>

        {options.length > 0 && (
          <CheckoutForm
            addresses={options}
            defaultId={rows.find((a) => a.is_default)?.id ?? options[0].id}
            blocked={cart.some((l) => !l.available)}
          />
        )}

        <details open={options.length === 0} className="rounded-lg border bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium">
            {options.length === 0 ? "Tambah alamat pengiriman" : "+ Tambah alamat baru"}
          </summary>
          <div className="mt-4">
            {/* --- PENEMPATAN YANG BENAR DI SINI --- */}
            <AddressForm
              provinces={provinces ?? []}
              action={saveAddress}
              submitLabel="Simpan alamat"
              resetOnSuccess
            />
          </div>
        </details>
      </div>

      <aside className="h-fit space-y-3 rounded-lg border bg-white p-4 text-sm md:sticky md:top-4">
        <h2 className="font-semibold">Ringkasan</h2>
        <ul className="space-y-1">
          {cart.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-2">
              <span>{l.name} ({l.label}) × {l.quantity}</span>
              <span>{formatIDR(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t pt-2">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatIDR(subtotal)}</span></div>
          <div className="flex justify-between"><span>Ongkir</span><span>{formatIDR(shipping)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>{formatIDR(subtotal + shipping)}</span></div>
        </div>
        <p className="text-xs text-muted-foreground">
          Total final dihitung ulang oleh server saat pesanan dibuat. Stok ditahan {" "}
          selama batas waktu pembayaran.
        </p>
      </aside>
    </div>
  );
}