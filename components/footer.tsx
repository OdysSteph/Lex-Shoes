import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Footer() {
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("store_settings")
    .select("store_name, address, contact_phone, contact_email, instagram_url, facebook_url, tiktok_url, whatsapp_number")
    .maybeSingle();

  const storeName = s?.store_name ?? "Toko";
  const socials = [
    { label: "Instagram", href: s?.instagram_url },
    { label: "Facebook", href: s?.facebook_url },
    { label: "TikTok", href: s?.tiktok_url },
    { label: "WhatsApp", href: s?.whatsapp_number ? `https://wa.me/${s.whatsapp_number}` : null },
  ].filter((x): x is { label: string; href: string } => Boolean(x.href));

  return (
    <footer className="border-t bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-base font-semibold">{storeName}</p>
          <p className="text-muted-foreground">
            Sepatu dan aksesoris kulit langsung dari pengrajin Cibaduyut, Bandung.
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-semibold">Alamat dan kontak</p>
          {s?.address ? (
            <p className="whitespace-pre-line text-muted-foreground">{s.address}</p>
          ) : (
            <p className="text-muted-foreground">Alamat belum diatur.</p>
          )}
          {s?.contact_phone && <p className="text-muted-foreground">Telp: {s.contact_phone}</p>}
          {s?.contact_email && (
            <p>
              <a href={`mailto:${s.contact_email}`} className="underline">{s.contact_email}</a>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="font-semibold">Ikuti kami</p>
          {socials.length === 0 ? (
            <p className="text-muted-foreground">Belum ada media sosial.</p>
          ) : (
            <ul className="space-y-1">
              {socials.map((x) => (
                <li key={x.label}>
                  <a href={x.href} target="_blank" rel="noopener noreferrer" className="underline">
                    {x.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="pt-2">
            <Link href="/produk" className="underline">Lihat produk</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}