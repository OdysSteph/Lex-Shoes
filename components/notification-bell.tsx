"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { notificationHref, type Notif } from "@/lib/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";

const COLS = "id, type, title, message, order_id, is_read, created_at";

export function NotificationBell({
  userId, initial, initialUnread,
}: { userId: string; initial: Notif[]; initialUnread: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Notif[]>(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);

  // Sinkron dengan data server saat halaman dimuat ulang
  useEffect(() => {
    setItems(initial);
    setUnread(initialUnread);
  }, [initial, initialUnread]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function refresh() {
      const [{ data }, { count }] = await Promise.all([
        supabase.from("notifications").select(COLS).order("created_at", { ascending: false }).limit(10),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("is_read", false),
      ]);
      if (cancelled) return;
      setItems((data ?? []) as Notif[]);
      setUnread(count ?? 0);
    }

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const n = payload.new as Notif;
            setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)].slice(0, 10));
            setUnread((u) => u + 1);
          }
        )
        // Saat (re)connect, ambil ulang agar tidak ada notifikasi terlewat
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void refresh();
        });
    }

    void init();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  function readOne(n: Notif) {
    setOpen(false);
    if (n.is_read) return;
    setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, is_read: true } : p)));
    setUnread((u) => Math.max(0, u - 1));
    void markNotificationRead(n.id);
  }

  function readAll() {
    setItems((prev) => prev.map((p) => ({ ...p, is_read: true })));
    setUnread(0);
    void markAllNotificationsRead();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifikasi, ${unread} belum dibaca`}
        aria-expanded={open}
        className="relative rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
      >
        Notifikasi
        {unread > 0 && (
          <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b p-3 text-sm">
            <span className="font-semibold">Notifikasi</span>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="text-xs underline">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <ul className="max-h-80 divide-y overflow-y-auto">
            {items.length === 0 && (
              <li className="p-4 text-center text-sm text-muted-foreground">Belum ada notifikasi.</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={notificationHref(n)}
                  onClick={() => readOne(n)}
                  className={`block p-3 text-sm hover:bg-neutral-50 ${n.is_read ? "" : "bg-blue-50"}`}
                >
                  <p className={n.is_read ? "" : "font-semibold"}>{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t p-2 text-center text-sm">
            <Link href="/notifikasi" onClick={() => setOpen(false)} className="underline">
              Lihat semua
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}