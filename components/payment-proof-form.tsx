"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadPaymentProof, type PaymentState } from "@/app/actions/payment";

export function PaymentProofForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState<PaymentState, FormData>(uploadPaymentProof, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <Label htmlFor="proof">Unggah bukti transfer (JPG/PNG/WebP, maks 2 MB)</Label>
      <input
        id="proof"
        name="file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        className="block text-sm"
      />
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-green-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Mengunggah..." : "Kirim bukti pembayaran"}
      </Button>
    </form>
  );
}