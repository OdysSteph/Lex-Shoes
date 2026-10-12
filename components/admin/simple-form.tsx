"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addVariant,
  createCategory,
  uploadProductImage,
  type ActionState,
} from "@/app/admin/actions";

function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-green-700">{state.message}</p>}
    </>
  );
}

// Kosongkan form setelah sukses
function useResetOnSuccess(state: ActionState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return ref;
}

export function VariantForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addVariant, {});
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-5">
      <input type="hidden" name="productId" value={productId} />
      <div className="space-y-1">
        <Label htmlFor="v-sku">SKU</Label>
        <Input id="v-sku" name="sku" required placeholder="SPT-001-42" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="v-size">Ukuran</Label>
        <Input id="v-size" name="size" placeholder="42" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="v-color">Warna</Label>
        <Input id="v-color" name="color" placeholder="Hitam" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="v-stock">Stok</Label>
        <Input id="v-stock" name="stock" type="number" min={0} step={1} defaultValue={0} required />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "..." : "Tambah"}
        </Button>
      </div>
      <div className="sm:col-span-5"><Feedback state={state} /></div>
    </form>
  );
}

export function ImageUploadForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadProductImage, {});
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="productId" value={productId} />
      <div className="space-y-1">
        <Label htmlFor="file">Foto (JPG/PNG/WebP, maks 2 MB)</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="block text-sm"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Mengunggah..." : "Unggah"}
      </Button>
      <div className="w-full"><Feedback state={state} /></div>
    </form>
  );
}

export function CategoryForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createCategory, {});
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor="c-name">Nama kategori</Label>
        <Input id="c-name" name="name" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-slug">Slug</Label>
        <Input id="c-slug" name="slug" required placeholder="tas-kulit" />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>{pending ? "..." : "Tambah kategori"}</Button>
      </div>
      <div className="sm:col-span-3"><Feedback state={state} /></div>
    </form>
  );
}