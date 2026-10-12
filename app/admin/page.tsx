import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const supabase = await createClient();

  const [all, active] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Ringkasan</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Total produk</p>
          <p className="text-2xl font-bold">{all.count ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Produk aktif</p>
          <p className="text-2xl font-bold">{active.count ?? 0}</p>
        </div>
      </div>
    </div>
  );
}