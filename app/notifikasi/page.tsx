import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { notificationHref, type Notif } from "@/lib/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";

export const metadata = { title: "Notifikasi" };

export default async function NotifikasiPage() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, message, order_id, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const items = (data ?? []) as Notif[];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifikasi</h1>
        {items.some((n) => !n.is_read) && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">Tandai semua dibaca</Button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">Belum ada notifikasi.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {items.map((n) => (
            <li key={n.id} className={`flex items-start justify-between gap-3 p-4 ${n.is_read ? "" : "bg-blue-50"}`}>
              <Link href={notificationHref(n)} className="min-w-0 flex-1">
                <p className={n.is_read ? "font-medium" : "font-semibold"}>{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </Link>
              {!n.is_read && (
                <form action={markNotificationRead.bind(null, n.id)}>
                  <Button type="submit" variant="ghost" size="sm">Tandai dibaca</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}