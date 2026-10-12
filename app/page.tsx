import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ProductCard, type ListingItem } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: latest }] = await Promise.all([
    supabase.from("categories").select("name, slug").order("name"),
    supabase
      .from("product_listing")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="space-y-10">
      <section className="rounded-xl bg-neutral-900 px-6 py-14 text-white">
        <h1 className="max-w-xl text-3xl font-bold sm:text-4xl">
          Sepatu dan aksesoris kulit langsung dari pengrajin Cibaduyut
        </h1>
        <p className="mt-3 max-w-lg text-neutral-300">
          Belanja langsung dari toko, tanpa potongan marketplace.
        </p>
        <Link
          href="/produk"
          className={cn(buttonVariants({ variant: "secondary" }), "mt-6")}
        >
          Lihat semua produk
        </Link>
      </section>

      <section className="flex flex-wrap gap-2">
        {categories?.map((c) => (
          <Link
            key={c.slug}
            href={`/produk?category=${c.slug}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {c.name}
          </Link>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Produk terbaru</h2>
        {latest && latest.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(latest as ListingItem[]).map((p) => <ProductCard key={p.id} item={p} />)}
          </div>
        ) : (
          <p className="text-muted-foreground">Belum ada produk.</p>
        )}
      </section>
    </div>
  );
}