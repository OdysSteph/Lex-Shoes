"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
});

// Cegah open redirect: hanya path internal.
function safeNext(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.includes("\\") ? s : "/";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email atau kata sandi salah" };

  redirect(safeNext(formData.get("next")));
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // full_name dibaca trigger handle_new_user untuk mengisi profiles
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error) return { error: "Pendaftaran gagal. Email mungkin sudah terdaftar." };

  // Jika konfirmasi email aktif, belum ada sesi.
  if (!data.session) {
    return { message: "Pendaftaran berhasil. Cek email Anda untuk konfirmasi, lalu masuk." };
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}