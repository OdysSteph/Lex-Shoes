import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getRole, getUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function Header() {
  const user = await getUser();
  const role = await getRole();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold">Toko Cibaduyut</Link>
        <nav className="flex flex-1 items-center gap-4 text-sm">
          <Link href="/produk" className="hover:underline">Produk</Link>
          {role === "admin" && (
            <Link href="/admin" className="hover:underline">Dasbor Admin</Link>
          )}
        </nav>

        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">Keluar</Button>
            </form>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link href="/masuk" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Masuk
            </Link>
            <Link href="/daftar" className={buttonVariants({ size: "sm" })}>
              Daftar
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}