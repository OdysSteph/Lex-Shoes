"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/app/admin/actions";
import { advanceOrder, cancelOrder, rejectPayment, verifyPayment } from "@/app/admin/pesanan/actions";

type Act = (s: ActionState, fd: FormData) => Promise<ActionState>;

function ActionForm({
  action, orderId, label, confirmText, variant = "default", children,
}: {
  action: Act;
  orderId: string;
  label: string;
  confirmText?: string;
  variant?: "default" | "outline";
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="orderId" value={orderId} />
      {children}
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-green-700">{state.message}</p>}
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? "Memproses..." : label}
      </Button>
    </form>
  );
}

const ta = "w-full rounded-md border bg-white px-3 py-2 text-sm";

export function OrderActions({
  orderId, status, paymentStatus,
}: { orderId: string; status: string; paymentStatus: string }) {
  const awaiting = status === "pending_verification" && paymentStatus === "awaiting_verification";

  return (
    <div className="space-y-6">
      {awaiting && (
        <>
          <ActionForm
            action={verifyPayment}
            orderId={orderId}
            label="Setujui pembayaran"
            confirmText="Pastikan uang sudah benar-benar masuk ke rekening. Setujui pembayaran ini?"
          />
          <ActionForm action={rejectPayment} orderId={orderId} label="Tolak pembayaran" variant="outline"
            confirmText="Tolak bukti pembayaran ini?">
            <Label htmlFor="reject-reason">Alasan penolakan (dilihat pelanggan)</Label>
            <textarea id="reject-reason" name="reason" rows={2} required minLength={3} maxLength={300} className={ta} />
          </ActionForm>
        </>
      )}

      {status === "paid" && (
        <ActionForm action={advanceOrder} orderId={orderId} label="Mulai proses pesanan">
          <input type="hidden" name="to" value="processing" />
        </ActionForm>
      )}

      {status === "processing" && (
        <ActionForm action={advanceOrder} orderId={orderId} label="Tandai dikirim"
          confirmText="Tandai pesanan ini sudah dikirim?">
          <input type="hidden" name="to" value="shipped" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="courier">Kurir</Label>
              <Input id="courier" name="courier" required maxLength={50} placeholder="JNE / J&T / SiCepat" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tracking">Nomor resi</Label>
              <Input id="tracking" name="tracking" required maxLength={80} />
            </div>
          </div>
        </ActionForm>
      )}

      {status === "shipped" && (
        <ActionForm action={advanceOrder} orderId={orderId} label="Tandai selesai"
          confirmText="Tandai pesanan ini selesai?">
          <input type="hidden" name="to" value="completed" />
        </ActionForm>
      )}

      {(status === "pending_payment" || status === "pending_verification") && (
        <ActionForm action={cancelOrder} orderId={orderId} label="Batalkan pesanan" variant="outline"
          confirmText="Batalkan pesanan dan kembalikan stok? Tidak bisa dibatalkan.">
          <Label htmlFor="cancel-reason">Alasan pembatalan</Label>
          <textarea id="cancel-reason" name="reason" rows={2} required minLength={3} maxLength={300} className={ta} />
        </ActionForm>
      )}
    </div>
  );
}