import { z } from "zod";

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const productSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug wajib diisi")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda hubung"),
  categoryId: z.string().uuid("Pilih kategori"),
  description: z.string().trim().max(5000).default(""),
  price: z.coerce
    .number({ message: "Harga harus berupa angka" })
    .int("Harga harus bilangan bulat")
    .min(0, "Harga tidak boleh negatif")
    .max(1_000_000_000),
  sku: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v ? v : null)),
  isActive: z.boolean(),
});

export const variantSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().trim().min(1, "SKU varian wajib diisi").max(60),
  size: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : null)),
  color: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : null)),
  stock: z.coerce
    .number({ message: "Stok harus berupa angka" })
    .int("Stok harus bilangan bulat")
    .min(0, "Stok tidak boleh negatif")
    .max(1_000_000),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug tidak valid"),
});

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;