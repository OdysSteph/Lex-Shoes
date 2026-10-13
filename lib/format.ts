export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export function productImageUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu pembayaran",
  pending_verification: "Menunggu verifikasi",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Belum dibayar",
  awaiting_verification: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
  expired: "Kedaluwarsa",
};

export function storeAssetUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/store-assets/${path}`;
}