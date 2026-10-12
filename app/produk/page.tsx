import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { ProductCard, type ListingItem } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Produk" };

const PAGE_SIZE = 12;
type SP = Record<string, string | undefined>;

const SORTS: Record<string, { column: string; ascending: boolean }> = {
  terbaru: { column: "created_at", ascending: false },
  termurah: { column: "price", ascending: true },
  termahal: { column: "price", ascending: false },
};

export default async function ProdukPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = SORTS[sp.sort ?? ""] ?? SORTS.terbaru;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories").select("name, slug").order("name");

  let query = supabase
    .from("product_listing")
    .select("*", { count: "exact" })
    .eq("is_active", true);

  if (sp.q?.trim()) {
    const term = sp.q.trim().replace(/[%_\\]/g, " ");
    query = query.ilike("name", `%${term}%`);
  }
  if (sp.category) query = query.eq("category_slug", sp.category);

  const min = Number(sp.min);
  const max = Number(sp.max);
  if (sp.min && Number.isFinite(min)) query = query.gte("price", min);
  if (sp.max && Number.isFinite(max)) query = query.lte("price", max);
  if (sp.tersedia === "1") query = query.gt("total_stock", 0);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order(sort.column, { ascending: sort.ascending })
    .range(from, from + PAGE_SIZE - 1);

  const items = (data ?? []) as ListingItem[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const href = (p: number) => {
    const u = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => { if (v && k !== "page") u.set(k, v); });
    u.set("page", String(p));
    return `/produk?${u.toString()}`;
  };

  const selectClass = "h-9 rounded-md border bg-white px-2 text-sm";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Produk</h1>

      <form method="get" className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <Input name="q" defaultValue={sp.q} placeholder="Cari nama produk..." className="lg:col-span-2" />
        <select name="category" defaultValue={sp.category ?? ""} className={selectClass}>
          <option value="">Semua kategori</option>
          {categories?.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="sort" defaultValue={sp.sort ?? "terbaru"} className={selectClass}>
          <option value="terbaru">Terbaru</option>
          <option value="termurah">Harga terendah</option>
          <option value="termahal">Harga tertinggi</option>
        </select>
        <Input name="min" type="number" min={0} defaultValue={sp.min} placeholder="Harga min" />
        <Input name="max" type="number" min={0} defaultValue={sp.max} placeholder="Harga maks" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="tersedia" value="1" defaultChecked={sp.tersedia === "1"} />
          Hanya yang tersedia
        </label>
        <div className="flex gap-2 lg:col-span-2">
          <Button type="submit">Terapkan</Button>
          <Link href="/produk" className={buttonVariants({ variant: "ghost" })}>
            Reset
          </Link>
        </div>
      </form>

      {error ? (
        <p role="alert" className="text-red-600">Gagal memuat produk. Coba lagi.</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Produk tidak ditemukan.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} item={p} />)}
        </div>
      )}

      {page > 1 && (
        <Link href={href(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Sebelumnya
        </Link>
      )}
      <span>Halaman {page} dari {totalPages}</span>
      {page < totalPages && (
        <Link href={href(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Berikutnya
        </Link>
      )}
    </div>
  );
}