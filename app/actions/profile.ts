"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; message?: string };

const schema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,12}$/, "Nomor HP tidak valid (contoh: 081234567890)")
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export async function updateProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getUser();
  if (!user) redirect("/masuk");

  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  // Hanya dua kolom ini yang dikirim. Role berada di tabel lain yang tidak bisa ditulis.
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("id", user.id)
    .select("id");
  if (error || !data?.length) return { error: "Gagal menyimpan profil." };

  revalidatePath("/akun");
  return { message: "Profil disimpan." };
}