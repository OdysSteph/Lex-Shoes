"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addPaymentMethod, saveSettings } from "@/app/admin/pengaturan/actions";
import type { ActionState } from "@/app/admin/actions";

export type SettingsValues = {
  store_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  shipping_fee: number;
  payment_expiry_minutes: number;
  payment_instructions: string;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  whatsapp_number: string | null;
};

const field = "w-full rounded-md border bg-white px-3 py-2 text-sm";

function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-green-700">{state.message}</p>}
    </>
  );
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettings, {});

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="storeName">Nama toko</Label>
        <Input id="storeName" name="storeName" required defaultValue={values.store_name} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contactPhone">Telepon / WhatsApp</Label>
        <Input id="contactPhone" name="contactPhone" defaultValue={values.contact_phone ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contactEmail">Email kontak</Label>
        <Input id="contactEmail" name="contactEmail" type="email" defaultValue={values.contact_email ?? ""} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="address">Alamat toko</Label>
        <textarea id="address" name="address" rows={2} defaultValue={values.address ?? ""} className={field} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="whatsappNumber">WhatsApp (format 62812...)</Label>
        <Input id="whatsappNumber" name="whatsappNumber" inputMode="numeric" placeholder="6281234567890" defaultValue={values.whatsapp_number ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="instagramUrl">Instagram (URL)</Label>
        <Input id="instagramUrl" name="instagramUrl" type="url" placeholder="https://instagram.com/namatoko" defaultValue={values.instagram_url ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="facebookUrl">Facebook (URL)</Label>
        <Input id="facebookUrl" name="facebookUrl" type="url" placeholder="https://facebook.com/namatoko" defaultValue={values.facebook_url ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="tiktokUrl">TikTok (URL)</Label>
        <Input id="tiktokUrl" name="tiktokUrl" type="url" placeholder="https://tiktok.com/@namatoko" defaultValue={values.tiktok_url ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="shippingFee">Ongkir per pesanan (Rp)</Label>
        <Input id="shippingFee" name="shippingFee" type="number" min={0} step={1} required defaultValue={values.shipping_fee} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="paymentExpiryMinutes">Batas waktu pembayaran (menit)</Label>
        <Input id="paymentExpiryMinutes" name="paymentExpiryMinutes" type="number" min={5} max={10080} step={1} required defaultValue={values.payment_expiry_minutes} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="paymentInstructions">Catatan pembayaran (opsional)</Label>
        <textarea
          id="paymentInstructions"
          name="paymentInstructions"
          rows={3}
          defaultValue={values.payment_instructions}
          placeholder="Contoh: Cantumkan nomor pesanan pada berita transfer."
          className={field}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan pengaturan"}</Button>
      </div>
    </form>
  );
}

export function PaymentMethodForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addPaymentMethod, {});
  const [type, setType] = useState<"bank" | "qris">("bank");
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="type">Jenis</Label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as "bank" | "qris")}
          className={field}
        >
          <option value="bank">Transfer bank</option>
          <option value="qris">QRIS</option>
        </select>
      </div>

      {type === "bank" ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="provider">Nama bank</Label>
            <Input id="provider" name="provider" required placeholder="BCA / BRI / Mandiri" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="accountNumber">Nomor rekening</Label>
            <Input id="accountNumber" name="accountNumber" inputMode="numeric" required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="accountName">Atas nama</Label>
            <Input id="accountName" name="accountName" required />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor="file">Gambar QRIS (JPG/PNG/WebP, maks 2 MB)</Label>
            <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="block text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qrisName">Nama merchant (opsional)</Label>
            <Input id="qrisName" name="accountName" />
          </div>
        </>
      )}

      <div className="space-y-2 sm:col-span-2">
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Tambah metode pembayaran"}</Button>
      </div>
    </form>
  );
}