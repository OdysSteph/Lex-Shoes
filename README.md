# LexShoes: E-Commerce Mandiri untuk Toko Sepatu Cibaduyut

Aplikasi toko online satu-toko (single-store) untuk pengrajin dan penjual sepatu di Cibaduyut, Bandung. Tujuannya membantu toko berjualan lewat platform sendiri tanpa komisi marketplace. Pembayaran diverifikasi manual oleh penjual (transfer bank atau QRIS), tanpa payment gateway.

Proyek ini juga menjadi implementasi nyata **Role-Based Access Control (RBAC)** yang ditegakkan di dua lapis: aplikasi (Next.js) dan database (PostgreSQL Row Level Security).

## Daftar Isi

1. [Fitur](#fitur)
2. [Teknologi](#teknologi)
3. [Peran dan Hak Akses](#peran-dan-hak-akses)
4. [Alur Pesanan dan Pembayaran](#alur-pesanan-dan-pembayaran)
5. [Struktur Proyek](#struktur-proyek)
6. [Menjalankan di Lokal](#menjalankan-di-lokal)
7. [Environment Variables](#environment-variables)
8. [Setup Database Supabase](#setup-database-supabase)
9. [Deploy ke Vercel](#deploy-ke-vercel)
10. [Aturan Laporan Penjualan](#aturan-laporan-penjualan)
11. [Keamanan](#keamanan)
12. [Pengujian](#pengujian)
13. [Performa](#performa)
14. [Troubleshooting](#troubleshooting)
15. [Keterbatasan Saat Ini](#keterbatasan-saat-ini)

---

## Fitur

**Publik (guest)**
- Katalog produk dengan pencarian, filter (kategori, rentang harga, ketersediaan), urutan (terbaru, harga), dan paginasi.
- Detail produk dengan harga dan stok per varian (ukuran/warna).
- Footer berisi nama toko, alamat, kontak, dan media sosial (dikelola admin).

**Pelanggan**
- Registrasi, login, logout, dan sesi persisten.
- Profil dan banyak alamat pengiriman (alamat utama, ubah, hapus). Wilayah Indonesia: provinsi, kabupaten/kota, kecamatan.
- Keranjang, checkout, dan pembuatan pesanan. Semua harga dan total dihitung di database.
- Instruksi pembayaran (rekening/QRIS) dan unggah bukti bayar ke bucket privat.
- Riwayat pesanan, status, kurir, dan nomor resi.
- Notifikasi dalam aplikasi (realtime).

**Admin**
- Dasbor ringkasan (penjualan bulan ini, antrean verifikasi, stok menipis, pesanan terbaru).
- Produk, varian dan stok, foto produk, serta kategori.
- Pesanan: filter, tinjau bukti bayar, setujui atau tolak (dengan alasan), proses, kirim (kurir dan resi), selesai, batalkan.
- Laporan penjualan harian, mingguan, bulanan, tahunan, dan rentang kustom (zona waktu Asia/Jakarta).
- Pengaturan toko: nama, kontak, media sosial, ongkir, batas waktu pembayaran, rekening bank dan QRIS.

## Teknologi

| Lapisan | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui (Base UI) |
| Backend | Supabase: PostgreSQL, Auth, Storage, Realtime, Row Level Security |
| Validasi | Zod (client dan server) |
| Hosting | Vercel (aplikasi) dan Supabase (data) |

## Peran dan Hak Akses

Role disimpan di tabel `user_roles` yang **tidak punya policy tulis** untuk pengguna. Role admin hanya bisa diberikan lewat SQL Editor atau service role.

| Kemampuan | Guest | Customer | Admin |
|---|:---:|:---:|:---:|
| Lihat katalog aktif | ✓ | ✓ | ✓ |
| Lihat rekening/QRIS pembayaran | ✗ | ✓ | ✓ |
| Keranjang, alamat, profil | ✗ | milik sendiri | milik sendiri |
| Buat pesanan | ✗ | ✓ (lewat `create_order`) | ✗ |
| Lihat pesanan | ✗ | milik sendiri | semua |
| Unggah bukti bayar | ✗ | pesanan sendiri | ✗ |
| Setujui / tolak pembayaran | ✗ | ✗ | ✓ |
| Ubah status kirim, resi, batalkan | ✗ | ✗ | ✓ |
| Kelola produk, stok, kategori | ✗ | ✗ | ✓ |
| Laporan penjualan | ✗ | ✗ | ✓ |
| Ubah pengaturan toko | ✗ | ✗ | ✓ |
| Notifikasi | ✗ | milik sendiri | milik sendiri |

## Alur Pesanan dan Pembayaran

Status pesanan (`orders.status`) dan status pembayaran (`orders.payment_status`) adalah dua hal terkait tetapi berbeda. Semua perubahan status lewat fungsi database (`SECURITY DEFINER`) yang memvalidasi transisi. Pengguna tidak bisa menulis tabel `orders` secara langsung.

```
pending_payment / awaiting_payment
   │  pelanggan unggah bukti (submit_payment_proof)
   ▼
pending_verification / awaiting_verification
   │── admin setujui (verify_payment) ──► paid / verified
   │                                          │ advance_order
   │                                          ▼
   │                                      processing ─► shipped (wajib kurir + resi) ─► completed
   │
   └── admin tolak (reject_payment, wajib alasan)
           ▼
       pending_payment / rejected  (diberi satu periode baru untuk unggah ulang)
```

- **Stok** dikurangi saat pesanan dibuat dan dikembalikan saat pesanan kedaluwarsa atau dibatalkan. Pengurangan memakai penguncian baris (`FOR UPDATE`) sehingga tidak bisa terjadi oversell.
- **Kedaluwarsa**: pesanan `pending_payment` yang lewat `expires_at` (default 60 menit, bisa diubah admin) menjadi `expired` lewat `pg_cron` setiap menit.
- Pesanan `pending_verification` **tidak** kedaluwarsa otomatis karena pelanggan sudah membayar dan admin yang memutuskan.
- **Pembatalan** oleh admin hanya sebelum pembayaran diverifikasi. Refund belum didukung.
- Setiap pesanan menyimpan **snapshot** nama produk, SKU, harga satuan, ongkir, dan alamat, sehingga riwayat tidak berubah saat data master diubah.

## Struktur Proyek

```
.
├─ app/                    # Halaman (App Router) dan Server Actions
│  ├─ actions/             # auth, cart, address, checkout, payment, profile, notifications
│  ├─ admin/               # dasbor, produk, kategori, pesanan, laporan, pengaturan
│  ├─ akun/                # profil dan alamat pelanggan
│  ├─ keranjang/ checkout/ pesanan/ notifikasi/ produk/
│  ├─ masuk/ daftar/
│  └─ layout.tsx page.tsx
├─ components/             # UI: header, footer, form, notifikasi, komponen admin
├─ lib/
│  ├─ supabase/            # client.ts, server.ts, proxy.ts
│  ├─ validation/          # skema Zod
│  ├─ auth.ts              # getUser, getRole, requireUser, requireAdmin
│  ├─ format.ts            # IDR, tanggal WIB, label status
│  └─ report.ts image.ts notifications.ts cart.ts
├─ db/                     # SQL migrasi, dijalankan berurutan
├─ scripts/seed-regions.mjs# isi data wilayah Indonesia
├─ proxy.ts                # refresh sesi dan proteksi route (Next.js 16)
└─ next.config.ts
```

## Menjalankan di Lokal

Prasyarat: Node.js 20+, akun Supabase, Git.

```bash
git clone <URL-REPO> lexshoes
cd lexshoes
npm install
cp .env.example .env.local     # lalu isi nilainya (lihat bagian berikut)
npm run dev
```

Buka http://localhost:3000.

Gunakan project Supabase **terpisah** untuk development dan produksi.

## Environment Variables

Simpan di `.env.local` (lokal) dan di **Vercel → Settings → Environment Variables** (produksi). Jangan pernah di-commit.

| Nama | Dipakai di | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser dan server | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser dan server | Publishable/anon key. Aman di browser karena dibatasi RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **hanya script lokal** | Secret key. Dipakai oleh `scripts/seed-regions.mjs`. **Jangan** diberi awalan `NEXT_PUBLIC_` dan tidak perlu dipasang di Vercel |

Contoh `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-key>
# Hanya untuk script seed lokal. Jangan commit nilai aslinya.
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` juga dibaca `next.config.ts` untuk mengizinkan gambar dari Supabase Storage, jadi harus tersedia saat build.

## Setup Database Supabase

### 1. Jalankan SQL berurutan

Di **Supabase → SQL Editor**, jalankan file di folder `db/` sesuai urutan:

| Urutan | File | Isi |
|---|---|---|
| 1 | `01_foundation.sql` | profil, role, fungsi `is_admin()`, trigger registrasi, RLS dasar |
| 2 | `02_storage.sql` | bucket `product-images` (publik) dan `payment-proofs` (privat) beserta policy |
| 3 | `03_catalog.sql` | kategori, produk, varian, gambar, pengaturan toko, RLS |
| 4 | `04_checkout.sql` | wilayah, alamat, keranjang, order, `create_order()`, `expire_orders()` |
| 5 | `05_payments.sql` | bukti bayar, verifikasi, status kirim, pembatalan |
| 6 | `06_settings_notifications_reports.sql` | metode pembayaran, notifikasi, laporan penjualan |
| 7 | `07_profile_addresses.sql` | validasi profil, fungsi alamat utama |
| 8 | `08_social_links.sql` | kolom media sosial toko |

`03b_seed_dev.sql` berisi data contoh. **Jalankan hanya di development, jangan di produksi.**

### 2. Jadwalkan kedaluwarsa pesanan

Aktifkan **Database → Extensions → pg_cron**, lalu:

```sql
select cron.schedule('expire-orders', '* * * * *', $$select public.expire_orders()$$);
```

Cek: `select * from cron.job;`. Jadwal ini harus dibuat di **setiap** project Supabase.

### 3. Isi data wilayah

```bash
node --env-file=.env.local scripts/seed-regions.mjs
```

Sumber data: `emsifa/api-wilayah-indonesia`. Hasilnya ±38 provinsi, ±514 kabupaten/kota, ±7.000 kecamatan. Aman dijalankan ulang (upsert). Desa/kelurahan diisi teks bebas oleh pelanggan.

### 4. Konfigurasi Auth

Di **Authentication**:
- **URL Configuration**: isi Site URL dan Redirect URLs (`http://localhost:3000/**` untuk lokal, domain produksi untuk produksi).
- **Providers → Email**: aktifkan **Confirm email** di produksi, minimum password 8.
- Produksi: pasang **SMTP kustom** (Authentication → SMTP Settings), karena email bawaan Supabase sangat dibatasi.

### 5. Buat admin pertama

Admin tidak bisa dibuat lewat aplikasi. Daftar akun biasa, lalu di SQL Editor:

```sql
update public.user_roles
set role = 'admin'
where user_id = (select id from auth.users where email = 'email-admin@anda.com');
```

Login ulang, menu **Dasbor Admin** akan muncul.

### 6. Isi data toko

Login sebagai admin, lalu: **Pengaturan** (nama toko, alamat, kontak, media sosial, ongkir, batas waktu bayar), **Rekening dan QRIS**, **Kategori**, lalu **Produk** (varian dan foto).

## Deploy ke Vercel

1. Push repo ke GitHub (private).
2. Vercel → **Add New → Project** → impor repo. Framework terdeteksi Next.js.
3. Tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (project **produksi**).
4. **Settings → Functions → Function Region**: pilih **Singapore (sin1)**, sama dengan region Supabase. Ini sangat memengaruhi kecepatan (lihat [Performa](#performa)).
5. Deploy, lalu isi Site URL dan Redirect URLs di Supabase Auth dengan domain Vercel.
6. Jika variabel ditambah setelah deploy, lakukan **Redeploy**.

Checklist sebelum menerima pesanan nyata:
- [ ] Konfirmasi email aktif dan SMTP kustom terpasang.
- [ ] Cron `expire-orders` terdaftar di project produksi.
- [ ] Tidak ada akun uji di `auth.users`.
- [ ] Rekening/QRIS asli sudah ditambahkan.
- [ ] Pertimbangkan paket berbayar Supabase (backup dan tanpa auto-pause).

## Aturan Laporan Penjualan

- Penjualan diakui saat pembayaran **diverifikasi admin** (`orders.paid_at`). Pesanan belum bayar, ditolak, kedaluwarsa, dan dibatalkan tidak dihitung.
- **Penjualan produk** = jumlah subtotal item. **Ongkir** dilaporkan terpisah. **Total diterima** = produk + ongkir.
- Refund belum didukung, sehingga belum ada pengurang.
- Angka ini adalah **penjualan, bukan laba**. Laba memerlukan data harga modal dan biaya.
- Batas hari dihitung 00:00-23:59 **Asia/Jakarta (WIB)**. Minggu dimulai Senin; minggu di tepi rentang bisa terpotong sebagian.

## Keamanan

- **RLS aktif** di semua tabel privat. Tabel `orders`, `order_items`, `payment_proofs`, `notifications` tidak punya policy tulis untuk pengguna; semua penulisan lewat fungsi `SECURITY DEFINER` yang memeriksa `auth.uid()` dan `is_admin()` di dalam fungsi.
- Role tidak pernah dibaca dari `user_metadata`. Hanya dari tabel `user_roles`.
- Harga, ongkir, subtotal, dan total dihitung di database. Browser hanya mengirim ID alamat saat checkout.
- Bukti bayar disimpan di bucket **privat**, diakses admin lewat signed URL berumur 5 menit. Unggahan divalidasi tipe, ukuran (maks 2 MB), dan tanda tangan file.
- Notifikasi: pengguna hanya bisa mengubah kolom `is_read` (grant tingkat kolom).
- Setiap Server Action admin memanggil `requireAdmin()` sendiri, tidak hanya mengandalkan guard di layout.
- URL media sosial dibatasi `https://` oleh validasi dan constraint database.
- `SUPABASE_SERVICE_ROLE_KEY` tidak dipakai di kode aplikasi dan tidak boleh ada di bundle browser.

Bukti bayar yang diunggah **belum tentu berarti uang masuk**. Admin wajib mencocokkan dengan mutasi rekening sebelum menyetujui.

## Pengujian

Saat ini pengujian dilakukan **manual**: skrip SQL di SQL Editor untuk batas RLS dan transisi status, serta checklist UI untuk alur beli sampai pengiriman. Tes otomatis (pgTAP untuk RLS dan state machine, Vitest untuk logika, Playwright untuk alur end-to-end) belum dibuat.

Skenario minimum yang harus lolos setiap kali ada perubahan:
- Guest tidak bisa membuat pesanan atau membuka `/admin`.
- Customer tidak bisa melihat pesanan, alamat, atau bukti bayar milik orang lain.
- Customer tidak bisa mengubah role, menyetujui pembayaran, atau mengubah stok dan total.
- Dua pembeli membeli stok terakhir bersamaan: satu berhasil, stok tidak negatif.
- Verifikasi ganda dan loncat status ditolak.
- Pesanan kedaluwarsa mengembalikan stok.

## Performa

Halaman dirender di server dan membaca database di setiap permintaan. Dua hal paling menentukan kecepatan:

1. **Region Vercel harus sama dengan Supabase.** Jika fungsi Vercel berada di AS sedangkan database di Singapura, setiap query menambah ±200 ms. Atur Function Region ke `sin1`.
2. **Hindari query berurutan.** Jalankan query independen dengan `Promise.all`, dan bungkus pengambil data yang dipakai berulang (mis. pengaturan toko) dengan `cache()` dari React agar hanya sekali per permintaan.

Cek region fungsi lewat header respons `x-vercel-id` (format `edge::fungsi::id`, bagian tengah adalah region fungsi).

## Troubleshooting

| Gejala | Penyebab umum |
|---|---|
| `Can't resolve 'tw-animate-css'` | Plugin PostCSS salah. Gunakan `@tailwindcss/postcss` dan `postcss.config.mjs` |
| Warning `asChild` | shadcn versi Base UI memakai `render`, bukan `asChild`. Gunakan `buttonVariants` pada `Link` |
| Login berhasil lalu langsung keluar | Site URL atau Redirect URL Supabase belum sesuai domain |
| Gambar produk tidak tampil | `NEXT_PUBLIC_SUPABASE_URL` salah atau belum ada saat build. Perbaiki lalu Redeploy |
| Email konfirmasi tidak datang | Batas email bawaan Supabase. Pasang SMTP kustom |
| Pesanan tidak kedaluwarsa | Cron `expire-orders` belum dibuat di project tersebut |
| Upload foto gagal | Naikkan `serverActions.bodySizeLimit` di `next.config.ts` (saat ini 3 MB) |
| Notifikasi tidak realtime | Pastikan tabel `notifications` ada di publikasi `supabase_realtime` |

## Keterbatasan Saat Ini

- Refund dan pengembalian dana belum didukung.
- Laporan hanya penjualan, belum laba.
- Ongkir flat per pesanan (nilai dapat diubah admin). Skema memungkinkan tarif per tujuan di masa depan.
- Desa/kelurahan berupa teks bebas.
- Belum ada ubah email/kata sandi, email atau WhatsApp otomatis, dan payment gateway.
- Single-store. Dukungan multi-toko memerlukan penambahan `store_id` pada tabel dan policy.
- Tes otomatis belum ada.