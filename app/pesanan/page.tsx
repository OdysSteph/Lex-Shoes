import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatIDR, ORDER_STATUS_LABEL } from "@/lib/format";

export const metadata = { title: "Pesanan Saya" };

export default async function PesananPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pesanan saya</h1>
      {(orders ?? []).length === 0 ? (
        <p className="text-muted-foreground">Belum ada pesanan.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {orders!.map((o) => (
            <li key={o.id}>
              <Link href={`/pesanan/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-neutral-50">
                <div>
                  <p className="font-medium">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge>
                  <span className="font-semibold">{formatIDR(Number(o.total))}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}