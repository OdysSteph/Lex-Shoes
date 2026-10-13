"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/admin/actions";

const ERRORS: Record<string, string> = {
  FORBIDDEN: "Anda tidak punya izin untuk aksi ini.",
  ORDER_NOT_FOUND: "Pesanan tidak ditemukan.",
  INVALID_STATE: "Status pesanan sudah berubah. Muat ulang halaman.",
  REASON_REQUIRED: "Alasan wajib diisi (3-300 karakter).",
  COURIER_REQUIRED: "Kurir dan nomor resi wajib diisi.",
};

function mapError(message: string) {
  const key = Object.keys(ERRORS).find((k) => message.includes(k));
  return key ? ERRORS[key] : "Terjadi kesalahan. Coba lagi.";
}

function refresh(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath(`/pesanan/${orderId}`);
}

const idOf = (fd: FormData) => z.string().uuid().safeParse(fd.get("orderId"));

export async function verifyPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = idOf(fd);
  if (!id.success) return { error: "Pesanan tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_payment", { p_order_id: id.data });
  if (error) return { error: mapError(error.message) };

  refresh(id.data);
  return { message: "Pembayaran diverifikasi." };
}

export async function rejectPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = idOf(fd);
  if (!id.success) return { error: "Pesanan tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_payment", {
    p_order_id: id.data,
    p_reason: String(fd.get("reason") ?? ""),
  });
  if (error) return { error: mapError(error.message) };

  refresh(id.data);
  return { message: "Pembayaran ditolak." };
}

export async function advanceOrder(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = idOf(fd);
  const to = z.enum(["processing", "shipped", "completed"]).safeParse(fd.get("to"));
  if (!id.success || !to.success) return { error: "Permintaan tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("advance_order", {
    p_order_id: id.data,
    p_to: to.data,
    p_courier: String(fd.get("courier") ?? ""),
    p_tracking: String(fd.get("tracking") ?? ""),
  });
  if (error) return { error: mapError(error.message) };

  refresh(id.data);
  return { message: "Status pesanan diperbarui." };
}

export async function cancelOrder(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = idOf(fd);
  if (!id.success) return { error: "Pesanan tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order_admin", {
    p_order_id: id.data,
    p_reason: String(fd.get("reason") ?? ""),
  });
  if (error) return { error: mapError(error.message) };

  refresh(id.data);
  return { message: "Pesanan dibatalkan dan stok dikembalikan." };
}