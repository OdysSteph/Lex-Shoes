import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { getRole, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { NotificationBell } from "@/components/notification-bell";
import type { Notif } from "@/lib/notifications";

export async function Header() {
  const user = await getUser();
  const role = await getRole();
  const supabase = await createClient();

  const { data: settings } = await supabase.from("store_settings").select("store_name").maybeSingle();
  const storeName = settings?.store_name ?? "Toko";

  let bell: React.ReactNode = null;
  if (user) {
    const [{ data: items }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, title, message, order_id, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("notifications").select("*", { count: "exact", head: true }).eq("is_read", false),
    ]);
    bell = <NotificationBell userId={user.id} initial={(items ?? []) as Notif[]} initialUnread={count ?? 0} />;
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold">{storeName}</Link>
        <nav className="flex flex-1 items-center gap-4 text-sm">
          <Link href="/produk" className="hover:underline">Produk</Link>
          {user && role !== "admin" && <Link href="/keranjang" className="hover:underline">Keranjang</Link>}
          {user && role !== "admin" && <Link href="/pesanan" className="hover:underline">Pesanan</Link>}
          {user && role !== "admin" && <Link href="/akun" className="hover:underline">Akun</Link>}
          {role === "admin" && <Link href="/admin" className="hover:underline">Dasbor Admin</Link>}
        </nav>

        {user ? (
          <div className="flex items-center gap-3 text-sm">
            {bell}
            <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">Keluar</Button>
            </form>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link href="/masuk" className={buttonVariants({ variant: "ghost", size: "sm" })}>Masuk</Link>
            <Link href="/daftar" className={buttonVariants({ size: "sm" })}>Daftar</Link>
          </div>
        )}
      </div>
    </header>
  );
}