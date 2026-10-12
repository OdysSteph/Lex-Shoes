import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";
import { toggleProductActive } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";

const PAGE_SIZE = 15;

export const metadata = { title: "Produk (Admin)" };

export default async function AdminProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id, name, slug, price, is_active, category:categories(name)", { count: "exact" });

  if (sp.q?.trim()) {
    query = query.ilike("name", `%${sp.q.trim().replace(/[%_\\]/g, " ")}%`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pageHref = (p: number) =>
    `/admin/produk?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Produk</h1>
        <Link href="/admin/produk/baru" className={buttonVariants()}>+ Tambah produk</Link>
      </div>

      <form method="get" className="flex gap-2">
        <Input name="q" defaultValue={sp.q} placeholder="Cari nama produk..." />
        <Button type="submit" variant="outline">Cari</Button>
      </form>

      {error && <p role="alert" className="text-red-600">Gagal memuat produk.</p>}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left">
            <tr>
              <th className="p-3">Nama</th>
              <th className="p-3">Kategori</th>
              <th className="p-3">Harga</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Belum ada produk.</td></tr>
            )}
            {(data ?? []).map((p) => {
              const cat = p.category as unknown as { name: string } | null;
              return (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{cat?.name}</td>
                  <td className="p-3">{formatIDR(Number(p.price))}</td>
                  <td className="p-3">
                    {p.is_active ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/produk/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Edit
                      </Link>
                      <ConfirmButton
                        action={toggleProductActive.bind(null, p.id, !p.is_active)}
                        label={p.is_active ? "Nonaktifkan" : "Aktifkan"}
                        confirmText={p.is_active ? "Nonaktifkan produk ini? Produk akan hilang dari toko." : "Aktifkan produk ini?"}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Paginasi">
          {page > 1 && <Link href={pageHref(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Sebelumnya</Link>}
          <span>Halaman {page} dari {totalPages}</span>
          {page < totalPages && <Link href={pageHref(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Berikutnya</Link>}
        </nav>
      )}
    </div>
  );
}