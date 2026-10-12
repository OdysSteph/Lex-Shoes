import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatIDR, productImageUrl } from "@/lib/format";

export type ListingItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  category_name: string;
  total_stock: number;
  image_path: string | null;
};

export function ProductCard({ item }: { item: ListingItem }) {
  const img = productImageUrl(item.image_path);
  const soldOut = item.total_stock <= 0;

  return (
    <Link
      href={`/produk/${item.slug}`}
      className="group overflow-hidden rounded-lg border bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square bg-neutral-100">
        {img ? (
          <Image
            src={img}
            alt={item.name}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Belum ada foto
          </div>
        )}
        {soldOut && (
          <Badge variant="secondary" className="absolute left-2 top-2">Habis</Badge>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="text-xs text-muted-foreground">{item.category_name}</p>
        <h3 className="line-clamp-2 text-sm font-medium group-hover:underline">{item.name}</h3>
        <p className="font-semibold">{formatIDR(item.price)}</p>
      </div>
    </Link>
  );
}