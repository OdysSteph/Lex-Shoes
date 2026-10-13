"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PaymentState = { error?: string; message?: string };

const MAX_BYTES = 2 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Cek tanda tangan file asli, karena Content-Type dari browser bisa dipalsukan
async function hasValidSignature(file: File, type: string) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (type === "image/jpeg") return at(0, 0xff, 0xd8, 0xff);
  if (type === "image/png") return at(0, 0x89, 0x50, 0x4e, 0x47);
  if (type === "image/webp") return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50);
  return false;
}

const ERRORS: Record<string, string> = {
  ORDER_NOT_FOUND: "Pesanan tidak ditemukan.",
  INVALID_STATE: "Pesanan ini tidak bisa menerima bukti pembayaran.",
  ORDER_EXPIRED: "Pesanan sudah kedaluwarsa.",
  INVALID_PATH: "File tidak valid.",
  NOT_AUTHENTICATED: "Sesi berakhir. Silakan masuk lagi.",
};

export async function uploadPaymentProof(_: PaymentState, formData: FormData): Promise<PaymentState> {
  const user = await requireUser();

  const orderId = z.string().uuid().safeParse(formData.get("orderId"));
  if (!orderId.success) return { error: "Pesanan tidak valid." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file bukti pembayaran." };
  if (!(file.type in EXT)) return { error: "Format harus JPG, PNG, atau WebP." };
  if (file.size > MAX_BYTES) return { error: "Ukuran file maksimal 2 MB." };
  if (!(await hasValidSignature(file, file.type))) return { error: "File bukan gambar yang valid." };

  const path = `${user.id}/${orderId.data}/${randomUUID()}.${EXT[file.type]}`;
  const supabase = await createClient();

  const { error: upErr } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: "Upload gagal. Coba lagi." };

  // Fungsi database memvalidasi pemilik, status, kedaluwarsa, dan path
  const { error } = await supabase.rpc("submit_payment_proof", {
    p_order_id: orderId.data,
    p_path: path,
  });
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return { error: key ? ERRORS[key] : "Gagal mengirim bukti pembayaran." };
  }

  revalidatePath(`/pesanan/${orderId.data}`);
  revalidatePath("/admin/pesanan");
  return { message: "Bukti pembayaran terkirim. Menunggu verifikasi admin." };
}