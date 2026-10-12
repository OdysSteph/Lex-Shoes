import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "guest" | "customer" | "admin";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

// Role dibaca dari tabel user_roles (RLS: user hanya bisa membaca barisnya sendiri).
// Sengaja TIDAK memakai user_metadata karena bisa diedit user.
export const getRole = cache(async (): Promise<Role> => {
  const user = await getUser();
  if (!user) return "guest";
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.role === "admin" ? "admin" : "customer";
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/masuk");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if ((await getRole()) !== "admin") notFound();
  return user;
}