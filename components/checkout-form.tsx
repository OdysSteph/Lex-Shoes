"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { placeOrder, type CheckoutState } from "@/app/actions/checkout";

export type AddressOption = { id: string; label: string; recipient: string; phone: string; text: string };

export function CheckoutForm({
  addresses,
  defaultId,
  blocked,
}: {
  addresses: AddressOption[];
  defaultId: string | null;
  blocked: boolean;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});

  return (
    <form action={action} className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Alamat pengiriman</legend>
        {addresses.map((a) => (
          <label key={a.id} className="flex cursor-pointer gap-3 rounded-md border bg-white p-3 text-sm">
            <input type="radio" name="addressId" value={a.id} defaultChecked={a.id === defaultId} required />
            <span>
              <span className="font-medium">{a.label}</span> · {a.recipient} · {a.phone}
              <br />
              <span className="text-muted-foreground">{a.text}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {blocked && (
        <p className="text-sm text-red-600">Ada item yang tidak tersedia. Perbaiki keranjang dulu.</p>
      )}

      <Button type="submit" disabled={pending || blocked} className="w-full">
        {pending ? "Membuat pesanan..." : "Buat pesanan"}
      </Button>
    </form>
  );
}