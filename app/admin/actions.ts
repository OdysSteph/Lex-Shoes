"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  categorySchema,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  productSchema,
  variantSchema,
} from "@/lib/validation/product";

export type ActionState = { error?: string; message?: string };

// Kode error Postgres yang sering muncul
function dbError(e: { code?: string; message: string }): string {
  if (e.code === "23505") return "Data duplikat: slug atau SKU sudah dipakai.";
  if (e.code === "23503") return "Data masih dipakai oleh data lain.";
  if (e.code === "42501") return "Anda tidak punya izin untuk aksi ini.";
  return "Terjadi kesalahan pada database. Coba lagi.";
}

function bump() {
  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  revalidatePath("/");
}

/* ============ PRODUK ============ */

function parseProduct(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    sku: formData.get("sku") ?? "",
    isActive: formData.get("isActive") === "on",
  });
}

export async function createProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseProduct(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: d.name,
      slug: d.slug,
      category_id: d.categoryId,
      description: d.description,
      price: d.price,
      sku: d.sku,
      is_active: d.isActive,
    })
    .select("id")
    .single();

  if (error) return { error: dbError(error) };

  bump();
  redirect(`/admin/produk/${data.id}`); // lanjut tambah varian dan gambar
}

export async function updateProduct(
  productId: string,
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseProduct(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: d.name,
      slug: d.slug,
      category_id: d.categoryId,
      description: d.description,
      price: d.price,
      sku: d.sku,
      is_active: d.isActive,
    })
    .eq("id", productId);

  if (error) return { error: dbError(error) };

  bump();
  revalidatePath(`/admin/produk/${productId}`);
  return { message: "Produk berhasil disimpan." };
}

export async function toggleProductActive(productId: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("products").update({ is_active: active }).eq("id", productId);
  bump();
}

/**
 * Hapus permanen hanya jika produk belum pernah dipesan.
 * Tabel order_items (tahap berikutnya) akan memakai FK ON DELETE RESTRICT,
 * sehingga database sendiri menolak penghapusan produk yang punya riwayat.
 * Untuk produk berriwayat, gunakan "Nonaktifkan".
 */
export async function deleteProduct(productId: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();

  // Kumpulkan path gambar untuk dibersihkan dari Storage
  const { data: imgs } = await supabase
    .from("product_images")
    .select("path")
    .eq("product_id", productId);

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "Produk sudah punya riwayat pesanan. Nonaktifkan saja."
          : dbError(error),
    };
  }

  if (imgs?.length) {
    await supabase.storage.from("product-images").remove(imgs.map((i) => i.path));
  }

  bump();
  redirect("/admin/produk");
}

/* ============ VARIAN ============ */

export async function addVariant(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = variantSchema.safeParse({
    productId: formData.get("productId"),
    sku: formData.get("sku"),
    size: formData.get("size") ?? "",
    color: formData.get("color") ?? "",
    stock: formData.get("stock"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").insert({
    product_id: d.productId,
    sku: d.sku,
    size: d.size,
    color: d.color,
    stock: d.stock,
  });
  if (error) return { error: dbError(error) };

  bump();
  revalidatePath(`/admin/produk/${d.productId}`);
  return { message: "Varian ditambahkan." };
}

export async function updateVariantStock(
  variantId: string,
  productId: string,
  formData: FormData
) {
  await requireAdmin();
  const stock = Number(formData.get("stock"));
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return;

  const supabase = await createClient();
  await supabase.from("product_variants").update({ stock }).eq("id", variantId);
  bump();
  revalidatePath(`/admin/produk/${productId}`);
}

export async function toggleVariantActive(variantId: string, productId: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("product_variants").update({ is_active: active }).eq("id", variantId);
  bump();
  revalidatePath(`/admin/produk/${productId}`);
}

export async function deleteVariant(variantId: string, productId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("product_variants").delete().eq("id", variantId);
  bump();
  revalidatePath(`/admin/produk/${productId}`);
}

/* ============ GAMBAR ============ */

export async function uploadProductImage(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file");

  if (!/^[0-9a-f-]{36}$/i.test(productId)) return { error: "Produk tidak valid." };
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file gambar." };
  if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number]))
    return { error: "Format harus JPG, PNG, atau WebP." };
  if (file.size > IMAGE_MAX_BYTES) return { error: "Ukuran gambar maksimal 2 MB." };

  // Ekstensi ditentukan dari tipe tervalidasi, bukan dari nama file pengguna
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type]!;
  const path = `${productId}/${randomUUID()}.${ext}`;

  const supabase = await createClient();
  const { error: upErr } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: "Upload gagal. Coba lagi." };

  const { count } = await supabase
    .from("product_images")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error: dbErr } = await supabase
    .from("product_images")
    .insert({ product_id: productId, path, sort_order: count ?? 0 });

  if (dbErr) {
    await supabase.storage.from("product-images").remove([path]); // rollback file
    return { error: dbError(dbErr) };
  }

  bump();
  revalidatePath(`/admin/produk/${productId}`);
  return { message: "Gambar diunggah." };
}

export async function deleteProductImage(imageId: string, productId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: img } = await supabase
    .from("product_images")
    .select("path")
    .eq("id", imageId)
    .maybeSingle();
  if (!img) return;

  await supabase.from("product_images").delete().eq("id", imageId);
  await supabase.storage.from("product-images").remove([img.path]);

  bump();
  revalidatePath(`/admin/produk/${productId}`);
}

/* ============ KATEGORI ============ */

export async function createCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) return { error: dbError(error) };

  revalidatePath("/admin/kategori");
  bump();
  return { message: "Kategori ditambahkan." };
}

export async function deleteCategory(categoryId: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "Kategori masih dipakai produk. Pindahkan produknya dulu."
          : dbError(error),
    };
  }
  revalidatePath("/admin/kategori");
  bump();
  return { message: "Kategori dihapus." };
}