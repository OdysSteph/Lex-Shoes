"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { AddressState } from "@/app/actions/address";

type Opt = { id: string; name: string };

export type AddressInitial = {
  label: string;
  recipientName: string;
  phone: string;
  provinceId: string;
  regencyId: string;
  districtId: string;
  village: string;
  postalCode: string;
  street: string;
  notes: string;
  isDefault: boolean;
};

type Props = {
  provinces: Opt[];
  action: (state: AddressState, formData: FormData) => Promise<AddressState>;
  submitLabel: string;
  initial?: AddressInitial;
  initialRegencies?: Opt[];
  initialDistricts?: Opt[];
  resetOnSuccess?: boolean;
};

const sel = "w-full rounded-md border bg-white px-3 py-2 text-sm";

export function AddressForm({
  provinces, action, submitLabel, initial, initialRegencies = [], initialDistricts = [],
  resetOnSuccess = false,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [state, formAction, pending] = useActionState<AddressState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);

  const [provinceId, setProvinceId] = useState(initial?.provinceId ?? "");
  const [regencyId, setRegencyId] = useState(initial?.regencyId ?? "");
  const [districtId, setDistrictId] = useState(initial?.districtId ?? "");
  const [regencies, setRegencies] = useState<Opt[]>(initialRegencies);
  const [districts, setDistricts] = useState<Opt[]>(initialDistricts);

  useEffect(() => {
    if (state.message && resetOnSuccess) {
      ref.current?.reset();
      setProvinceId("");
      setRegencyId("");
      setDistrictId("");
      setRegencies([]);
      setDistricts([]);
    }
  }, [state, resetOnSuccess]);

  async function onProvince(id: string) {
    setProvinceId(id);
    setRegencyId("");
    setDistrictId("");
    setRegencies([]);
    setDistricts([]);
    if (!id) return;
    const { data } = await supabase.from("regencies").select("id, name").eq("province_id", id).order("name");
    setRegencies(data ?? []);
  }

  async function onRegency(id: string) {
    setRegencyId(id);
    setDistrictId("");
    setDistricts([]);
    if (!id) return;
    const { data } = await supabase.from("districts").select("id, name").eq("regency_id", id).order("name");
    setDistricts(data ?? []);
  }

  return (
    <form ref={ref} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="recipientName">Nama penerima</Label>
        <Input id="recipientName" name="recipientName" required defaultValue={initial?.recipientName} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Nomor HP</Label>
        <Input id="phone" name="phone" inputMode="tel" placeholder="081234567890" required defaultValue={initial?.phone} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="provinceId">Provinsi</Label>
        <select id="provinceId" name="provinceId" required value={provinceId} className={sel}
          onChange={(e) => onProvince(e.target.value)}>
          <option value="" disabled>Pilih provinsi</option>
          {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="regencyId">Kabupaten / Kota</Label>
        <select id="regencyId" name="regencyId" required value={regencyId} className={sel}
          onChange={(e) => onRegency(e.target.value)} disabled={regencies.length === 0}>
          <option value="" disabled>Pilih kabupaten/kota</option>
          {regencies.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="districtId">Kecamatan</Label>
        <select id="districtId" name="districtId" required value={districtId} className={sel}
          onChange={(e) => setDistrictId(e.target.value)} disabled={districts.length === 0}>
          <option value="" disabled>Pilih kecamatan</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="village">Desa / Kelurahan</Label>
        <Input id="village" name="village" required defaultValue={initial?.village} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="postalCode">Kode pos</Label>
        <Input id="postalCode" name="postalCode" inputMode="numeric" maxLength={5} required defaultValue={initial?.postalCode} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="label">Label alamat</Label>
        <Input id="label" name="label" defaultValue={initial?.label ?? "Rumah"} />
      </div>

      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="street">Alamat lengkap (jalan, nomor, RT/RW)</Label>
        <textarea id="street" name="street" rows={2} required defaultValue={initial?.street} className={sel} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="notes">Catatan untuk kurir (opsional)</Label>
        <Input id="notes" name="notes" defaultValue={initial?.notes} />
      </div>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="isDefault" defaultChecked={initial?.isDefault} /> Jadikan alamat utama
      </label>

      {state.error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-green-700 sm:col-span-2">{state.message}</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : submitLabel}</Button>
      </div>
    </form>
  );
}