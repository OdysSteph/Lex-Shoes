import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Akun Saya" };

export default async function AkunPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Akun saya</h1>
      <section className="rounded-lg border bg-white p-4">
        <ProfileForm
          email={user.email ?? ""}
          fullName={profile?.full_name ?? ""}
          phone={profile?.phone ?? ""}
        />
      </section>
      <p className="text-sm">
        <Link href="/akun/alamat" className="underline">Kelola alamat pengiriman →</Link>
      </p>
    </div>
  );
}