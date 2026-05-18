import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Plan B – WGT 2026",
  description: "Dein Festival-Navigator für das Wave-Gotik-Treffen 2026 in Leipzig.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-zinc-950 font-sans antialiased">
        <main className="mx-auto max-w-lg">{children}</main>
        <div className="mx-auto max-w-lg">
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
