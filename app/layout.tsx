import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Toko Cibaduyut", template: "%s | Toko Cibaduyut" },
  description: "Sepatu dan aksesoris kulit langsung dari pengrajin Cibaduyut, Bandung.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${geist.className} flex min-h-screen flex-col bg-neutral-50 text-neutral-900`}>
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}