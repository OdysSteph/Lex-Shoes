import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <aside className="rounded-lg border bg-white p-4 md:self-start">
        <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Admin</p>
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/admin" className="hover:underline">Ringkasan</Link>
          <Link href="/admin/produk" className="hover:underline">Produk</Link>
          <Link href="/admin/kategori" className="hover:underline">Kategori</Link>
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}