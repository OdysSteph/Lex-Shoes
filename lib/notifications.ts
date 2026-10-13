export type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
};

const ADMIN_TYPES = ["order_created", "payment_submitted"];

export function notificationHref(n: Pick<Notif, "type" | "order_id">) {
  if (!n.order_id) return "/notifikasi";
  return ADMIN_TYPES.includes(n.type) ? `/admin/pesanan/${n.order_id}` : `/pesanan/${n.order_id}`;
}