import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatIDR, productImageUrl } from "@/lib/format";
import { AddToCartForm } from "@/components/add-to-cart-form";

type Variant = { id: string; size: string | null; color: string | null; stock: number; is_active: boolean };
type Img = { path: string; sort_order: number };

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(`
      id, name, description, price, sku,
      category:categories(name, slug),
      images:product_images(path, sort_order),
      variants:product_variants(id, size, color, stock, is_active)
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) notFound();

  const images = ((data.images ?? []) as Img[]).sort((a, b) => a.sort_order - b.sort_order);
  const variants = ((data.variants ?? []) as Variant[])
    .filter((v) => v.is_active)
    .sort((a, b) => (a.size ?? "").localeCompare(b.size ?? "", undefined, { numeric: true }));
  const category = data.category as unknown as { name: string } | null;
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        {images.length > 0 ? (
          images.map((img) => (
            <div key={img.path} className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
              <Image src={productImageUrl(img.path)!} alt={data.name} fill sizes="50vw" className="object-cover" />
            </div>
          ))
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
            Belum ada foto
          </div>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{category?.name}</p>
        <h1 className="text-2xl font-semibold">{data.name}</h1>
        <p className="text-2xl font-bold">{formatIDR(Number(data.price))}</p>
        <div>
          {totalStock > 0
            ? <Badge>Stok tersedia</Badge>
            : <Badge variant="secondary">Stok habis</Badge>}
        </div>

        {data.description && <p className="whitespace-pre-line text-neutral-700">{data.description}</p>}

        <div>
          <h2 className="mb-2 text-sm font-medium">Varian</h2>
          <ul className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <li
                key={v.id}
                className={`rounded-md border px-3 py-1.5 text-sm ${v.stock <= 0 ? "text-neutral-400 line-through" : ""}`}
              >
                {[v.size, v.color].filter(Boolean).join(" / ") || "Standar"}
                <span className="ml-2 text-xs text-muted-foreground">
                  {v.stock > 0 ? `sisa ${v.stock}` : "habis"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <AddToCartForm
          slug={slug}
          options={variants.map((v) => ({
            id: v.id,
            label: [v.size, v.color].filter(Boolean).join(" / ") || "Standar",
            stock: v.stock,
          }))}
        />
      </div>
    </div>
  );
}