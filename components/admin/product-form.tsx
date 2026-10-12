"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/validation/product";
import type { ActionState } from "@/app/admin/actions";

type Category = { id: string; name: string };
type Initial = {
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  price: number;
  sku: string | null;
  isActive: boolean;
};

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  initial?: Initial;
  submitLabel: string;
};

const fieldClass =
  "w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-neutral-400";

export function ProductForm({ action, categories, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-white p-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nama produk</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
        <p className="text-xs text-muted-foreground">Contoh: sepatu-kulit-pantofel</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="categoryId">Kategori</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={initial?.categoryId ?? ""}
            className={fieldClass}
          >
            <option value="" disabled>Pilih kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Harga (Rp)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={initial?.price}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sku">SKU produk (opsional)</Label>
        <Input id="sku" name="sku" defaultValue={initial?.sku ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={initial?.description}
          className={fieldClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} />
        Tampilkan di toko (aktif)
      </label>

      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-green-700">{state.message}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : submitLabel}
      </Button>
    </form>
  );
}