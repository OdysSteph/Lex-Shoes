import { z } from "zod";

const optional = (schema: z.ZodString) =>
  schema.or(z.literal("")).transform((v) => (v ? v : null));

export const settingsSchema = z.object({
  storeName: z.string().trim().min(2, "Nama toko minimal 2 karakter").max(100),
  contactPhone: optional(z.string().trim().regex(/^[0-9+() -]{6,20}$/, "Nomor kontak tidak valid")),
  contactEmail: optional(z.string().trim().email("Email kontak tidak valid")),
  address: optional(z.string().trim().max(300)),
  shippingFee: z.coerce
    .number({ message: "Ongkir harus berupa angka" })
    .int("Ongkir harus bilangan bulat")
    .min(0, "Ongkir tidak boleh negatif")
    .max(1_000_000),
  paymentExpiryMinutes: z.coerce
    .number({ message: "Batas waktu harus berupa angka" })
    .int()
    .min(5, "Minimal 5 menit")
    .max(10080, "Maksimal 7 hari (10080 menit)"),
  paymentInstructions: z.string().trim().max(1000, "Maksimal 1000 karakter"),
  instagramUrl: optional(z.string().trim().url("URL Instagram tidak valid").startsWith("https://", "Harus diawali https://")),
  facebookUrl: optional(z.string().trim().url("URL Facebook tidak valid").startsWith("https://", "Harus diawali https://")),
  tiktokUrl: optional(z.string().trim().url("URL TikTok tidak valid").startsWith("https://", "Harus diawali https://")),
  whatsappNumber: optional(z.string().trim().regex(/^62[0-9]{8,13}$/, "Format WhatsApp: 62812xxxxxxx (tanpa + dan tanpa 0 di depan)")),
});

export const bankSchema = z.object({
  provider: z.string().trim().min(2, "Nama bank minimal 2 karakter").max(50),
  accountNumber: z.string().trim().regex(/^[0-9]{5,30}$/, "Nomor rekening hanya angka (5-30 digit)"),
  accountName: z.string().trim().min(2, "Nama pemilik rekening wajib diisi").max(100),
});