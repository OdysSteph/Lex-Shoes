"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type ProfileState } from "@/app/actions/profile";

export function ProfileForm({
  email, fullName, phone,
}: { email: string; fullName: string; phone: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} readOnly disabled />
      </div>
      <div className="space-y-1">
        <Label htmlFor="fullName">Nama lengkap</Label>
        <Input id="fullName" name="fullName" required defaultValue={fullName} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Nomor HP</Label>
        <Input id="phone" name="phone" inputMode="tel" placeholder="081234567890" defaultValue={phone} />
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-green-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan profil"}</Button>
    </form>
  );
}