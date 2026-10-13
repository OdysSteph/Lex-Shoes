"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasValidImageSignature, IMAGE_EXT } from "@/lib/image";
import { IMAGE_MAX_BYTES } from "@/lib/validation/product";
import { bankSchema, settingsSchema } from "@/lib/validation/settings";
import type { ActionState } from "@/app/admin/actions";

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    storeName: fd.get("storeName"),
    contactPhone: fd.get("contactPhone") ?? "",
    contactEmail: fd.get("contactEmail") ?? "",
    address: fd.get("address") ?? "",
    shippingFee: fd.get("shippingFee"),
    paymentExpiryMinutes: fd.get("paymentExpiryMinutes"),
    paymentInstructions: fd.get("paymentInstructions") ?? "",
    instagramUrl: fd.get("instagramUrl") ?? "",
    facebookUrl: fd.get("facebookUrl") ?? "",
    tiktokUrl: fd.get("tiktokUrl") ?? "",
    whatsappNumber: fd.get("whatsappNumber") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_settings")
    .update({
      store_name: d.storeName,
      contact_phone: d.contactPhone,
      contact_email: d.contactEmail,
      address: d.address,
      shipping_fee: d.shippingFee,
      payment_expiry_minutes: d.paymentExpiryMinutes,
      payment_instructions: d.paymentInstructions,
      instagram_url: d.instagramUrl,
      facebook_url: d.facebookUrl,
      tiktok_url: d.tiktokUrl,
      whatsapp_number: d.whatsappNumber,
    })
    .eq("id", true)
    .select("id");

  if (error || !data?.length) return { error: "Gagal menyimpan pengaturan." };

  revalidatePath("/", "layout");
  return {
    message:
      "Pengaturan disimpan. Perubahan ongkir dan batas waktu hanya berlaku untuk pesanan baru.",
  };
}

export async function addPaymentMethod(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { count } = await supabase
    .from("payment_methods")
    .select("*", { count: "exact", head: true });
  const sortOrder = count ?? 0;
  const type = fd.get("type");

  if (type === "bank") {
    const p = bankSchema.safeParse({
      provider: fd.get("provider"),
      accountNumber: fd.get("accountNumber"),
      accountName: fd.get("accountName"),
    });
    if (!p.success) return { error: p.error.issues[0].message };

    const { error } = await supabase.from("payment_methods").insert({
      type: "bank",
      provider: p.data.provider,
      account_number: p.data.accountNumber,
      account_name: p.data.accountName,
      sort_order: sortOrder,
    });
    if (error) return { error: "Gagal menyimpan rekening." };
  } else if (type === "qris") {
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Pilih gambar QRIS." };
    if (!(file.type in IMAGE_EXT)) return { error: "Format harus JPG, PNG, atau WebP." };
    if (file.size > IMAGE_MAX_BYTES) return { error: "Ukuran gambar maksimal 2 MB." };
    if (!(await hasValidImageSignature(file))) return { error: "File bukan gambar yang valid." };

    const merchant = z.string().trim().max(100).safeParse(fd.get("accountName") ?? "");
    const path = `qris/${randomUUID()}.${IMAGE_EXT[file.type]}`;

    const { error: upErr } = await supabase.storage
      .from("store-assets")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return { error: "Upload gambar gagal. Coba lagi." };

    const { error } = await supabase.from("payment_methods").insert({
      type: "qris",
      provider: "QRIS",
      account_name: merchant.success && merchant.data ? merchant.data : null,
      qris_image_path: path,
      sort_order: sortOrder,
    });
    if (error) {
      await supabase.storage.from("store-assets").remove([path]);
      return { error: "Gagal menyimpan QRIS." };
    }
  } else {
    return { error: "Pilih jenis pembayaran." };
  }

  revalidatePath("/admin/pengaturan");
  return { message: "Metode pembayaran ditambahkan." };
}

export async function togglePaymentMethod(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("payment_methods").update({ is_active: active }).eq("id", id);
  revalidatePath("/admin/pengaturan");
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();

  const { data: m } = await supabase
    .from("payment_methods").select("qris_image_path").eq("id", id).maybeSingle();
  await supabase.from("payment_methods").delete().eq("id", id);
  if (m?.qris_image_path) {
    await supabase.storage.from("store-assets").remove([m.qris_image_path]);
  }
  revalidatePath("/admin/pengaturan");
}