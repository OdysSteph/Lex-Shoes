import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().trim().max(30).default("Rumah"),
  recipientName: z.string().trim().min(2, "Nama penerima minimal 2 karakter").max(100),
  phone: z.string().trim().regex(/^(\+62|62|0)8[0-9]{7,12}$/, "Nomor HP tidak valid (contoh: 081234567890)"),
  provinceId: z.string().regex(/^\d+$/, "Pilih provinsi"),
  regencyId: z.string().regex(/^\d+$/, "Pilih kabupaten/kota"),
  districtId: z.string().regex(/^\d+$/, "Pilih kecamatan"),
  village: z.string().trim().min(2, "Isi desa/kelurahan").max(100),
  postalCode: z.string().regex(/^\d{5}$/, "Kode pos harus 5 digit"),
  street: z.string().trim().min(5, "Alamat jalan minimal 5 karakter").max(300),
  notes: z.string().trim().max(200).optional().transform((v) => v || null),
  isDefault: z.boolean(),
});