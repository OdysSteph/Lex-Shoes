import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Toko Cibaduyut", template: "%s | Toko Cibaduyut" },
  description: "Sepatu dan aksesoris kulit langsung dari pengrajin Cibaduyut, Bandung.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${geist.className} min-h-screen bg-neutral-50 text-neutral-900`}>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Toko Cibaduyut
        </footer>
      </body>
    </html>
  );
}