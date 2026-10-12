"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  mode: "login" | "register";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
};

export function AuthForm({ mode, action, next }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const isRegister = mode === "register";

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {isRegister && (
        <div className="space-y-2">
          <Label htmlFor="fullName">Nama lengkap</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">{state.error}</p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-green-700">{state.message}</p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Memproses..." : isRegister ? "Daftar" : "Masuk"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? (
          <>Sudah punya akun? <Link href="/masuk" className="underline">Masuk</Link></>
        ) : (
          <>Belum punya akun? <Link href="/daftar" className="underline">Daftar</Link></>
        )}
      </p>
    </form>
  );
}