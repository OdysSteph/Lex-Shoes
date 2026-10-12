import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "@/components/admin/simple-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteCategory } from "@/app/admin/actions";

export const metadata = { title: "Kategori (Admin)" };

export default async function KategoriPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Kategori</h1>

      <section className="rounded-lg border bg-white p-4">
        <CategoryForm />
      </section>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left">
            <tr><th className="p-3">Nama</th><th className="p-3">Slug</th><th className="p-3">Aksi</th></tr>
          </thead>
          <tbody>
            {(categories ?? []).length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Belum ada kategori.</td></tr>
            )}
            {(categories ?? []).map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.slug}</td>
                <td className="p-3">
                  <ConfirmButton
                    action={async () => {
                      "use server";
                      await deleteCategory(c.id);
                    }}
                    label="Hapus"
                    variant="destructive"
                    confirmText={`Hapus kategori "${c.name}"?`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}