import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductForm } from "@/components/admin/product-form";
import { ImageUploadForm } from "@/components/admin/simple-form";
import { VariantForm } from "@/components/admin/simple-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import {
  deleteProduct,
  deleteProductImage,
  deleteVariant,
  toggleVariantActive,
  updateProduct,
  updateVariantStock,
} from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { productImageUrl } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProdukPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id, name, slug, description, price, sku, is_active, category_id,
        images:product_images(id, path, sort_order),
        variants:product_variants(id, sku, size, color, stock, is_active)
      `)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  if (!product) notFound();

  const images = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const variants = [...(product.variants ?? [])].sort((a, b) =>
    (a.size ?? "").localeCompare(b.size ?? "", undefined, { numeric: true })
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit produk</h1>
        <Link href="/admin/produk" className="text-sm underline">← Kembali</Link>
      </div>

      <ProductForm
        action={updateProduct.bind(null, product.id)}
        categories={categories ?? []}
        submitLabel="Simpan perubahan"
        initial={{
          name: product.name,
          slug: product.slug,
          categoryId: product.category_id,
          description: product.description,
          price: Number(product.price),
          sku: product.sku,
          isActive: product.is_active,
        }}
      />

      {/* VARIAN */}
      <section className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Varian dan stok</h2>
        <p className="text-sm text-muted-foreground">
          Stok dihitung per varian. Produk tanpa ukuran cukup satu varian (kosongkan ukuran).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left">
              <tr>
                <th className="py-2">SKU</th>
                <th>Ukuran</th>
                <th>Warna</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {variants.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">
                  Belum ada varian. Produk tanpa varian tidak bisa dibeli.
                </td></tr>
              )}
              {variants.map((v) => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="py-2">{v.sku}</td>
                  <td>{v.size ?? "-"}</td>
                  <td>{v.color ?? "-"}</td>
                  <td>
                    <form
                      action={updateVariantStock.bind(null, v.id, product.id)}
                      className="flex items-center gap-2"
                    >
                      <Input
                        name="stock"
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={v.stock}
                        className="h-8 w-20"
                      />
                      <Button type="submit" size="sm" variant="outline">Simpan</Button>
                    </form>
                  </td>
                  <td>{v.is_active ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</td>
                  <td>
                    <div className="flex gap-2">
                      <ConfirmButton
                        action={toggleVariantActive.bind(null, v.id, product.id, !v.is_active)}
                        label={v.is_active ? "Nonaktifkan" : "Aktifkan"}
                        confirmText="Ubah status varian ini?"
                      />
                      <ConfirmButton
                        action={deleteVariant.bind(null, v.id, product.id)}
                        label="Hapus"
                        variant="destructive"
                        confirmText="Hapus varian ini? Tidak bisa dibatalkan."
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t pt-4">
          <h3 className="mb-2 text-sm font-medium">Tambah varian</h3>
          <VariantForm productId={product.id} />
        </div>
      </section>

      {/* GAMBAR */}
      <section className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Foto produk</h2>

        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada foto.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img, i) => (
              <li key={img.id} className="space-y-2">
                <div className="relative aspect-square overflow-hidden rounded-md bg-neutral-100">
                  <Image src={productImageUrl(img.path)!} alt={`Foto ${i + 1}`} fill sizes="25vw" className="object-cover" />
                </div>
                <ConfirmButton
                  action={deleteProductImage.bind(null, img.id, product.id)}
                  label="Hapus"
                  variant="destructive"
                  confirmText="Hapus foto ini?"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="border-t pt-4">
          <ImageUploadForm productId={product.id} />
          <p className="mt-2 text-xs text-muted-foreground">Foto pertama menjadi foto utama.</p>
        </div>
      </section>

      {/* ZONA BERBAHAYA */}
      <section className="space-y-2 rounded-lg border border-red-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-red-700">Hapus produk</h2>
        <p className="text-sm text-muted-foreground">
          Hapus permanen hanya aman untuk produk yang belum pernah dipesan. Jika sudah ada riwayat pesanan, gunakan Nonaktifkan.
        </p>
        <ConfirmButton
          action={async () => {
            "use server";
            await deleteProduct(id);
          }}
          label="Hapus permanen"
          variant="destructive"
          confirmText="Hapus produk ini beserta varian dan fotonya secara permanen?"
        />
      </section>
    </div>
  );
}