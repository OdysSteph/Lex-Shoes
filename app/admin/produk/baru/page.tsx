import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Tambah Produk" };

export default async function BaruPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories").select("id, name").order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tambah produk</h1>

      {(categories ?? []).length === 0 ? (
        <p className="rounded-lg border bg-white p-4 text-sm">
          Belum ada kategori.{" "}
          <Link href="/admin/kategori" className="underline">Buat kategori dulu</Link>.
        </p>
      ) : (
        <>
          <ProductForm
            action={createProduct}
            categories={categories ?? []}
            submitLabel="Simpan dan lanjut"
          />
          <p className="text-sm text-muted-foreground">
            Setelah disimpan, Anda diarahkan ke halaman edit untuk menambah varian (ukuran/stok) dan foto.
          </p>
        </>
      )}
    </div>
  );
}